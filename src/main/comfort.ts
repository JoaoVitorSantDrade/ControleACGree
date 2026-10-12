import { randomUUID } from 'node:crypto';
import type { ComfortData, ComfortSample, ComfortSummary, Device, History, Maintenance, ObservedInterval, Rule } from '../shared/types';
import { Storage } from './storage';
const DAY=86400000;
export function localDate(at=Date.now()) { const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function maintenanceDue(m:Maintenance|undefined,at=Date.now()) {
  if(!m?.enabled)return false;
  const due=new Date(`${m.lastDate}T00:00:00`);due.setDate(due.getDate()+m.intervalDays);
  return localDate(at)>=(m.snoozedUntil || localDate(due.getTime()));
}
export function nextSchedule(rules:Rule[],mac:string,groups:{id:string;members:string[]}[],now:number) {
  let result:{at:number;name:string}|undefined;
  for(const rule of rules.filter(r=>r.enabled && (r.target.kind==='device'?r.target.id===mac:groups.find(g=>g.id===r.target.id)?.members.includes(mac)))){
    if(rule.trigger.kind!=='schedule')continue;
    const [h,m]=rule.trigger.time.split(':').map(Number);
    for(let i=0;i<8;i++){const d=new Date(now);d.setDate(d.getDate()+i);d.setHours(h,m,0,0);if(d.getTime()>now && rule.trigger.days.includes(d.getDay())){if(!result || d.getTime()<result.at)result={at:d.getTime(),name:rule.name};break;}}
  }
  return result;
}
export class ComfortRecorder {
  private summaries=new Map<string,{key:string;value:ComfortSummary}>();
  private segments=new Map<string,string>();
  private previous=new Map<string,{at:number;on:boolean;interval?:ObservedInterval}>();
  private lastMinute=new Map<string,number>();
  private lastPrune=0;
  constructor(private store:Storage){}
  break(mac?:string){if(mac){this.previous.delete(mac);this.segments.delete(mac);}else{this.previous.clear();this.segments.clear();}}
  observe(d:Device,at:number,freshness:number){
    this.summaries.delete(d.mac);
    if(!this.segments.has(d.mac))this.segments.set(d.mac,randomUUID());
    const old=this.previous.get(d.mac),on=d.state.Pow===1;
    if(old && (at<=old.at || at-old.at>freshness))this.segments.set(d.mac,randomUUID());
    if(d.state.Pow!==0 && d.state.Pow!==1)this.previous.delete(d.mac);
    if((d.state.Pow===0 || d.state.Pow===1) && old && at>old.at && at-old.at<=freshness && old.on===on){
      const interval=old.interval || {id:randomUUID(),mac:d.mac,start:old.at,end:at,on};interval.end=at;
      this.store.put('observed',interval.id || `${d.mac}:${interval.start}`,interval);this.previous.set(d.mac,{at,on,interval});
    }else if(d.state.Pow===0 || d.state.Pow===1)this.previous.set(d.mac,{at,on});
    const raw=d.state.TemSen,ambient=Number.isFinite(raw)&&raw>=20&&raw<=100?raw-40:undefined;
    if(ambient===undefined)this.segments.delete(d.mac);
    const minute=Math.floor(at/60000);
    if(ambient!==undefined && this.lastMinute.get(d.mac)!==minute){
      const sample:ComfortSample={mac:d.mac,at,ambient,segment:this.segments.get(d.mac),target:Number.isFinite(d.state.SetTem)&&d.state.SetTem>=16&&d.state.SetTem<=30?d.state.SetTem:undefined};
      this.store.put('sample',`${d.mac}:${minute}`,sample);this.lastMinute.set(d.mac,minute);
    }
    if(at-this.lastPrune>=3600000){for(const entry of this.previous.values())if(entry.interval)entry.interval.start=Math.max(entry.interval.start,at-30*DAY);this.store.prune('sample',at-30*DAY);this.store.prune('observed',at-30*DAY,'end');this.store.prune('comfortEvent',at-30*DAY);this.lastPrune=at;}
  }
  event(h:History){this.store.put('comfortEvent',h.id,h);}
  summary(mac:string,from:number,to:number):ComfortSummary{
    const key=`${Math.round((to-from)/3600000)}:${Math.floor(to/60000)}:${localDate(to)}`,cached=this.summaries.get(mac);if(cached?.key===key)return cached.value;
    const samples=this.store.range<ComfortSample>('sample',from,to,'at',mac);
    const intervals=this.store.range<ObservedInterval>('observed',Math.min(from,to-7*DAY),to,'end',mac);
    const span=(a:number,b:number,onlyOn=false)=>{
      const ranges=intervals.filter(i=>!onlyOn || i.on).map(i=>({start:Math.max(i.start,a),end:Math.min(i.end,b)})).filter(i=>i.end>i.start).sort((x,y)=>x.start-y.start);
      let total=0,end=-Infinity;for(const i of ranges){total+=Math.max(0,i.end-Math.max(end,i.start));end=Math.max(end,i.end);}return total;
    };
    const today=new Date(to);today.setHours(0,0,0,0);
    const values=samples.flatMap(s=>s.ambient===undefined?[]:[s.ambient]);
    const value:ComfortSummary={min:values.length?Math.min(...values):undefined,max:values.length?Math.max(...values):undefined,samples:samples.length,coverage:Math.min(1,samples.length/Math.max(1,Math.ceil((to-from)/60000))),observedToday:span(today.getTime(),to,true),observedWeek:span(to-7*DAY,to,true),unobservedToday:Math.max(0,to-today.getTime()-span(today.getTime(),to)),unobservedWeek:Math.max(0,7*DAY-span(to-7*DAY,to))};
    this.summaries.set(mac,{key,value});return value;
  }
  query(mac:string,hours:1|24|168,now=Date.now()):ComfortData{
    const from=now-hours*3600000;this.summaries.delete(mac);
    return {mac,from,to:now,samples:this.store.range<ComfortSample>('sample',from,now,'at',mac),events:this.store.range<History>('comfortEvent',from,now).filter(h=>h.device===mac).slice(-500),summary:this.summary(mac,from,now)};
  }
}
