const {contextBridge,ipcRenderer}=require('electron');
const listen=channel=>callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on(channel,listener);return()=>ipcRenderer.removeListener(channel,listener);};
contextBridge.exposeInMainWorld('gree',{
  comfort:(mac,hours)=>ipcRenderer.invoke('fixture:comfort',mac,hours), favorite:()=>Promise.resolve(), saveMaintenance:()=>Promise.resolve(),maintenanceAction:()=>Promise.resolve(),resumeExternalOverride:()=>Promise.resolve(),
  snapshot:()=>ipcRenderer.invoke('fixture:snapshot'),command:(target,patch)=>ipcRenderer.invoke('fixture:command',target,patch),
  onChange:listen('changed'),onDeviceChange:listen('deviceChange'),onFlyoutTransition:listen('flyoutTransition'),onNavigate:listen('navigate'),
  flyoutReady:()=>ipcRenderer.invoke('fixture:ready'),completeFlyoutTransition:id=>ipcRenderer.invoke('fixture:complete',id),hideFlyout:()=>ipcRenderer.invoke('fixture:hide'),
  settings:value=>ipcRenderer.invoke('fixture:settings',value),resume:()=>Promise.resolve(),discover:()=>Promise.resolve(),openDashboard:()=>Promise.resolve()
});
