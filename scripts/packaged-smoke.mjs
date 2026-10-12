import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync,writeFileSync,createWriteStream,existsSync,readFileSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
const executable=path.resolve(process.argv[2] || 'release/win-unpacked/Gree Desktop.exe');
const output=path.resolve(process.argv[3] || '.cache/packaged-qa'),profile=path.join(output,'profile');mkdirSync(profile,{recursive:true});
const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
const inspectorServer=net.createServer();await new Promise(resolve=>inspectorServer.listen(0,'127.0.0.1',resolve));const inspectorPort=inspectorServer.address().port;await new Promise(resolve=>inspectorServer.close(resolve));
const child=spawn(executable,[`--inspect=127.0.0.1:${inspectorPort}`,'--background','--qa-dashboard','--qa-offscreen',`--qa-profile=${profile}`,`--remote-debugging-port=${port}`],{windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(createWriteStream(path.join(output,'stdout.log')));child.stderr.pipe(createWriteStream(path.join(output,'stderr.log')));
let socket, evaluate, originalSettings;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  let page;const deadline=Date.now()+40000;
  while(Date.now()<deadline){try{const pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();page=pages.find(p=>p.type==='page');if(page)break;}catch{}await wait(200);}
  if(!page)throw new Error('Aplicativo empacotado não abriu o renderer');
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let serial=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const resolve=pending.get(message.id);pending.delete(message.id);resolve?.(message);}});
  evaluate=async(expression)=>{const id=++serial;const promise=new Promise(resolve=>pending.set(id,resolve));socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));const result=await promise;if(result.error || result.result.exceptionDetails)throw new Error(JSON.stringify(result));return result.result.result.value;};
  let state;
  while(Date.now()<deadline){try{state=await evaluate('window.gree.snapshot()');if(state?.devices.length && !state.scanning)break;}catch{}await wait(250);}
  if(!state?.devices.every(d=>d.online) || !state.devices.length)throw new Error('Pacote não leu os aparelhos');
  if(!existsSync(path.join(profile,'gree.sqlite')))throw new Error('SQLite não foi persistido pelo pacote');
  const title=await evaluate('document.querySelector("h1").textContent');
  if(!title.includes('clima'))throw new Error('Interface não carregou');
  await evaluate('window.gree.openDashboard("rules")');await wait(100);
  if(!(await evaluate('document.querySelector("h1").textContent')).includes('rotina'))throw new Error('Navegação IPC falhou');
  const dataOnly=['seed','verify'].includes(process.argv[4]);
  if(!dataOnly){
    originalSettings=state.settings;
    await evaluate(`window.gree.settings(${JSON.stringify({...originalSettings,startup:true})})`);
    const registry=await promisify(execFile)('reg.exe',['query','HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run']);
    if(!registry.stdout.toLowerCase().includes(executable.toLowerCase()))throw new Error('Inicialização não foi registrada no Windows');
    await evaluate(`window.gree.settings(${JSON.stringify(originalSettings)})`);originalSettings=undefined;
  }
  let comfort=false;if(await evaluate('Boolean(window.gree.comfort)')){const result=await evaluate(`window.gree.comfort(${JSON.stringify(state.devices[0].mac)},1)`);if(!result.samples.length || result.samples.length>61)throw new Error('Consulta de conforto inválida');comfort=true;const mac=state.devices.at(-1).mac;await evaluate(`window.gree.openDashboard('comfort',${JSON.stringify(mac)})`);await wait(150);if((await evaluate(`document.querySelector('.comfort-page select').value`))!==`device:${mac}`)throw new Error('Acompanhamento abriu no aparelho errado');}
  let upgradeData;
  const persisted=s=>({devices:s.devices.map(d=>({mac:d.mac,name:d.name,room:d.room,features:d.features})).sort((a,b)=>a.mac.localeCompare(b.mac)),groups:s.groups,rules:s.rules,settings:s.settings,history:s.history});
  if(process.argv[4]==='seed'){
    const first=state.devices[0];
    await evaluate(`window.gree.saveDevice(${JSON.stringify(first.mac)},{name:'Quarto QA upgrade',room:'Casa QA',features:[]})`);
    await evaluate(`window.gree.saveGroup({id:'upgrade-group',name:'Grupo preservado',members:${JSON.stringify(state.devices.map(d=>d.mac))}})`);
    await evaluate(`window.gree.saveRule({id:'upgrade-rule',name:'Regra preservada',enabled:false,target:{kind:'group',id:'upgrade-group'},trigger:{kind:'schedule',days:[1,3,5],time:'23:00'},match:'all',conditions:[],action:{SetTem:24},cooldownMinutes:5})`);
    writeFileSync(path.join(output,'expected.json'),JSON.stringify(persisted(await evaluate('window.gree.snapshot()')),null,2));upgradeData='seeded';
  }
  if(process.argv[4]==='verify'){
    const expected=JSON.parse(readFileSync(path.join(output,'expected.json'),'utf8'));
    const actual=persisted(await evaluate('window.gree.snapshot()'));
    if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Dados mudaram na atualização: '+JSON.stringify(actual));
    upgradeData='preserved';
  }
  const report={at:new Date().toISOString(),executable,packagedRuntime:true,sqlite:true,comfort,startupRegistry:!dataOnly,upgradeData,devices:state.devices.map(d=>({ip:d.ip,online:d.online,encryption:d.encryption})),ui:true};
  writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} finally {
  if(originalSettings && evaluate)try{await evaluate(`window.gree.settings(${JSON.stringify(originalSettings)})`);}catch{}socket?.close();
  let inspector;try{const pages=await(await fetch(`http://127.0.0.1:${inspectorPort}/json`)).json();inspector=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{inspector.addEventListener('open',resolve,{once:true});inspector.addEventListener('error',reject,{once:true});});inspector.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:"setTimeout(()=>process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').app.quit(),100)",awaitPromise:true}}));await wait(300);inspector.close();const deadline=Date.now()+5000;while(child.exitCode===null && Date.now()<deadline)await wait(50);if(child.exitCode===null)throw new Error('Encerramento normal não concluiu');console.log('QA encerrada normalmente, sem terminar o aplicativo real.');}catch(error){child.kill();throw error;}finally{inspector?.close();}
}
