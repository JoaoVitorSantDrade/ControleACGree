import { vanePositions } from '../../shared/vanePositions';
export function VaneIcon({value}:{value:number|undefined}) {
 const p=vanePositions.find(p=>p.value===value);
 const angle=p?(-25+p.level*20):15;
 return <svg className={`vane-icon ${p?.swing?'swinging':''} ${value===1?'full-swing':''}`} width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" style={{'--vane-angle':`${angle}deg`} as React.CSSProperties}>
  <path d="M3 5h26v7H3z" opacity=".45"/><g className="vane-blade"><path d="M8 14h17" strokeWidth="2.5"/><path d="M14 18h8m-8 4h5" opacity=".6"/></g>{p?.swing&&<path d="m27 17 2 2-2 2m2-2h-4" opacity=".8"/>}
 </svg>;
}
