import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8} from 'fflate';
import {createProject} from '../src/model.js';
import {buildNativeKeyboard,isLegacyNumericLayout,packageEntries,parseNativeYaml} from '../src/native.js';
import {renderKeyboard} from '../src/preview.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));
function legacyRoot(p){
  const root=buildNativeKeyboard(p,{page:'numeric'});
  const row=(ids)=>({HStack:{subviews:ids.map((id)=>({Cell:`key_${id}`}))}});
  root.keyboardLayout=[
    row(['digit_1','digit_2','digit_3','backspace']),row(['digit_4','digit_5','digit_6','numeric_minus']),
    row(['digit_7','digit_8','digit_9','numeric_plus']),row(['numeric_dot','digit_0','numeric_equal']),
    row(['symbols','numeric','language','space','period','enter']),
  ];
  root.key_period={foregroundStyle:'key_period_fg',action:{symbol:'。'}};root.key_period_fg={buttonStyleType:'text',text:'。'};
  root.key_digit_0.size.width='2/4';
  for(const id of ['multiply','divide','open_paren','close_paren']){delete root[`key_numeric_${id}`];delete root[`key_numeric_${id}_fg`];}
  return root;
}
test('舊五排數字覆寫在預覽及匯出重新排列，保留自訂動作及原始資料',()=>{
  const p=createProject(),path='dark/numeric_portrait.yaml',old=legacyRoot(p);
  old.key_digit_2.action={symbol:'②'};old.futureFeature={preserve:true};p.nativeOverrides[path]=old;
  const before=structuredClone(p);assert.equal(isLegacyNumericLayout(old.keyboardLayout),true);
  const result=renderKeyboard(p,{theme:'dark',orientation:'portrait',locale:'zh',page:'numeric',nativePath:path});
  const exported=parseNativeYaml(strFromU8(packageEntries(p,png)[path]));assert.deepEqual(result.root,exported);
  assert.equal(exported.keyboardLayout.length,4);assert.equal(exported.key_digit_0.size.width,exported.key_digit_1.size.width);
  assert.deepEqual(exported.key_digit_2.action,{symbol:'②'});assert.deepEqual(exported.futureFeature,{preserve:true});
  for(const [id,value] of Object.entries({multiply:'*',divide:'/',open_paren:'(',close_paren:')'}))assert.deepEqual(result.cells.get(`key_numeric_${id}`).action,{symbol:value});
  assert.deepEqual(p,before);
});
test('原生數字頁的明確自訂排列保持原樣',()=>{
  const p=createProject(),path='dark/numeric_portrait.yaml',custom=legacyRoot(p);
  custom.keyboardLayout[0].HStack.subviews.reverse();p.nativeOverrides[path]=custom;
  assert.equal(isLegacyNumericLayout(custom.keyboardLayout),false);
  const root=buildNativeKeyboard(p,{page:'numeric'});assert.deepEqual(root.keyboardLayout,custom.keyboardLayout);assert.equal(root.key_digit_0.size.width,'2/4');
});
