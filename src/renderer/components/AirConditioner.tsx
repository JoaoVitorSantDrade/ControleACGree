import { useId } from 'react';

export function AirConditioner({on,cooling,temperature,oscillating=false}:{on:boolean;cooling:boolean;temperature:number|undefined;oscillating?:boolean}) {
  const id=useId().replace(/:/g,'');
  const paint=(name:string)=>`url(#${id}-${name})`;
  return <svg className={`ac-illustration ac-depth ${on?'on':''} ${cooling?'cooling':''} ${on && oscillating?'oscillating':''}`} viewBox="0 0 360 134" role="img" aria-label={on?'Ar-condicionado ligado':'Ar-condicionado desligado'}>
    <defs>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2=".15" y2="1"><stop stopColor="#fbfdff"/><stop offset=".5" stopColor="#e8eef2"/><stop offset="1" stopColor="#afbfc9"/></linearGradient>
      <linearGradient id={`${id}-top`} x2="0" y2="1"><stop stopColor="#d7e2e9"/><stop offset="1" stopColor="#fff"/></linearGradient>
      <linearGradient id={`${id}-side`} x2="1" y2=".5"><stop stopColor="#9aafb9"/><stop offset="1" stopColor="#536b79"/></linearGradient>
      <linearGradient id={`${id}-vane`} x2="0" y2="1"><stop stopColor="#f0f7fa"/><stop offset=".45" stopColor="#bcced8"/><stop offset="1" stopColor="#8197a6"/></linearGradient>
      <linearGradient id={`${id}-air`} x2="0" y2="1"><stop stopColor="#78d8f5" stopOpacity=".5"/><stop offset="1" stopColor="#78d8f5" stopOpacity="0"/></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#5acff5" stopOpacity=".18"/><stop offset="1" stopColor="#5acff5" stopOpacity="0"/></radialGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-40%" width="150%" height="200%"><feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#000" floodOpacity=".35"/></filter>
    </defs>
    <ellipse className="ac-aura" cx="185" cy="89" rx="150" ry="40" fill={paint('glow')}/>
    <g filter={paint('shadow')}>
      <path d="M47 19 304 12 Q321 12 328 27 L332 65 Q332 82 316 91 L299 97 47 90Z" fill={paint('side')}/>
      <path d="M34 35 Q34 22 50 18 L298 12 Q313 11 322 25 L308 37Z" fill={paint('top')}/>
      <path d="M32 39 Q31 26 47 25 L299 20 Q316 20 318 37 L320 75 Q320 93 303 96 L49 91 Q32 90 31 75Z" fill={paint('face')}/>
      <path d="M41 32 Q171 25 302 27" fill="none" stroke="#fff" strokeWidth="1.3" opacity=".75"/>
      <path d="M39 63 Q173 68 311 60" fill="none" stroke="#8ca1ae" strokeWidth=".6" opacity=".3"/>
      <path d="M324 33 327 66 Q328 77 323 82" fill="none" stroke="#dce6ec" strokeWidth=".7" opacity=".45"/>
      <circle cx="66" cy="45" r="1.5" fill="#aabdc8"/>
      <text className="ac-display" x="278" y="50" textAnchor="middle" fontSize="13" fontWeight="500" fontFamily="Segoe UI, sans-serif">{temperature ?? '—'}</text>
      <circle className="ac-led" cx="278" cy="57" r="1.4"/>
      <path className="ac-vent" d="M49 80 Q173 73 303 79 L302 89 Q173 83 51 87Z" fill="#14232d"/>
      <g className="ac-louvers" stroke="#5b7787" strokeWidth=".8" opacity=".45">{Array.from({length:14},(_,i)=><path key={i} d={`M${61+i*17} 79v7`}/>)}</g>
      <path className="ac-vane" d="M48 82 Q174 77 304 83 L301 94 Q174 87 52 92Z" fill={paint('vane')} stroke="#d7e6ed" strokeWidth=".5"/>
    </g>
    <g className="air-stream" fill="none" stroke={paint('air')} strokeWidth="1.1">{Array.from({length:7},(_,i)=>{const x=76+i*34;return <path style={{animationDelay:`${i*-.38}s`}} key={i} d={`M${x} 96 Q${x+(x-180)*.03} 112 ${x+(x-180)*.14} 132`}/>;})}</g>
  </svg>;
}
