import test from 'node:test';
import assert from 'node:assert/strict';
import {strToU8} from 'fflate';
import {createProject,upgradeProject,validateProject} from '../src/model.js';
import {importBytes} from '../src/importer.js';
import {loadDraft,listTemplates} from '../src/storage.js';

test('已移除的佈局可從舊專案、草稿與模板升級，保留自訂資料與方案',()=>{
  for(const layout of ['ryan','workbench']){
    const old=createProject();old.editorRevision=11;old.layout=layout;old.meta.name='霧光 · 速成';old.colors.dark.background='#123456';
    old.keys['zh:q']={label:'自訂',action:{character:'q'}};old.nativeOverrides['dark/custom.yaml']={arbitrary:{preserve:true}};
    const before=structuredClone(old);assert.deepEqual(validateProject(old),[]);
    const next=upgradeProject(old);assert.equal(next.layout,'ios');assert.equal(next.meta.name,'霧光 · 中文');assert.equal(next.compatibility.previousLayout,layout);
    for(const key of ['colors','keys','nativeOverrides','schemaBinding','toolbar','behavior'])assert.deepEqual(next[key],old[key],key);
    assert.deepEqual(old,before);assert.deepEqual(validateProject(next),[]);assert.deepEqual(upgradeProject(next),next);
    assert.equal(importBytes(strToU8(JSON.stringify(old)),'legacy.json').project.layout,'ios');
    globalThis.localStorage={getItem:(key)=>key.endsWith(':project:v1')?JSON.stringify(old):JSON.stringify([{id:'legacy',project:old}])};
    try{assert.equal(loadDraft().layout,'ios');assert.equal(listTemplates()[0].project.layout,'ios');}finally{delete globalThis.localStorage;}
  }
  const current=createProject();current.layout='workbench';assert.ok(validateProject(current).some((error)=>error.includes('佈局')));
  const named=createProject();named.editorRevision=11;named.meta.name='我的鍵盤';assert.equal(upgradeProject(named).meta.name,'我的鍵盤');
});
