import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambientReading, ambientSummary, pointerTemperature, sliderCenter, toastDuration } from '../src/shared/ux';
import { FlyoutLifecycle } from '../src/main/flyoutLifecycle';
import { flyoutBounds } from '../src/shared/flyoutBounds';
import type { Device } from '../src/shared/types';
const device=(raw?:number):Device=>({mac:'a',ip:'127.0.0.1',name:'Quarto',room:'',features:[],online:true,lastSeen:1000,state:{SetTem:22,...(raw===undefined?{}:{TemSen:raw})}});
test('sensor ausente nunca usa a temperatura definida; vencimento no limite configurado',()=>{
  assert.equal(ambientReading(device(),1000,15).label,'Indisponível');
  assert.equal(ambientReading(device(66),36000,15).label,'26 °C');
  assert.equal(ambientReading(device(66),36001,15).label,'Sem leitura atual');
  assert.equal(ambientReading({...device(66),online:false},1000,15).fresh,false);
  assert.equal(ambientReading(device(200),1000,15).label,'Indisponível');
});
test('grupo apresenta faixa real e conta somente leituras válidas e atuais',()=>{
  const result=ambientSummary([device(64),{...device(67),mac:'b'}, {...device(69),mac:'c',lastSeen:0}],35500,15);
  assert.equal(result.label,'24–27 °C');assert.equal(result.count,2);assert.equal(result.readings[2].value,29);assert.equal(result.readings[2].fresh,false);
});
test('slider compartilha centro do preenchimento e bola nos extremos e meio',()=>{
  assert.equal(sliderCenter(16),'calc(0% + 19px)');assert.equal(sliderCenter(30),'calc(100% + -19px)');assert.equal(sliderCenter(23),'calc(50% + 0px)');
  assert.equal(pointerTemperature(0,0,240),16);assert.equal(pointerTemperature(240,0,240),30);assert.equal(pointerTemperature(120,0,240),23);
  assert.ok(pointerTemperature(121,0,240)>23 && pointerTemperature(121,0,240)<24);
});
test('fechamento espera confirmação e identificador antigo não encerra reabertura',()=>{
  const events:unknown[]= [];let hides=0;const life=new FlyoutLifecycle(t=>events.push(t),()=>hides++);
  const first=life.transition(true);life.complete(first.id);const closing=life.transition(false);assert.equal(hides,0);
  const reversed=life.transition(true);life.complete(closing.id);assert.equal(hides,0);assert.equal(life.state.phase,'opening');
  life.complete(reversed.id);assert.equal(life.state.phase,'open');const last=life.transition(false);life.complete(last.id);assert.equal(hides,1);assert.equal(life.state.phase,'hidden');life.dispose();
});
test('janela fecha em até 300 ms quando o renderer não confirma',async()=>{
  let hidden=false;const life=new FlyoutLifecycle(()=>{},()=>hidden=true);life.transition(false);await new Promise(r=>setTimeout(r,325));assert.equal(hidden,true);life.dispose();
});
test('durações de toast respeitam sucesso, parcial e erro',()=>assert.deepEqual(toastDuration,{success:4000,partial:6000,error:8000,info:6000}));
test('bandeja permanece na área útil de dois monitores e escalas diferentes',()=>{
  for(const scale of [1,1.25,1.5,2])for(const area of [{x:0,y:0,width:1920/scale,height:1040/scale},{x:-1920/scale,y:-80,width:1920/scale,height:1040/scale}])for(const point of [{x:area.x,y:area.y},{x:area.x+area.width,y:area.y+area.height}]){
    const bounds=flyoutBounds(area,point);assert.ok(bounds.x>=area.x && bounds.y>=area.y);assert.ok(bounds.x+bounds.width<=area.x+area.width && bounds.y+bounds.height<=area.y+area.height);
  }
});
