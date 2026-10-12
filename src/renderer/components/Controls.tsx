import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { pointerTemperature, sliderCenter } from '../../shared/ux';

export function IconButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`ui-icon-button ${props.className || ''}`}/>;
}
export interface SelectOption { value: string; label: string; section?: string }
export function InlineSelect({label,value,options,disabled,onChange}:{label:string;value:string;options:SelectOption[];disabled?:boolean;onChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false), id=useId(), root=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(0),[page,setPage]=useState(0),[capacity,setCapacity]=useState(5),[above,setAbove]=useState(true);
  useEffect(()=>{if(!open || !root.current)return;const r=root.current.getBoundingClientRect(),up=r.top,down=innerHeight-r.bottom;setAbove(up>down);setCapacity(Math.max(1,Math.min(5,Math.floor((Math.max(up,down)-78)/42))));},[open]);
  useEffect(()=>{ if(!open)return; const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside); },[open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  const select=(i:number)=>{const item=options[i];if(item)onChange(item.value);setOpen(false);root.current?.querySelector('button')?.focus();};
  return <div ref={root} className="inline-select" onKeyDown={e=>{
    if(e.key==='Escape' && open){e.preventDefault();e.stopPropagation();setOpen(false);}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();setOpen(true);setActive(i=>{const next=e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1)));setPage(Math.floor(next/capacity));return next;});}
    if(open && ['Enter',' '].includes(e.key)){e.preventDefault();select(active);}
    if(e.key==='Tab')setOpen(false);
  }}><button type="button" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open?`${id}-${active}`:undefined} onClick={()=>{const index=Math.max(0,options.findIndex(o=>o.value===value));setActive(index);setPage(Math.floor(index/capacity));setOpen(v=>!v);}}><span>{options.find(o=>o.value===value)?.label || 'Misto / —'}</span><ChevronDown size={14}/></button>
  {open && <div className={`inline-options ${above?'above':'below'}`}><div id={id} role="listbox" aria-label={label}>{options.slice(page*capacity,(page+1)*capacity).map((o,offset)=>{const i=page*capacity+offset;return <button type="button" id={`${id}-${i}`} key={o.value} role="option" aria-selected={value===o.value} tabIndex={-1} className={active===i?'active':''} onPointerMove={()=>setActive(i)} onClick={()=>select(i)}><span>{o.label}</span>{o.value===value && <Check size={14}/>}</button>;})}</div>{options.length>capacity && <div className="menu-pages"><button type="button" aria-label="Página anterior" disabled={page===0} onClick={()=>{setPage(p=>p-1);setActive((page-1)*capacity);}}><ChevronLeft size={16}/></button><span>{page+1}/{Math.ceil(options.length/capacity)}</span><button type="button" aria-label="Próxima página" disabled={(page+1)*capacity>=options.length} onClick={()=>{setPage(p=>p+1);setActive((page+1)*capacity);}}><ChevronRight size={16}/></button></div>}</div>}</div>;
}

export function OrganicSlider({value,disabled,onPreview,onCommit,onAdjusting,cancelKey}:{value:number;disabled?:boolean;onPreview:(value:number|undefined)=>void;onCommit:(value:number)=>void;onAdjusting:(value:boolean)=>void;cancelKey?:string}) {
  const [position,setPosition]=useState(value), [drag,setDrag]=useState(false), [keyboardFocus,setKeyboardFocus]=useState(false);
  const input=useRef<HTMLInputElement>(null), interacting=useRef(false), pointer=useRef<number | undefined>(undefined), current=useRef(value), baseline=useRef(value), props=useRef({value,onPreview,onCommit,onAdjusting});
  props.current={value,onPreview,onCommit,onAdjusting};
  const preview=(v:number)=>{current.current=v;setPosition(v);onPreview(Math.round(v));};
  const begin=()=>{if(!interacting.current){baseline.current=value;interacting.current=true;onAdjusting(true);}};
  const finish=(commit:boolean)=>{if(!interacting.current)return;interacting.current=false;pointer.current=undefined;setDrag(false);onAdjusting(false);const rounded=Math.round(current.current);setPosition(commit?rounded:props.current.value);onPreview(undefined);if(commit && rounded!==baseline.current)onCommit(rounded);};
  const move=(x:number)=>{const r=input.current!.getBoundingClientRect();preview(pointerTemperature(x,r.left,r.width));};
  useEffect(()=>{if(!interacting.current){current.current=value;setPosition(value);}},[value]);
  useEffect(()=>{finish(false);},[cancelKey,disabled]);
  useEffect(()=>()=>{if(interacting.current){props.current.onPreview(undefined);props.current.onAdjusting(false);}},[]);
  return <div className={`organic-range ${drag?'dragging':''} ${keyboardFocus?'keyboard-focus':''}`} style={{'--center':sliderCenter(position)} as React.CSSProperties}>
    <div className="organic-track" aria-hidden="true"><div className="organic-fill"/><div className="organic-thumb"/></div>
    <input ref={input} type="range" min={16} max={30} step={1} value={Math.round(position)} disabled={disabled} aria-label="Temperatura definida" aria-valuetext={`${Math.round(position)} graus Celsius`} onPointerDown={e=>{if(disabled)return;e.preventDefault();setKeyboardFocus(false);begin();pointer.current=e.pointerId;setDrag(true);e.currentTarget.focus({preventScroll:true});setKeyboardFocus(false);e.currentTarget.setPointerCapture(e.pointerId);move(e.clientX);}} onPointerMove={e=>{if(pointer.current===e.pointerId)move(e.clientX);}} onPointerUp={e=>{if(pointer.current!==e.pointerId)return;move(e.clientX);finish(true);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>finish(false)} onLostPointerCapture={()=>finish(false)} onChange={e=>{if(pointer.current===undefined){begin();preview(Number(e.target.value));}}} onFocus={e=>setKeyboardFocus(e.currentTarget.matches(':focus-visible'))} onKeyDown={e=>{setKeyboardFocus(true);if(e.key==='Escape' && interacting.current){e.preventDefault();e.stopPropagation();finish(false);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))begin();}} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))finish(true);}} onBlur={()=>{setKeyboardFocus(false);finish(false);}}/>
    <div className="range-labels"><span>16°</span><span>30°</span></div>
  </div>;
}
