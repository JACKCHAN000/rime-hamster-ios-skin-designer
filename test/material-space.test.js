import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8} from 'fflate';
import {createProject,upgradeProject,validateProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml,exportArchive} from '../src/native.js';
import {effectiveCell,renderKeyboard} from '../src/preview.js';
import {createHoldModel} from '../src/hold.js';
import {controlsHtml} from '../src/ui.js';
import {importBytes} from '../src/importer.js';
import {rawSpacePreviewText} from '../src/space-behavior.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));
const view={theme:'dark',orientation:'portrait',locale:'zh',page:'main',category:'常用'};
const raw={combine:['enter',{symbol:' '}]};

test('原碼空白選項僅在有編碼時回車，第二步及空閒狀態直接輸出空格',()=>{
  const p=createProject();p.behavior.spaceAction='rawThenSpace';
  for(const theme of ['dark','light'])for(const orientation of ['portrait','landscape'])for(const locale of ['zh','en'])for(const page of ['main','symbols1','symbols2','numeric']){
    const state={theme,orientation,locale,page},root=buildNativeKeyboard(p,state),cell=root.key_space;
    assert.deepEqual(effectiveCell(cell,root,{...state,preedit:false}).action,{symbol:' '});
    assert.deepEqual(effectiveCell(cell,root,{...state,preedit:true}).action,raw);
    assert.equal(root.key_space_fg.text,'␣');assert.ok(cell.foregroundStyle.includes('key_space_openBox'));
  }
  p.behavior.swipePreset='full';const root=buildNativeKeyboard(p),hold=createHoldModel(root,root.key_space,{...view,preedit:true});
  assert.deepEqual(hold.choices[hold.selected.col].action,raw);assert.deepEqual(root.key_space.swipeUpAction,{shortcut:'#次选上屏'});
  assert.equal(rawSpacePreviewText(true,'hello'),'hello ');assert.equal(rawSpacePreviewText(false,'hello'),' ');
  p.behavior.spaceAction='candidate';assert.equal(buildNativeKeyboard(p).key_space.action,'space');assert.equal(buildNativeKeyboard(p).key_space.preeditStateAction,undefined);
});

test('原碼空白可儲存與匯出，舊生成覆寫跟隨選項且保留明確自訂動作',()=>{
  const p=createProject(),legacy=buildNativeKeyboard(p);p.nativeOverrides['dark/pinyin_portrait.yaml']=legacy;p.behavior.spaceAction='rawThenSpace';const before=structuredClone(p);
  const preview=renderKeyboard(p,{...view,preedit:true}),root=preview.root;assert.deepEqual(preview.cells.get('key_space').action,raw);assert.deepEqual(p,before);
  const files=packageEntries(p,png),output=parseNativeYaml(strFromU8(files['dark/pinyin_portrait.yaml']));assert.deepEqual(output.key_space.preeditStateAction,raw);assert.deepEqual(output.key_space.action,{symbol:' '});
  assert.deepEqual(importBytes(exportArchive(p,png),'raw-space.cskin').project,p);
  assert.ok(controlsHtml(p,view,'layout',preview).includes('data-field="behavior.spaceAction"'));
  assert.ok(controlsHtml(p,{...view,selected:'key_space'},'keys',preview).includes('原碼上屏，再加空格'));
  p.nativeOverrides['dark/pinyin_portrait.yaml']=output;p.behavior.spaceAction='candidate';assert.equal(buildNativeKeyboard(p).key_space.action,'space');assert.equal(buildNativeKeyboard(p).key_space.preeditStateAction,undefined);
  p.behavior.spaceAction='rawThenSpace';p.nativeOverrides['dark/pinyin_portrait.yaml'].key_space.preeditStateAction={symbol:'自訂'};assert.deepEqual(buildNativeKeyboard(p).key_space.preeditStateAction,{symbol:'自訂'});
});

test('舊草稿補入透明度與空白選項，舊生成底色可調透明並保持來源及其他偏好',()=>{
  const old=createProject();old.editorRevision=14;delete old.metrics.backgroundOpacity;delete old.behavior.spaceAction;old.legend='uppercase';old.schemaBinding.zh='quick_ice';old.colors.dark.accent='#2468AC';
  old.nativeOverrides['dark/pinyin_portrait.yaml']={boardBackground:{buttonStyleType:'geometry',normalColor:old.colors.dark.background}};
  const before=structuredClone(old),p=upgradeProject(old);assert.deepEqual(old,before);assert.deepEqual(p.colors,old.colors);assert.equal(p.legend,'uppercase');assert.equal(p.schemaBinding.zh,'quick_ice');assert.equal(p.metrics.backgroundOpacity,1);assert.equal(p.behavior.spaceAction,'candidate');assert.deepEqual(upgradeProject(p),p);
  assert.equal(buildNativeKeyboard(p).boardBackground.normalColor,old.colors.dark.background+'03');
  p.metrics.backgroundOpacity=0;assert.ok(buildNativeKeyboard(p).boardBackground.normalColor.endsWith('00'));
  p.metrics.backgroundOpacity=100;assert.ok(buildNativeKeyboard(p).boardBackground.normalColor.endsWith('ff'));
  p.metrics.backgroundOpacity=0;p.appearance='solid';assert.ok(buildNativeKeyboard(p).boardBackground.normalColor.endsWith('ff'));
  assert.deepEqual(validateProject(p),[]);p.metrics.backgroundOpacity=101;assert.ok(validateProject(p).some(error=>error.includes('底色不透明度')));
  p.metrics.backgroundOpacity=1;p.behavior.spaceAction='invalid';assert.ok(validateProject(p).some(error=>error.includes('空白鍵')));
});
