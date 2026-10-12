import { useEffect, useState } from 'react';
import type { DeviceChange } from '../../shared/types';
export function useDeviceFeedback(mac: string) {
  const [event,setEvent]=useState<DeviceChange>(),[now,setNow]=useState(Date.now());
  useEffect(()=>{setEvent(undefined);const dispose=window.gree.onDeviceChange(value=>{if(value.mac===mac){setEvent(value);setNow(Date.now());}});return dispose;},[mac]);
  useEffect(()=>{if(!event)return;const timer=setInterval(()=>setNow(Date.now()),80);const stop=setTimeout(()=>{clearInterval(timer);setEvent(undefined);},3000);return()=>{clearInterval(timer);clearTimeout(stop);};},[event]);
  const classFor=(field:string)=>event?.fields.includes(field) && now-event.at<(field==='TemSen'?300:event.origin==='manual'?450:180)?field==='TemSen'?'ambient-changed':event.origin==='manual'?'confirmed-control':'external-control':'';
  return {classFor,message:event?event.origin==='manual'?'Ajuste confirmado':event.origin==='automation'?'Alterado por automação':'Estado atualizado pela rede':undefined};
}
