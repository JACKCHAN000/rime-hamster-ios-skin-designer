import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8,strToU8} from 'fflate';
import {createProject,upgradeProject,validateProject,languageAction} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml,exportArchive} from '../src/native.js';
import {DEFAULT_SCHEMA_BINDING,applySchemaBindings,bindLanguageAction,keyboardSwitchType} from '../src/schema-binding.js';
import {renderKeyboard,effectiveCell,selectedStyles} from '../src/preview.js';
import {createHoldModel} from '../src/hold.js';
import {controlsHtml} from '../src/ui.js';
import {importBytes} from '../src/importer.js';
import {loadDraft,listTemplates} from '../src/storage.js';
import {actionParts,actionFromFields} from '../src/actions.js';

const view={theme:'dark',page:'main',locale:'zh',orientation:'portrait',preedit:false,shifted:false,capsLocked:false,asciiMode:false,simplified:false,category:'常用'};
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));
const expected=(type,id)=>({combine:[{keyboardType:type},{switchRimeSchema:id}]});

test('預設啟用使用者提供的方案 ID，鍵盤後接方案且兩方向皆正確',()=>{
  const p=createProject();assert.deepEqual(p.schemaBinding,{enabled:true,zh:'quick5_lite',en:'melt_eng'});assert.deepEqual(validateProject(p),[]);
  assert.deepEqual(languageAction('zh',p.schemaBinding),expected('alphabetic','melt_eng'));assert.deepEqual(languageAction('en',p.schemaBinding),expected('pinyin','quick5_lite'));
  assert.deepEqual(languageAction('zh'),{keyboardType:'alphabetic'});
});
test('各主題、方向、語系與符號／數字頁均綁定正確目標',()=>{
  const p=createProject();
  for(const theme of ['dark','light'])for(const orientation of ['portrait','landscape'])for(const locale of ['zh','en'])for(const page of ['main','symbols1','symbols2','numeric']){
    const root=buildNativeKeyboard(p,{theme,orientation,locale,page});assert.deepEqual(root.key_language.action,locale==='zh'?expected('alphabetic','melt_eng'):expected('pinyin','quick5_lite'));assert.equal(root.key_language.backgroundStyle,'keyBackground');
  }
});
test('關閉綁定只切鍵盤，保留 ID，再啟用可還原組合動作',()=>{
  const p=createProject();p.schemaBinding.enabled=false;
  assert.deepEqual(buildNativeKeyboard(p).key_language.action,{keyboardType:'alphabetic'});assert.equal(p.schemaBinding.en,'melt_eng');
  p.schemaBinding.enabled=true;assert.deepEqual(buildNativeKeyboard(p).key_language.action,expected('alphabetic','melt_eng'));
  assert.deepEqual(bindLanguageAction(expected('pinyin','quick5_lite'),{...DEFAULT_SCHEMA_BINDING,enabled:false}),{keyboardType:'pinyin'});
});
test('可改方案 ID，開啟時驗證必填，關閉可保留空欄位',()=>{
  const p=createProject();p.schemaBinding={enabled:true,zh:'my_quick',en:'my_english'};assert.deepEqual(buildNativeKeyboard(p).key_language.action,expected('alphabetic','my_english'));
  p.schemaBinding.zh='';assert.ok(validateProject(p).some((error)=>error.includes('中文方案')));p.schemaBinding.enabled=false;assert.deepEqual(validateProject(p),[]);
  p.schemaBinding.en='bad id';assert.ok(validateProject(p).some((error)=>error.includes('英文方案')));
});
test('舊原生中英覆寫及 cnenButton 可套用綁定，不改原始資料或其他工作流程',()=>{
  const p=createProject(),base=createProject();base.schemaBinding.enabled=false;const raw=buildNativeKeyboard(base);raw.cnenButton={action:{keyboardType:'alphabetic'}};raw.custom={action:{combine:[{keyboardType:'alphabetic'},{runScript:'keep'},{switchRimeSchema:'keep_id'}]}};
  p.nativeOverrides['dark/custom.yaml']=raw;
  const preview=renderKeyboard(p,{...view,nativePath:'dark/custom.yaml'});assert.deepEqual(preview.root.key_language.action,expected('alphabetic','melt_eng'));assert.deepEqual(preview.root.cnenButton.action,expected('alphabetic','melt_eng'));assert.deepEqual(raw.key_language.action,{keyboardType:'alphabetic'});assert.deepEqual(preview.root.custom,raw.custom);
  const files=packageEntries(p,png),exported=parseNativeYaml(strFromU8(files['dark/custom.yaml']));assert.deepEqual(exported.cnenButton.action,expected('alphabetic','melt_eng'));
});
test('既有純語系組合可更新 ID 並保留 delay，自訂額外動作不被重寫',()=>{
  const original={combine:[{keyboardType:'alphabetic'},{delay:250},{switchRimeSchema:'old_id'}]};const updated=bindLanguageAction(original,DEFAULT_SCHEMA_BINDING);
  assert.deepEqual(updated,{combine:[{keyboardType:'alphabetic'},{delay:250},{switchRimeSchema:'melt_eng'}]});assert.equal(original.combine[2].switchRimeSchema,'old_id');
  const custom={combine:[{keyboardType:'alphabetic'},{runScript:'custom'},{switchRimeSchema:'custom_id'}]};assert.deepEqual(applySchemaBindings({key_language:{action:custom}},DEFAULT_SCHEMA_BINDING).key_language.action,custom);
});
test('綁定不影響英文大小寫、ASCII 開關或滑動字面修正',()=>{
  const p=createProject(),root=buildNativeKeyboard(p,{locale:'en'}),upper=effectiveCell(root.key_q,root,{...view,locale:'en',capsLocked:true});assert.deepEqual(upper.action,{character:'Q'});assert.ok(root.key_q.capsLockedStateForegroundStyle);
  assert.deepEqual(root.tool_traditional.action,{shortcut:'#中英切换'});assert.equal(root.tool_ascii_off_fg.text,'EN+');assert.equal(root.key_q.swipeUpForegroundStyle,undefined);assert.equal(root.tool_menu_fg.fontSize,27);
  p.behavior.swipePreset='full';const full=buildNativeKeyboard(p),hold=createHoldModel(full,full.key_language,view);assert.deepEqual(hold.choices[hold.selected.col].action,expected('alphabetic','melt_eng'));
});
test('專案、cskin 與舊草稿／模板都保存或遷移綁定設定',()=>{
  const p=createProject(),roundtrip=importBytes(exportArchive(p,png),'bound.cskin');assert.deepEqual(roundtrip.project.schemaBinding,p.schemaBinding);
  const old=structuredClone(p);old.editorRevision=9;delete old.schemaBinding;const before=structuredClone(old);assert.deepEqual(upgradeProject(old).schemaBinding,DEFAULT_SCHEMA_BINDING);assert.deepEqual(old,before);
  const data=new Map([['hamster-skin-studio:project:v1',JSON.stringify(old)],['hamster-skin-studio:library:v1',JSON.stringify([{id:'old',project:old}])]]);globalThis.localStorage={getItem:(key)=>data.get(key)??null};
  try{assert.deepEqual(loadDraft().schemaBinding,DEFAULT_SCHEMA_BINDING);assert.deepEqual(listTemplates()[0].project.schemaBinding,DEFAULT_SCHEMA_BINDING);}finally{delete globalThis.localStorage;}
  const disabled=createProject();disabled.schemaBinding.enabled=false;assert.equal(upgradeProject(disabled).schemaBinding.enabled,false);
  assert.deepEqual(importBytes(strToU8(JSON.stringify(old)),'old.json').project.schemaBinding,DEFAULT_SCHEMA_BINDING);
});
test('佈局介面有啟用開關與兩個預填欄位，組合動作可安全往返 JSON 表單',()=>{
  const p=createProject(),html=controlsHtml(p,view,'layout',renderKeyboard(p,view));assert.ok(html.includes('schema-binding-form'));assert.ok(html.includes('value="quick5_lite"'));assert.ok(html.includes('value="melt_eng"'));assert.ok(html.includes('name="enabled" type="checkbox" checked'));
  const action=expected('alphabetic','melt_eng'),[type,value]=actionParts(action);assert.equal(type,'combine');assert.deepEqual(actionFromFields(type,value),action);assert.throws(()=>actionFromFields('combine','not json'),/JSON/);
});
test('實際皮膚檔包含兩個方案 ID，只有中英控制會加入 schema 指令',()=>{
  const files=packageEntries(createProject(),png),zh=parseNativeYaml(strFromU8(files['dark/pinyin_portrait.yaml'])),en=parseNativeYaml(strFromU8(files['light/alphabetic_portrait.yaml']));assert.deepEqual(zh.key_language.action,expected('alphabetic','melt_eng'));assert.deepEqual(en.key_language.action,expected('pinyin','quick5_lite'));
  assert.equal(keyboardSwitchType(zh.key_language.action),'alphabetic');assert.deepEqual(en.tool_traditional.action,{shortcut:'#中英切换'});assert.deepEqual(zh.tool_menu.action,{floatKeyboardType:'panel'});
});

test('舊中文方案更新為 quick5_lite，保留關閉狀態、自訂字面與其他方案 ID',()=>{
  const old=createProject();old.editorRevision=13;old.schemaBinding.zh='quick_ice';old.schemaBinding.enabled=false;old.legend='uppercase';
  const before=structuredClone(old),next=upgradeProject(old);assert.equal(next.schemaBinding.zh,'quick5_lite');assert.equal(next.schemaBinding.en,'melt_eng');assert.equal(next.schemaBinding.enabled,false);assert.equal(next.legend,'uppercase');
  assert.equal(next.compatibility.previousChineseSchemaId,'quick_ice');assert.deepEqual(old,before);assert.deepEqual(upgradeProject(next),next);
  assert.equal(importBytes(strToU8(JSON.stringify(old)),'old.json').project.schemaBinding.zh,'quick5_lite');
  next.schemaBinding.enabled=true;assert.deepEqual(buildNativeKeyboard(next,{locale:'en'}).key_language.action,expected('pinyin','quick5_lite'));
  const custom=structuredClone(old);custom.schemaBinding.zh='custom_chinese';assert.equal(upgradeProject(custom).schemaBinding.zh,'custom_chinese');
});
