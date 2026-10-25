import './style.css';
import { assertProject, clone, createProject, keyboardRows, pageFromAction, safeName, DEFAULT_TOOLBAR } from './model.js';
import { buildNativeKeyboard, descriptorName, exportArchive, parseNativeYaml, validateNative, yamlText } from './native.js';
import { importBytes } from './importer.js';
import { appShell, controlsHtml, modalFrame } from './ui.js';
import { createDemoPng, renderKeyboard, cssColor } from './preview.js';
import { esc, icon } from './icons.js';
import { deleteTemplate, listTemplates, loadDraft, saveDraft, saveTemplate } from './storage.js';
import { releaseDecision, selectHoldAtPoint } from './gestures.js';
import { createHoldModel,holdMarkup } from './hold.js';
import { insertPreviewText } from './typing.js';
import { nextShiftState,afterCharacterState,caseState,letterCaseMode } from './keyboard-case.js';
import { toggleAsciiMode } from './rime-state.js';
import { actionFromFields } from './actions.js';
import {legendLabel} from './presentation-settings.js';
import {isRawSpaceAction,rawSpacePreviewText} from './space-behavior.js';

const app = document.getElementById('app');
let project = loadDraft() || createProject();
const view = { theme:'dark', orientation:'portrait', page:'main', locale:'zh',asciiMode:false, shifted:false,capsLocked:false,lastShiftTap:null, preedit:false, simplified:false, candidates:'none', category:'常用', collectionPage:0, selected:null, nativePath:null, symbolPage:0, testing:false, nativeDrafts:{},floating:null };
let tab = 'appearance', preview, undo = [], redo = [], lastChange = { field:null,time:0 }, saved = true;
let toastTimer, press = null, suppressClickUntil = 0;
app.innerHTML = appShell(project);

