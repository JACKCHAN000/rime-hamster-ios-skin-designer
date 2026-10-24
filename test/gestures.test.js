import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseDecision, selectHoldCell } from '../src/gestures.js';

const root={choice:{action:{keyboardType:'symbolic'}}};
test('長按放開只回傳長按動作，不回落為短按',() => {
  const result=releaseDecision({held:true,selected:{row:0,col:0},rows:[['choice']],dx:0,dy:0},root);
  assert.equal(result.kind,'hold');assert.deepEqual(result.action,{keyboardType:'symbolic'});
});
test('取消長按不執行單擊，也不輸出動作',() => {
  assert.deepEqual(releaseDecision({held:true,selected:null,rows:[['choice']],dx:0,dy:0},root),{kind:'hold',action:undefined});
});
test('短按、上下滑及橫向移出互斥',() => {
  const p={held:false,info:{cell:{swipeUpAction:{symbol:'↑'},swipeDownAction:{symbol:'↓'}}}};
  assert.equal(releaseDecision({...p,dx:0,dy:0},root).kind,'tap');
  assert.deepEqual(releaseDecision({...p,dx:1,dy:-30},root),{kind:'swipe',action:{symbol:'↑'}});
  assert.deepEqual(releaseDecision({...p,dx:1,dy:30},root),{kind:'swipe',action:{symbol:'↓'}});
  assert.equal(releaseDecision({...p,dx:40,dy:10},root).kind,'cancel');
});
test('網格使用相對位移、避開空格、超出邊界可取消',() => {
  const rows=[['a',null],['b','c']],hint={symbolRows:rows,selected:{row:0,col:0},moveStep:{horizontal:30,vertical:30}};
  assert.deepEqual(selectHoldCell(hint,rows,hint.selected,3,2),hint.selected);
  const selected=selectHoldCell(hint,rows,hint.selected,30,30);assert.equal(selected.row,1);assert.equal(selected.col,1);
  assert.ok(selectHoldCell(hint,rows,hint.selected,30,0));
  assert.equal(selectHoldCell(hint,rows,hint.selected,300,0),null);
});
test('未設初選時，微小位移維持取消狀態',() => {
  const rows=[['a','b']];assert.equal(selectHoldCell({symbolRows:rows},rows,{row:0,col:0},2,1),null);
});
