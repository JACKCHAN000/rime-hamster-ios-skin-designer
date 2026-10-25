import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, strFromU8 } from 'fflate';
import { createProject, keyboardRows, upgradeProject, validateProject, pageFromAction, DEFAULT_TOOLBAR } from '../src/model.js';
import { buildNativeKeyboard, buildConfig, packageEntries, validateNative } from '../src/native.js';
import { renderKeyboard } from '../src/preview.js';
import { controlsHtml } from '../src/ui.js';
import { actionFromFields } from '../src/actions.js';
import { importBytes } from '../src/importer.js';
import { loadDraft, listTemplates } from '../src/storage.js';

const view={theme:'dark',locale:'zh',orientation:'portrait',page:'main',category:'常用',preedit:false,shifted:false,simplified:false,candidates:'none'};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('主鍵盤底列符合六鍵順序，保留玻璃外觀及大小寫送鍵分離',()=>{
  const p=createProject();
  for(const locale of ['zh','en']) {
    const rows=keyboardRows(p,{locale});
    assert.deepEqual(rows.at(-1).map((key)=>key.id),['symbols','numeric','language','space','period','enter']);
    assert.equal(rows.at(-1).reduce((sum,key)=>sum+key.width,0),10);
    assert.equal(rows[0][0].label,locale==='zh'?'手':'q');assert.deepEqual(rows[0][0].action,{character:'q'});
  }
  assert.equal(p.appearance,'glass');
  p.behavior.bottomRow='legacy';assert.equal(keyboardRows(p).at(-1).length,4);
});
test('中英文句號及長按分開設定，英文的句號快捷輸出半形',()=>{
  const p=createProject(),root=buildNativeKeyboard(p),period=root.key_period;
  assert.deepEqual(period.action,{symbol:'。'});
  const legacy=root[period.hintSymbolsStyle];
  assert.equal(period.hintSymbolsGridStyle,undefined);assert.equal(legacy.selectedIndex,1);
  assert.deepEqual(legacy.symbolStyles.map((name)=>root[name].action.symbol),['，','。',',','.','!','?']);assert.equal(period.repeatAction,undefined);
  for(const theme of ['dark','light'])for(const orientation of ['portrait','landscape'])for(const page of ['main','symbols1','symbols2']){
    const en=buildNativeKeyboard(p,{theme,orientation,page,locale:'en'}),hint=en[en.key_period.hintSymbolsStyle];
    assert.equal(en.key_period_fg.text,'.');assert.deepEqual(en.key_period.action,{symbol:'.'});
    assert.deepEqual(hint.symbolStyles.map((name)=>en[name].action.symbol),[',','.','!','?']);assert.equal(hint.selectedIndex,1);
    if(page==='main'){assert.deepEqual(en.key_m.swipeUpAction,{symbol:'.'});assert.equal(en.key_m_swipeUp_hint.text,'.');}
  }
  p.behavior.swipePreset='full';assert.deepEqual(buildNativeKeyboard(p,{locale:'en'}).key_period.swipeUpAction,{character:'/'});
});
test('參考配置只在字母鍵提供數字標點，未設定方向不顯示提示',()=>{
  const p=createProject(),root=buildNativeKeyboard(p);
  for(const key of keyboardRows(p).flat().filter((k)=>k.role==='letter')) {
    const cell=root[`key_${key.id}`];assert.ok(cell.swipeUpAction,key.id);
    assert.ok(cell.foregroundStyle.includes(`key_${key.id}_swipeUp_hint`));
    assert.equal(cell.foregroundStyle.includes(`key_${key.id}_swipeDown_hint`),!!cell.swipeDownAction);
    assert.equal(cell.swipeUpForegroundStyle,undefined);assert.equal(cell.swipeDownForegroundStyle,undefined);
  }
  assert.deepEqual(root.key_c.swipeUpAction,{symbol:'」'});assert.deepEqual(root.key_v.swipeUpAction,{symbol:'<'});
  assert.deepEqual(root.key_q.swipeUpAction,{symbol:'1'});assert.deepEqual(root.key_q.swipeDownAction,{symbol:'!'});
  assert.equal(renderKeyboard(p,view).cells.get('key_q').label,'手');
});
test('上下滑可各自設定快捷指令、RIME 送鍵、腳本與停用',()=>{
  const p=createProject();p.keys['zh:q']={swipeUpAction:actionFromFields('shortcut','#showPasteboardView'),swipeDownAction:actionFromFields('runScript','我的腳本')};
  assert.deepEqual(validateProject(p),[]);let root=buildNativeKeyboard(p);
  assert.deepEqual(root.key_q.swipeUpAction,{shortcut:'#showPasteboardView'});assert.deepEqual(root.key_q.swipeDownAction,{runScript:'我的腳本'});
  p.keys['zh:q'].swipeDownAction=actionFromFields('sendKeys','Shift+Tab');assert.deepEqual(buildNativeKeyboard(p).key_q.swipeDownAction,{sendKeys:'Shift+Tab'});
  p.keys['zh:q'].swipeUpAction=actionFromFields('disabled','');root=buildNativeKeyboard(p);assert.equal(root.key_q.swipeUpAction,'none');assert.equal(root.key_q_swipeUp_hint,undefined);
  delete p.keys['zh:q'].swipeUpAction;assert.deepEqual(buildNativeKeyboard(p).key_q.swipeUpAction,{symbol:'1'});
});
test('按鍵表單提供上下滑快捷指令選單，句號表單顯示內建標點',()=>{
  const p=createProject(),preview=renderKeyboard(p,view);
  let html=controlsHtml(p,{...view,selected:'key_q'},'keys',preview);
  assert.ok(html.includes('data-swipe-form="swipeUpAction"'));assert.ok(html.includes('data-swipe-form="swipeDownAction"'));assert.ok(html.includes('#copy'));assert.ok(html.includes('runScript'));
  html=controlsHtml(p,{...view,selected:'key_period'},'keys',preview);assert.ok(html.includes('，|。|,|.|!|?'));
});
test('預設工具列有 Emoji 與腳本，菜單是指定 Unicode ☰',()=>{
  const p=createProject(),root=buildNativeKeyboard(p);
  assert.ok(p.toolbar.includes('emoji'));assert.ok(p.toolbar.includes('script'));assert.ok(p.toolbar.includes('menu'));
  assert.deepEqual(root.tool_emoji.action,{keyboardType:'emojis'});assert.deepEqual(root.tool_script.action,{shortcut:'#toggleScriptView'});
  assert.equal(root.tool_menu_fg.buttonStyleType,'text');assert.equal(root.tool_menu_fg.text,'☰');assert.equal(root.tool_menu_fg.systemImageName,undefined);
  assert.deepEqual(root.tool_menu.action,{floatKeyboardType:'panel'});
  assert.ok(renderKeyboard(p,view).html.includes('☰'));
});
test('獨立數字鍵盤及英文數字頁皆有完整映射、數字與返回動作',()=>{
  const p=createProject(),config=buildConfig(p);
  assert.equal(keyboardRows(p).at(-1)[1].action.keyboardType,'numeric');
  assert.deepEqual(pageFromAction({keyboardType:'numeric'}),{page:'numeric',locale:'zh'});
  assert.deepEqual(pageFromAction({keyboardType:'studio_en_numeric'}),{page:'numeric',locale:'en'});
  for(const locale of ['zh','en'])for(const orientation of ['portrait','landscape']) {
    const root=buildNativeKeyboard(p,{page:'numeric',locale,orientation});assert.equal(root.keyboardLayout.length,4);
    for(let n=0;n<=9;n++)assert.deepEqual(root[`key_digit_${n}`].action,{symbol:String(n)});
    for(const [id,value] of Object.entries({plus:'+',minus:'-',multiply:'*',divide:'/',open_paren:'(',close_paren:')',dot:'.',equal:'='}))assert.deepEqual(root[`key_numeric_${id}`].action,{symbol:value});
    assert.equal(root.key_numeric.action,'returnPrimaryKeyboard');assert.deepEqual(validateNative(root),[]);
  }
  assert.ok(config.numeric.iPhone.portrait);assert.ok(config.studio_en_numeric.iPad.floating);
  const files=packageEntries(p,png);assert.ok(files['light/numeric_portrait.yaml']);assert.ok(files['dark/numeric_en_landscape.yaml']);
  assert.match(strFromU8(files['dark/pinyin_portrait.yaml']),/☰/);
});
test('舊專案與模板升級不重設使用者配色、送鍵及原生覆寫',()=>{
  const old=createProject();delete old.editorRevision;delete old.behavior.bottomRow;
  old.toolbar=['symbols','language','dismiss'];old.colors.dark.background='#123456';old.keys['zh:q']={swipeUpAction:{shortcut:'#copy'}};old.nativeOverrides['dark/pinyin_portrait.yaml']={future:{preserve:true}};
  const next=upgradeProject(old);assert.equal(next.editorRevision,15);assert.equal(next.behavior.bottomRow,'enhanced');
  assert.deepEqual(next.toolbar,DEFAULT_TOOLBAR);assert.deepEqual(next.compatibility.previousToolbar,old.toolbar);assert.equal(next.colors.dark.background,'#123456');assert.deepEqual(next.keys,old.keys);assert.deepEqual(next.nativeOverrides,old.nativeOverrides);
  assert.equal(old.editorRevision,undefined);assert.deepEqual(next,upgradeProject(next));
  next.toolbar=next.toolbar.filter((id)=>id!=='menu');assert.ok(!upgradeProject(next).toolbar.includes('menu'));
  assert.deepEqual(importBytes(strToU8(JSON.stringify(old)),'old.project.json').project.toolbar,DEFAULT_TOOLBAR);
  const store=new Map([['hamster-skin-studio:project:v1',JSON.stringify(old)],['hamster-skin-studio:library:v1',JSON.stringify([{id:'old',project:old}])]]);
  globalThis.localStorage={getItem:(key)=>store.get(key)??null};
  try {assert.equal(loadDraft().editorRevision,15);assert.equal(listTemplates()[0].project.editorRevision,15);}finally{delete globalThis.localStorage;}
});
