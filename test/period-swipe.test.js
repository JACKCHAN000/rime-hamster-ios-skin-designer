import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8} from 'fflate';
import {createProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml,descriptorName} from '../src/native.js';
import {renderKeyboard} from '../src/preview.js';
import {releaseDecision} from '../src/gestures.js';
import {createHoldModel} from '../src/hold.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('中英文句號兩方向送 RIME 字元，匯出保留動作並隱藏提示，點按及長按仍正確',()=>{
  const p=createProject(),files=packageEntries(p,png);
  for(const locale of ['zh','en'])for(const theme of ['dark','light'])for(const orientation of ['portrait','landscape'])for(const page of ['main','symbols1','symbols2']){
    const view={locale,theme,orientation,page},root=parseNativeYaml(strFromU8(files[`${theme}/${descriptorName(view)}.yaml`])),period=root.key_period;
    assert.deepEqual(period.action,{symbol:locale==='en'?'.':'。'});
    for(const dy of [-40,40])assert.deepEqual(releaseDecision({held:false,dx:0,dy,info:{cell:period}},root),{kind:'swipe',action:{character:'/'}});
    assert.equal(root.key_period_swipeUp_hint,undefined);assert.equal(root.key_period_swipeDown_hint,undefined);
    const hold=createHoldModel(root,period,view);assert.ok(!hold.choices.some((choice)=>choice.label==='/'));assert.deepEqual(hold.choices[hold.selected.col].action,period.action);
    const preview=renderKeyboard(p,view),button=preview.html.match(/<button[^>]*data-cell="key_period"[^>]*>[\s\S]*?<\/button>/)[0];
    assert.ok(!button.includes('上滑：/'));assert.ok(!button.includes('下滑：/'));
  }
  const legacy=buildNativeKeyboard(p);legacy.key_period.swipeUpAction={symbol:'，'};legacy.key_period.swipeDownAction={symbol:'?'};
  for(const direction of ['Up','Down']){const name=`key_period_swipe${direction}_hint`;legacy[name]={buttonStyleType:'text',text:'/'};legacy.key_period.foregroundStyle=[...(Array.isArray(legacy.key_period.foregroundStyle)?legacy.key_period.foregroundStyle:[legacy.key_period.foregroundStyle]),name];}
  p.nativeOverrides['dark/pinyin_portrait.yaml']=legacy;const before=structuredClone(p),fixed=buildNativeKeyboard(p);
  assert.deepEqual(fixed.key_period.swipeUpAction,{character:'/'});assert.deepEqual(fixed.key_period.swipeDownAction,{character:'/'});assert.deepEqual(fixed.key_period.foregroundStyle,['key_period_fg']);assert.deepEqual(p,before);
  const disabled=createProject();disabled.behavior.swipePreset='off';assert.equal(buildNativeKeyboard(disabled).key_period.swipeUpAction,undefined);
  disabled.keys['zh:period']={swipeUpAction:{character:'/'}};assert.deepEqual(buildNativeKeyboard(disabled).key_period.swipeUpAction,{character:'/'});
});
