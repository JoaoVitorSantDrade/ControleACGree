import test from 'node:test';
import assert from 'node:assert/strict';
import { temperatureBitmap } from '../src/main/trayTemperature';
test('tray temperature bitmap is stable, bounded and distinguishes readings',()=>{
  for(const temperature of [-20,0,9,25,60]) {
    const bitmap=temperatureBitmap(temperature);
    assert.equal(bitmap.length,32*32*4);
    assert.equal(bitmap[3],0);
    assert.ok(bitmap.some((v,i)=>i%4===3 && v===255));
  }
  assert.deepEqual(temperatureBitmap(25),temperatureBitmap(25));
  assert.notDeepEqual(temperatureBitmap(25),temperatureBitmap(26));
});
