import { toastDuration } from './ux';
export type ToastKind = keyof typeof toastDuration;
export interface Toast { id:number; text:string; kind:ToastKind; count:number; remaining:number; leaving:boolean; hover:boolean; focus:boolean }
export function enqueueToast(items:Toast[],id:number,text:string,kind:ToastKind):Toast[] {
  const found=items.find(t=>t.text===text && t.kind===kind && !t.leaving);
  if(found)return items.map(t=>t.id===found.id?{...t,count:t.count+1,remaining:toastDuration[kind]}:t);
  return [...items,{id,text,kind,count:1,remaining:toastDuration[kind],leaving:false,hover:false,focus:false}].slice(-3);
}
export function advanceToasts(items:Toast[],elapsed:number):Toast[] {
  return items.flatMap(t=>{
    if(!t.leaving && (t.hover || t.focus))return [t];
    const remaining=t.remaining-elapsed;
    if(remaining>0)return [{...t,remaining}];
    return t.leaving?[]:[{...t,leaving:true,remaining:160}];
  });
}
