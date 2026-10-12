import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, ambient, matches, type Runtime } from '../src/main/automation';
import { rule as validateRule, patch } from '../src/main/validation';
import type { Device, Rule } from '../src/shared/types';
const now = new Date(2026,9,12,22,0,1).getTime();
const device = ():Device => ({ mac:'test',ip:'127.0.0.1',name:'Teste',room:'',features:[],online:true,lastSeen:now,state:{ Pow:1,SetTem:24,TemSen:69 },poweredSince:now-3600000 });
const rule = ():Rule => ({ id:'r',name:'Regra',enabled:true,target:{kind:'device',id:'test'},trigger:{kind:'schedule',days:[new Date(now).getDay()],time:'22:00'},conditions:[],match:'all',action:{Pow:0},cooldownMinutes:5 });
test('agenda dispara uma vez por minuto e por aparelho',() => {
  const r=rule(),d=device(),rt:Runtime={};
  assert.equal(evaluate(r,d,rt,now,now-1000,35000),'fire');
  assert.equal(evaluate(r,d,rt,now+1000,now,35000),'none');
  assert.equal(evaluate(r,d,{},now,now-1000,35000),'fire');
});
test('agenda perdida na suspensão não executa',() => assert.equal(evaluate(rule(),device(),{},now,now-3600000,35000),'missed'));
test('temporizador não executa retroativamente após reiniciar',() => {
  const r={...rule(),trigger:{kind:'timer' as const,at:now-120000}};
  const rt:Runtime={}; assert.equal(evaluate(r,device(),rt,now,now-1000,35000),'missed');
  assert.equal(evaluate(r,device(),rt,now+1000,now,35000),'none');
});
test('histerese rearma somente após sair da faixa',() => {
  const r={...rule(),trigger:{kind:'temperature' as const,op:'gt' as const,value:28,hysteresis:1}},d=device(),rt:Runtime={};
  assert.equal(evaluate(r,d,rt,now,now-1000,35000),'fire');
  d.lastSeen=now+1000; d.state.TemSen=68;
  assert.equal(evaluate(r,d,rt,now+1000,now,35000),'none');
  d.lastSeen=now+2000; d.state.TemSen=67;
  assert.equal(evaluate(r,d,rt,now+2000,now+1000,35000),'none');
  d.lastSeen=now+301000; d.state.TemSen=69;
  assert.equal(evaluate(r,d,rt,now+301000,now+300000,35000),'fire');
});
test('sem sensor não substitui medição pela temperatura definida',() => {
  const d=device();delete d.state.TemSen;assert.equal(ambient(d),undefined);
  assert.equal(matches(d,[{field:'ambient',op:'gt',value:20}],'all',now),false);
});
test('pausa manual, cooldown e offline impedem ações',() => {
  const d=device();d.pausedUntil=now+900000;
  assert.equal(evaluate(rule(),d,{},now,now-1000,35000),'paused');
  d.pausedUntil=undefined;
  assert.equal(evaluate(rule(),d,{last:now-1000},now,now-1000,35000),'cooldown');
  d.online=false;assert.equal(evaluate(rule(),d,{},now,now-1000,35000),'offline');
});
test('estado inicial e reconexão não são transições',() => {
  const r={...rule(),trigger:{kind:'state' as const,field:'Pow' as const,value:1}}, d=device(),rt:Runtime={};
  assert.equal(evaluate(r,d,rt,now,now-1000,35000),'none');
  d.state.Pow=0;d.lastSeen=now+1000;evaluate(r,d,rt,now+1000,now,35000);
  d.state.Pow=1;d.lastSeen=now+2000;assert.equal(evaluate(r,d,rt,now+2000,now+1000,35000),'fire');
  d.online=false;evaluate(r,d,rt,now+3000,now+2000,35000);
  d.online=true;d.lastSeen=now+4000;assert.equal(evaluate(r,d,rt,now+4000,now+3000,35000),'none');
});
test('tempo ligado dispara uma vez e não infere duração desconectada',() => {
  const r={...rule(),trigger:{kind:'duration' as const,minutes:60}},d=device(),rt:Runtime={};
  assert.equal(evaluate(r,d,rt,now,now-1000,35000),'fire');
  d.lastSeen=now+1000;assert.equal(evaluate(r,d,rt,now+1000,now,35000),'none');
  d.poweredSince=undefined;d.lastSeen=now+2000;assert.equal(evaluate(r,d,rt,now+2000,now+1000,35000),'none');
});
test('condições todas ou qualquer respeitam valores indisponíveis',() => {
  const cs=[{field:'Pow' as const,op:'eq' as const,value:0},{field:'ambient' as const,op:'gt' as const,value:28}];
  assert.equal(matches(device(),cs,'all',now),false);assert.equal(matches(device(),cs,'any',now),true);
});
test('validação rejeita comandos fora da faixa e regras inválidas',() => {
  assert.throws(()=>patch({SetTem:99}));assert.throws(()=>patch({key:1}));assert.throws(()=>validateRule({...rule(),trigger:{kind:'schedule',days:[],time:'22:00'}}));
  assert.doesNotThrow(()=>validateRule(rule()));
});
