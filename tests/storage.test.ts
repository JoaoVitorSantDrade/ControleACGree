import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Storage } from '../src/main/storage';
test('SQLite persiste e reabre nomes, grupos e regras',async()=>{
  await mkdir('.cache',{recursive:true});
  const dir=await mkdtemp(path.resolve('.cache/gree-test-')),wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
  try { let store=await Storage.open(dir,wasm);store.put('device','mac',{name:'Quarto',ip:'192.168.0.1'});store.put('group','g',{members:['mac']});store.put('rule','r',{enabled:true});store.close();
    store=await Storage.open(dir,wasm);assert.deepEqual(store.all('device'),[{name:'Quarto',ip:'192.168.0.1'}]);assert.equal(store.all('group').length,1);assert.equal(store.all('rule').length,1);store.remove('rule','r');assert.equal(store.all('rule').length,0);store.close();
  } finally { await rm(dir,{recursive:true,force:true}); }
});
