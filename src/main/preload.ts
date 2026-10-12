import { contextBridge, ipcRenderer } from 'electron';
import type { API, Snapshot } from '../shared/types';
const api: API = {
  resumeExternalOverride:mac=>ipcRenderer.invoke('resumeExternalOverride',mac), comfort:(mac,hours)=>ipcRenderer.invoke('comfort',mac,hours), saveMaintenance:(mac,value)=>ipcRenderer.invoke('saveMaintenance',mac,value), maintenanceAction:(mac,action)=>ipcRenderer.invoke('maintenanceAction',mac,action), favorite:(target,value)=>ipcRenderer.invoke('favorite',target,value),
  snapshot: () => ipcRenderer.invoke('snapshot'), discover: ip => ipcRenderer.invoke('discover',ip),
  command: (target,patch) => ipcRenderer.invoke('command',target,patch),
  saveDevice: (mac,changes) => ipcRenderer.invoke('saveDevice',mac,changes), resume: mac => ipcRenderer.invoke('resume',mac),
  saveGroup: group => ipcRenderer.invoke('saveGroup',group), deleteGroup: id => ipcRenderer.invoke('deleteGroup',id),
  saveRule: rule => ipcRenderer.invoke('saveRule',rule), deleteRule: id => ipcRenderer.invoke('deleteRule',id), testRule: id => ipcRenderer.invoke('testRule',id),
  settings: settings => ipcRenderer.invoke('settings',settings),
  openDashboard: (page,mac) => ipcRenderer.invoke('openDashboard',page,mac), hideFlyout: () => ipcRenderer.invoke('hideFlyout'),
  flyoutReady: () => ipcRenderer.invoke('flyoutReady'),
  completeFlyoutTransition: id => ipcRenderer.invoke('completeFlyoutTransition',id),
  onFlyoutTransition: callback => { const listener = (_: unknown, value: Parameters<typeof callback>[0]) => callback(value); ipcRenderer.on('flyoutTransition',listener); return () => ipcRenderer.removeListener('flyoutTransition',listener); },
  onDeviceChange: callback => { const listener = (_: unknown, value: Parameters<typeof callback>[0]) => callback(value); ipcRenderer.on('deviceChange',listener); return () => ipcRenderer.removeListener('deviceChange',listener); },
  onNavigate: callback => { const listener = (_: unknown,page: 'devices' | 'groups' | 'rules' | 'settings' | 'history' | 'comfort') => callback(page); ipcRenderer.on('navigate',listener); return () => ipcRenderer.removeListener('navigate',listener); },
  onChange: callback => { const listener = (_: unknown,state: Snapshot) => callback(state); ipcRenderer.on('changed',listener); return () => ipcRenderer.removeListener('changed',listener); }
};
contextBridge.exposeInMainWorld('gree',api);
