// A small bitmap font stays readable in the Windows notification area.
const digits = ['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
export function temperatureBitmap(value:number):Buffer {
  const pixels=Buffer.alloc(32*32*4);
  const paint=(x:number,y:number,b:number,g:number,r:number)=>{const i=(y*32+x)*4;pixels[i]=b;pixels[i+1]=g;pixels[i+2]=r;pixels[i+3]=255;};
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if((x-15.5)**2+(y-15.5)**2<=15.5**2)paint(x,y,29,24,20);
  const text=String(Math.round(value)),scale=text.length<=2?3:2,width=text.length*(3*scale+2)-2,start=Math.floor((32-width)/2),top=Math.floor((32-5*scale)/2);
  [...text].forEach((digit,i)=>{const glyph=digits[Number(digit)] || '000000111000000';for(let row=0;row<5;row++)for(let col=0;col<3;col++)if(glyph[row*3+col]==='1')for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)paint(start+i*(3*scale+2)+col*scale+dx,top+row*scale+dy,245,216,98);});
  return pixels;
}
