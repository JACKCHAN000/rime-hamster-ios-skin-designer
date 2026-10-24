import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync, strFromU8, strToU8, zipSync } from 'fflate';
import { createProject, assertProject, keyboardRows, safeArchivePath, validateProject, pageFromAction } from '../src/model.js';
import { buildNativeKeyboard, buildConfig, exportArchive, packageEntries, parseNativeYaml, validateNative, yamlText } from '../src/native.js';
import { convertRyan, extractArchive, importBytes } from '../src/importer.js';
import { renderKeyboard, effectiveCell, selectedStyles } from '../src/preview.js';
import { appShell, controlsHtml } from '../src/ui.js';

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));
const baseView = {theme:'dark',locale:'zh',orientation:'portrait',page:'main',category:'常用',preedit:false,simplified:false,shifted:false,candidates:'none',symbolPage:0};

test('預設中文鍵面為倉頡字根，RIME 送鍵保持字母', () => {
  const p=createProject();assert.deepEqual(validateProject(p),[]);
  const q=keyboardRows(p)[0][0];assert.equal(q.label,'手');assert.deepEqual(q.action,{character:'q'});
  const native=buildNativeKeyboard(p);assert.equal(native.key_q_fg.text,'手');assert.deepEqual(native.key_q.action,{character:'q'});assert.equal(native.key_q.uppercasedStateAction,undefined);
  assert.equal(native.key_a_fg.text,'日');
});
test('英文 Shift 有獨立的大寫動作，不改中文中文', () => {
  const p=createProject(),en=buildNativeKeyboard(p,{locale:'en'});
  assert.deepEqual(en.key_q.uppercasedStateAction,{character:'Q'});
  const active=effectiveCell(en.key_q,en,{...baseView,locale:'en',shifted:true});assert.deepEqual(active.action,{character:'Q'});
});
test('外觀切換不改鍵盤配置與送鍵', () => {
  const p=createProject(),before=keyboardRows(p);p.appearance='solid';p.colors.dark.key='#123456';
  assert.deepEqual(keyboardRows(p),before);assert.equal(buildNativeKeyboard(p).keyBackground.normalColor,'#123456ff');
});
test('iOS 佈局可產生完整原生結構', () => {
  const p=createProject(),native=buildNativeKeyboard(p);assert.deepEqual(validateNative(native),[]);assert.equal(native.keyboardLayout.length,4);
});
test('符號短按與單項長按使用不同目的地，沒有 repeatAction', () => {
  const root=buildNativeKeyboard(createProject());
  assert.deepEqual(root.key_symbols.action,{keyboardType:'ios_zh_symbols_1'});
  const hint=root[root.key_symbols.hintSymbolsStyle];assert.equal(hint.selectedIndex,0);
  assert.deepEqual(root[hint.symbolStyles[0]].action,{keyboardType:'symbolic'});
  assert.equal(root.key_symbols.repeatAction,undefined);assert.equal(root.key_symbols.longPressAction,undefined);
});
test('符號路由可對調或停用長按', () => {
  const p=createProject();p.behavior.symbolTap='hamster';p.behavior.symbolHold='ios';
  const root=buildNativeKeyboard(p,{locale:'en'});assert.deepEqual(root.key_symbols.action,{keyboardType:'symbolic'});assert.equal(root.key_symbols_choice.action.keyboardType,'ios_en_symbols_1');
  p.behavior.symbolHold='none';assert.equal(buildNativeKeyboard(p).key_symbols.hintSymbolsStyle,undefined);
});
test('繁中與英文符號各有兩頁，路由互不混用', () => {
  const p=createProject();
  const zh=buildNativeKeyboard(p,{page:'symbols1',locale:'zh'}),en=buildNativeKeyboard(p,{page:'symbols2',locale:'en'});
  assert.equal(zh.key_symbols_toggle.action.keyboardType,'ios_zh_symbols_2');assert.equal(en.key_symbols_toggle.action.keyboardType,'ios_en_symbols_1');
  assert.equal(zh.key_return.action,'returnPrimaryKeyboard');assert.deepEqual(pageFromAction({keyboardType:'ios_en_symbols_2'}),{locale:'en',page:'symbols2'});
  assert.equal(zh.key_sym_zh_0_1_8_fg.text,'「');assert.equal(en.key_sym_en_1_1_5_fg.text,'>');
});
test('長按矩陣保存空格並輸出直接上屏動作', () => {
  const p=createProject();p.keys['zh:q']={longPress:{rows:[['！',null],['，','。']]}};
  assertProject(p);const root=buildNativeKeyboard(p),grid=root[root.key_q.hintSymbolsGridStyle];
  assert.equal(grid.symbolRows[0][1],null);assert.deepEqual(grid.selected,{row:0,col:0});assert.deepEqual(root[grid.symbolRows[1][0]].action,{symbol:'，'});assert.deepEqual(validateNative(root),[]);
  assert.equal(root[root.key_q.hintSymbolsStyle].symbolStyles.length,3);
});
test('自訂字面不改動作，自訂動作不受額外 role 欄位影響', () => {
  const p=createProject();p.keys['zh:q']={label:'甲',role:'spacer',width:0};const q=keyboardRows(p)[0][0];assert.equal(q.label,'甲');assert.equal(q.role,'letter');assert.equal(q.width,1);assert.deepEqual(q.action,{character:'q'});
});
test('通知與條件樣式符合中英、繁簡、預編輯模擬', () => {
  const p=createProject();p.toolbar.push('language');const root=buildNativeKeyboard(p);
  assert.deepEqual(selectedStyles(root.tool_language.foregroundStyle,baseView),['tool_language_zh_fg']);
  assert.deepEqual(selectedStyles(buildNativeKeyboard(p,{locale:'en'}).tool_language.foregroundStyle,{...baseView,locale:'en'}),['tool_language_en_fg']);
  assert.equal(effectiveCell(root.key_enter,root,{...baseView,preedit:true}).backgroundStyle,'returnActiveBg');
  assert.equal(effectiveCell(root.key_enter,root,baseView).backgroundStyle,'keyBackground');
});
test('完整皮膚包有所有裝置映射、兩主題、預覽與專案', () => {
  const p=createProject(),files=packageEntries(p,png),config=buildConfig(p);
  assert.equal(Object.keys(files).filter((path) => path==='config.yaml'||/^(light|dark)\/[^/]+\.yaml$/.test(path)).length,41);
  for(const [type,devices] of Object.entries(config))if(devices?.iPhone)for(const device of Object.values(devices))for(const name of Object.values(device))for(const theme of ['light','dark'])assert.ok(files[`${theme}/${name}.yaml`],`${type}/${theme}/${name}`);
  assert.ok(files['demo.png']);assert.ok(files['studio.project.json']);assert.ok(files['README.md']);
  for(const [path,bytes] of Object.entries(files))if(/^(light|dark)\/[^/]+\.yaml$/.test(path))assert.deepEqual(validateNative(parseNativeYaml(strFromU8(bytes))),[],path);
});
test('cskin 往返保留原生覆寫、未知節點、資產與所有專案設定', () => {
  const p=createProject();p.nativeOverrides['dark/pinyin_portrait.yaml']={futureFeature:{arbitrary:['保留',42]},key_q_fg:{buttonStyleType:'text',text:'Q',normalColor:'#FEFEFE'}};p.assets['sound/test.wav']=btoa('fake-wav');
  const archive=exportArchive(p,png),result=importBytes(archive,'test.cskin');assert.deepEqual(result.project,p);
  const files=extractArchive(archive);assert.deepEqual(parseNativeYaml(strFromU8(files['dark/pinyin_portrait.yaml'])).futureFeature,{arbitrary:['保留',42]});assert.equal(strFromU8(files['sound/test.wav']),'fake-wav');
});
test('原生 YAML 用正式 parser 支援錨點、多行與合併', () => {
  const value=parseNativeYaml('base: &base\n  buttonStyleType: text\n  normalColor: "#FFFFFF"\ncopy:\n  <<: *base\n  text: |-\n    第一行\n    第二行\n');
  assert.equal(value.copy.normalColor,'#FFFFFF');assert.equal(value.copy.text,'第一行\n第二行');
  assert.throws(() => parseNativeYaml('key: 1\nkey: 2'),/Map keys|unique|重複/i);
});
test('錯誤引用與混合配置在匯出前被擋下', () => {
  const p=createProject();p.nativeOverrides['dark/pinyin_portrait.yaml']={keyboardLayout:[{HStack:{subviews:[{Cell:'missing'}]}}]};
  assert.throws(() => exportArchive(p,png),/missing/);
  const root=buildNativeKeyboard(createProject());root.keyboardLayout[0].HStack.subviews.push({VStack:{subviews:[]}});assert.ok(validateNative(root).some((x) => x.includes('種類不一致')));
});
test('config 映射到不存在的原生檔案時拒絕匯出', () => {
  const p=createProject();p.nativeConfig={pinyin:{iPhone:{portrait:'does_not_exist'}}};assert.throws(() => exportArchive(p,png),/does_not_exist/);
});
test('不接受任意 JSON 或未支援的專案版本', () => {
  assert.throws(() => importBytes(strToU8('{"hello":"world"}'),'settings.json'),/格式或版本/);
  const p=createProject();p.version=2;assert.throws(() => assertProject(p),/版本/);
  assert.throws(() => importBytes(zipSync({'random.json':strToU8('{"hello":"world"}')}),'fake.cskin'),/沒有找到/);
});
test('Ryan 格式轉換保留原設定並列出未轉換內容', () => {
  const settings={skinInfo:{name:'Ryan 測試',author:'Ryan'},spaceKeyLayout:'1',palette:{dark:{bg:'#12345601',keyNormal:'#FFFFFF80',textMain:'#FAFAFA'}},groups:{alphabetSize:24},toolbarButtons:[3,4,5,6,7,2],unknown:{preserve:true}};
  const p=convertRyan(settings);assert.equal(p.meta.name,'Ryan 測試');assert.equal(p.layout,'ios');assert.equal(p.colors.dark.background,'#123456');assert.equal(p.metrics.fontSize,24);assert.deepEqual(p.compatibility.originalSettings,settings);assert.ok(p.compatibility.warnings.some((x) => x.includes('尚未自動轉換')));
  const result=importBytes(zipSync({'Ryan/jsonnet/settings.json':strToU8(JSON.stringify(settings))}),'ryan.cskin');assert.equal(result.project.compatibility.source,'ryan-settings');
});
test('原生皮膚保留自訂映射、資源與原文註解', () => {
  const native=buildNativeKeyboard(createProject()),text='# 原始註解\n'+yamlText(native);
  const archive=zipSync({'Old/config.yaml':strToU8('pinyin:\n  iPhone:\n    portrait: customKeyboard\n    landscape: customKeyboard\n'),'Old/light/customKeyboard.yaml':strToU8(text),'Old/dark/customKeyboard.yaml':strToU8(text),'Old/light/resources/a.png':png});
  const {project:p,nativePath}=importBytes(archive,'old.cskin');assert.equal(nativePath,'light/customKeyboard.yaml');assert.ok(p.compatibility.sourceYaml['light/customKeyboard.yaml'].startsWith('# 原始註解'));assert.equal(p.nativeConfig.pinyin.iPhone.portrait,'customKeyboard');
  const files=packageEntries(p,png);assert.ok(files['light/customKeyboard.yaml']);assert.deepEqual(files['light/resources/a.png'],png);
});
test('匯入拒絕不安全路徑與過量檔案', () => {
  assert.equal(safeArchivePath('../evil'),false);assert.equal(safeArchivePath('C:/evil'),false);assert.equal(safeArchivePath('dark/../config.yaml'),false);
  assert.throws(() => extractArchive(zipSync({'../evil.txt':strToU8('no')})),/不安全/);
  assert.throws(() => extractArchive(zipSync(Object.fromEntries(Array.from({length:257},(_,i) => [`a${i}.txt`,strToU8('x')])))),/過多/);
});
test('預覽讀取有效原生設定，覆寫字面會立刻呈現', () => {
  const p=createProject();p.nativeOverrides['dark/pinyin_portrait.yaml']={key_q_fg:{buttonStyleType:'text',text:'測試',normalColor:'#FFFFFF',fontSize:22}};
  const result=renderKeyboard(p,baseView);assert.ok(result.html.includes('測試'));assert.equal(result.cells.get('key_q').label,'測試');assert.ok(result.html.includes('native-board'));
});
test('預覽文字及控制介面會轉義 HTML', () => {
  const p=createProject();p.keys['zh:q']={label:'<img src=x onerror=alert(1)>'};
  assert.ok(renderKeyboard(p,baseView).html.includes('&lt;img'));assert.ok(!renderKeyboard(p,baseView).html.includes('<img src=x'));
  p.meta.name='<script>alert(1)</script>';assert.ok(appShell(p).includes('&lt;script&gt;'));
});
test('所有通用分頁可產生控制介面', () => {
  const p=createProject(),preview=renderKeyboard(p,baseView);
  globalThis.localStorage={getItem(){return null;}};
  for(const tab of ['appearance','layout','keys','symbols','toolbar','native','project'])assert.ok(controlsHtml(p,baseView,tab,preview).length>100,tab);
  delete globalThis.localStorage;
});
test('拒絕非 PNG 預覽資料與非法長按格', () => {
  assert.throws(() => packageEntries(createProject(),strToU8('not png')),/PNG/);
  const p=createProject();p.keys['zh:q']={longPress:{rows:[Array(9).fill('x')]}};assert.ok(validateProject(p).some((x) => x.includes('長按網格')));
});
test('匯出檢查圖集、動畫、字體與音效資源', () => {
  const p=createProject();p.nativeOverrides['dark/pinyin_portrait.yaml']={key_q_fg:{buttonStyleType:'fileImage',normalImage:{file:'caps',image:'Q'}}};
  assert.throws(() => packageEntries(p,png),/caps.png/);
  p.assets['dark/resources/caps.png']=Buffer.from(png).toString('base64');p.assets['dark/resources/caps.yaml']=Buffer.from('Q:\n  rect: {x: 0, y: 0, width: 1, height: 1}\n').toString('base64');
  assert.ok(packageEntries(p,png)['dark/resources/caps.png']);
  p.nativeConfig={keySound:{input:'tap.wav'}};assert.throws(() => packageEntries(p,png),/tap.wav/);
  p.assets['sound/tap.wav']=btoa('sound');p.nativeConfig.fontFace=[{url:'font.ttf'}];assert.throws(() => packageEntries(p,png),/font.ttf/);
});
