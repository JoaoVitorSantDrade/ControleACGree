import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '../src/main/storage';
import { Controller } from '../src/main/controller';
import type { Rule, DeviceChange } from '../src/shared/types';
const protector = { isEncryptionAvailable:()=>true,encryptString:(v:string)=>Buffer.from(`protected:${v}`),decryptString:(v:Buffer)=>v.toString().slice(10) };
async function fixture(events: DeviceChange[] = []) {
  await mkdir('.cache',{recursive:true}); const dir=await mkdtemp(path.resolve('.cache/controller-'));
  const store=await Storage.open(dir,path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'));
  let network=[{mac:'aabbccddeeff',ip:'127.0.0.1',name:'Gree'},{mac:'001122334455',ip:'127.0.0.2',name:'Gree'}];
  let inFlight=0,maxInFlight=0,failSecond=false;
  const transport = {
    discover:async()=>({devices:network,errors:[],targets:[]}),
    bind:async()=> '1234567890123456',
    readStatus:async()=>({Pow:1,SetTem:24,TemSen:69,Mod:1,WdSpd:0}),
    command:async(d:{mac:string},_key:string,p:Record<string,number>)=>{
      inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);await new Promise(resolve=>setTimeout(resolve,15));inFlight--;
      if(failSecond && d.mac==='001122334455') throw new Error('simulated timeout');
      return {Pow:1,SetTem:24,TemSen:69,Mod:1,WdSpd:0,...p};
    }
  };
  const controller=new Controller(store,()=>{},protector,transport as any,event=>events.push(event));
  await controller.tick();await controller.discover();
  return {controller,store,setNetwork:(v:typeof network)=>{network=v;},setFailure:()=>{failSecond=true;},max:()=>maxInFlight,close:async()=>{controller.stop();store.close();await rm(dir,{recursive:true,force:true});}};
}
test('troca de IP preserva identidade, nome e grupo; proteção de chave',async()=>{
  const f=await fixture();try {
    const d=f.controller.devices[0];f.controller.saveDevice(d.mac,{name:'Quarto',room:'Casa',features:[]});
    f.controller.saveGroup({id:'g',name:'Casa',members:[d.mac]});
    f.setNetwork([{mac:d.mac,ip:'127.0.0.3',name:'Gree'}]);await f.controller.discover();
    assert.equal(f.controller.devices.length,2);assert.equal(d.ip,'127.0.0.3');assert.equal(d.name,'Quarto');assert.equal(f.controller.groups[0].members[0],d.mac);
    const keys=f.store.all<{key:string}>('key');assert.ok(keys.length);assert.notEqual(keys[0].key,'1234567890123456');
  } finally {await f.close();}
});
test('mudanças confirmadas têm origem, não repetem no polling nem animam leitura inicial',async()=>{
  const events:DeviceChange[]=[];const f=await fixture(events);try{
    assert.equal(events.length,0);const target={kind:'device' as const,id:f.controller.devices[0].mac};
    await f.controller.send(target,{SetTem:25});assert.equal(events.length,1);assert.equal(events[0].origin,'manual');assert.deepEqual(events[0].fields,['SetTem']);
    // Fake readStatus returns 24: this is an actual external change, not an echo.
    await f.controller.poll();assert.equal(events[1].origin,'network');assert.deepEqual(events[1].fields,['SetTem']);await f.controller.poll();assert.equal(events.length,2);
    f.controller.resume(target.id);f.controller.resumeExternalOverride(target.id);await f.controller.send(target,{SetTem:26},false);assert.equal(events[2].origin,'automation');
    f.controller.suspend();await f.controller.poll();assert.equal(events.length,3);
  }finally{await f.close();}
});
test('fila serializa comandos no mesmo aparelho e pausa automações',async()=>{
  const f=await fixture();try {const target={kind:'device' as const,id:f.controller.devices[0].mac};
    await Promise.all([f.controller.send(target,{SetTem:25}),f.controller.send(target,{SetTem:26})]);
    assert.equal(f.max(),1);assert.equal(f.controller.devices[0].state.SetTem,26);assert.ok(f.controller.devices[0].pausedUntil!>Date.now());
    f.controller.resume(target.id);assert.equal(f.controller.devices[0].pausedUntil,undefined);
  } finally {await f.close();}
});
test('grupo apresenta sucesso e falha individualmente',async()=>{
  const f=await fixture();try {f.controller.saveGroup({id:'g',name:'Casa',members:f.controller.devices.map(d=>d.mac)});f.setFailure();
    const results=await f.controller.send({kind:'group',id:'g'},{SetTem:25});assert.deepEqual(results.map(r=>r.ok),[true,false]);
    assert.deepEqual(f.controller.snapshot().history.map(h=>h.status).sort(),['failure','success']);
  } finally {await f.close();}
});
test('regras conflitantes têm prioridade determinística; reinício não repete agenda',async()=>{
  const f=await fixture();try {
    const now=Date.now(),date=new Date(now),time=`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const base:Rule={id:'a',name:'Primeira',enabled:true,target:{kind:'device',id:f.controller.devices[0].mac},trigger:{kind:'schedule',days:[date.getDay()],time},conditions:[],match:'all',action:{SetTem:25},cooldownMinutes:5};
    f.controller.saveRule(base);f.controller.saveRule({...base,id:'b',name:'Segunda',action:{SetTem:26}});await f.controller.tick(now);
    assert.equal(f.controller.devices[0].state.SetTem,25);assert.ok(f.controller.snapshot().history.some(h=>h.message.includes('Conflito')));
    const restarted=new Controller(f.store,()=>{},protector);await restarted.tick(now+1000);assert.equal(restarted.snapshot().history.length,f.controller.snapshot().history.length);
  } finally {await f.close();}
});
test('suspensão invalida leituras e tempo ligado',async()=>{
  const f=await fixture();try {f.controller.suspend();assert.ok(f.controller.devices.every(d=>!d.online && d.poweredSince===undefined && d.lastSeen===undefined));}
  finally {await f.close();}
});
test('suspensão curta não executa temporizador retroativamente',async()=>{
  const f=await fixture();try {
    const now=Date.now();
    f.controller.saveRule({id:'short',name:'Timer',enabled:true,target:{kind:'device',id:f.controller.devices[0].mac},trigger:{kind:'timer',at:now+1000},conditions:[],match:'all',action:{Pow:0},cooldownMinutes:5});
    f.controller.suspend();await f.controller.tick(now+2000);
    assert.equal(f.controller.devices[0].state.Pow,1);
    assert.ok(f.controller.snapshot().history.some(h=>h.status==='skipped' && h.message.includes('Horário perdido')));
  } finally {await f.close();}
});
