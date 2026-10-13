import { ComfortRecorder,localDate,maintenanceDue,nextSchedule } from './comfort';
import { matches } from './automation';
import { randomUUID } from 'node:crypto';
import { discover, bind, readStatus, command } from './protocol.mjs';
import { Storage } from './storage';
import { evaluate, scheduleToken, type Runtime } from './automation';
import * as validate from './validation';
import type { Device, Group, Rule, History, Settings, Snapshot, Patch, Target, Result, DeviceChange, Maintenance } from '../shared/types';

export class Controller {
  private recorder:ComfortRecorder;
  private references=new Map<string,Patch>();
  devices: Device[]; groups: Group[]; rules: Rule[]; settings: Settings;
  scanning = false; diagnostic = 'Busque os aparelhos conectados à sua rede.';
  private keys = new Map<string, string>();
  private queues = new Map<string, Promise<unknown>>();
  private runtimes = new Map<string, Runtime>();
  private previousTick: number;
  private ticking = false; private polling = false; private stopped = false;
  private lastCursorWrite = 0;
  private discontinuity = true;
  constructor(private store: Storage, private changed: () => void, private protector: { isEncryptionAvailable(): boolean; encryptString(value: string): Buffer; decryptString(value: Buffer): string }, private transport = { discover,bind,readStatus,command }, private deviceChanged: (event: DeviceChange) => void = () => {}) {
    this.recorder=new ComfortRecorder(store);
    for(const ref of store.all<{mac:string;state:Patch}>('reference'))this.references.set(ref.mac,ref.state);
    this.devices = store.all<Device>('device').map(d => ({ ...d, online: false, pending: false, poweredSince: undefined, lastSeen: undefined }));
    this.groups = store.all<Group>('group'); this.rules = store.all<Rule>('rule');
    this.settings = store.all<Settings>('settings')[0] || { theme: 'dark', startup: false, pollSeconds: 15 };
    this.previousTick = store.all<number>('cursor')[0] || Date.now() - 1000;
    for (const entry of store.all<{ id: string; runtime: Runtime }>('runtime')) this.runtimes.set(entry.id, { last: entry.runtime.last, token: entry.runtime.token });
  }
  snapshot(): Snapshot { return { devices: this.devices.map(d=>({...d,comfort:{...this.recorder.summary(d.mac,Date.now()-3600000,Date.now()),nextSchedule:nextSchedule(this.rules,d.mac,this.groups,Date.now()),maintenanceDue:maintenanceDue(d.maintenance)}})), groups: this.groups, rules: this.rules, settings: this.settings, history: this.store.all<History>('history').sort((a,b) => b.at-a.at).slice(0,300), scanning: this.scanning, diagnostic: this.diagnostic }; }
  private persist(d: Device) { this.store.put('device', d.mac, { ...d, state: {}, online: false, pending: false, poweredSince: undefined, lastSeen: undefined }); }
  private log(name: string, status: History['status'], message: string, device?: string, rule?: string, metadata:Partial<History>={}) {
    const entry: History = { id: randomUUID(), at: Date.now(), name, status, message, device, rule, ...metadata };
    this.store.put('history', entry.id, entry); this.store.trimHistory(); if(status==='success')this.recorder.event(entry);this.changed();
  }
  private serial<T>(mac: string, work: () => Promise<T>): Promise<T> {
    const next = (this.queues.get(mac) || Promise.resolve()).catch(() => {}).then(work);
    this.queues.set(mac, next);
    void next.finally(() => { if (this.queues.get(mac) === next) this.queues.delete(mac); }).catch(() => {});
    return next;
  }
  private async key(d: Device) {
    const cached = this.keys.get(d.mac); if (cached) return cached;
    validate.ensure(this.protector.isEncryptionAvailable(), 'Proteção de chaves do sistema indisponível. No Linux, habilite um chaveiro Secret Service ou KWallet.');
    const saved = this.store.all<{ mac: string; key: string }>('key').find(k => k.mac === d.mac);
    if (saved) {
      try { const key = this.protector.decryptString(Buffer.from(saved.key,'base64')); this.keys.set(d.mac,key); return key; }
      catch { this.store.remove('key',d.mac); }
    }
    const key = await this.transport.bind(d);
    this.store.put('key', d.mac, { mac: d.mac, key: this.protector.encryptString(key).toString('base64') });
    this.keys.set(d.mac,key); this.persist(d); return key;
  }
  private update(d: Device, state: Patch, origin: DeviceChange['origin'] = 'network', expected:Patch={}) {
    const now = Date.now();
    const continuous = d.online && d.lastSeen !== undefined && now-d.lastSeen <= this.settings.pollSeconds*2000+5000;
    const fields = continuous ? Object.keys(state).filter(field => d.state[field] !== undefined && d.state[field] !== state[field]) : [];
    const previous=this.references.get(d.mac);
    const controllable=['Pow','Mod','SetTem','WdSpd',...d.features];
    const valid=(f:string)=>{const range=validate.ranges[f];return Number.isInteger(state[f]) && range && state[f]>=range[0] && state[f]<=range[1];};
    const external=previous?controllable.filter(f=>previous[f]!==undefined && valid(f) && state[f]!==previous[f] && (origin==='network' || !(f in expected) || state[f]!==expected[f])):[];
    if(external.length){
      const before=Object.fromEntries(external.map(f=>[f,previous![f]])),after=Object.fromEntries(external.map(f=>[f,state[f]]));
      const first=!d.externalOverride;d.externalOverride={at:now,fields:external,before,after};
      this.persist(d);const h:History={id:randomUUID(),at:now,device:d.mac,name:'Alteração fora do desktop',status:'skipped',message:first?'Automações pausadas até retomada explícita.':'Nova alteração detectada; proteção mantida.',origin:'external',reason:'external-protection',fields:external,before,after};this.store.put('history',h.id,h);this.store.trimHistory();this.recorder.event(h);
    }
    const reference={...previous,...Object.fromEntries(controllable.filter(valid).map(f=>[f,state[f]]))};
    if(JSON.stringify(reference)!==JSON.stringify(previous)){this.references.set(d.mac,reference);this.store.put('reference',d.mac,{mac:d.mac,state:reference});}
    if (state.Pow === 1 && (!d.online || d.poweredSince === undefined || !d.lastSeen || now-d.lastSeen > this.settings.pollSeconds*2000+5000)) d.poweredSince = now;
    if (state.Pow !== 1) d.poweredSince = undefined;
    d.state = state; d.online = true; d.error = undefined; d.lastSeen = now;
    this.recorder.observe(d,now,this.settings.pollSeconds*2000+5000);
    if(fields.length){this.changed();const expectedFields=fields.filter(f=>!external.includes(f));if(expectedFields.length)this.deviceChanged({mac:d.mac,fields:expectedFields,origin,at:now});const externalFields=fields.filter(f=>external.includes(f));if(externalFields.length)this.deviceChanged({mac:d.mac,fields:externalFields,origin:'network',at:now});}
  }
  private offline(d: Device, error: unknown) { this.recorder.break(d.mac); d.online = false; d.poweredSince = undefined; d.error = error instanceof Error ? error.message : String(error); this.keys.delete(d.mac); this.store.remove('key',d.mac); }
  async discover(ip?: string) {
    if (this.scanning) return;
    if (ip) validate.ip(ip);
    this.scanning = true; this.changed();
    try {
      const scan = await this.transport.discover({ addresses: ip ? [ip] : undefined });
      for (const found of scan.devices) {
        let d = this.devices.find(d => d.mac === found.mac);
        if (d) { d.ip = found.ip; d.firmware = found.firmware; d.model = found.model; }
        else { const created: Device = { ...found, name: `Gree ${found.ip.split('.').pop()}`, room: '', features: [], online: false, state: {} }; this.devices.push(created); d = created; }
        this.persist(d);
      }
      this.diagnostic = `${scan.devices.length} aparelho(s) encontrado(s). ${scan.errors.join(' ')}`;
      await this.poll();
    } catch (error) { this.diagnostic = String(error); }
    finally { this.scanning = false; this.changed(); }
  }
  async poll() {
    if (this.polling || this.stopped) return;
    this.polling = true;
    try { await Promise.all(this.devices.map(d => this.serial(d.mac, async () => {
      try { this.update(d, await this.transport.readStatus(d, await this.key(d))); }
      catch (error) { this.offline(d,error); }
    }))); }
    finally { this.polling = false; this.changed(); }
  }
  resolve(target: Target) {
    validate.target(target);
    if (target.kind === 'device') return this.devices.filter(d => d.mac === target.id);
    const group = this.groups.find(g => g.id === target.id);
    return this.devices.filter(d => group?.members.includes(d.mac));
  }
  async send(target: Target, patch: Patch, manual = true, rule?: Rule): Promise<Result[]> {
    validate.ensure(!this.stopped,'Aplicativo encerrando.');
    validate.patch(patch);
    const devices = this.resolve(target);
    validate.ensure(devices.length, 'Destino sem aparelhos.');
    if (manual) for (const d of devices) { d.pausedUntil = Date.now() + 15*60000; this.persist(d); }
    this.changed();
    return Promise.all(devices.map(d => this.serial(d.mac, async () => {
      if(!manual){
        try{this.update(d,await this.transport.readStatus(d,await this.key(d)));}catch(e){this.offline(d,e);}
        const reason=d.externalOverride?'Controle externo: automações pausadas.':!d.online?'Sem leitura atual do aparelho.':rule&&!matches(d,rule.conditions,rule.match,Date.now())?'Condições não atendidas.':undefined;
        if(reason){this.log(rule?.name||'Automação','skipped',reason,d.mac,rule?.id,{origin:'automation',reason:d.externalOverride?'external-protection':'preflight'});return {mac:d.mac,ok:false,message:reason};}
      }
      if (!manual && d.pausedUntil && d.pausedUntil > Date.now()) {
        this.log(rule?.name || 'Automação','skipped','Pausa manual ativa.',d.mac,rule?.id);
        return { mac: d.mac, ok: false, message: 'Pausa manual ativa.' };
      }
      d.pending = true; this.changed();
      try {
        validate.ensure(d.online, 'Aparelho sem comunicação.');
        const supported = ['Pow','Mod','SetTem','WdSpd', ...d.features];
        const filtered = Object.fromEntries(Object.entries(patch).filter(([key]) => supported.includes(key) && d.state[key] !== undefined));
        const omitted = Object.keys(patch).filter(key => !(key in filtered));
        validate.ensure(Object.keys(filtered).length, 'Nenhuma ação compatível com este aparelho.');
        const key = await this.key(d);
        this.update(d, await this.transport.command(d, key, filtered), manual ? 'manual' : 'automation',filtered);
        const message = omitted.length ? `Confirmado parcialmente. Sem suporte confirmado: ${omitted.join(', ')}.` : 'Comando confirmado pela leitura.';
        this.log(rule?.name || 'Controle manual','success',message,d.mac,rule?.id,{origin:manual?'manual':'automation',fields:Object.keys(filtered),after:filtered});
        return { mac: d.mac, ok: !omitted.length, message };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        d.error = message; this.log(rule?.name || 'Controle manual','failure',message,d.mac,rule?.id);
        return { mac: d.mac, ok: false, message };
      } finally { d.pending = false; this.changed(); }
    })));
  }
  saveDevice(mac: string, changes: Pick<Device,'name'|'room'|'features'>) {
    const d = this.devices.find(d => d.mac === mac); validate.ensure(d, 'Aparelho desconhecido.');
    validate.text(changes.name); validate.ensure(typeof changes.room === 'string' && changes.room.length <= 80, 'Ambiente inválido.');
    validate.ensure(Array.isArray(changes.features) && changes.features.every(f => ['SwUpDn','SwingLfRig','Lig','Quiet','Tur','Blo','SwhSlp'].includes(f) && d.state[f] !== undefined), 'Recurso não reportado pelo aparelho.');
    Object.assign(d,changes); this.persist(d); this.changed();
  }
  resume(mac: string) { const d = this.devices.find(d => d.mac === mac); validate.ensure(d,'Aparelho desconhecido.'); d.pausedUntil = undefined; this.persist(d); this.changed(); }
  resumeExternalOverride(mac:string){
    const d=this.devices.find(d=>d.mac===mac);validate.ensure(d,'Aparelho desconhecido.');
    if(!d.externalOverride)return;
    d.externalOverride=undefined;d.poweredSince=undefined;this.persist(d);
    for(const rule of this.rules){const key=`${rule.id}:${mac}`,r=this.runtimes.get(key)||{};r.seen=d.lastSeen;r.previous=rule.trigger.kind==='state'?d.state[rule.trigger.field]:undefined;r.latched=rule.trigger.kind==='temperature';
      if(rule.trigger.kind==='schedule')r.token=scheduleToken(rule,Date.now());if(rule.trigger.kind==='timer' && rule.trigger.at<=Date.now())r.token=String(rule.trigger.at);
      this.runtimes.set(key,r);this.store.put('runtime',key,{id:key,runtime:r});}
    this.log('Proteção externa','skipped','Automações retomadas pelo usuário; nenhuma ação retroativa.',mac,undefined,{origin:'manual',reason:'external-resumed'});this.changed();
  }
  comfort(mac:string,hours:1|24|168){validate.ensure(this.devices.some(d=>d.mac===mac),'Aparelho desconhecido.');validate.ensure([1,24,168].includes(hours),'Período inválido.');return this.recorder.query(mac,hours);}
  saveMaintenance(mac:string,value:Maintenance){const d=this.devices.find(d=>d.mac===mac);validate.ensure(d,'Aparelho desconhecido.');const validDate=(v:string)=>typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && localDate(new Date(`${v}T00:00:00`).getTime())===v;
    validate.ensure(value && typeof value.enabled==='boolean' && validDate(value.lastDate) && value.lastDate<=localDate() && Number.isInteger(value.intervalDays) && value.intervalDays>=1 && value.intervalDays<=730 && (!value.snoozedUntil || validDate(value.snoozedUntil)),'Manutenção inválida.');d.maintenance={enabled:value.enabled,lastDate:value.lastDate,intervalDays:value.intervalDays,snoozedUntil:value.snoozedUntil};this.persist(d);this.changed();}
  maintenanceAction(mac:string,action:'done'|'snooze'){const d=this.devices.find(d=>d.mac===mac);validate.ensure(d?.maintenance,'Lembrete não configurado.');validate.ensure(['done','snooze'].includes(action),'Ação inválida.');const date=new Date();date.setDate(date.getDate()+7);this.saveMaintenance(mac,{...d.maintenance,lastDate:action==='done'?localDate():d.maintenance.lastDate,snoozedUntil:action==='done'?undefined:localDate(date.getTime())});}
  favorite(target:Target,value:boolean){validate.target(target);validate.ensure(typeof value==='boolean','Favorito inválido.');if(target.kind==='device'){const d=this.devices.find(d=>d.mac===target.id);validate.ensure(d,'Aparelho desconhecido.');d.favorite=value;this.persist(d);}else{const g=this.groups.find(g=>g.id===target.id);validate.ensure(g,'Grupo desconhecido.');g.favorite=value;this.store.put('group',g.id,g);}this.changed();}
  saveGroup(group: Group) {
    validate.text(group.id); validate.text(group.name);
    validate.ensure(Array.isArray(group.members) && group.members.length > 0 && group.members.every(mac => this.devices.some(d => d.mac === mac)), 'Selecione aparelhos válidos.');
    group.favorite=this.groups.find(g=>g.id===group.id)?.favorite || false;
    group.members = [...new Set(group.members)]; this.groups = [...this.groups.filter(g => g.id !== group.id),group]; this.store.put('group',group.id,group); this.changed();
  }
  deleteGroup(id: string) { validate.ensure(!this.rules.some(r => r.target.kind === 'group' && r.target.id === id),'Remova as regras deste grupo primeiro.'); this.groups = this.groups.filter(g => g.id !== id); this.store.remove('group',id); this.changed(); }
  saveRule(rule: Rule) { validate.rule(rule); validate.ensure(this.resolve(rule.target).length,'Destino sem aparelhos.'); this.rules = [...this.rules.filter(r => r.id !== rule.id),rule]; this.store.put('rule',rule.id,rule); this.clearRuntime(rule.id); this.changed(); }
  private clearRuntime(id: string) { for (const key of this.runtimes.keys()) if (key.startsWith(`${id}:`)) { this.runtimes.delete(key); this.store.remove('runtime',key); } }
  deleteRule(id: string) { this.rules = this.rules.filter(r => r.id !== id); this.store.remove('rule',id); this.clearRuntime(id); this.changed(); }
  async testRule(id: string) { const rule = this.rules.find(r => r.id === id); validate.ensure(rule,'Regra desconhecida.'); return this.send(rule.target,rule.action,true,rule); }
  saveSettings(settings: Settings) { validate.settings(settings); this.settings = settings; this.store.put('settings','settings',settings); this.changed(); }
  async tick(now = Date.now()) {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    try {
      const gap = this.discontinuity || now - this.previousTick > 65000 || now < this.previousTick;
      if (gap) {
        for (const d of this.devices) { d.online = false; d.poweredSince = undefined; d.lastSeen = undefined; }
        for (const runtime of this.runtimes.values()) { runtime.previous = undefined; runtime.seen = undefined; runtime.latched = false; }
      }
      const claimed = new Map<string, Set<string>>();
      for (const rule of this.rules.filter(r => r.enabled).sort((a,b) => a.id.localeCompare(b.id))) {
        if (this.stopped) break;
        const devices = this.resolve(rule.target);
        // Enumerate skipped schedule slots during downtime, bounded to the last week.
        if (gap && rule.trigger.kind === 'schedule') {
          for (let minute = Math.floor(Math.max(this.previousTick,now-7*86400000)/60000)*60000+60000; minute < Math.floor(now/60000)*60000; minute += 60000) {
            if (scheduleToken(rule,minute)) this.log(rule.name,'skipped',`Agenda perdida em ${new Date(minute).toLocaleString('pt-BR')}; não executada retroativamente.`,undefined,rule.id);
          }
        }
        for (const d of devices) {
          if (this.stopped) break;
          const id = `${rule.id}:${d.mac}`, runtime = this.runtimes.get(id) || {};
          const before = JSON.stringify(runtime);
          const outcome = evaluate(rule,d,runtime,now,gap?Math.min(this.previousTick,now-65001):this.previousTick,this.settings.pollSeconds*2000+5000);
          this.runtimes.set(id,runtime);
          if (before !== JSON.stringify(runtime)) this.store.put('runtime',id,{ id, runtime });
          if (outcome === 'fire') {
            const fields = claimed.get(d.mac) || new Set<string>();
            if (Object.keys(rule.action).some(key => fields.has(key))) this.log(rule.name,'skipped','Conflito com outra regra neste ciclo; prioridade pelo identificador da regra.',d.mac,rule.id);
            else { Object.keys(rule.action).forEach(key => fields.add(key)); claimed.set(d.mac,fields); await this.send({ kind:'device', id:d.mac },rule.action,false,rule); }
          }
          else if (outcome !== 'none') this.log(rule.name,'skipped',({ missed:'Horário perdido; não executado retroativamente.', offline:'Sem leitura atual do aparelho.', protected:'Controle externo: automações pausadas.', paused:'Pausa manual ativa.', cooldown:'Intervalo mínimo entre execuções.', conditions:'Condições não atendidas.' } as Record<string,string>)[outcome],d.mac,rule.id,{origin:'automation',reason:outcome==='protected'?'external-protection':outcome});
        }
      }
      this.previousTick = now;
      this.discontinuity = false;
      if (now-this.lastCursorWrite>=10000) {this.store.put('cursor','cursor',now);this.lastCursorWrite=now;}
    } finally { this.ticking = false; }
  }
  suspend() {
    this.discontinuity = true;this.recorder.break();
    for (const d of this.devices) { d.online = false; d.lastSeen = undefined; d.poweredSince = undefined; }
    for (const runtime of this.runtimes.values()) { runtime.previous = undefined; runtime.seen = undefined; runtime.latched = false; }
    this.changed();
  }
  stop() { this.stopped = true;this.recorder.break(); }
  async shutdown() {
    this.stop();
    await Promise.allSettled([...this.queues.values()]);
    while (this.ticking || this.polling) await new Promise(resolve => setTimeout(resolve,20));
    this.store.put('cursor','cursor',this.previousTick);
  }
}
