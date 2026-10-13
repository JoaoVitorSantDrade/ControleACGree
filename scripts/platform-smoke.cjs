// Native Electron/renderer/SQLite smoke; simulated IPC, no physical UDP.
const {app,BrowserWindow,ipcMain,safeStorage}=require('electron');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const output=path.resolve('.cache/platform-smoke');mkdirSync(output,{recursive:true});app.setPath('userData',output);
const state={devices:[],groups:[],rules:[],history:[],settings:{theme:'dark',startup:false,pollSeconds:15},scanning:false,diagnostic:''};
ipcMain.handle('fixture:snapshot',()=>state);ipcMain.handle('fixture:ready',()=>({id:1,phase:'open'}));ipcMain.handle('fixture:complete',()=>{});
const timeout=setTimeout(()=>{console.error('Native smoke timeout');app.exit(1)},30000);
app.whenReady().then(async()=>{
 const init=require('sql.js');const SQL=await init({locateFile:()=>path.resolve('node_modules/sql.js/dist/sql-wasm.wasm')});const db=new SQL.Database();db.run('CREATE TABLE qa(value TEXT); INSERT INTO qa VALUES ("ok")');if(db.exec('SELECT value FROM qa')[0].values[0][0]!=='ok')throw Error('SQLite failed');db.close();
 const w=new BrowserWindow({show:false,width:440,height:720,webPreferences:{preload:path.resolve('scripts/ux-fixture-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 await w.loadFile(path.resolve('dist/renderer/index.html'),{hash:'tray'});await new Promise(r=>setTimeout(r,1000));
 if(!await w.webContents.executeJavaScript('Boolean(document.querySelector(".tray-surface"))'))throw Error('Renderer did not mount');
 writeFileSync('.cache/platform-smoke.json',JSON.stringify({platform:process.platform,arch:process.arch,electron:process.versions.electron,sqlite:true,renderer:true,keyEncryption:safeStorage.isEncryptionAvailable(),keyBackend:process.platform==='linux'?safeStorage.getSelectedStorageBackend():'system',physicalDevices:false},null,2));
 clearTimeout(timeout);w.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1)});
