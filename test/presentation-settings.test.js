import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {strFromU8,strToU8} from 'fflate';
import {createProject,keyboardRows,upgradeProject,validateProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml,exportArchive} from '../src/native.js';
import {renderKeyboard} from '../src/preview.js';
import {importBytes} from '../src/importer.js';
import {createHoldModel} from '../src/hold.js';
import {DEFAULT_SWIPE_HINTS} from '../src/presentation-settings.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));
const view={theme:'dark',orientation:'portrait',locale:'zh',page:'main',category:'常用'};

test('倉頡鍵面完整對應三排，仍送原字母且長按原鍵一致',()=>{
  const p=createProject(),rows=keyboardRows(p),root=buildNativeKeyboard(p);
  assert.equal(p.legend,'cangjie');assert.deepEqual(rows.slice(0,3).map((row)=>row.filter((key)=>key.role==='letter').map((key)=>key.label).join('')),['手田水口廿卜山戈人心','日尸木火土竹十大中','符難金女月弓一']);
  for(const row of rows)for(const key of row.filter((key)=>key.role==='letter'))assert.deepEqual(root[`key_${key.id}`].action,{character:key.id});
  const hold=createHoldModel(root,root.key_q,view);assert.equal(hold.choices[hold.selected.col].label,'手');assert.deepEqual(hold.choices[hold.selected.col].action,{character:'q'});
  for(const legend of ['uppercase','lowercase']){p.legend=legend;assert.equal(buildNativeKeyboard(p).key_q_fg.text,legend==='uppercase'?'Q':'q');}
  p.legend='cangjie';p.keys['zh:q']={label:'自訂'};assert.equal(buildNativeKeyboard(p).key_q_fg.text,'自訂');
  const english=buildNativeKeyboard(p,{locale:'en'});assert.equal(english.key_q_fg.text,'q');assert.deepEqual(english.key_q.uppercasedStateAction,{character:'Q'});
});
test('提示大小與顏色套用正常及英文大小寫圖層，非法設定會被拒絕',()=>{
  const p=createProject();let root=buildNativeKeyboard(p);assert.equal(root.key_q_swipeUp_hint.fontSize,10.5);assert.equal(root.key_q_swipeDown_hint.fontSize,10.5);
  p.swipeHints.scale=200;p.swipeHints.colors={dark:'#77BBFF',light:'#234567'};
  for(const theme of ['dark','light']){
    root=buildNativeKeyboard(p,{theme,locale:'en'});assert.equal(root.key_q_swipeUp_hint.fontSize,14);assert.equal(root.key_q_swipeDown_hint.normalColor,p.swipeHints.colors[theme]);
    assert.ok(root.key_q.uppercasedStateForegroundStyle.includes('key_q_swipeUp_hint'));assert.ok(root.key_q.capsLockedStateForegroundStyle.includes('key_q_swipeDown_hint'));
    assert.equal(root.key_q.swipeUpForegroundStyle,undefined);
  }
  p.swipeHints.scale=999;assert.ok(validateProject(p).some((error)=>error.includes('上下滑提示')));
});
test('舊專案補入字根及提示設定，原始覆寫與自訂字面保留且可往返',()=>{
  const old=createProject();old.editorRevision=12;old.legend='uppercase';delete old.swipeHints;old.keys['zh:a']={label:'自訂日'};
  old.nativeOverrides['dark/pinyin_portrait.yaml']={key_q_fg:{buttonStyleType:'text',text:'Q',fontSize:22,normalColor:'#FFFFFF'},key_q_swipeUp_hint:{buttonStyleType:'text',text:'1',fontSize:7,normalColor:'#FFFFFF7A'}};
  const before=structuredClone(old),next=upgradeProject(old);assert.deepEqual(old,before);assert.equal(next.legend,'cangjie');assert.deepEqual(next.swipeHints,DEFAULT_SWIPE_HINTS);assert.deepEqual(next.keys,old.keys);assert.deepEqual(next.nativeOverrides,old.nativeOverrides);
  assert.equal(buildNativeKeyboard(next).key_q_fg.text,'手');assert.equal(buildNativeKeyboard(next).key_q_swipeUp_hint.fontSize,10.5);
  const fromJson=importBytes(strToU8(JSON.stringify(old)),'old.json').project;assert.deepEqual(fromJson,next);
  assert.deepEqual(importBytes(exportArchive(next,png),'new.cskin').project,next);
  const lowercase=structuredClone(old);lowercase.legend='lowercase';assert.equal(upgradeProject(lowercase).legend,'lowercase');
});
test('匯出的空白符號 PNG 透明範圍確實佔寬 40%，圖集及語意完整',()=>{
  const p=createProject(),files=packageEntries(p,png),root=parseNativeYaml(strFromU8(files['dark/pinyin_portrait.yaml'])),style=root.key_space_openBox;
  assert.equal(root.key_space.action,'space');assert.equal(root.key_space_fg.text.codePointAt(0),0x2423);assert.ok(root.key_space.foregroundStyle.includes('key_space_openBox'));
  const base=`dark/resources/${style.normalImage.file}`,image=files[`${base}.png`],sprites=parseNativeYaml(strFromU8(files[`${base}.yaml`]));
  assert.equal(style.contentMode,'scaleToFill');assert.equal(sprites.openBox.rect.width,320);
  const bytes=Buffer.from(image),idat=[];let width,height;
  for(let at=8;at<bytes.length;){const size=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+size);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);}if(type==='IDAT')idat.push(data);at+=size+12;}
  const rgba=inflateSync(Buffer.concat(idat)),columns=new Set();
  for(let y=0;y<height;y++){assert.equal(rgba[y*(width*4+1)],0);for(let x=0;x<width;x++)if(rgba[y*(width*4+1)+1+x*4+3])columns.add(x);}
  assert.equal(columns.size/width,.4);assert.equal(Math.min(...columns),96);assert.equal(Math.max(...columns),223);
  assert.ok(renderKeyboard(p,view).html.includes('preserveAspectRatio="none"'));
  const imported=importBytes(exportArchive(p,png),'space.cskin');assert.deepEqual(imported.project,p);
});