function toast(message) { const node = document.getElementById('toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'),3600); }
function persist() {
  try { saveDraft(project); saved = true; } catch { saved = false; toast('瀏覽器儲存空間不足，請下載專案檔保存。'); }
  document.getElementById('save-status').innerHTML = `<i class="${saved ? '' : 'unsaved'}"></i>${saved ? '已儲存在此瀏覽器' : '尚未儲存 · 請下載專案檔'}`;
}
function commit(mutator, field = '', rerenderPanel = false) {
  const next = clone(project); const result = mutator(next) || next;
  try { assertProject(result); } catch(error) { toast(error.message); return false; }
  if (JSON.stringify(result) === JSON.stringify(project)) return true;
  const now = Date.now();
  if (!field || lastChange.field !== field || now-lastChange.time > 800) { undo.push(clone(project)); if (undo.length > 50) undo.shift(); }
  lastChange = { field,time:now }; redo = []; project = result; persist();
  renderPreview(); if (rerenderPanel) renderPanel(); updateChrome(); return true;
}
function updateChrome() {
  document.getElementById('header-project').textContent = project.meta.name;
  document.querySelector('[data-action="undo"]').disabled = !undo.length;
  document.querySelector('[data-action="redo"]').disabled = !redo.length;
  document.querySelectorAll('[data-tab]').forEach((node) => { const active = node.dataset.tab === tab;node.classList.toggle('active',active);node.setAttribute('aria-current',active ? 'page' : 'false'); });
}
function renderPanel() { document.getElementById('controls').innerHTML = controlsHtml(project,view,tab,preview); updateChrome(); }
function renderPreview() {
  try { preview = renderKeyboard(project,view); } catch(error) { toast(`預覽無法解析：${error.message}`); return; }
  let floatingHtml='';
  if(view.floating){
    const config=project.nativeConfig?.[view.floating],name=config?.iPhone?.[view.orientation],nativePath=name?`${view.theme}/${name}.yaml`:null;
    const floating=renderKeyboard(project,{...view,page:'panel',nativePath,candidates:'none',preedit:false,selected:null});
    preview.cells=new Map([...preview.cells,...[...floating.cells].map(([id,cell])=>[id,{...cell,floating:true}])]);
    floatingHtml=`<button class="floating-scrim" data-action="close-floating" aria-label="關閉浮動菜單"></button><section class="floating-panel" aria-label="浮動鍵盤菜單" style="background:${project.colors[view.theme].background}"><header><span>菜單</span><button class="icon-button" data-action="close-floating" aria-label="關閉菜單">${icon('close',16)}</button></header>${floating.html}</section>`;
  }
  document.getElementById('keyboard-preview').innerHTML = preview.html+floatingHtml;
  document.querySelector('.preview-stage').classList.toggle('landscape',view.orientation === 'landscape');
  document.querySelector('.keyboard-shadow').classList.toggle('light-keyboard',view.theme === 'light');
  document.querySelectorAll('[data-theme]').forEach((node) => { node.classList.toggle('active',node.dataset.theme === view.theme); node.setAttribute('aria-pressed',String(node.dataset.theme === view.theme)); });
  document.querySelectorAll('[data-page]').forEach((node) => { node.classList.toggle('active',node.dataset.page === view.page); if (node.dataset.page === 'main') node.textContent = view.locale === 'zh' ? '中文' : 'ABC'; });
  document.querySelectorAll('[data-locale]').forEach((node) => node.classList.toggle('active',node.dataset.locale === view.locale));
  document.getElementById('preview-orientation').value = view.orientation;
  document.getElementById('state-preedit').checked = view.preedit;
  document.getElementById('state-candidates').value = view.candidates;
  document.getElementById('state-letter-case').hidden=view.locale!=='en';document.getElementById('state-letter-case').value=letterCaseMode(view);
  document.getElementById('source-indicator').textContent = preview.name;
  document.getElementById('preview-badges').innerHTML = `<span><i></i>${view.locale === 'zh' ? `中文 · ${legendLabel(project.legend)}` : '英文鍵盤'}</span><span>${view.nativePath ? '原生檔案' : 'iOS 佈局'}</span>`;
  document.getElementById('testing-button').classList.toggle('active',view.testing);
  document.getElementById('testing-button').innerHTML = `${icon(view.testing ? 'check' : 'play',12)}${view.testing ? '試打中' : '試打'}`;
}
function renderAll() { renderPreview(); renderPanel(); }
function changeView(values) { cancelPress();if(values.locale&&values.locale!==view.locale)values={...caseState('lower'),...values};if(values.page!==undefined&&values.floating===undefined)values.floating=null;Object.assign(view,values);renderAll(); }
function setPath(obj,path,value) { const keys = path.split('.'); const last = keys.pop(); const target = keys.reduce((parent,key) => parent[key],obj); target[last] = value; }
function selectedKeyId() { const name = preview.cells.get(view.selected)?.name;return name?.startsWith('key_') && !view.nativePath ? `${view.locale}:${name.slice(4)}` : null; }
function updateKey(patch,field = '') {
  const id = selectedKeyId(); if (!id) return;
  return commit((p) => { p.keys[id] = { ...(p.keys[id] || {}),...patch }; },field);
}
function openModal(content) { const modal = document.getElementById('modal');document.getElementById('modal-content').innerHTML = content; if (!modal.open) modal.showModal(); }
function closeModal() { document.getElementById('modal').close(); }
function download(bytes,name,type) {
  const url = URL.createObjectURL(new Blob([bytes],{type}));const link = document.createElement('a');link.href = url;link.download = name;document.body.appendChild(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url),1000);
}
function insertText(text,force=false) {
  return insertPreviewText(document.getElementById('typing-paper'),text,{testing:view.testing,fromGesture:force});
}
function perform(action,{forceInput=false}={}) {
  if (!action || action === 'none') return;
  if(action.floatKeyboardType){view.floating=view.floating===action.floatKeyboardType?null:action.floatKeyboardType;renderPreview();return;}
  if(view.floating){view.floating=null;renderPreview();}
  const target = pageFromAction(action,view.locale);
  if (target) { changeView({...target,nativePath:null,selected:null,candidates:'none',collectionPage:0});return; }
  if (typeof action === 'object') {
    if (action.character !== undefined || action.symbol !== undefined) {
      const text=action.character??action.symbol,inserted=insertText(text,forceInput);
      if(inserted&&view.locale==='en'&&/^[a-z]$/i.test(text)){Object.assign(view,afterCharacterState(view));renderPreview();if(tab==='keys')renderPanel();}return;
    }
    if(isRawSpaceAction(action)&&view.preedit){
      const inserted=insertText(rawSpacePreviewText(view.preedit),forceInput);
      if(inserted&&view.preedit)changeView({preedit:false,candidates:'none'});return;
    }
    if (action.combine) { for (const child of action.combine) if (!child.delay) perform(child,{forceInput}); return; }
    if(action.switchRimeSchema){toast(`方案切換目標：${action.switchRimeSchema}（實際由元書執行）`);return;}
    const shortcut = action.shortcut || action.shortcutCommand;
    if (shortcut === '#中英切换'||action.rimeOption==='ascii_mode') return changeView(toggleAsciiMode(view));
    if (shortcut === '#简繁切换') { view.simplified = !view.simplified;renderPreview();toast(`已模擬${view.simplified ? '簡體' : '繁體'}狀態，實際轉換由 RIME 執行。`);return; }
    if (shortcut === '#candidatesBarStateToggle') return changeView({candidates:view.candidates === 'expanded' ? 'normal' : 'expanded'});
    if (shortcut === '#toggleScriptView') {toast('在元書會開啟腳本面板；網頁保留此動作，不執行腳本。');return;}
    if (shortcut === '#keyboardMenu') {view.floating='panel';renderPreview();return;}
    if (shortcut === '#subCollectionPageUp' || shortcut === '#subCollectionPageDown') { const max = Math.max(0,Math.ceil((preview.root[view.category]?.length || project.collections[view.category]?.length || 0)/24)-1);changeView({collectionPage:Math.max(0,Math.min(max,view.collectionPage+(shortcut.endsWith('Down') ? 1 : -1)))});return; }
    if (action.keyboardType === 'emojis') { toast('Emoji 會在元書內開啟系統表情頁；網頁不模擬此畫面。');return; }
    toast('這個動作會在元書執行；網頁保留設定，不執行外部操作。');return;
  }
  if (action === 'shift') return changeView(nextShiftState(view,Date.now()));
  if (action === 'backspace' && (view.testing||forceInput)) {
    const paper = document.getElementById('typing-paper');
    let start = paper.selectionStart, end = paper.selectionEnd;
    if (start === end && start > 0) { const chars = [...paper.value.slice(0,start)];start -= chars.pop()?.length || 0; }
    paper.setRangeText('',start,end,'end');return;
  }
  if (action === 'space') return insertText(' ',forceInput);
  if (action === 'enter') return insertText('\n',forceInput);
  if (action === 'dismissKeyboard') { toast('在元書會收起鍵盤。');return; }
  if (view.testing) toast('此動作已保留，請在元書內測試。');
}
function tapCell(id) {
  const info = preview.cells.get(id);if (!info) return;
  view.selected = id;
  const action = info.action;
  if(action==='shift'){if(!view.testing)tab='keys';perform(action);return;}
  if (view.testing || info.floating || info.name.startsWith('tool_')) perform(action);
  else { tab='keys';renderAll(); }
}
function cancelPress() { if(press)suppressClickUntil=Date.now()+500;if (press?.timer) clearTimeout(press.timer);press=null;document.querySelector('.hold-overlay')?.remove(); }
function updateHoldHighlight(){document.querySelectorAll('.hold-choice').forEach((node)=>{const active=Number(node.dataset.row)===press?.selected?.row&&Number(node.dataset.col)===press?.selected?.col;node.classList.toggle('active',active);node.setAttribute('aria-selected',String(active));});}
function showHold() {
  if(!press||!press.element.isConnected)return;
  const root=press.info.root||preview.root,model=createHoldModel(root,press.info.cell,view);if(!model)return;
  Object.assign(press,model,{held:true});
  const overlay=document.createElement('div');overlay.className='hold-overlay';overlay.setAttribute('role','listbox');overlay.setAttribute('aria-label','長按候選');
  overlay.style.gridTemplateColumns=`repeat(${Math.max(...model.rows.map((row)=>row.length))},minmax(42px,1fr))`;
  const background=root[model.hint.backgroundStyle],selected=root[model.hint.selectedBackgroundStyle];
  overlay.style.background=cssColor(background?.normalColor,project.colors[view.theme].background);overlay.style.setProperty('--hold-selected',cssColor(selected?.normalColor||selected?.highlightColor,project.colors[view.theme].accent));
  overlay.innerHTML=holdMarkup(model);document.body.appendChild(overlay);
  const rect=press.element.getBoundingClientRect(),bound=overlay.getBoundingClientRect();
  overlay.style.left=`${Math.max(8,Math.min(window.innerWidth-bound.width-8,rect.left+rect.width/2-bound.width/2))}px`;
  overlay.style.top=`${Math.max(8,rect.top-bound.height-10)}px`;
  press.panelRect=overlay.getBoundingClientRect();press.rectangles=[...overlay.querySelectorAll('.hold-choice')].map((node)=>{const r=node.getBoundingClientRect();return {row:Number(node.dataset.row),col:Number(node.dataset.col),left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
}
function finishPress(){
  if(!press)return;const current=press;cancelPress();const decision=releaseDecision(current,current.choiceRoot||current.info.root||preview.root);
  if(decision.kind==='tap')tapCell(current.id);else if(decision.action)perform(decision.action,{forceInput:true});
}

document.addEventListener('pointerdown',(e) => {
  const element=e.target.closest('.native-key');if (!element || e.button !== 0) return;
  const info=preview.cells.get(element.dataset.cell);if (!info) return;
  cancelPress();e.preventDefault();element.setPointerCapture?.(e.pointerId);
  press={element,info,id:element.dataset.cell,x:e.clientX,y:e.clientY,pointer:e.pointerId,held:false,dx:0,dy:0};
  press.timer=setTimeout(showHold,460);
});
document.addEventListener('pointermove',(e) => {
  if (!press || e.pointerId !== press.pointer) return;
  press.dx=e.clientX-press.x;press.dy=e.clientY-press.y;
  if (!press.held) { if (Math.hypot(press.dx,press.dy)>12) clearTimeout(press.timer);return; }
  press.selected=selectHoldAtPoint(press.hint,press.rows,press.origin,press.dx,press.dy,{x:e.clientX,y:e.clientY},press.rectangles,press.panelRect,{singleRow:press.singleRow});
  updateHoldHighlight();
});
document.addEventListener('pointerup',(e)=>{if(press&&e.pointerId===press.pointer)finishPress();});
document.addEventListener('pointercancel',cancelPress);
document.addEventListener('lostpointercapture',(e)=>{if(press&&press.pointer===e.pointerId)cancelPress();});
document.addEventListener('contextmenu',(e)=>{if(e.target.closest('.native-key,.hold-overlay'))e.preventDefault();});
window.addEventListener('blur',cancelPress);

document.addEventListener('input',(e) => {
  const el=e.target;
  if (el.matches('[data-field]')) {
    const field=el.dataset.field;const value=el.type === 'checkbox' ? el.checked : el.hasAttribute('data-number') ? Number(el.value) : el.value;
    commit((p) => setPath(p,field,value),field);
    const output=document.querySelector(`[data-output="${field}"]`);if(output) output.textContent=value+(el.dataset.suffix || '');
    const color=document.querySelector(`[data-color-value="${field}"]`);if(color) color.textContent=String(value).toUpperCase();
  }
  if (el.matches('[data-key-label]')) updateKey({label:el.value},'key-label');
  if (el.id === 'native-editor') view.nativeDrafts[view.nativePath || `${view.theme}/${descriptorName(view)}.yaml`]=el.value;
});
document.addEventListener('change',(e) => {
  const el=e.target;
  if (el.dataset.shortcutPreset && el.value) {
    document.getElementById(`${el.dataset.shortcutPreset}-type`).value='shortcut';
    document.getElementById(`${el.dataset.shortcutPreset}-value`).value=el.value;
    el.value='';
  }
  if (el.id === 'preview-orientation') changeView({orientation:el.value,nativePath:null});
  if (el.id === 'state-preedit') changeView({preedit:el.checked});
  if (el.id === 'state-candidates') changeView({candidates:el.value});
  if(el.id==='state-letter-case')changeView(caseState(el.value));
  if (el.id === 'collection-category') changeView({category:el.value,collectionPage:0,page:'hamster',nativePath:null});
  if (el.id === 'native-file') changeView({nativePath:el.value,theme:el.value.startsWith('light/')?'light':'dark',orientation:/landscape/i.test(el.value)?'landscape':'portrait'});
});
document.addEventListener('submit',(e) => {
  if(e.target.id==='schema-binding-form'){
    e.preventDefault();const binding={enabled:e.target.elements.enabled.checked,zh:e.target.elements.zh.value.trim(),en:e.target.elements.en.value.trim()};
    if(commit((p)=>{p.schemaBinding=binding;},'',true))toast(binding.enabled?'已啟用中文／英文方案綁定。':'已關閉方案綁定，保留鍵盤切換。');return;
  }
  if(e.target.matches('[data-swipe-form]')) {
    e.preventDefault();const {prefix,swipeForm:field}=e.target.dataset;
    const type=document.getElementById(`${prefix}-type`).value,value=document.getElementById(`${prefix}-value`).value;
    if(type!=='disabled' && !value){toast('請輸入動作內容，或選擇「停用此方向」。');return;}
    try{if(updateKey({[field]:actionFromFields(type,value)})!==false){renderPanel();toast(`${field==='swipeUpAction'?'上滑':'下滑'}快捷鍵已更新。`);}}catch(error){toast(error.message);}return;
  }
  if(e.target.id !== 'key-action-form')return;e.preventDefault();
  const type=document.getElementById('key-action-type').value,value=document.getElementById('key-action-value').value;
  try{if(updateKey({action:actionFromFields(type,value)}) !== false)toast('按鍵動作已更新。');}catch(error){toast(error.message);}
});
document.addEventListener('click',async (e) => {
  const key=e.target.closest('[data-cell]');
  if(key){if(e.detail===0 || Date.now()>suppressClickUntil)tapCell(key.dataset.cell);return;}
  const button=e.target.closest('button,[data-tab]');if(!button)return;
  if(button.dataset.resetSwipe){const id=selectedKeyId();if(id)commit((p)=>{if(p.keys[id])delete p.keys[id][button.dataset.resetSwipe];},'',true);return;}
  if(button.dataset.tab){tab=button.dataset.tab;renderPanel();return;}
  if(button.dataset.theme)return changeView({theme:button.dataset.theme,nativePath:null});
  if(button.dataset.page)return changeView({page:button.dataset.page,nativePath:null,selected:null,candidates:'none'});
  if(button.dataset.locale)return changeView({locale:button.dataset.locale,nativePath:null,selected:null,...caseState('lower')});
  if(button.dataset.category)return changeView({category:button.dataset.category,collectionPage:0});
  if(button.dataset.sample){insertText(button.dataset.sample);return;}
  if(button.dataset.preset){commit((p) => {p.appearance=button.dataset.preset;},'',true);return;}
  if(button.dataset.layout){commit((p) => {p.layout=button.dataset.layout;},'',true);return;}
  if(button.dataset.symbolPage){changeView({symbolPage:Number(button.dataset.symbolPage),page:`symbols${Number(button.dataset.symbolPage)+1}`,nativePath:null});return;}
  if(button.dataset.toolToggle){commit((p) => {const id=button.dataset.toolToggle;p.toolbar=p.toolbar.includes(id)?p.toolbar.filter((x) => x!==id):[...p.toolbar,id];},'',true);return;}
  if(button.dataset.toolMove!==undefined){commit((p) => {const i=Number(button.dataset.toolMove),j=i+Number(button.dataset.direction);[p.toolbar[i],p.toolbar[j]]=[p.toolbar[j],p.toolbar[i]];},'',true);return;}
  if(button.dataset.loadTemplate){const item=listTemplates().find((x) => x.id===button.dataset.loadTemplate);if(item){view.nativePath=null;commit(() => clone(item.project),'',true);toast('模板已載入，可復原回前一個設計。');}return;}
  if(button.dataset.deleteTemplate){try{deleteTemplate(button.dataset.deleteTemplate);renderPanel();}catch(error){toast(error.message);}return;}
  const action=button.dataset.action;
  try {
    if(action==='undo' || action==='redo') {
      const from=action==='undo'?undo:redo,to=action==='undo'?redo:undo;
      if(from.length){to.push(clone(project));project=from.pop();lastChange={};view.nativePath=null;persist();renderAll();}return;
    }
    if(action==='import'){document.getElementById('file-import').click();return;}
    if(action==='save-project'){download(JSON.stringify(project,null,2),`${safeName(project.meta.name)}.project.json`,'application/json');toast('專案檔已下載。');return;}
    if(action==='save-template'){saveTemplate(clone(project));renderPanel();toast('已加入本機模板庫。');return;}
    if(action==='new-project'){view.nativePath=null;commit(() => createProject(),'',true);return;}
    if(action==='close-modal')return closeModal();
    if(action==='toggle-testing'){view.testing=!view.testing;renderPreview();toast(view.testing?'試打已開啟。這裡模擬送鍵，不執行 RIME 選字。':'已返回按鍵編輯模式。');return;}
    if(action==='reset-preview'){changeView({page:'main',locale:'zh',asciiMode:false,...caseState('lower'),preedit:false,candidates:'none',selected:null,nativePath:null,category:'常用',collectionPage:0});return;}
    if(action==='show-source'){tab='native';renderPanel();return;}
    if(action==='close-floating'){view.floating=null;renderPreview();return;}
    if(action==='reset-toolbar'){commit((p)=>{p.toolbar=[...DEFAULT_TOOLBAR];},'',true);toast('已還原預設工具列順序。');return;}
    if(action==='reset-key'){const id=selectedKeyId();if(id)commit((p) => {delete p.keys[id];},'',true);return;}
    if(action==='apply-grid'){
      const text=document.getElementById('key-grid').value.trim(),rows=text.split('\n').map((row) => row.split('|').map((x) => x.trim()||null));
      const current=keyboardRows(project,view).flat().find((key)=>`key_${key.id}`===view.selected)?.longPress,selected=current?.selected;
      const longPress=text?{rows,...(selected&&rows[selected.row]?.[selected.col]?{selected}:{})}:{rows:[[null]]};
      if(updateKey({longPress}) !== false){renderAll();toast('長按候選已更新，可按住此鍵測試。');}return;
    }
    if(action==='apply-collection'){
      const category=document.getElementById('collection-category').value,values=document.getElementById('collection-values').value.split('\n').map((x) => x.trim()).filter(Boolean);
      commit((p) => {p.collections[category]=values;},'',true);toast('分類內容已儲存。');return;
    }
    if(action==='apply-yaml'){
      const path=view.nativePath || `${view.theme}/${descriptorName(view)}.yaml`,root=parseNativeYaml(document.getElementById('native-editor').value),errors=path==='config.yaml'?[]:validateNative(root);
      if(errors.length)throw new Error(errors.slice(0,5).join('\n'));
      delete view.nativeDrafts[path];commit((p) => {if(path==='config.yaml')p.nativeConfig=root;else p.nativeOverrides[path]=root;},'',true);toast('原生 YAML 已套用。');return;
    }
    if(action==='reset-yaml'){const path=view.nativePath||`${view.theme}/${descriptorName(view)}.yaml`;delete view.nativeDrafts[path];commit((p) => {if(path==='config.yaml')delete p.nativeConfig;else delete p.nativeOverrides[path];},'',true);return;}
    if(action==='exit-native'){changeView({nativePath:null});return;}
    if(action==='copy-yaml'){await navigator.clipboard.writeText(document.getElementById('native-editor').value);toast('YAML 已複製。');return;}
    if(action==='export-dialog'){
      openModal(modalFrame('把設計，帶進元書。',`<div class="export-file"><span>${icon('keyboard',30)}</span><div><b>${esc(safeName(project.meta.name))}.cskin</b><small>深淺色 · 直橫向 · 繁中／英文符號頁</small></div></div><div class="export-checks"><p>${icon('check',16)}原生 YAML 與鍵盤映射</p><p>${icon('check',16)}預覽圖、繁中說明與完整專案檔</p><p>${icon('check',16)}匯入的進階設定與資源一併保留</p></div><p class="field-hint">下載後，將檔案分享至元書安裝。請在裝置上確認透明效果、長按切頁及中文輸入。</p>`, '<button class="button secondary" data-action="close-modal">繼續編輯</button><button class="button primary" data-action="download-cskin">下載 .cskin</button>'));return;
    }
    if(action==='download-cskin'){
      button.disabled=true;button.textContent='正在產生皮膚…';
      try{const demo=await createDemoPng(project,view.theme);const bytes=exportArchive(project,demo);download(bytes,`${safeName(project.meta.name)}.cskin`,'application/zip');closeModal();toast('皮膚已匯出。可分享至元書安裝。');}finally{button.disabled=false;button.textContent='下載 .cskin';}return;
    }
    if(action==='guide'){
      openModal(modalFrame('從這裡，做出你的鍵盤。',`<ol class="guide-steps"><li><b>挑外觀與佈局</b><p>先選玻璃質感，再調鍵距、字級與深淺色。</p></li><li><b>點鍵盤，編輯按鍵</b><p>字面與 RIME 動作分開。開啟試打後，可測試切頁、滑動與長按放開。</p></li><li><b>留住兩種符號配置</b><p>符號鍵單擊進仿 iOS 頁，長按放開進元書分類；123 開獨立數字頁。句號長按依中英文提供不同標點。</p></li><li><b>儲存與安裝</b><p>草稿自動保存在此瀏覽器；專案檔可移至其他裝置。下載 .cskin 後分享至元書。</p></li></ol><div class="panel-note">這是第一版。Ryan 設定僅轉換基本欄位；原生皮膚可保留並編輯 YAML。圖片、部分集合與原生動畫仍需實機驗證。網頁不執行 RIME 引擎或任意 Jsonnet。</div>`));return;
    }
  } catch(error){toast(error.message);}
});
document.getElementById('file-import').addEventListener('change',async(e) => {
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>12*1024*1024)throw new Error('檔案不能超過 12 MB。');const result=importBytes(new Uint8Array(await file.arrayBuffer()),file.name);view.nativePath=result.nativePath||null;if(result.nativePath)view.theme=result.nativePath.startsWith('light/')?'light':'dark';view.selected=null;tab='project';if(commit(() => result.project,'',true))toast(result.message);}catch(error){toast(`匯入失敗：${error.message}`);}finally{e.target.value='';}
});
function syncPhysicalCaps(e){
  if(e.key==='CapsLock'&&!e.repeat&&view.locale==='en'&&(e.target===document.body||e.target.closest('#typing-paper,#keyboard-preview'))){const locked=typeof e.getModifierState==='function'?e.getModifierState('CapsLock'):!view.capsLocked;Object.assign(view,caseState(locked?'locked':'lower'));renderPreview();if(tab==='keys')renderPanel();}
}
document.addEventListener('keyup',syncPhysicalCaps);
document.addEventListener('keydown',(e) => {
  syncPhysicalCaps(e);
  if(e.key==='Escape'){cancelPress();if(view.floating){view.floating=null;renderPreview();}}
  if(press?.held&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)){e.preventDefault();if(e.key==='Enter'){finishPress();return;}const items=press.choices,current=items.findIndex((c)=>c.row===press.selected?.row&&c.col===press.selected?.col),delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1,next=items[Math.max(0,Math.min(items.length-1,current+delta))];press.selected={row:next.row,col:next.col};updateHoldHighlight();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();document.querySelector('[data-action="save-project"]').click();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea,select')){e.preventDefault();document.querySelector(`[data-action="${e.shiftKey?'redo':'undo'}"]`).click();}
});
renderAll();persist();
