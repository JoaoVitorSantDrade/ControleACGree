import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
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

test('banco zerado recupera backup válido e preserva arquivo danificado',async()=>{
 const dir=await mkdtemp(path.resolve('.cache/gree-recovery-')),wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
 try {
  let store=await Storage.open(dir,wasm);store.put('device','mac',{name:'Quarto'});store.close();
  const file=path.join(dir,'gree.sqlite');await writeFile(file,Buffer.alloc(8192));
  store=await Storage.open(dir,wasm);assert.deepEqual(store.all('device'),[{name:'Quarto'}]);store.close();
  const damaged=(await readdir(dir)).find(f=>f.includes('.damaged-'))!;assert.deepEqual(await readFile(path.join(dir,damaged)),Buffer.alloc(8192));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('sem backup corrupção é informada sem apagar os dados',async()=>{
 const dir=await mkdtemp(path.resolve('.cache/gree-corrupt-')),file=path.join(dir,'gree.sqlite');
 try {await writeFile(file,Buffer.alloc(4096));await assert.rejects(Storage.open(dir,path.resolve('node_modules/sql.js/dist/sql-wasm.wasm')),/danificado/);assert.deepEqual(await readFile(file),Buffer.alloc(4096));}
 finally{await rm(dir,{recursive:true,force:true});}
});
