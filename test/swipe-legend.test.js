import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {strFromU8} from 'fflate';
import {createProject,upgradeProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml} from '../src/native.js';
import {effectiveCell,selectedStyles} from '../src/preview.js';
import {releaseDecision} from '../src/gestures.js';
import {caseState} from '../src/keyboard-case.js';
import {extractArchive} from '../src/importer.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('上滑與下滑只執行動作，保留正常／大寫／鎖定字面及角標',()=>{
  const p=createProject();
  for(const locale of ['zh','en'])for(const mode of ['lower','upper','locked']){
    const root=buildNativeKeyboard(p,{locale}),view={locale,...caseState(mode)},cell=effectiveCell(root.key_q,root,view),before=structuredClone(root.key_q),legend=root[selectedStyles(cell.foregroundStyle,view)[0]].text;
    for(const dy of [-48,48]){
      const result=releaseDecision({held:false,dx:0,dy,info:{cell}},root);assert.deepEqual(result.action,dy<0?{symbol:'1'}:{symbol:'!'});
      assert.deepEqual(root.key_q,before);assert.equal(root[selectedStyles(effectiveCell(root.key_q,root,view).foregroundStyle,view)[0]].text,legend);
    }
    assert.equal(root.key_q.swipeUpForegroundStyle,undefined);assert.equal(root.key_q.swipeDownForegroundStyle,undefined);
    assert.equal(root.key_q_swipeUp_hint.text,'1');assert.equal(root.key_q_swipeDown_hint.text,'!');assert.ok(root.key_q.hintSymbolsStyle);
  }
});
test('實際匯出的皮膚沒有滑動整鍵前景替換，動作與長按仍存在',()=>{
  const files=packageEntries(createProject(),png);
  for(const [path,bytes]of Object.entries(files))if(/^(dark|light)\/[^/]+\.yaml$/.test(path)){
    const text=strFromU8(bytes);assert.ok(!text.includes('swipeUpForegroundStyle:'),path);assert.ok(!text.includes('swipeDownForegroundStyle:'),path);
  }
  const root=parseNativeYaml(strFromU8(files['dark/pinyin_portrait.yaml']));assert.deepEqual(root.key_q.swipeUpAction,{symbol:'1'});assert.ok(root.key_q.hintSymbolsStyle);assert.ok(root.key_q.foregroundStyle.includes('key_q_fg'));
});
test('舊生成覆寫移除替換字面的設定並備份，保留自訂圖片狀態及其他偏好',()=>{
  const p=createProject();p.editorRevision=8;p.colors.dark.accent='#987654';p.nativeOverrides['dark/pinyin_portrait.yaml']={key_q:{action:{character:'q'},foregroundStyle:['key_q_fg'],swipeUpAction:{symbol:'1'},swipeDownAction:{symbol:'!'},swipeUpForegroundStyle:'key_q_swipeUp_active',swipeDownForegroundStyle:['key_q_swipeDown_active']},key_q_fg:{buttonStyleType:'text',text:'Q'},key_q_swipeUp_active:{buttonStyleType:'text',text:'1'},key_x:{swipeUpAction:{symbol:'「'},swipeUpForegroundStyle:'customSwipeArtwork'},customSwipeArtwork:{buttonStyleType:'text',text:'自訂'}};
  const next=upgradeProject(p),root=next.nativeOverrides['dark/pinyin_portrait.yaml'];assert.equal(next.editorRevision,14);assert.equal(root.key_q.swipeUpForegroundStyle,undefined);assert.equal(root.key_q.swipeDownForegroundStyle,undefined);assert.deepEqual(root.key_q.swipeUpAction,{symbol:'1'});assert.deepEqual(root.key_q.foregroundStyle,['key_q_fg']);assert.equal(root.key_x.swipeUpForegroundStyle,'customSwipeArtwork');assert.equal(next.colors.dark.accent,'#987654');assert.equal(root.key_q_swipeUp_active.text,'1');
  assert.equal(next.compatibility.previousSwipeAppearance['dark/pinyin_portrait.yaml'].key_q.swipeUpForegroundStyle,'key_q_swipeUp_active');assert.equal(p.nativeOverrides['dark/pinyin_portrait.yaml'].key_q.swipeUpForegroundStyle,'key_q_swipeUp_active');assert.deepEqual(upgradeProject(next),next);
});
const reference=new URL('../仿仓默认Hydro改.cskin',import.meta.url);
test('參考皮膚也只綁定滑動動作，不替換整個字母前景',{skip:!existsSync(reference)},()=>{
  const files=extractArchive(new Uint8Array(readFileSync(reference))),root=parseNativeYaml(new TextDecoder().decode(files['dark/pinyin_26_portrait.yaml']));assert.ok(root.qButton.swipeUpAction);assert.ok(root.qButton.swipeDownAction);assert.equal(root.qButton.swipeUpForegroundStyle,undefined);assert.equal(root.qButton.swipeDownForegroundStyle,undefined);
});
