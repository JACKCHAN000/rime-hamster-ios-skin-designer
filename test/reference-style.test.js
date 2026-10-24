import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, upgradeProject, keyboardRows, validateProject, DEFAULT_TOOLBAR } from '../src/model.js';
import { buildNativeKeyboard } from '../src/native.js';
import { effectiveCell, selectedStyles } from '../src/preview.js';
import { controlsHtml } from '../src/ui.js';
import { renderKeyboard } from '../src/preview.js';
import { systemIcon, iconShapes } from '../src/icons.js';

test('精簡配置除句號隱藏快捷外不預設功能鍵滑動，長按及六鍵順序保留',()=>{
  const p=createProject(),root=buildNativeKeyboard(p);
  for(const id of ['shift','backspace','symbols','numeric','language','space','enter']){
    assert.equal(root[`key_${id}`].swipeUpAction,undefined,id);assert.equal(root[`key_${id}`].swipeDownAction,undefined,id);
    assert.equal(root[`key_${id}_swipeUp_hint`],undefined,id);assert.equal(root[`key_${id}_swipeDown_hint`],undefined,id);
  }
  assert.deepEqual(root.key_period.swipeUpAction,{character:'/'});assert.deepEqual(root.key_period.swipeDownAction,{character:'/'});
  assert.equal(root.key_period_swipeUp_hint,undefined);assert.equal(root.key_period_swipeDown_hint,undefined);
  assert.ok(root.key_period.hintSymbolsStyle);assert.ok(root.key_symbols.hintSymbolsStyle);
  assert.deepEqual(keyboardRows(p).at(-1).map((k)=>k.id),['symbols','numeric','language','space','period','enter']);
});
test('字母提示同列左右排，主字母下移；未設定的下滑不製造角標',()=>{
  const root=buildNativeKeyboard(createProject());
  assert.deepEqual(root.key_q_swipeUp_hint.center,{x:0.24,y:0.20});assert.deepEqual(root.key_q_swipeDown_hint.center,{x:0.79,y:0.20});
  assert.deepEqual(root.key_q_fg.center,{x:0.5,y:0.60});
  assert.equal(root.key_x_swipeUp_hint.text,'「');assert.equal(root.key_x_swipeDown_hint,undefined);
  assert.equal(root.key_n.swipeUpAction.symbol,',');assert.equal(root.key_m.swipeUpAction.symbol,'。');
});
test('繁簡以繁／簡文字回應狀態，保留快捷指令和通知',()=>{
  const root=buildNativeKeyboard(createProject());
  assert.equal(root.tool_traditional_zh_fg.text,'繁');assert.equal(root.tool_traditional_cn_fg.text,'簡');
  assert.equal(root.tool_traditional_zh_fg.systemImageName,undefined);assert.deepEqual(root.tool_traditional.action,{shortcut:'#简繁切换'});
  const a=effectiveCell(root.tool_traditional,root,{simplified:false}),b=effectiveCell(root.tool_traditional,root,{simplified:true});
  assert.equal(root[selectedStyles(a.foregroundStyle,{simplified:false})[0]].text,'繁');assert.equal(root[selectedStyles(b.foregroundStyle,{simplified:true})[0]].text,'簡');
});
test('工具列依修正排列七項，底列保留中英切換',()=>{
  const p=createProject();assert.deepEqual(p.toolbar,['menu','emoji','phrase','clipboard','script','traditional','dismiss']);
  const root=buildNativeKeyboard(p);assert.equal(root.tool_menu_fg.text,'☰');assert.equal(root.key_language_fg.text,'中');assert.equal(root.key_space_fg.text,'␣');
});
test('完整快捷需明確選用，關閉預設仍保留逐鍵自訂',()=>{
  const p=createProject();p.behavior.swipePreset='full';let root=buildNativeKeyboard(p);
  assert.deepEqual(root.key_space.swipeDownAction,{shortcut:'#三选上屏'});assert.deepEqual(root.key_c.swipeUpAction,{shortcut:'#copy'});
  assert.equal(root.key_c_swipeUp_hint.buttonStyleType,'text');assert.equal(root.key_c_swipeUp_hint.text,'複製');
  p.behavior.swipePreset='off';p.keys['zh:space']={swipeUpAction:{shortcut:'#copy'}};root=buildNativeKeyboard(p);
  assert.equal(root.key_q.swipeUpAction,undefined);assert.deepEqual(root.key_space.swipeUpAction,{shortcut:'#copy'});assert.equal(root.key_space.swipeDownAction,undefined);
});
test('舊專案套用參考圖順序並備份原排序，保留配色與自訂動作',()=>{
  const old=createProject();old.editorRevision=3;delete old.behavior.swipePreset;delete old.behavior.hintStyle;
  old.toolbar=['menu','emoji','script','symbols','language','traditional','phrase','clipboard','dismiss'];
  old.keys['zh:q']={swipeDownAction:{shortcut:'#copy'}};old.colors.dark.background='#123456';
  const next=upgradeProject(old);assert.deepEqual(next.toolbar,DEFAULT_TOOLBAR);assert.equal(next.behavior.swipePreset,'reference');assert.equal(next.behavior.hintStyle,'text');
  assert.deepEqual(next.keys,old.keys);assert.deepEqual(next.colors,old.colors);assert.equal(old.behavior.swipePreset,undefined);assert.deepEqual(upgradeProject(next),next);
  old.toolbar=['menu','script','emoji','traditional'];const custom=upgradeProject(old);assert.deepEqual(custom.toolbar,DEFAULT_TOOLBAR);assert.deepEqual(custom.compatibility.previousToolbar,old.toolbar);
});
test('常用語對話泡泡與剪貼簿有不同圖示，預覽、原生與 PNG 使用一致映射',()=>{
  const p=createProject(),root=buildNativeKeyboard(p),preview=renderKeyboard(p,{theme:'dark',locale:'zh',page:'main',orientation:'portrait'});
  assert.equal(root.tool_phrase_fg.systemImageName,'text.bubble');assert.equal(root.tool_clipboard_fg.systemImageName,'doc.on.clipboard');
  assert.equal(systemIcon('text.bubble'),'message');assert.equal(systemIcon('doc.on.clipboard'),'clipboard');
  assert.equal(preview.cells.get('tool_phrase').icon,'message');assert.equal(preview.cells.get('tool_clipboard').icon,'clipboard');
  assert.ok(iconShapes('message').some((shape)=>shape.attributes.d?.includes('M7 9h10')));assert.notDeepEqual(iconShapes('message'),iconShapes('clipboard'));
  assert.equal(root.tool_symbols,undefined);assert.deepEqual(root.toolbarLayout[0].HStack.subviews.map((cell)=>cell.Cell),DEFAULT_TOOLBAR.map((id)=>`tool_${id}`));
});
test('滑動配置及提示可由介面選擇，格式檢查拒絕未知模式',()=>{
  const p=createProject(),view={theme:'dark',locale:'zh',page:'main',orientation:'portrait'};
  const html=controlsHtml(p,view,'layout',renderKeyboard(p,view));assert.ok(html.includes('behavior.swipePreset'));assert.ok(html.includes('功能鍵不顯示提示'));assert.ok(html.includes('文字／符號'));
  p.behavior.swipePreset='random';assert.ok(validateProject(p).some((e)=>e.includes('滑動預設')));
});
