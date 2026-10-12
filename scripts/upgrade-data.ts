import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { Storage } from '../src/main/storage';
import type { History } from '../src/shared/types';
const output=path.resolve(process.argv[3] || '.cache/upgrade-010-020');
const store=await Storage.open(path.join(output,'profile'),path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'));
const digest=()=>createHash('sha256').update(JSON.stringify(store.all<{mac:string;key:string}>('key').sort((a,b)=>a.mac.localeCompare(b.mac)))).digest('hex');
try {
  if(process.argv[2]==='seed'){
    const settings={theme:'light',startup:false,pollSeconds:20};
    const history:History={id:'upgrade-history',name:'Dados de QA da versão anterior',at:Date.now(),status:'skipped',message:'Registro de teste para verificar preservação; nenhum comando físico enviado.'};
    store.put('settings','settings',settings);store.put('history',history.id,history);
    const expected=JSON.parse(readFileSync(path.join(output,'expected.json'),'utf8'));expected.settings=settings;expected.history=[history];
    writeFileSync(path.join(output,'expected.json'),JSON.stringify(expected,null,2));writeFileSync(path.join(output,'key-digest.txt'),digest());
    console.log('Preferências e histórico de QA preparados no banco criado pela versão anterior.');
  }else{
    const unchanged=digest()===readFileSync(path.join(output,'key-digest.txt'),'utf8');
    console.log(JSON.stringify({protectedRecordsUnchanged:unchanged,protectedRecords:store.all('key').length,note:unchanged?'Registros protegidos idênticos.':'Registros protegidos diferem após reconexão; preservação byte a byte não comprovada.'}));
  }
}finally{store.close();}
