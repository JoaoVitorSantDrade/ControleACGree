export interface Rectangle { x:number; y:number; width:number; height:number }
export function flyoutBounds(area:Rectangle,point:{x:number;y:number}):Rectangle {
  const width=Math.min(440,area.width-24),height=Math.min(720,area.height-24);
  return {width,height,x:Math.max(area.x+12,Math.min(Math.round(point.x-width/2),area.x+area.width-width-12)),y:point.y>area.y+area.height/2?area.y+area.height-height-12:area.y+12};
}
