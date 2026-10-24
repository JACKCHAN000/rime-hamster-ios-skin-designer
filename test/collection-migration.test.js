import test from 'node:test';
import assert from 'node:assert/strict';
import {strFromU8} from 'fflate';
import {createProject,upgradeProject} from '../src/model.js';
import {buildNativeKeyboard,packageEntries,parseNativeYaml} from '../src/native.js';
import {renderKeyboard} from '../src/preview.js';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jAkwAAAAASUVORK5CYII=','base64'));

test('舊符號頁升級保留輸出、翻頁及方案，備份舊樣式且預覽和匯出一致',()=>{
  const p=createProject();p.editorRevision=10;p.collections.貨幣=['＄','NT$','HK$','US$'];
  const path='dark/symbolic_portrait.yaml',legacy=buildNativeKeyboard(p,{page:'hamster'});
  legacy.symbolCell={backgroundStyle:'keyBackground',foregroundStyle:'symbolText'};
  legacy.symbolCategories.cellStyle='symbolCell';
  legacy.symbolText={buttonStyleType:'text',text:'',fontSize:19,normalColor:'#FFFFFF',highlightColor:'#FFFFFF'};
  for(const id of ['symbolItemBackground','symbolCategoryCell','symbolCategoryText'])delete legacy[id];
  for(const id of ['collectionPrevious','collectionNext','collectionReturn'])legacy[id].backgroundStyle='keyBackground';
  p.nativeOverrides[path]=legacy;const before=structuredClone(p),next=upgradeProject(p);
  assert.deepEqual(p,before);assert.deepEqual(upgradeProject(next),next);
  assert.deepEqual(next.schemaBinding,p.schemaBinding);assert.deepEqual(next.collections,p.collections);
  assert.deepEqual(next.compatibility.previousSymbolAppearance[path].symbolCell,legacy.symbolCell);
  const preview=renderKeyboard(next,{theme:'dark',orientation:'portrait',page:'hamster',locale:'zh',category:'貨幣',nativePath:path});
  const exported=parseNativeYaml(strFromU8(packageEntries(next,png)[path]));
  assert.deepEqual(preview.root,exported);
  assert.deepEqual(preview.cells.get('symbolContent_0').action,{symbol:'＄'});
  for(const id of ['collectionPrevious','collectionNext','collectionReturn'])assert.deepEqual(exported[id].action,legacy[id].action);
  assert.equal(exported[exported.symbolCell.backgroundStyle].normalColor,'#00000000');
  assert.equal(exported.symbolText.badgeNormalColor,'#00000000');assert.equal(exported.symbolText.badgeHighlightColor,'#00000000');
  assert.ok(preview.html.includes('data-category="貨幣"'));assert.ok(preview.html.includes('aria-pressed="true"'));
});

test('符號頁升級保留明確自訂的圖片樣式及其他原生頁面',()=>{
  const p=createProject();p.editorRevision=10;
  p.nativeOverrides['dark/symbolic_portrait.yaml']={symbolCell:{backgroundStyle:'myArtwork',foregroundStyle:'myText'},myArtwork:{buttonStyleType:'fileImage'},myText:{buttonStyleType:'text',text:'自訂'}};
  p.nativeOverrides['dark/pinyin_portrait.yaml']={customNode:{text:'保留'}};
  const next=upgradeProject(p);assert.deepEqual(next.nativeOverrides,p.nativeOverrides);assert.equal(next.compatibility.previousSymbolAppearance,undefined);
});
