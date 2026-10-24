import {keyboardSwitchType} from '../src/schema-binding.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createProject,keyboardRows,upgradeProject,DEFAULT_TOOLBAR} from '../src/model.js';
import {buildNativeKeyboard,buildConfig,packageEntries,parseNativeYaml,validateNative} from '../src/native.js';
import {renderKeyboard,effectiveCell,selectedStyles} from '../src/preview.js';
import {createHoldModel,holdMarkup} from '../src/hold.js';
import {selectHoldAtPoint,releaseDecision} from '../src/gestures.js';
import {insertPreviewText} from '../src/typing.js';
import {extractArchive} from '../src/importer.js';

const view={theme:'dark',page:'main',locale:'zh',orientation:'portrait',category:'常用',preedit:false,shifted:false,simplified:false};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('移除預設和舊草稿工具列中英，但保留底列切換和其他自訂',()=>{
  const p=createProject();assert.ok(!p.toolbar.includes('language'));assert.equal(p.toolbar.length,7);assert.ok(buildNativeKeyboard(p).key_language);
  const old=createProject();old.editorRevision=5;old.toolbar=['menu','language','copy','emoji'];old.keys['zh:q']={label:'甲'};
  const next=upgradeProject(old);assert.deepEqual(next.toolbar,['menu','copy','emoji']);assert.deepEqual(next.keys,old.keys);assert.equal(next.editorRevision,14);assert.deepEqual(old.toolbar,['menu','language','copy','emoji']);assert.deepEqual(upgradeProject(next),next);
});
test('中英文字隨鍵盤切換，背景維持普通按鍵',()=>{
  const p=createProject();p.toolbar.push('language');
  for(const theme of ['dark','light']){
    const root=buildNativeKeyboard(p,{theme});
    for(const name of ['key_language','tool_language']){
      const zh=effectiveCell(root[name],root,{...view,locale:'zh'}),english=buildNativeKeyboard(p,{theme,locale:'en'}),en=effectiveCell(english[name],english,{...view,locale:'en'});
      assert.equal(root[selectedStyles(zh.foregroundStyle,view)[0]].text,'中');assert.equal(english[selectedStyles(en.foregroundStyle,{locale:'en'})[0]].text,'EN');
      assert.equal(root[selectedStyles(zh.backgroundStyle,view)[0]].normalColor,english[selectedStyles(en.backgroundStyle,{locale:'en'})[0]].normalColor);
      assert.equal(keyboardSwitchType(zh.action),'alphabetic');assert.equal(keyboardSwitchType(en.action),'pinyin');
    }
  }
  const zh=renderKeyboard(p,view),en=renderKeyboard(p,{...view,locale:'en'});assert.equal(zh.cells.get('key_language').label,'中');assert.equal(en.cells.get('key_language').label,'EN');
});
test('每個有預設滑動的鍵都有單行長按，順序為上滑、原鍵、下滑，預選原鍵',()=>{
  const p=createProject();
  for(const preset of ['reference','full'])for(const locale of ['zh','en']){
    p.behavior.swipePreset=preset;const root=buildNativeKeyboard(p,{locale});
    for(const key of keyboardRows(p,{locale}).flat()){
      const cell=root[`key_${key.id}`];if(!cell||key.longPress)continue;
      const up=cell.swipeUpAction&&cell.swipeUpAction!=='none',down=cell.swipeDownAction&&cell.swipeDownAction!=='none';if(!up&&!down)continue;
      const hint=root[cell.hintSymbolsStyle];assert.ok(hint,key.id);assert.equal(cell.hintSymbolsGridStyle,undefined,key.id);
      const actions=hint.symbolStyles.map((name)=>root[name].action);assert.equal(hint.selectedIndex,up?1:0,key.id);assert.deepEqual(actions[hint.selectedIndex],cell.action,key.id);
      if(up)assert.deepEqual(actions[0],cell.swipeUpAction,key.id);if(down)assert.deepEqual(actions.at(-1),cell.swipeDownAction,key.id);
    }
  }
});
test('原鍵長按送給 RIME，Shift 狀態仍正確，單方向不造出多餘候選',()=>{
  const p=createProject(),root=buildNativeKeyboard(p),q=createHoldModel(root,root.key_q,view),x=createHoldModel(root,root.key_x,view);
  assert.equal(q.selected.col,1);assert.deepEqual(q.choices.map((c)=>c.action),[{symbol:'1'},{character:'q'},{symbol:'!'}]);
  assert.equal(x.choices.length,2);assert.equal(x.selected.col,1);
  const en=buildNativeKeyboard(p,{locale:'en'}),upper=createHoldModel(en,en.key_q,{...view,locale:'en',shifted:true});assert.deepEqual(upper.choices[1].action,{character:'Q'});
});
test('句號單行長按預選句號，直接指向面板格子可選取，選中標記與輸出動作一致',()=>{
  const root=buildNativeKeyboard(createProject()),model=createHoldModel(root,root.key_period,view);
  assert.equal(model.singleRow,true);assert.equal(model.selected.col,1);assert.ok(holdMarkup(model).includes('aria-selected="true"'));assert.ok(holdMarkup(model).includes('hold-choice active'));
  assert.equal(root.hintSelected.normalColor,root.hintSelected.highlightColor);assert.ok(root.hintSelected.normalColor);
  const rectangles=model.choices.map((c)=>({row:0,col:c.col,left:20+c.col*44,right:62+c.col*44,top:10,bottom:54}));
  const selected=selectHoldAtPoint(model.hint,model.rows,model.origin,70,-120,{x:20+4*44+10,y:30},rectangles,{left:16,right:290,top:6,bottom:58},{singleRow:true});
  assert.deepEqual(selected,{row:0,col:4});
  const result=releaseDecision({...model,held:true,selected},model.choiceRoot);assert.deepEqual(result,{kind:'hold',action:{symbol:'!'}});
  const vertical=selectHoldAtPoint(model.hint,model.rows,model.origin,0,-50,{x:1,y:100},[],null,{singleRow:true});assert.equal(vertical.col,1);
});
test('長按選字在編輯模式也能插入試打區，一般編輯點按不會誤輸入',()=>{
  const paper={value:'甲乙',selectionStart:1,selectionEnd:1,setRangeText(text,start,end){this.value=this.value.slice(0,start)+text+this.value.slice(end);this.selectionStart=this.selectionEnd=start+text.length;}};
  assert.equal(insertPreviewText(paper,'?',{testing:false}),false);assert.equal(paper.value,'甲乙');
  assert.equal(insertPreviewText(paper,'，',{testing:false,fromGesture:true}),true);assert.equal(paper.value,'甲，乙');
});
test('浮動菜單有獨立 panel 映射、四個檔案與八個動作，菜單不切換主鍵盤',()=>{
  const p=createProject(),main=buildNativeKeyboard(p),config=buildConfig(p);assert.deepEqual(main.tool_menu.action,{floatKeyboardType:'panel'});
  for(const orientation of ['portrait','landscape']){
    const root=buildNativeKeyboard(p,{page:'panel',orientation});assert.deepEqual(root.floatTargetScale,{x:0.75,y:0.6});assert.equal(root.toolbarHeight,0);assert.equal(root.keyboardLayout.length,2);assert.equal(root.keyboardLayout[0].HStack.subviews.length,4);assert.deepEqual(validateNative(root),[]);
  }
  assert.equal(config.panel.iPhone.portrait,'panel_portrait');assert.equal(config.panel.iPad.floating,'panel_portrait');
  const files=packageEntries(p,png);for(const theme of ['light','dark'])for(const orientation of ['portrait','landscape'])assert.ok(files[`${theme}/panel_${orientation}.yaml`]);
});
const reference=new URL('../仿仓默认Hydro改.cskin',import.meta.url);
test('提供的皮膚可解析：浮動菜單與單行選取結構與實作對照',{skip:!existsSync(reference)},()=>{
  const files=extractArchive(new Uint8Array(readFileSync(reference))),root=parseNativeYaml(new TextDecoder().decode(files['dark/pinyin_26_portrait.yaml'])),panel=parseNativeYaml(new TextDecoder().decode(files['dark/panel_portrait.yaml']));
  assert.deepEqual(root.toolbarMenuButton.action,{floatKeyboardType:'panel'});assert.deepEqual(buildNativeKeyboard(createProject(),{page:'panel'}).floatTargetScale,panel.floatTargetScale);
  const hint=root[root.spaceRightButton.hintSymbolsStyle];assert.ok(Array.isArray(hint.symbolStyles));assert.ok(Number.isInteger(hint.selectedIndex));assert.equal(createHoldModel(root,root.spaceRightButton,view).selected.col,hint.selectedIndex);
});
