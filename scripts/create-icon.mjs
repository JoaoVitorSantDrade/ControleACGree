import { mkdirSync,writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
// Rasterize the application's simple geometric snowflake mark, without external assets.
const size=256,raw=Buffer.alloc((size*4+1)*size),lines=[];
for(let a=0;a<6;a++) {
  const angle=a*Math.PI/3,dx=Math.cos(angle),dy=Math.sin(angle);
  lines.push([128,128,128+dx*72,128+dy*72]);
  for(const side of [-1,1]) {const branch=angle+side*Math.PI/3;lines.push([128+dx*45,128+dy*45,128+dx*45-Math.cos(branch)*24,128+dy*45-Math.sin(branch)*24]);}
}
const distance=(x,y,[x1,y1,x2,y2])=>{const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-x1-t*dx,y-y1-t*dy);};
for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
  const offset=y*(size*4+1)+1+x*4;
  const edge=Math.hypot(Math.max(38-x,0,x-217),Math.max(38-y,0,y-217));
  const alpha=Math.max(0,Math.min(1,38-edge));
  const white=Math.max(0,Math.min(1,5-Math.min(...lines.map(line=>distance(x,y,line)))));
  raw[offset]=82+(255-82)*white;raw[offset+1]=135+(255-135)*white;raw[offset+2]=245+(255-245)*white;raw[offset+3]=Math.round(alpha*255);
}
function crc(buffer){let value=0xffffffff;for(const byte of buffer){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);}
const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
mkdirSync('public',{recursive:true});mkdirSync('assets',{recursive:true});writeFileSync('public/app-icon.png',png);writeFileSync('assets/app.ico',Buffer.concat([ico,png]));
