import { useEffect, useRef, useState } from 'react';
import { Check, AlertCircle, X, Info } from 'lucide-react';
import { advanceToasts,enqueueToast,type ToastKind,type Toast } from '../../shared/notifications';
export function useToasts(compact = false) {
  const [items,setItems]=useState<Toast[]>([]), serial=useRef(0);
  const dismiss=(id:number)=>setItems(all=>all.map(t=>t.id===id?{...t,leaving:true,remaining:160}:t));
  const notify=(text:string,kind:ToastKind='success')=>{
    if(!text)return;
    const id=++serial.current;setItems(all=>enqueueToast(all,id,text,kind));
  };
  useEffect(()=>{let previous=performance.now();const timer=setInterval(()=>{const now=performance.now(),elapsed=now-previous;previous=now;setItems(all=>advanceToasts(all,elapsed));},80);return()=>clearInterval(timer);},[]);
  const pause=(id:number,field:'hover'|'focus',value:boolean)=>setItems(all=>all.map(t=>t.id===id?{...t,[field]:value}:t));
  const view=<div className={`toast-stack ${compact?'compact-toasts':''}`} aria-live="polite" aria-relevant="additions">{(compact?items.slice(-1):items).map(t=><div key={t.id} className={`ui-toast ${t.kind} ${t.leaving?'leaving':''}`} tabIndex={0} onMouseEnter={()=>pause(t.id,'hover',true)} onMouseLeave={()=>pause(t.id,'hover',false)} onFocus={()=>pause(t.id,'focus',true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))pause(t.id,'focus',false);}}>{t.kind==='success'?<Check size={18}/>:t.kind==='info'?<Info size={18}/>:<AlertCircle size={18}/>}<div><p>{t.text}{compact && t.count>1 && <small> · Repetido {t.count} vezes</small>}</p>{!compact && t.count>1 && <small>Repetido {t.count} vezes</small>}</div><button type="button" aria-label="Fechar notificação" onClick={()=>dismiss(t.id)}><X size={16}/></button></div>)}</div>;
  return {notify,view};
}
