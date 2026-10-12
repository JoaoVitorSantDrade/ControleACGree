import { test } from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { once } from 'node:events';
import { bind, command, readStatus, decode, discover, envelope, encrypt } from '../src/main/protocol.mjs';

async function simulator(mode='ECB') {
  const socket=dgram.createSocket('udp4');socket.bind(0,'127.0.0.1');await once(socket,'listening');
  const address=socket.address();const mac='aabbccddeeff',key='1234567890123456';let state:Record<string,number>={Pow:0,SetTem:24,TemSen:68};
  socket.on('message',(packet,peer)=>{
    try {
      const outer=JSON.parse(packet.toString());
      if (outer.t==='scan') { socket.send(envelope(mac,{t:'dev',mac,name:'Simulado',ver:'test'},undefined,mode),peer.port,peer.address);return; }
      if (mode==='GCM' && !outer.tag) return;
      let data;
      try { data=decode(packet,mode==='GCM'?'{yxAHAY_Lm6pbC/<':'a3K8Bx%2r8Y7#xDh'); } catch { data=decode(packet,key); }
      let response;
      if(data.t==='bind') response={t:'bindok',mac,key,r:200};
      else if(data.t==='status') response={t:'dat',mac,r:200,cols:Object.keys(state),dat:Object.values(state)};
      else { state={...state,...Object.fromEntries(data.opt.map((col:string,i:number)=>[col,data.p[i]]))};response={t:'res',mac,r:200,opt:data.opt,p:data.p}; }
      socket.send(envelope(mac,response,data.t==='bind'?(mode==='GCM'?'{yxAHAY_Lm6pbC/<':'a3K8Bx%2r8Y7#xDh'):key,mode),peer.port,peer.address);
    } catch { /* intentional drop */ }
  });
  return { socket,port:address.port,device:{mac,ip:'127.0.0.1',encryption:undefined as string|undefined},key };
}
for(const mode of ['ECB','GCM']) test(`vinculação, leitura e confirmação ${mode}`,async()=>{
  const s=await simulator(mode);
  try { const options={port:s.port,timeout:100};const key=await bind(s.device,options);assert.equal(key,s.key);assert.equal((await readStatus(s.device,key,options)).Pow,0);assert.equal((await command(s.device,key,{SetTem:25},options)).SetTem,25); }
  finally { s.socket.close(); }
});
for (const mode of ['ECB','GCM']) test(`descoberta com resposta ${mode}`,async()=>{
  const s=await simulator(mode);
  try { const result=await discover({addresses:['127.0.0.1'],port:s.port,timeout:100});assert.equal(result.devices.length,1);assert.equal(result.devices[0].mac,s.device.mac); }
  finally { s.socket.close(); }
});
test('criptografia rejeita pacote adulterado e JSON inválido',()=>{
  assert.deepEqual(decode(Buffer.from(JSON.stringify({pack:encrypt({t:'dev'})}))),{t:'dev'});
  assert.throws(()=>decode(Buffer.from('invalid')));
  const packet=JSON.parse(envelope('mac',{t:'dat'},'1234567890123456','GCM').toString());packet.tag=Buffer.alloc(16).toString('base64');
  assert.throws(()=>decode(Buffer.from(JSON.stringify(packet)),'1234567890123456'));
});
test('timeout termina requisição sem resposta',async()=>{
  const s=await simulator();
  try { await assert.rejects(()=>readStatus(s.device,'xxxxxxxxxxxxxxxx',{port:s.port,timeout:30}),/Sem resposta/); }
  finally { s.socket.close(); }
});
