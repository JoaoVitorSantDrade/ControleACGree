import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '../src/main/storage';
import { Controller } from '../src/main/controller';
import { ComfortRecorder,localDate,maintenanceDue,nextSchedule } from '../src/main/comfort';
import { evaluate } from '../src/main/automation';
import type { Device,Patch,Rule } from '../src/shared/types';
const protector={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};
async function fixture(){
  await mkdir('.cache',{recursive:true});const dir=await mkdtemp(path.resolve('.cache/v030-'));const store=await Storage.open(dir,path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'));
  const states:Record<string,Patch>={a:{Pow:1,Mod:1,SetTem:24,WdSpd:0,TemSen:66},b:{Pow:1,Mod:1,SetTem:24,WdSpd:0,TemSen:67}};
  const sent:{mac:string;patch:Patch}[]=[];
  const transport={discover:async()=>({devices:[{mac:'a',ip:'127.0.0.1'},{mac:'b',ip:'127.0.0.2'}],errors:[],targets:[]}),bind:async()=> 'key',readStatus:async(d:Device)=>({...states[d.mac]}),command:async(d:Device,_k:string,p:Patch)=>{sent.push({mac:d.mac,patch:p});Object.assign(states[d.mac],p);return {...states[d.mac]};}};
  const create=()=>new Controller(store,()=>{},protector,transport as any);const controller=create();await controller.tick();await controller.discover();
  return {store,states,sent,controller,transport,create,close:async()=>{controller.stop();store.close();await rm(dir,{recursive:true,force:true});}};
}
test('desligamento externo bloqueia religamento, grupo parcial e persiste após reinício',async()=>{
  const f=await fixture();try{f.controller.saveGroup({id:'g',name:'Casa',members:['a','b']});f.states.a.Pow=0;await f.controller.poll();assert.ok(f.controller.devices[0].externalOverride);
    const results=await f.controller.send({kind:'group',id:'g'},{Pow:1},false);assert.deepEqual(results.map(r=>r.ok),[false,true]);assert.equal(f.states.a.Pow,0);assert.equal(f.sent.length,1);
    const restarted=f.create();assert.ok(restarted.devices[0].externalOverride);await restarted.tick();await restarted.poll();await restarted.send({kind:'device',id:'a'},{Pow:1},false);assert.equal(f.states.a.Pow,0);restarted.stop();
  }finally{await f.close();}
});
test('sensor e leituras repetidas não protegem; comandos próprios não protegem',async()=>{
  const f=await fixture();try{f.states.a.TemSen=68;await f.controller.poll();await f.controller.poll();assert.equal(f.controller.devices[0].externalOverride,undefined);await f.controller.send({kind:'device',id:'a'},{SetTem:23});await f.controller.poll();assert.equal(f.controller.devices[0].externalOverride,undefined);
  }finally{await f.close();}
});
test('preflight detecta mudança antes do poll e comandos manuais não removem proteção',async()=>{
  const f=await fixture();try{f.states.a.SetTem=27;const r=await f.controller.send({kind:'device',id:'a'},{SetTem:22},false);assert.equal(r[0].ok,false);assert.equal(f.sent.length,0);assert.equal(f.states.a.SetTem,27);
    await f.controller.send({kind:'device',id:'a'},{SetTem:25});assert.ok(f.controller.devices[0].externalOverride);f.controller.resumeExternalOverride('a');assert.equal(f.controller.devices[0].externalOverride,undefined);assert.ok(f.controller.devices[0].pausedUntil!>Date.now());
  }finally{await f.close();}
});
test('diferença após reconexão protege sem inventar horário; baseline inicial não protege',async()=>{
  const f=await fixture();try{assert.equal(f.controller.devices[0].externalOverride,undefined);f.controller.suspend();f.states.a.Mod=3;await f.controller.poll();assert.deepEqual(f.controller.snapshot().devices[0].externalOverride?.fields,['Mod']);const count=f.controller.snapshot().history.filter(h=>h.origin==='external').length;await f.controller.poll();assert.equal(f.controller.snapshot().history.filter(h=>h.origin==='external').length,count);
  }finally{await f.close();}
});
test('retomar temperatura e agenda não provoca execução retroativa',async()=>{
  const f=await fixture();try{const now=Date.now(),d=f.controller.devices[0],date=new Date(now),time=`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    const base={enabled:true,target:{kind:'device' as const,id:'a'},match:'all' as const,conditions:[],action:{Pow:1},cooldownMinutes:5};
    f.controller.saveRule({...base,id:'temperature',name:'Temperatura',trigger:{kind:'temperature',op:'gt',value:20,hysteresis:1}});f.controller.saveRule({...base,id:'schedule',name:'Agenda',trigger:{kind:'schedule',days:[date.getDay()],time}});
    f.states.a.Pow=0;await f.controller.poll();f.controller.resumeExternalOverride('a');await f.controller.tick(now+10);assert.equal(f.sent.length,0);await f.controller.poll();await f.controller.tick(now+20);assert.equal(f.sent.length,0);
  }finally{await f.close();}
});
test('amostras por minuto, intervalos contínuos, lacunas e retenção de 30 dias',async()=>{
  const f=await fixture();try{const recorder=new ComfortRecorder(f.store);const t=new Date('2026-10-12T10:00:00').getTime();const d:Device={mac:'c',ip:'127.0.0.3',name:'Teste',room:'',features:[],online:true,state:{Pow:1,TemSen:66,SetTem:24}};
    recorder.observe(d,t,35000);recorder.observe(d,t+15000,35000);recorder.observe(d,t+30000,35000);assert.equal(recorder.query('c',1,t+30000).samples.length,1);assert.equal(recorder.query('c',1,t+30000).summary.observedToday,30000);
    recorder.break('c');recorder.observe(d,t+60000,35000);recorder.observe(d,t+75000,35000);const data=recorder.query('c',1,t+75000);assert.equal(data.summary.observedToday,45000);assert.notEqual(data.samples[0].segment,data.samples[1].segment);
    d.state.TemSen=999;recorder.observe(d,t+120000,35000);assert.equal(recorder.query('c',1,t+120000).samples.length,2);recorder.break();d.state.TemSen=66;recorder.observe(d,t+31*86400000,35000);assert.equal(f.store.all<{mac:string}>('sample').filter(s=>s.mac==='c').length,1);
  }finally{await f.close();}
});
test('calendário de manutenção: desativado, vencimento, adiamento e conclusão',async()=>{
  const f=await fixture();try{const today=localDate();f.controller.saveMaintenance('a',{enabled:false,lastDate:'2026-01-01',intervalDays:30});assert.equal(maintenanceDue(f.controller.devices[0].maintenance),false);f.controller.saveMaintenance('a',{enabled:true,lastDate:'2026-01-01',intervalDays:30});assert.equal(maintenanceDue(f.controller.devices[0].maintenance),true);f.controller.maintenanceAction('a','snooze');assert.equal(maintenanceDue(f.controller.devices[0].maintenance),false);assert.equal(f.controller.devices[0].maintenance?.lastDate,'2026-01-01');f.controller.maintenanceAction('a','done');assert.equal(f.controller.devices[0].maintenance?.lastDate,today);assert.equal(f.controller.devices[0].maintenance?.snoozedUntil,undefined);assert.throws(()=>f.controller.saveMaintenance('a',{enabled:true,lastDate:'2026-02-31',intervalDays:30}));
  }finally{await f.close();}
});
test('favoritos e consulta de conforto validam destinos e período',async()=>{
  const f=await fixture();try{f.controller.favorite({kind:'device',id:'a'},true);assert.equal(f.create().devices[0].favorite,true);assert.throws(()=>f.controller.comfort('a',999 as 1));assert.throws(()=>f.controller.comfort('unknown',1));assert.throws(()=>f.controller.favorite({kind:'device',id:'unknown'},true));assert.equal(f.controller.comfort('a',1).samples.length,1);
  }finally{await f.close();}
});

test('preflight revalida condições sem confundir sensor com intervenção',async()=>{
  const f=await fixture();try{f.states.a.TemSen=70;const rule:Rule={id:'r',name:'Condição',enabled:true,target:{kind:'device',id:'a'},trigger:{kind:'temperature',op:'gt',value:20,hysteresis:1},match:'all',conditions:[{field:'ambient',op:'lt',value:25}],action:{Pow:1},cooldownMinutes:5};const result=await f.controller.send(rule.target,rule.action,false,rule);assert.equal(result[0].ok,false);assert.equal(f.sent.length,0);assert.equal(f.controller.devices[0].externalOverride,undefined);
  }finally{await f.close();}
});
test('comando automático enfileirado observa intervenção antes de enviar',async()=>{
  const f=await fixture();try{let release!:()=>void;const gate=new Promise<void>(r=>release=r);const original=f.transport.command;f.transport.command=async(d,k,p)=>{await gate;return original(d,k,p);};
    const manual=f.controller.send({kind:'device',id:'a'},{SetTem:23});await new Promise(r=>setTimeout(r,5));f.controller.resume('a');const automatic=f.controller.send({kind:'device',id:'a'},{Pow:1},false);
    const read=f.transport.readStatus;f.transport.readStatus=async d=>{if(d.mac==='a')f.states.a.Pow=0;return read(d);};release();await manual;const result=await automatic;assert.equal(result[0].ok,false);assert.equal(f.sent.length,1);assert.equal(f.states.a.Pow,0);
  }finally{await f.close();}
});
test('modo, ventilação e recurso confirmado acionam proteção',async()=>{
  const f=await fixture();try{f.states.a.Quiet=0;await f.controller.poll();f.controller.saveDevice('a',{name:'Quarto',room:'',features:['Quiet']});await f.controller.poll();f.states.a.Quiet=1;f.states.a.WdSpd=3;f.states.a.Mod=3;await f.controller.poll();assert.deepEqual(f.controller.devices[0].externalOverride?.fields,['Mod','WdSpd','Quiet']);
  }finally{await f.close();}
});
test('intervalos sobrepostos por relógio não duplicam tempo; meia-noite usa dia local',async()=>{
  const f=await fixture();try{const recorder=new ComfortRecorder(f.store);const now=new Date(2026,9,12,0,2,0).getTime();f.store.put('observed','one',{mac:'z',start:now-180000,end:now,on:true});f.store.put('observed','two',{mac:'z',start:now-60000,end:now,on:true});const summary=recorder.summary('z',now-3600000,now);assert.equal(summary.observedToday,120000);assert.equal(summary.observedWeek,180000);assert.equal(summary.unobservedToday,0);
  }finally{await f.close();}
});
test('próxima agenda considera grupos e não inventa hora para sensor',()=>{
  const now=new Date(2026,9,12,10,0,0).getTime();const base={id:'r',name:'Agenda',enabled:true,target:{kind:'group' as const,id:'g'},match:'all' as const,conditions:[],action:{Pow:1},cooldownMinutes:5};const rules:Rule[]=[{...base,trigger:{kind:'schedule',days:[1],time:'11:00'}},{...base,id:'t',trigger:{kind:'temperature',op:'gt',value:25,hysteresis:1}}];assert.equal(nextSchedule(rules,'a',[{id:'g',members:['a']}],now)?.at,now+3600000);assert.equal(nextSchedule(rules,'b',[{id:'g',members:['a']}],now),undefined);
});

test('retenção também recorta o início de intervalos ainda ativos',async()=>{
  const f=await fixture();try{const recorder=new ComfortRecorder(f.store),now=Date.now();f.store.put('observed','long',{mac:'z',start:now-40*86400000,end:now,on:true});recorder.observe({mac:'z',ip:'127.0.0.3',name:'Z',room:'',features:[],online:true,state:{Pow:1,TemSen:66}},now,35000);assert.equal(f.store.all<{mac:string;start:number}>('observed').find(i=>i.mac==='z')?.start,now-30*86400000);
  }finally{await f.close();}
});
