import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function luminance(hex:string){if(hex.length===4)hex='#'+[...hex.slice(1)].map(c=>c+c).join('');const rgb=hex.slice(1).match(/../g)!.map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('paleta Névoa conserva contraste para texto principal, secundário e ação',()=>{
  const css=readFileSync('src/renderer/tokens.css','utf8');const themes=css.match(/\{[^}]+\}/g)!;
  themes.forEach((theme,i)=>{const tokens=Object.fromEntries([...theme.matchAll(/--([\w-]+):(#[\da-f]{3,6})(?=[;}])/gi)].map(m=>[m[1],m[2]]));
    for(const bg of ['bg','panel','hover'])for(const text of ['text','muted'])assert.ok(contrast(tokens[text],tokens[bg])>=4.5,`${text}/${bg}: ${contrast(tokens[text],tokens[bg])}`);
    assert.ok(contrast(i?'#ffffff':'#123641',tokens.accent)>=4.5);
  });
});
