import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enqueueToast,advanceToasts,type Toast} from '../src/shared/notifications';
test('toasts agrupam repetições e mantêm até três notificações',()=>{
  let items:Toast[]=[];items=enqueueToast(items,1,'Salvo','success');items=enqueueToast(items,2,'Salvo','success');assert.equal(items.length,1);assert.equal(items[0].count,2);
  for(let id=3;id<7;id++)items=enqueueToast(items,id,`Erro ${id}`,'error');assert.equal(items.length,3);assert.deepEqual(items.map(t=>t.text),['Erro 4','Erro 5','Erro 6']);
});
test('pausa de hover/foco conserva tempo restante e retoma sem reiniciar',()=>{
  let items=advanceToasts(enqueueToast([],1,'Salvo','success'),1000);assert.equal(items[0].remaining,3000);
  items[0].hover=true;items=advanceToasts(items,10000);assert.equal(items[0].remaining,3000);items[0].hover=false;items[0].focus=true;items=advanceToasts(items,10000);assert.equal(items[0].remaining,3000);
  items[0].focus=false;items=advanceToasts(items,3000);assert.equal(items[0].leaving,true);assert.equal(advanceToasts(items,160).length,0);
});
test('parcial e erro expiram em seis e oito segundos com saída completa',()=>{
  let items=enqueueToast(enqueueToast([],1,'Parcial','partial'),2,'Erro','error');items=advanceToasts(items,6000);assert.equal(items[0].leaving,true);assert.equal(items[1].remaining,2000);
  items=advanceToasts(items,160);assert.equal(items.length,1);items=advanceToasts(items,1840);assert.equal(items[0].leaving,true);assert.equal(advanceToasts(items,160).length,0);
});
