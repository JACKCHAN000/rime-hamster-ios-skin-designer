import {keyboardSwitchType} from '../src/schema-binding.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, keyboardRows } from '../src/model.js';
import { buildNativeKeyboard } from '../src/native.js';
import { renderKeyboard } from '../src/preview.js';
import { controlsHtml } from '../src/ui.js';
import { actionStyle, glyphStyle } from '../src/key-presentation.js';
import { drawIcon, iconShapes, systemIcon } from '../src/icons.js';

const view={theme:'dark',locale:'zh',orientation:'portrait',page:'main',category:'常用',preedit:false,shifted:false,simplified:false,candidates:'none'};

test('空白鍵使用正確 U+2423 Open Box，實際動作仍是 space',()=>{
  const p=createProject();
  for(const bottomRow of ['enhanced','legacy'])for(const locale of ['zh','en'])for(const page of ['main','symbols1','symbols2','numeric']){
    p.behavior.bottomRow=bottomRow;
    const root=buildNativeKeyboard(p,{locale,page}),key=keyboardRows(p,{locale,page}).flat().find((key)=>key.id==='space');
    assert.equal(key.label,'␣');assert.equal(root.key_space_fg.buttonStyleType,'text');assert.equal(root.key_space_fg.text.codePointAt(0),0x2423);assert.equal(root.key_space_fg.text.length,1);assert.equal(root.key_space.action,'space');
  }
});
test('符號與數字頁使用返回圖示，與 Enter 圖示不同',()=>{
  const p=createProject();
  for(const locale of ['zh','en'])for(const page of ['symbols1','symbols2','numeric']){
    const root=buildNativeKeyboard(p,{locale,page}),id=page==='numeric'?'numeric':'return';
    assert.equal(root[`key_${id}_fg`].buttonStyleType,'systemImage');assert.equal(root[`key_${id}_fg`].systemImageName,'arrow.uturn.backward');assert.equal(root[`key_${id}_fg`].text,undefined);
    assert.equal(root[`key_${id}`].action,'returnPrimaryKeyboard');assert.equal(root.key_enter_fg.systemImageName,'return');
  }
  const root=buildNativeKeyboard(p,{page:'hamster'});assert.equal(root.collectionReturnFg.systemImageName,'arrow.uturn.backward');assert.equal(root.collectionReturn.action,'returnPrimaryKeyboard');
});
test('中英鍵切換實際鍵盤檔，以文字區分且保留普通底色',()=>{
  const p=createProject();p.toolbar.push('language');const zh=buildNativeKeyboard(p),en=buildNativeKeyboard(p,{locale:'en'});
  for(const id of ['key_language','tool_language']){
    assert.equal(zh[zh[id].foregroundStyle].text,'中');assert.equal(en[en[id].foregroundStyle].text,'EN');
    assert.equal(keyboardSwitchType(zh[id].action),'alphabetic');assert.equal(keyboardSwitchType(en[id].action),'pinyin');
    assert.equal(zh[id].backgroundStyle,en[id].backgroundStyle);
  }
});
test('易識別工具與翻頁用圖示，繁簡和菜單維持文字',()=>{
  const p=createProject();p.toolbar.push('symbols');const root=buildNativeKeyboard(p);
  for(const name of ['tool_emoji_fg','tool_script_fg','tool_phrase_fg','tool_clipboard_fg','tool_dismiss_fg','candidatePreviousFg','candidateNextFg','candidateCollapseFg','expandFg'])assert.equal(root[name].buttonStyleType,'systemImage',name);
  assert.equal(root.tool_traditional_zh_fg.buttonStyleType,'text');assert.equal(root.tool_traditional_zh_fg.text,'繁');assert.equal(root.tool_traditional_cn_fg.text,'簡');
  assert.equal(root.tool_menu_fg.buttonStyleType,'text');assert.equal(root.tool_menu_fg.text,'☰');
  assert.equal(root.key_symbols_fg.text,'#+=');assert.equal(root.tool_symbols_fg.text,'#+=');
});
test('快捷提示可用圖示，符號及使用者字面保持原文與輸出值',()=>{
  const p=createProject();p.behavior.swipePreset='full';p.behavior.hintStyle='icons';p.keys['zh:q']={swipeUpAction:{symbol:'copy'},label:'copy'};
  const root=buildNativeKeyboard(p);
  assert.equal(root.key_c_swipeUp_hint.systemImageName,'doc.on.doc');assert.deepEqual(root.key_c.swipeUpAction,{shortcut:'#copy'});
  assert.equal(root.key_q_fg.buttonStyleType,'text');assert.equal(root.key_q_fg.text,'copy');assert.equal(root.key_q_swipeUp_hint.buttonStyleType,'text');assert.equal(root.key_q_swipeUp_hint.text,'cop');assert.deepEqual(root.key_q.swipeUpAction,{symbol:'copy'});
  assert.deepEqual(actionStyle({symbol:'copy'}),{buttonStyleType:'text',text:'copy'});assert.deepEqual(glyphStyle('constructor'),{buttonStyleType:'text',text:'constructor'});
});
test('圖示保留繁中提示、無障礙名稱與易讀的編輯字面',()=>{
  const p=createProject(),preview=renderKeyboard(p,view);
  assert.ok(preview.html.includes('aria-label="空白鍵"'));assert.ok(preview.html.includes('aria-label="中英切換"'));
  const symbols=renderKeyboard(p,{...view,page:'symbols1'});assert.equal(symbols.cells.get('key_return').accessibilityLabel,'返回中文鍵盤');assert.equal(symbols.cells.get('key_return').icon,'back');
  const html=controlsHtml(p,{...view,page:'symbols1',selected:'key_return'},'keys',symbols);assert.ok(html.includes('value="↶"'));assert.ok(!html.includes('value="arrow.uturn.backward"'));
});
test('原生系統圖示都有網頁向量及 PNG 繪圖路徑',()=>{
  const p=createProject();
  const names=new Set(['main','hamster','numeric','symbols1'].flatMap((page)=>Object.values(buildNativeKeyboard(p,{page})).filter((style)=>style?.buttonStyleType==='systemImage').map((style)=>style.systemImageName)));
  const priorPath=globalThis.Path2D;let drawn=0;
  globalThis.Path2D=class {constructor(path){assert.ok(path.length>0);}};
  const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},roundRect(){},arc(){},ellipse(){},stroke(){drawn++;},fill(){drawn++;}};
  try{for(const name of names){const vector=systemIcon(name);assert.ok(vector,name);assert.ok(iconShapes(vector).length,name);assert.equal(drawIcon(ctx,vector,10,10,18,'#FFFFFF'),true);}}finally{globalThis.Path2D=priorPath;}
  assert.ok(drawn>names.size);assert.equal(drawIcon(ctx,'missing',10,10,18,'#FFFFFF'),false);
});
