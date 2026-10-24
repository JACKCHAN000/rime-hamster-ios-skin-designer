import {zlibSync} from 'fflate';

// U+2423 Open Box outline, occupying exactly 40% of the transparent sprite width.
const W=320,H=160,PATH='M98 70V90H222V70';
const pattern=/^studio_spacebar_40_([a-f0-9]{6})$/i;
export function spaceSymbolColor(style){
  const match=style?.buttonStyleType==='fileImage'&&style.normalImage?.image==='openBox'&&pattern.exec(style.normalImage.file);
  return match?`#${match[1]}`:null;
}
export function spaceSymbolStyle(color,gap=0){
  const image={file:`studio_spacebar_40_${color.slice(1).toLowerCase()}`,image:'openBox'};
  return {buttonStyleType:'fileImage',normalImage:image,highlightImage:{...image},contentMode:'scaleToFill',insets:{left:gap/2,right:gap/2,top:gap/2,bottom:gap/2}};
}
export function spaceSymbolHtml(style){
  const color=spaceSymbolColor(style),i=style.insets||{};
  return `<span class="space-symbol-layer" aria-hidden="true" style="position:absolute;inset:${i.top||0}px ${i.right||0}px ${i.bottom||0}px ${i.left||0}px;pointer-events:none"><svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${PATH}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
export function drawSpaceSymbol(ctx,style,box){
  const i=style.insets||{};ctx.save();ctx.translate(box.x+(i.left||0),box.y+(i.top||0));ctx.scale((box.width-(i.left||0)-(i.right||0))/W,(box.height-(i.top||0)-(i.bottom||0))/H);
  ctx.strokeStyle=spaceSymbolColor(style);ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(98,70);ctx.lineTo(98,90);ctx.lineTo(222,90);ctx.lineTo(222,70);ctx.stroke();ctx.restore();
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){
  const result=new Uint8Array(data.length+12),view=new DataView(result.buffer);view.setUint32(0,data.length);result.set([...type].map((c)=>c.charCodeAt(0)),4);result.set(data,8);
  let crc=0xffffffff;for(const byte of result.subarray(4,-4))crc=crcTable[(crc^byte)&255]^(crc>>>8);view.setUint32(result.length-4,(crc^0xffffffff)>>>0);return result;
}
function segmentDistance(x,y,x1,y1,x2,y2){
  const t=Math.max(0,Math.min(1,((x-x1)*(x2-x1)+(y-y1)*(y2-y1))/((x2-x1)**2+(y2-y1)**2)));
  return Math.hypot(x-x1-t*(x2-x1),y-y1-t*(y2-y1));
}
export function spaceSymbolResource(file){
  const match=pattern.exec(file);if(!match)return null;
  const rgb=[0,2,4].map((at)=>parseInt(match[1].slice(at,at+2),16)),pixels=new Uint8Array(H*(W*4+1));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const distance=Math.min(segmentDistance(x+.5,y+.5,98,70,98,90),segmentDistance(x+.5,y+.5,98,90,222,90),segmentDistance(x+.5,y+.5,222,90,222,70));
    const alpha=Math.round(Math.max(0,Math.min(1,2.5-distance))*255);if(!alpha)continue;
    const at=y*(W*4+1)+1+x*4;pixels.set([...rgb,alpha],at);
  }
  const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,W);view.setUint32(4,H);header[8]=8;header[9]=6;
  const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlibSync(pixels)),chunk('IEND',new Uint8Array())];
  const png=new Uint8Array(parts.reduce((n,part)=>n+part.length,0));let at=0;for(const part of parts){png.set(part,at);at+=part.length;}
  return {png,yaml:`openBox:\n  rect: {x: 0, y: 0, width: ${W}, height: ${H}}\n`};
}
