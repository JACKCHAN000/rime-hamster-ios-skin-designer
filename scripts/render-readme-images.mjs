import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createProject} from '../src/model.js';
import {buildNativeKeyboard} from '../src/native.js';
import {selectedStyles} from '../src/preview.js';
import {icon,systemIcon,esc} from '../src/icons.js';
import {spaceSymbolColor,spaceSymbolResource} from '../src/space-symbol.js';
import {legendLabel} from '../src/presentation-settings.js';
import {SYSTEM_SURFACE} from '../src/keyboard-material.js';
import {SPACE_ACTIONS} from '../src/space-behavior.js';

// Documentation illustrations from the current model; these are not browser/device captures.
const project=createProject(),out=fileURLToPath(new URL('../docs/images/',import.meta.url));
const color=(value='#000000')=>({fill:value.slice(0,7),opacity:value.length===9?parseInt(value.slice(7),16)/255:1});
function opaque(value,background='#202124'){const c=color(value);return '#'+[1,3,5].map((at)=>Math.round(parseInt(c.fill.slice(at,at+2),16)*c.opacity+parseInt(background.slice(at,at+2),16)*(1-c.opacity)).toString(16).padStart(2,'0')).join('');}
function rect(x,y,w,h,fill,r=0,stroke='none',line=.7){const c=color(fill),edge=stroke==='none'?'none':opaque(stroke,opaque(fill));return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c.fill}" fill-opacity="${c.opacity}" stroke="${edge}" stroke-width="${line}"/>`;}
function text(value,x,y,size=14,fill='#27332e',weight=400,anchor='start'){
  const c=color(fill);return `<text x="${x}" y="${y}" font-size="${size}" fill="${c.fill}" fill-opacity="${c.opacity}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="central">${esc(value)}</text>`;
}
function graphic(name,x,y,size,fill='#27332e'){return `<g transform="translate(${x-size/2} ${y-size/2})" color="${fill}">${icon(name,size)}</g>`;}
function geometry(style,x,y,w,h){
  const i=style.insets||{},left=i.left||0,right=i.right||0,top=i.top||0,bottom=i.bottom||0;
  return rect(x+left,y+top,Math.max(0,w-left-right),Math.max(0,h-top-bottom),style.normalColor||'#00000000',style.cornerRadius||0,style.normalBorderColor||'none',style.borderSize||0);
}
function layer(style,x,y,w,h,{web=false,menu=false}={}){
  if(!style)return '';
  if(style.buttonStyleType==='geometry')return geometry(style,x,y,w,h);
  if(spaceSymbolColor(style)){
    const png=spaceSymbolResource(style.normalImage.file).png,i=style.insets||{};
    return `<image x="${x+(i.left||0)}" y="${y+(i.top||0)}" width="${w-(i.left||0)-(i.right||0)}" height="${h-(i.top||0)-(i.bottom||0)}" preserveAspectRatio="none" href="data:image/png;base64,${Buffer.from(png).toString('base64')}"/>`;
  }
  const cx=x+w*(style.center?.x??.5),cy=y+h*(style.center?.y??.5),size=web&&menu&&style.fontSize===27?18:Number(style.fontSize)||20;
  if(menu&&style.text==='☰')return `<path d="M${cx-size*.32} ${cy-size*.25}h${size*.64}m${-size*.64} ${size*.25}h${size*.64}m${-size*.64} ${size*.25}h${size*.64}" fill="none" stroke="${style.normalColor}" stroke-width="${size*.09}"/>`;
  if(style.text==='−')return `<path d="M${cx-size*.27} ${cy}h${size*.54}" stroke="${style.normalColor}" stroke-width="${size*.07}"/>`;
  if(style.buttonStyleType==='systemImage')return graphic(systemIcon(style.systemImageName),cx,cy,size,style.normalColor);
  return text(style.text||'',cx,cy,size,style.normalColor,({medium:500,semibold:600,bold:700})[style.fontWeight]||400,'middle');
}
function keyboard({locale='zh',page='main',web=false}={}){
  const view={theme:'dark',orientation:'portrait',locale,page,simplified:false,asciiMode:false},root=buildNativeKeyboard(project,view),width=390;
  const preedit=root.preeditHeight,toolbar=root.toolbarHeight,height=preedit+toolbar+root.keyboardHeight;
  let result=rect(0,0,width,height,SYSTEM_SURFACE[view.theme],18)+rect(0,0,width,height,root.boardBackground.normalColor,18);
  result+=text(`${locale==='zh'?'中文':'英文'} · ${locale==='zh'?legendLabel(project.legend):'小寫字母'}`,width/2,preedit/2,10,'#969FA5',400,'middle');
  const tools=root.toolbarLayout[0].HStack.subviews;
  tools.forEach(({Cell:name},i)=>{const cell=root[name];for(const ref of selectedStyles(cell.foregroundStyle,view))result+=layer(root[ref],i*width/tools.length,preedit,width/tools.length,toolbar,{web,menu:name==='tool_menu'});});
  const rows=root.keyboardLayout,i=root.keyboardStyle.insets,left=i.left||0,right=i.right||0,top=i.top||0,bottom=i.bottom||0;
  const rowHeight=(root.keyboardHeight-top-bottom)/rows.length;
  rows.forEach((row,r)=>{let x=left;const y=preedit+toolbar+top+r*rowHeight;
    for(const {Cell:name} of row.HStack.subviews){const cell=root[name],ratio=cell.size.width.split('/').map(Number),w=(width-left-right)*ratio[0]/ratio[1];
      for(const ref of selectedStyles(cell.backgroundStyle,view))result+=layer(root[ref],x,y,w,rowHeight);
      for(const ref of selectedStyles(cell.foregroundStyle,view))result+=layer(root[ref],x,y,w,rowHeight);x+=w;
    }
  });
  return {svg:result,width,height};
}
function svg(width,height,body,title){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Microsoft JhengHei, Noto Sans TC, sans-serif"><title>${esc(title)}</title>${body}</svg>`;}
function button(label,x,y,w,{active=false,primary=false}={}){return rect(x,y,w,36,primary?'#375d49':active?'#edf3e9':'#ffffff',7,active?'#bacdb5':'#e2e7df')+text(label,x+w/2,y+18,12,primary?'#ffffff':'#56664f',500,'middle');}

let web=rect(0,0,1440,960,'#f6f7f4');
web+=rect(0,0,1440,78,'#ffffff')+graphic('keyboard',44,39,27,'#375d49')+text('元書造型所',72,31,18,'#27332e',600)+text('SKIN STUDIO',72,51,9,'#8c9490',500)+text(project.meta.name,245,39,14,'#74816e');
web+=button('匯入',1045,21,75)+button('儲存專案',1132,21,110)+button('匯出皮膚',1254,21,138,{primary:true});
web+=rect(0,79,86,849,'#ffffff')+rect(87,79,344,849,'#ffffff');
const tabs=[['palette','外觀'],['layout','佈局'],['key','按鍵'],['symbols','符號'],['toolbar','工具列'],['code','原生 YAML'],['folder','專案']];
tabs.forEach(([glyph,label],i)=>{const y=112+i*88;if(i===1)web+=rect(12,y-12,62,68,'#edf3e9',10);web+=graphic(glyph,43,y+7,22,i===1?'#375d49':'#93a08b')+text(label,43,y+33,11,i===1?'#375d49':'#93a08b',400,'middle');});
web+=text('02',115,114,11,'#879b78',500)+text('熟悉的手感',115,151,24,'#27332e',550)+text('外觀與佈局分開，習慣由你決定。',115,186,11,'#7b8774');
web+=rect(115,217,286,87,'#f3f7ef',10,'#b9cdb1')+graphic('layout',147,258,27,'#78936c')+text('iOS 27',175,245,14,'#375d49',600)+text('中文／英文獨立符號頁',175,270,11,'#87967d');
web+=text('輸入方案綁定',115,342,12,'#69795f',600)+text('中英切換時一併切換方案',115,377,12,'#53654c',500)+rect(365,366,36,20,'#78946c',10)+rect(383,369,14,14,'#ffffff',7);
web+=text('中文方案 ID',115,418,11,'#6e7b67')+rect(115,435,286,38,'#ffffff',6,'#dfe5d9')+text(project.schemaBinding.zh,128,454,13,'#53654c');
web+=text('英文方案 ID',115,500,11,'#6e7b67')+rect(115,517,286,38,'#ffffff',6,'#dfe5d9')+text(project.schemaBinding.en,128,536,13,'#53654c');
web+=button('套用方案綁定',115,578,286)+text('空白鍵點按行為',115,653,11,'#6e7b67')+rect(115,671,286,38,'#ffffff',6,'#dfe5d9')+text(SPACE_ACTIONS.find(([id])=>id===project.behavior.spaceAction)[1],128,690,12,'#53654c')+graphic('down',382,690,14,'#87967d');
web+=text('中文鍵盤字面',115,751,11,'#6e7b67')+rect(115,769,286,38,'#ffffff',6,'#dfe5d9')+text('倉頡字根（預設）',128,788,12,'#53654c')+graphic('down',382,788,14,'#87967d');
web+=text('上下滑提示大小',115,850,11,'#6e7b67')+text(`${project.swipeHints.scale}%`,401,850,11,'#6e7b67',400,'end')+rect(115,878,286,4,'#e4eadf',2)+rect(115,878,143,4,'#8da77e',2)+rect(252,872,16,16,'#6e8d5d',8);
web+=text('YOUR KEYBOARD, YOUR WAY',493,124,11,'#99a68c',500)+text('讓每一次輸入，都剛剛好。',493,165,28,'#354632',550)+text('從一點透明、一個鍵位，做出自己的日常。',493,206,12,'#7f8d76');
web+=text('由 JACKCHAN000 製作 · GitHub 原始碼',493,229,11,'#526c48');
web+=button('深色',493,247,86,{active:true})+graphic('moon',507,265,13,'#53664f')+button('淺色',579,247,86)+graphic('sun',593,265,13,'#53664f')+button('iPhone · 直向',1185,247,180);
web+=rect(674,320,448,111,'#ffffff',12,'#e4e9df')+text('●  試打紙',690,340,10,'#8fa07f')+text('日常的字句，也可以有喜歡的模樣。',690,375,13,'#b5bcb1')+text('僅存在此瀏覽器',1104,340,9,'#a6afa0',400,'end');
const webKeyboard=keyboard({web:true});web+=`<g transform="translate(664 446) scale(1.2)">${webKeyboard.svg}</g>`;
web+=text('中文 · 倉頡字根',898,816,11,'#87967d',400,'middle')+text('iOS 佈局',1032,816,11,'#87967d',400,'middle');
['中文','數字','符號 1','#+=','元書符號'].forEach((label,i)=>{web+=button(label,614+i*96,854,86,{active:i===0});});
web+=rect(0,929,1440,31,'#ffffff')+text('● 已儲存在此瀏覽器',18,944,10,'#87967d')+text('介面示意圖 · 依目前程式與預設設定繪製',1420,944,10,'#87967d',400,'end');

let skins=rect(0,0,1280,455,'#f5f6f3');
skins+=text('生成皮膚預覽',30,32,23,'#27332e',600)+text('依目前匯出設定繪製；原生字形與材質以元書實機為準。',30,66,12,'#74816e');
for(const [i,options] of [{locale:'zh'},{locale:'en'},{locale:'zh',page:'numeric'}].entries()){
  const x=30+i*415,k=keyboard(options),name=i===0?'中文 · 倉頡字根':i===1?'英文 · 小寫':'數字 · 四排快捷';
  skins+=text(name,x,106,14,'#53654c',600)+text(i===0?project.schemaBinding.zh:i===1?project.schemaBinding.en:'+ - * / ( )',x+390,106,11,'#87967d',400,'end');
  skins+=`<g transform="translate(${x} 128)">${k.svg}</g>`;
}
mkdirSync(out,{recursive:true});
writeFileSync(`${out}web-studio.svg`,svg(1440,960,web,'元書造型所編輯器介面示意'));
writeFileSync(`${out}generated-skins.svg`,svg(1280,455,skins,'中文、英文與數字鍵盤生成預覽'));
execFileSync('python',[fileURLToPath(new URL('./rasterize-readme-images.py',import.meta.url))],{stdio:'inherit'});
