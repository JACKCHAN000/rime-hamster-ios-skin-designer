import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {strFromU8} from 'fflate';
import {createProject,upgradeProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml} from '../src/native.js';
import {effectiveCell,selectedStyles,renderKeyboard} from '../src/preview.js';
import {toggleAsciiMode,asciiModeValue} from '../src/rime-state.js';
import {systemIcon} from '../src/icons.js';
import {extractArchive} from '../src/importer.js';

const view={theme:'dark',locale:'en',page:'main',orientation:'portrait',asciiMode:false,shifted:false,capsLocked:false,simplified:false,preedit:false};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('收起按鍵使用與原皮膚相同的單純 chevron.down',()=>{
  for(const locale of ['zh','en'])for(const page of ['main','symbols1','numeric','hamster']){
    const root=buildNativeKeyboard(createProject(),{locale,page});assert.equal(root.tool_dismiss_fg.systemImageName,'chevron.down');assert.equal(root.tool_dismiss.action,'dismissKeyboard');assert.equal(systemIcon(root.tool_dismiss_fg.systemImageName),'down');
  }
});
test('工具列 Emoji 在各模式的字級、字重、中心與顯示框一致',()=>{
  const p=createProject();
  for(const locale of ['zh','en'])for(const orientation of ['portrait','landscape']){
    const root=buildNativeKeyboard(p,{locale,orientation}),emoji=root.tool_emoji_fg;
    assert.equal(emoji.fontSize,17);assert.equal(emoji.fontWeight,'medium');assert.equal(emoji.contentMode,'center');assert.deepEqual(emoji.center,{x:0.5,y:0.5});
    for(const id of ['emoji','phrase','clipboard','script','dismiss']){assert.deepEqual(root[`tool_${id}`].bounds,{alignment:'center',width:28,height:28});assert.equal(root[`tool_${id}_fg`].fontSize,17);}
  }
});
test('中英切換和空白使用完全相同的普通鍵帽，沒有特殊底色或邊框',()=>{
  const p=createProject();
  for(const locale of ['zh','en'])for(const theme of ['light','dark']){
    const root=buildNativeKeyboard(p,{locale,theme});assert.equal(root.key_language.backgroundStyle,'keyBackground');assert.equal(root.key_language.backgroundStyle,root.key_space.backgroundStyle);assert.deepEqual(root.languageEnglishBackground,root.keyBackground);
    assert.equal(root[root.key_language.foregroundStyle].normalColor,p.colors[theme].text);
  }
});
test('中文使用繁簡切換，英文改為 ASCII 開關並以 EN+／EN- 顯示',()=>{
  const p=createProject(),zh=buildNativeKeyboard(p),en=buildNativeKeyboard(p,{locale:'en'});
  assert.deepEqual(zh.tool_traditional.action,{shortcut:'#简繁切换'});assert.deepEqual(en.tool_traditional.action,{shortcut:'#中英切换'});
  for(const asciiMode of [false,true])for(const simplified of [false,true]){
    const state={...view,asciiMode,simplified},cell=effectiveCell(en.tool_traditional,en,state),label=en[selectedStyles(cell.foregroundStyle,state)[0]].text;
    assert.equal(label,asciiMode?'EN-':'EN+');
    const chinese=effectiveCell(zh.tool_traditional,zh,{...state,locale:'zh'});assert.equal(zh[selectedStyles(chinese.foregroundStyle,state)[0]].text,simplified?'簡':'繁');
  }
  assert.equal(renderKeyboard(p,view).cells.get('tool_traditional').accessibilityLabel,'開啟 ASCII 模式');assert.equal(renderKeyboard(p,{...view,asciiMode:true}).cells.get('tool_traditional').accessibilityLabel,'關閉 ASCII 模式');
});
test('切 ASCII 只改 RIME 狀態，不改英文頁或 Caps Lock',()=>{
  const initial={...view,capsLocked:true,shifted:true},next={...initial,...toggleAsciiMode(initial)};assert.equal(next.locale,'en');assert.equal(next.capsLocked,true);assert.equal(next.page,'main');assert.equal(next.asciiMode,true);
  assert.equal(asciiModeValue({...view,locale:'en',asciiMode:false}),false);assert.equal(toggleAsciiMode(next).asciiMode,false);
  const root=buildNativeKeyboard(createProject(),{locale:'en'});assert.equal(root[selectedStyles(effectiveCell(root.key_shift,root,next).foregroundStyle,next)[0]].systemImageName,'capslock.fill');
});
test('舊生成檔移除英文特效並更新 ASCII 工具，備份原設定且不重設配色或大小寫',()=>{
  const p=createProject();p.editorRevision=7;p.colors.dark.accent='#BDE3BE';
  p.nativeOverrides['dark/alphabetic_portrait.yaml']={keyBackground:{buttonStyleType:'geometry',normalColor:'#444444'},key_language:{action:{keyboardType:'pinyin'},backgroundStyle:'languageEnglishBackground'},key_language_en_fg:{buttonStyleType:'text',text:'EN',normalColor:'#B8DFFF'},languageEnglishBackground:{buttonStyleType:'geometry',normalColor:'#B8DFFF33'},tool_dismiss_fg:{buttonStyleType:'systemImage',systemImageName:'keyboard.chevron.compact.down',fontSize:25},tool_traditional:{action:{shortcut:'#简繁切换'}},key_q_fg:{buttonStyleType:'text',text:'Q'}};
  const next=upgradeProject(p),root=buildNativeKeyboard(next,{locale:'en'});assert.equal(root.key_language.backgroundStyle,'keyBackground');assert.deepEqual(root.languageEnglishBackground,root.keyBackground);assert.equal(root.key_language_en_fg.normalColor,'#FFFFFF');assert.deepEqual(root.tool_traditional.action,{shortcut:'#中英切换'});assert.equal(root.tool_dismiss_fg.systemImageName,'chevron.down');
  assert.equal(next.colors.dark.accent,'#BDE3BE');assert.equal(next.nativeOverrides['dark/alphabetic_portrait.yaml'].key_q_fg.text,'Q');assert.equal(next.compatibility.previousToolbarPresentation['dark/alphabetic_portrait.yaml'].tool_dismiss_fg.fontSize,25);assert.deepEqual(upgradeProject(next),next);
});
test('實際匯出英文 YAML 具有 ASCII 條件和通知，沒有特殊中英框',()=>{
  const files=packageEntries(createProject(),png),root=parseNativeYaml(strFromU8(files['dark/alphabetic_portrait.yaml']));assert.equal(root.key_language.backgroundStyle,'keyBackground');assert.equal(root.tool_dismiss_fg.systemImageName,'chevron.down');
  assert.equal(root.englishAsciiOffNotification.rimeOptionName,'ascii_mode');assert.equal(root.englishAsciiOnNotification.rimeOptionValue,true);assert.equal(root.tool_ascii_off_fg.text,'EN+');assert.equal(root.tool_ascii_on_fg.text,'EN-');
});
const reference=new URL('../仿仓默认Hydro改.cskin',import.meta.url);
test('英文模式及收起的實作與提供皮膚對照',{skip:!existsSync(reference)},()=>{
  const files=extractArchive(new Uint8Array(readFileSync(reference))),source=parseNativeYaml(new TextDecoder().decode(files['dark/alphabetic_26_portrait.yaml'])),root=buildNativeKeyboard(createProject(),{locale:'en'});
  assert.equal(root.tool_dismiss_fg.systemImageName,source.toolbarCloseButtonForegroundStyle.systemImageName);assert.equal(root.tool_emoji_fg.fontSize,source.toolbarEmojiButtonForegroundStyle.fontSize);assert.equal(root.tool_emoji_fg.fontWeight,source.toolbarEmojiButtonForegroundStyle.fontWeight);
  assert.deepEqual(root.tool_traditional.action,source.toolbarSimp2tranButton.action);assert.equal(root.tool_ascii_off_fg.text,source.tranStyle.text);assert.equal(root.tool_ascii_on_fg.text,source.simpStyle.text);
});
