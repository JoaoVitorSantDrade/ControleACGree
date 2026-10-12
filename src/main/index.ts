import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, safeStorage, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Storage } from './storage';
import { Controller } from './controller';
import { FlyoutLifecycle } from './flyoutLifecycle';
import { flyoutBounds } from '../shared/flyoutBounds';

const here = path.dirname(fileURLToPath(import.meta.url));
const qaProfile = process.argv.find(arg => arg.startsWith('--qa-profile='))?.slice('--qa-profile='.length);
if (qaProfile) app.setPath('userData',qaProfile);
let window: BrowserWindow | null = null, tray: Tray, controller: Controller, quitting = false, draining = false;
let pollTimer: ReturnType<typeof setInterval>, tickTimer: ReturnType<typeof setInterval>;
let store: Storage;
let flyout: BrowserWindow | null = null;
let lastFlyoutBlur = 0;
let comfortSelection:string|undefined;
let consumeBlurClick = false;
const flyoutLifecycle = new FlyoutLifecycle(state => { if (flyout && !flyout.isDestroyed()) flyout.webContents.send('flyoutTransition',state); }, () => flyout?.hide());
function hideFlyout() { if (flyout?.isVisible() && flyoutLifecycle.state.phase !== 'closing') flyoutLifecycle.transition(false); }
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
app.on('second-instance', () => { showFlyout(); });
function show(page = 'devices') {
  if (window) { window.webContents.send('navigate',page); window.show(); window.focus(); return; }
  window = new BrowserWindow({ width:1360, height:900, minWidth:980, minHeight:680, title:'Gree Desktop', backgroundColor:'#0c111b', autoHideMenuBar:true, show:!process.argv.includes('--background'),
    webPreferences: { preload:path.join(here,'preload.cjs'), contextIsolation:true, nodeIntegration:false, sandbox:true, offscreen:process.argv.includes('--qa-offscreen') } });
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('close', event => { if (!quitting) { event.preventDefault(); window?.hide(); } });
  window.on('closed', () => { window = null; });
  void window.loadFile(path.join(here,'../renderer/index.html'),{hash:page});
}
function placeFlyout() {
  if (!flyout || !tray) return;
  const anchor = tray.getBounds();
  const point = anchor.width ? {x:anchor.x+anchor.width/2,y:anchor.y+anchor.height/2} : screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(point).workArea;
  flyout.setBounds(flyoutBounds(area,point));
}
function showFlyout(toggle = false) {
  if (toggle && consumeBlurClick) { consumeBlurClick=false; if (Date.now()-lastFlyoutBlur < 150) return; }
  if (flyout && !flyout.isDestroyed()) {
    if (toggle && flyout.isVisible() && flyoutLifecycle.state.phase !== 'closing') { hideFlyout(); return; }
    placeFlyout();flyout.show();flyout.focus();flyoutLifecycle.transition(true);return;
  }
  flyout = new BrowserWindow({width:440,height:780,show:false,frame:false,transparent:true,backgroundColor:'#00000000',resizable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:true,
    webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:process.argv.includes('--qa-offscreen')} });
  flyout.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  flyout.webContents.on('will-navigate',event => event.preventDefault());
  flyout.on('blur',() => {
    const point=screen.getCursorScreenPoint(),bounds=tray.getBounds();
    consumeBlurClick=flyoutLifecycle.state.phase!=='closing' && point.x>=bounds.x && point.x<=bounds.x+bounds.width && point.y>=bounds.y && point.y<=bounds.y+bounds.height;
    lastFlyoutBlur=Date.now();hideFlyout();
  });
  flyout.on('close',event => { if (!quitting) {event.preventDefault();hideFlyout();} });
  flyout.on('closed',() => {flyout=null;});
  flyout.once('ready-to-show',() => {placeFlyout();flyout?.show();flyout?.focus();flyoutLifecycle.transition(true);});
  void flyout.loadFile(path.join(here,'../renderer/index.html'),{hash:'tray'});
}
function schedulePolling() { clearInterval(pollTimer); pollTimer = setInterval(() => void controller.poll().catch(console.error),controller.settings.pollSeconds*1000); }
if (locked) void app.whenReady().then(async () => {
  const wasm = app.isPackaged ? path.join(process.resourcesPath,'sql-wasm.wasm') : path.join(here,'../../node_modules/sql.js/dist/sql-wasm.wasm');
  store = await Storage.open(app.getPath('userData'),wasm);
  controller = new Controller(store, () => { for (const view of [window,flyout]) if (view && !view.isDestroyed()) view.webContents.send('changed',{...controller.snapshot(),comfortSelection}); if(tray){const ds=controller.devices;tray.setToolTip(`Gree Desktop · ${ds.filter(d=>d.online&&d.state.Pow===1).length} ligados · ${ds.filter(d=>d.online).length}/${ds.length} conectados · ${ds.filter(d=>d.externalOverride).length} protegidos`);} },safeStorage,undefined,event => {
    for (const view of [window,flyout]) if (view && !view.isDestroyed() && view.isVisible() && (view !== flyout || ['open','opening'].includes(flyoutLifecycle.state.phase))) view.webContents.send('deviceChange',event);
  });
  const handlers: Record<string, (...args: any[]) => unknown> = {
    resumeExternalOverride:mac=>controller.resumeExternalOverride(mac),comfort:(mac,hours)=>controller.comfort(mac,hours),saveMaintenance:(mac,value)=>controller.saveMaintenance(mac,value),maintenanceAction:(mac,action)=>controller.maintenanceAction(mac,action),favorite:(target,value)=>controller.favorite(target,value),
    snapshot: () => ({...controller.snapshot(),comfortSelection}), discover: ip => controller.discover(ip), command: (target,patch) => controller.send(target,patch),
    saveDevice: (mac,changes) => controller.saveDevice(mac,changes), resume: mac => controller.resume(mac),
    saveGroup: group => controller.saveGroup(group), deleteGroup: id => controller.deleteGroup(id),
    saveRule: rule => controller.saveRule(rule), deleteRule: id => controller.deleteRule(id), testRule: id => controller.testRule(id),
    settings: settings => { controller.saveSettings(settings); app.setLoginItemSettings({ name:qaProfile?'Gree Desktop QA':app.getName(), openAtLogin:settings.startup, args:app.isPackaged?['--background']:[app.getAppPath(),'--background'] }); schedulePolling(); },
    openDashboard: (page,mac) => { if (page && !['devices','groups','rules','settings','history','comfort'].includes(page)) throw new Error('Página inválida.'); if(mac!==undefined){if(page!=='comfort' || !controller.devices.some(d=>d.mac===mac))throw new Error('Aparelho inválido.');comfortSelection=mac;}hideFlyout();show(page || 'devices');if(mac!==undefined)window?.webContents.send('changed',{...controller.snapshot(),comfortSelection}); },
    hideFlyout,
    flyoutReady: () => flyoutLifecycle.state,
    completeFlyoutTransition: id => { if (Number.isSafeInteger(id)) flyoutLifecycle.complete(id); }
  };
  for (const [channel,handler] of Object.entries(handlers)) ipcMain.handle(channel,(event,...args) => {
    const source = [window,flyout].find(view => view && !view.isDestroyed() && event.sender === view.webContents);
    if (!source || event.senderFrame !== source.webContents.mainFrame) throw new Error('Origem IPC não autorizada.');
    if (['flyoutReady','completeFlyoutTransition','hideFlyout'].includes(channel) && source !== flyout) throw new Error('IPC exclusivo do controle rápido.');
    return handler(...args);
  });
  // Embedded PNG keeps the tray available in packaged and development builds.
  tray = new Tray(nativeImage.createFromPath(path.join(here,'../renderer/app-icon.png')).resize({width:24,height:24}));
  tray.setToolTip('Gree Desktop · automações em segundo plano');
  tray.setContextMenu(Menu.buildFromTemplate([{ label:'Controle rápido',click:() => showFlyout() },{ label:'Abrir painel completo',click:() => show() },{ label:'Automações',click:() => show('rules') },{ label:'Buscar aparelhos',click:() => void controller.discover() },{ type:'separator' },{ label:'Sair e parar automações',click:() => app.quit() }]));
  tray.on('click',() => showFlyout(true));
  tray.on('double-click',() => show());
  if (process.argv.includes('--qa-dashboard')) {show();if (process.argv.includes('--background'))window?.hide();}
  else if (!process.argv.includes('--background')) showFlyout();
  powerMonitor.on('suspend',() => controller.suspend());
  powerMonitor.on('resume',() => { void controller.tick().then(() => controller.poll()); });
  await controller.tick();
  tickTimer = setInterval(() => void controller.tick().catch(console.error),1000); schedulePolling();
  void controller.discover();
}).catch(error => { console.error(error); app.quit(); });
app.on('window-all-closed', () => {});
app.on('before-quit', event => {
  if (quitting || !controller) return;
  event.preventDefault();
  if (draining) return;
  draining = true; clearInterval(pollTimer); clearInterval(tickTimer);
  void controller.shutdown().finally(() => { quitting = true; app.quit(); });
});
app.on('will-quit', () => { flyoutLifecycle.dispose(); tray?.destroy(); store?.close(); });
