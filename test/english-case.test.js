import {keyboardSwitchType} from '../src/schema-binding.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8} from 'fflate';
import {createProject,keyboardRows,upgradeProject,pageFromAction} from '../src/model.js';
import {buildNativeKeyboard,buildConfig,packageEntries,parseNativeYaml} from '../src/native.js';
import {effectiveCell,selectedStyles,renderKeyboard} from '../src/preview.js';
import {createHoldModel} from '../src/hold.js';
import {nextShiftState,afterCharacterState,caseState,letterCaseMode} from '../src/keyboard-case.js';
import {systemIcon,iconShapes} from '../src/icons.js';

const view={theme:'dark',locale:'en',page:'main',orientation:'portrait',category:'常用',shifted:false,capsLocked:false,preedit:false,simplified:false};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('由中文實際切到英文檔，英文預設字面和輸出均小寫',()=>{
  const p=createProject(),zh=buildNativeKeyboard(p),target=pageFromAction({keyboardType:keyboardSwitchType(zh.key_language.action)}),config=buildConfig(p);
  assert.deepEqual(target,{page:'main',locale:'en'});assert.equal(config.alphabetic.iPhone.portrait,'alphabetic_portrait');
  const en=buildNativeKeyboard(p,target);assert.equal(en.key_q_fg.text,'q');assert.deepEqual(en.key_q.action,{character:'q'});assert.equal(keyboardSwitchType(en.key_language.action),'pinyin');
  assert.equal(zh.key_q_fg.text,'手');assert.deepEqual(zh.key_q.action,{character:'q'});
  for(const legend of ['uppercase','lowercase']){p.legend=legend;assert.equal(keyboardRows(p,{locale:'en'})[0][0].label,'q');}
});
test('所有英文按鍵小寫／大寫／Caps Lock 的字面和鍵值一致',()=>{
  const p=createProject();
  for(const orientation of ['portrait','landscape'])for(const theme of ['dark','light']){
    const root=buildNativeKeyboard(p,{locale:'en',orientation,theme});
    for(const id of 'qwertyuiopasdfghjklzxcvbnm')for(const mode of ['lower','upper','locked']){
      const state={...view,...caseState(mode)},cell=effectiveCell(root[`key_${id}`],root,state),style=root[selectedStyles(cell.foregroundStyle,state)[0]];
      assert.equal(style.text,mode==='lower'?id:id.toUpperCase());assert.equal(cell.action.character,style.text);
    }
  }
});
test('Shift 有三種不同圖示，鎖定樣式優先，使用既有 shift 動作',()=>{
  const root=buildNativeKeyboard(createProject(),{locale:'en'}),names=[];
  for(const mode of ['lower','upper','locked']){
    const state={...view,...caseState(mode)},cell=effectiveCell(root.key_shift,root,state),image=root[selectedStyles(cell.foregroundStyle,state)[0]].systemImageName;
    names.push(image);assert.equal(cell.action,'shift');assert.ok(iconShapes(systemIcon(image)).length);
  }
  assert.deepEqual(names,['shift','shift.fill','capslock.fill']);assert.equal(new Set(names.map(systemIcon)).size,3);
  assert.ok(iconShapes('shiftActive').some((shape)=>shape.attributes.fill==='currentColor'));
});
test('一次大寫輸入後復原，雙按鎖定後持續大寫，再按 Shift 解鎖',()=>{
  const lower=caseState('lower'),once=nextShiftState(lower,1000);assert.equal(letterCaseMode(once),'upper');assert.equal(letterCaseMode(afterCharacterState(once)),'lower');
  const locked=nextShiftState(once,1200);assert.equal(letterCaseMode(locked),'locked');assert.equal(letterCaseMode(afterCharacterState(locked)),'locked');assert.equal(letterCaseMode(nextShiftState(locked,1400)),'lower');
  assert.equal(letterCaseMode(nextShiftState(once,2000)),'lower');
});
test('英文長按原字跟隨大小寫，中文維持字根外觀和字母鍵值',()=>{
  const p=createProject(),en=buildNativeKeyboard(p,{locale:'en'}),zh=buildNativeKeyboard(p,{locale:'zh'});
  for(const mode of ['lower','upper','locked']){
    const state={...view,...caseState(mode)},hint=createHoldModel(en,en.key_q,state),selected=hint.choices.find((choice)=>choice.col===hint.selected.col);
    assert.equal(selected.label,mode==='lower'?'q':'Q');assert.equal(selected.action.character,selected.label);
    const speed=effectiveCell(zh.key_q,zh,{...state,locale:'zh'});assert.deepEqual(speed.action,{character:'q'});assert.equal(zh[selectedStyles(speed.foregroundStyle,state)[0]].text,'手');
  }
});
test('候選、長按、英文指示與 Enter 強調色改藍色，兩主題都可產生',()=>{
  const p=createProject();assert.equal(p.colors.dark.accent,'#B8DFFF');assert.equal(p.colors.light.accent,'#B8DFFF');
  for(const theme of ['dark','light']){
    const root=buildNativeKeyboard(p,{theme,locale:'en'});assert.equal(root.returnActiveBg.normalColor,'#B8DFFF');assert.notEqual(root.returnActiveFg.normalColor,'#102218');
    const candidate=root.candidateText.preferredTextColor,rgb=[1,3,5].map((at)=>parseInt(candidate.slice(at,at+2),16));assert.ok(rgb[2]>rgb[1]&&rgb[1]>rgb[0]);
    assert.notEqual(root.hintSelected.normalBorderColor,'#BDE3BE');assert.equal(root.hintSelected.normalColor,root.hintSelected.highlightColor);
  }
});
test('舊生成覆寫能修復大小寫及切換，保留原欄位備份與其他自訂',()=>{
  const p=createProject();p.editorRevision=6;p.colors.dark.accent='#BDE3BE';p.colors.light.accent='#4C7655';
  p.nativeOverrides['dark/alphabetic_portrait.yaml']={key_q:{action:{character:'q'},foregroundStyle:['key_q_fg']},key_q_fg:{buttonStyleType:'text',text:'Q',normalColor:'#FFFFFF'},key_shift:{action:'shift'},key_language:{action:{shortcut:'#中英切换'},foregroundStyle:'key_language_zh_fg',notification:['key_language_en_notification']},candidateText:{preferredTextColor:'#BDE3BE'},future:{unrelated:true}};
  const next=upgradeProject(p),root=buildNativeKeyboard(next,{locale:'en'});assert.equal(root.key_q_fg.text,'q');assert.equal(root.key_q.uppercasedStateAction.character,'Q');assert.ok(root.key_q.capsLockedStateForegroundStyle);assert.ok(root.key_shift.capsLockedStateForegroundStyle);assert.equal(keyboardSwitchType(root.key_language.action),'pinyin');
  assert.equal(next.colors.dark.accent,'#B8DFFF');assert.equal(next.colors.light.accent,'#B8DFFF');assert.deepEqual(next.nativeOverrides['dark/alphabetic_portrait.yaml'].future,{unrelated:true});assert.equal(next.compatibility.previousGeneratedFields['dark/alphabetic_portrait.yaml'].key_q_fg.text,'Q');assert.equal(p.nativeOverrides['dark/alphabetic_portrait.yaml'].key_q_fg.text,'Q');assert.deepEqual(upgradeProject(next),next);
});
test('皮膚包的英文檔確實包含大小寫與鎖定狀態，不只是網頁模擬',()=>{
  const p=createProject(),files=packageEntries(p,png),config=parseNativeYaml(strFromU8(files['config.yaml']));
  for(const theme of ['dark','light']){
    const zh=parseNativeYaml(strFromU8(files[`${theme}/${config.pinyin.iPhone.portrait}.yaml`])),en=parseNativeYaml(strFromU8(files[`${theme}/${config.alphabetic.iPhone.portrait}.yaml`]));
    assert.equal(keyboardSwitchType(zh.key_language.action),'alphabetic');assert.equal(en.key_q_fg.text,'q');assert.equal(en.key_q.uppercasedStateAction.character,'Q');assert.ok(en.key_q.capsLockedStateForegroundStyle);assert.ok(en.key_shift.capsLockedStateForegroundStyle);
  }
  assert.equal(renderKeyboard(p,{...view,...caseState('locked')}).cells.get('key_shift').icon,'capsLock');
});
test('圖片資源也能沿用同一套三態引用，檔案與切片可完整匯出',()=>{
  const p=createProject(),image=(name)=>({buttonStyleType:'fileImage',normalImage:{file:'modifiers',image:name}});
  p.nativeOverrides['dark/alphabetic_portrait.yaml']={key_shift_fg:image('idle'),key_shift_upper_fg:image('upper'),key_shift_caps_fg:image('locked')};
  p.assets['dark/resources/modifiers.png']=Buffer.from(png).toString('base64');p.assets['dark/resources/modifiers.yaml']=Buffer.from('idle:\n  rect: {x: 0, y: 0, width: 1, height: 1}\nupper:\n  rect: {x: 0, y: 0, width: 1, height: 1}\nlocked:\n  rect: {x: 0, y: 0, width: 1, height: 1}\n').toString('base64');
  const files=packageEntries(p,png),root=parseNativeYaml(strFromU8(files['dark/alphabetic_portrait.yaml']));
  for(const mode of ['lower','upper','locked']){const state={...view,...caseState(mode)},cell=effectiveCell(root.key_shift,root,state);assert.equal(root[selectedStyles(cell.foregroundStyle,state)[0]].normalImage.image,mode==='lower'?'idle':mode);}
  assert.ok(files['dark/resources/modifiers.png']);assert.equal(root.key_shift.action,'shift');
});
