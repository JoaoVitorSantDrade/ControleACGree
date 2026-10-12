import { useEffect, useRef, useState } from 'react';
import { Thermometer, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ambientSummary } from '../../shared/ux';
import type { Device } from '../../shared/types';

export function Ambient({devices,now,pollSeconds,highlight=false,onOpen}:{devices:Device[];now:number;pollSeconds:number;highlight?:boolean;onOpen?:()=>void}) {
  const [details,setDetails]=useState(false),[page,setPage]=useState(0),[above,setAbove]=useState(false);
  const root=useRef<HTMLDivElement>(null), trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLDivElement>(null);
  const summary=ambientSummary(devices,now,pollSeconds), group=devices.length>1, reading=summary.readings[Math.min(page,devices.length-1)];
  useEffect(()=>{
    if(!details)return;
    let remaining=6000,previous=performance.now();
    const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setDetails(false);};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setDetails(false);trigger.current?.focus();}};
    const timer=setInterval(()=>{const current=performance.now(),elapsed=current-previous;previous=current;if(panel.current?.matches(':hover') || panel.current?.contains(document.activeElement))return;remaining-=elapsed;if(remaining<=0)setDetails(false);},100);
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
    return()=>{clearInterval(timer);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
  },[details,page]);
  return <div ref={root} className={`ambient-block ${highlight?'ambient-changed':''}`}><button ref={trigger} type="button" className="ambient-summary" aria-expanded={details} aria-label="Detalhes da temperatura ambiente" onClick={()=>{if(onOpen){onOpen();return;}const r=root.current!.getBoundingClientRect();setAbove(r.top>innerHeight-r.bottom);setPage(0);setDetails(v=>!v);}}><span><Thermometer size={14}/>{group?'Ambientes':'Ambiente'}<ChevronDown size={12}/></span><strong className={summary.count===0?'unavailable':''}>{summary.label}</strong>{group && <small>{summary.count}/{devices.length} leituras</small>}</button>{details && reading && <div ref={panel} tabIndex={0} className={`ambient-details ${above?'above':'below'}`} aria-label="Origem da leitura"><div>{group && <b title={reading.device.name}>{reading.device.name}</b>}<span>Sensor do aparelho</span><span>{reading.fresh?`${reading.value} °C`:reading.value!==undefined?`${reading.value} °C · leitura antiga`:'Sensor indisponível'}</span><small>{reading.device.lastSeen?`Última leitura: ${new Date(reading.device.lastSeen).toLocaleTimeString('pt-BR')}`:'Nenhuma leitura recebida'}</small></div>{group && <div className="menu-pages"><button type="button" aria-label="Leitura anterior" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><span>{page+1}/{devices.length}</span><button type="button" aria-label="Próxima leitura" disabled={page>=devices.length-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div>}</div>}</div>;
}
