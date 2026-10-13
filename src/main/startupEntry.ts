export function linuxAutostartEntry(executable:string,args:string[]=[]) {
  const quote=(s:string)=>'"'+s.replace(/%/g,'%%').replace(/[\\"`$]/g,'\\$&')+'"';
  return `[Desktop Entry]\nType=Application\nName=Gree Desktop\nExec=${[executable,...args,'--background'].map(quote).join(' ')}\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`;
}
