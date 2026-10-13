import { app } from 'electron';
import path from 'node:path';
import { mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { linuxAutostartEntry } from './startupEntry';
export function configureStartup(enabled:boolean,name:string) {
  if(process.platform==='linux') {
    const directory=path.join(process.env.XDG_CONFIG_HOME || path.join(app.getPath('home'),'.config'),'autostart');
    const file=path.join(directory,name==='Gree Desktop QA'?'gree-desktop-qa.desktop':'gree-desktop.desktop');
    if(enabled) { mkdirSync(directory,{recursive:true});writeFileSync(file,linuxAutostartEntry(process.env.APPIMAGE || process.execPath,app.isPackaged?[]:[app.getAppPath()])); }
    else rmSync(file,{force:true});
  } else app.setLoginItemSettings({name,openAtLogin:enabled,args:app.isPackaged?['--background']:[app.getAppPath(),'--background']});
}
