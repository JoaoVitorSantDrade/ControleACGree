import { vanePositions } from '../../shared/vanePositions';

// Schematic range, not a measured blade angle. Five rays share one fixed origin.
export function VaneIcon({value}:{value:number|undefined}) {
 const position=vanePositions.find(p=>p.value===value);
 const point=(angle:number,r=24)=>({x:7+Math.cos(angle*Math.PI/180)*r,y:7+Math.sin(angle*Math.PI/180)*r});
 const angle=(position?.level ?? 2)*18;
 const low=value===1?0:Math.max(0,angle-8),high=value===1?80:Math.min(80,angle+8);
 const start=point(low),end=point(high);
 const known=position && value!==0;
 return <svg className="vane-icon" width="34" height="30" viewBox="0 0 40 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
  <path d="M3 3h12M3 3v9" opacity=".5"/>
  {!known?<><path d="M12 14h15m-15 6h15m-15 6h15" strokeDasharray="2 4" opacity=".5"/>{value===0&&<circle cx="7" cy="7" r="2" fill="currentColor" stroke="none"/>}</>:<>
   {position.swing&&<path d={`M7 7 L${start.x} ${start.y} A24 24 0 0 1 ${end.x} ${end.y} Z`} fill="currentColor" fillOpacity=".2" stroke="none"/>}
   {[0,18,36,54,72].map((a,i)=>{const to=point(a);const selected=!position.swing&&i===position.level;return <path key={a} d={`M7 7 L${to.x} ${to.y}`} opacity={selected?1:.18} strokeWidth={selected?2.8:1}/>;})}
   {position.swing?<><path d={`M${start.x} ${start.y} A24 24 0 0 1 ${end.x} ${end.y}`} strokeWidth="2.5"/><circle cx={start.x} cy={start.y} r="2" fill="currentColor" stroke="none"/><circle cx={end.x} cy={end.y} r="2" fill="currentColor" stroke="none"/></>:<circle cx={point(angle).x} cy={point(angle).y} r="2.2" fill="currentColor" stroke="none"/>}
  </>}
 </svg>;
}
