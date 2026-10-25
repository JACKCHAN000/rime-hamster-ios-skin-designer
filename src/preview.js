import { buildNativeKeyboard, descriptorName, isLegacyNumericLayout } from './native.js';
import { esc, icon, systemIcon, drawIcon } from './icons.js';
import { accessibleKeyLabel } from './key-presentation.js';
import { actionLabel,hiddenSwipeHint } from './actions.js';
import { asciiModeValue } from './rime-state.js';
import {applySchemaBindings} from './schema-binding.js';
import {applyKeyPresentation,legendLabel} from './presentation-settings.js';
import {spaceSymbolColor,spaceSymbolHtml,drawSpaceSymbol} from './space-symbol.js';
import {SYSTEM_SURFACE} from './keyboard-material.js';

export const cssColor = (value, fallback = 'transparent') => typeof value === 'string' && /^#?[a-f0-9]{6}([a-f0-9]{2})?$/i.test(value) ? `#${value.replace(/^#/,'')}` : fallback;
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function lengthCss(value, fallback = '') {
  if (typeof value === 'number') return `${Math.max(0,value)}px`;
  if (typeof value === 'object' && value) return `${number(value.percentage) * 100}%`;
  const ratio = typeof value === 'string' && /^([\d.]+)\/([\d.]+)$/.exec(value);
  if (ratio && Number(ratio[2]) > 0) return `${Number(ratio[1])/Number(ratio[2])*100}%`;
  return fallback;
}
export function selectedStyles(ref, view) {
  if (typeof ref === 'string') return [ref];
  if (!Array.isArray(ref)) return [];
  if (ref.every((x) => typeof x === 'string')) return ref;
  const match = ref.find((x) => {
    const actual = x.conditionKey === 'rime$ascii_mode' ? asciiModeValue(view) : x.conditionKey === 'rime$simplification' ? view.simplified : x.conditionKey === '$returnKeyType' ? 0 : x.conditionKey === '$symbolicKeyboardLockState' ? false : undefined;
    return actual !== undefined && (Array.isArray(x.conditionValue) ? x.conditionValue.includes(actual) : actual === x.conditionValue);
  });
  return typeof match?.styleName === 'string' ? [match.styleName] : Array.isArray(match?.styleName) ? match.styleName : [];
}
export function effectiveCell(cell, root, view) {
  let result = { ...cell };
  const names = typeof cell.notification === 'string' ? [cell.notification] : cell.notification || [];
  for (const name of names) {
    const n = root[name]; if (!n) continue;
    const match = n.notificationType === 'preeditChanged' ? view.preedit : n.notificationType === 'rime' && n.rimeNotificationType === 'optionChanged' ? (n.rimeOptionName === 'ascii_mode' ? asciiModeValue(view) : n.rimeOptionName === 'simplification' ? view.simplified : undefined) === n.rimeOptionValue : false;
    if (match) result = { ...result, ...n };
  }
  const upper=!!(view.shifted||view.capsLocked);
  if(view.capsLocked&&result.capsLockedStateForegroundStyle)result.foregroundStyle=result.capsLockedStateForegroundStyle;
  else if(upper&&result.uppercasedStateForegroundStyle)result.foregroundStyle=result.uppercasedStateForegroundStyle;
  if(upper&&result.uppercasedStateAction)result.action=result.uppercasedStateAction;
  if (view.preedit && result.preeditStateAction) result.action = result.preeditStateAction;
  return result;
}
function fill(value) {
  if (Array.isArray(value)) return `linear-gradient(180deg,${value.map((x) => cssColor(x)).join(',')})`;
  return cssColor(value);
}
function insetsCss(insets = {}) { return `${number(insets.top)}px ${number(insets.right)}px ${number(insets.bottom)}px ${number(insets.left)}px`; }
function previewForegroundStyle(cellName,style){
  // The 50% menu glyph correction is for iPhone rendering, not web/PNG fonts.
  return cellName==='tool_menu'&&style?.buttonStyleType==='text'&&style.text==='☰'&&style.fontSize===27
    ?{...style,fontSize:18}:style;
}
export function layerHtml(style, view, textOverride) {
  if (!style || typeof style !== 'object') return '';
  if(spaceSymbolColor(style))return spaceSymbolHtml(style);
  let content = '', attributes = '';
  const x = number(style.center?.x,0.5)*100, y = number(style.center?.y,0.5)*100;
  if (style.buttonStyleType === 'geometry') return `<span class="key-geometry" style="inset:${insetsCss(style.insets)};background:${esc(fill(style.normalColor))};border:${number(style.borderSize)}px solid ${cssColor(style.normalBorderColor)};border-radius:${number(style.cornerRadius)}px;box-shadow:${number(style.shadowOffset?.x)}px ${number(style.shadowOffset?.y,1)}px ${number(style.shadowRadius,2)}px ${cssColor(style.normalShadowColor,'#000000')}${Math.round(number(style.shadowOpacity,0)*255).toString(16).padStart(2,'0')}"></span>`;
  const size = typeof style.fontSize === 'string' && style.fontSize.endsWith('em') ? `${number(style.fontSize.slice(0,-2),1)}em` : `${number(style.fontSize,20)}px`;
  if (style.buttonStyleType === 'systemImage') {
    const name = systemIcon(style.systemImageName);
    content = name ? icon(name,number(style.fontSize,22)) : `<span class="unknown-icon">◇</span>`;
    attributes = ` title="${esc(typeof style.systemImageName === 'object' ? style.systemImageName.ios : style.systemImageName)}"`;
  } else if (style.buttonStyleType === 'fileImage' || style.buttonStyleType === 'assetImage') {
    content = icon('image',18); attributes = ' title="圖片樣式：目前以佔位顯示，原始資源保留於匯出包"';
  } else {
    let text = textOverride ?? style.text ?? '';
    const variables = { '$rimeSchemaName':'中文', '$rimePreedit':view.preedit ? 'ab' : '', '$rimeCandidate':'明', '$returnKeyType':'換行' };
    text = variables[text] ?? text;
    content = esc(text);
  }
  return `<span class="key-layer"${attributes} style="left:${x}%;top:${y}%;font-size:${size};color:${cssColor(style.normalColor,'#FFFFFF')};font-weight:${({regular:400,medium:500,semibold:600,bold:700,light:300})[style.fontWeight] || 400}">${content}</span>`;
}
export function rootForView(p, view) {
  const raw=view.nativePath&&p.nativeOverrides[view.nativePath],numeric=/^(dark|light)\/numeric(_en)?_(portrait|landscape)\.yaml$/.exec(view.nativePath||'');
  const root=raw&&numeric&&isLegacyNumericLayout(raw.keyboardLayout)
    ?buildNativeKeyboard(p,{theme:numeric[1],page:'numeric',locale:numeric[2]?'en':'zh',orientation:numeric[3]})
    :raw?applySchemaBindings(raw,p.schemaBinding):buildNativeKeyboard(p,view);
  const path=view.nativePath||'',locale=/\/(alphabetic|numeric_en|ios_en_)/.test(path)?'en':/\/pinyin_/.test(path)?'zh':view.locale;
  applyKeyPresentation(root,p,{theme:view.theme,locale});
  return view.page==='panel'?{preeditHeight:0,toolbarHeight:0,keyboardHeight:164,...root}:root;
}
export function renderKeyboard(p, view) {
  const root = rootForView(p,view), cells = new Map();
  const board = root[root.keyboardStyle?.backgroundStyle] || {};
  function cellHtml(name, extra = {}) {
    const original = root[name] || {};
    const cell = effectiveCell(original,root,view);
    const id = extra.id || name;
    const refs = selectedStyles(cell.foregroundStyle,view);
    const fg = refs.map((ref) => layerHtml(previewForegroundStyle(name,root[ref]),view,extra.label)).join('');
    const bgRef = selectedStyles(cell.backgroundStyle,view)[0];
    const bg = layerHtml(root[bgRef],view);
    const label = extra.label ?? (refs.map((ref)=>root[ref]?.text).find(Boolean)||refs.map((ref)=>root[ref]?.systemImageName).find(Boolean)||name);
    const action=extra.action ?? cell.action,accessibilityLabel=accessibleKeyLabel(name,action,label,view.locale);
    const glyph=systemIcon(root[refs[0]]?.systemImageName);
    const keyId=name.startsWith('key_')?name.slice(4):name;
    const title=[accessibilityLabel,cell.swipeUpAction && cell.swipeUpAction!=='none'&&!hiddenSwipeHint(keyId,cell.swipeUpAction) ? `上滑：${actionLabel(cell.swipeUpAction)}` : '',cell.swipeDownAction && cell.swipeDownAction!=='none'&&!hiddenSwipeHint(keyId,cell.swipeDownAction) ? `下滑：${actionLabel(cell.swipeDownAction)}` : ''].filter(Boolean).join('\n');
    cells.set(id,{ name, cell, original, label, accessibilityLabel, icon:glyph, action, root });
    const isEmpty = !cell.foregroundStyle && !cell.backgroundStyle;
    if (isEmpty) return `<span class="native-spacer" style="${sizeCss(cell.size,'row')}"></span>`;
    return `<button class="native-key ${view.selected === id ? 'selected-key' : ''}" data-cell="${esc(id)}" aria-label="${esc(accessibilityLabel)}" title="${esc(title)}" style="${sizeCss(cell.size,'row')}">${bg}${fg}</button>`;
  }
  function sizeCss(size = {}, parent = 'row') {
    const basis = lengthCss(parent === 'row' ? size?.width : size?.height);
    return basis ? `flex:0 0 ${basis};` : 'flex:1 1 0;';
  }
  function collectionHtml(name, cell) {
    const style = root[cell.cellStyle] || {};
    if (cell.type === 'classifiedSymbols') {
      const names = root[cell.dataSource] || Object.keys(p.collections);
      const rowHeight=100/Math.max(1,number(cell.maximumRow,6));
      return `<div class="collection-categories" style="${sizeCss(cell.size)}padding:${insetsCss(cell.insets)}">${names.map((label) => {
        const active=view.category===label,fg=selectedStyles(style.foregroundStyle,view).map((ref)=>{const text=root[ref]||{};return layerHtml(active?{...text,normalColor:text.highlightColor||text.normalColor}:text,view,label);}).join('');
        return `<button data-category="${esc(label)}" class="native-key collection-category ${active?'active':''}" aria-pressed="${active}" style="flex:0 0 ${rowHeight}%;">${layerHtml(root[selectedStyles(style.backgroundStyle,view)[0]],view)}${fg}</button>`;
      }).join('')}</div>`;
    }
    if (cell.type === 'subClassifiedSymbols' || cell.type === 'symbols' || cell.type === 'horizontalSymbols') {
      const data = cell.type === 'subClassifiedSymbols' ? root[view.category] || p.collections[view.category] || [] : root[cell.dataSource] || [];
      const limit = 24, slice = cell.type === 'subClassifiedSymbols' ? data.slice((view.collectionPage || 0)*limit,((view.collectionPage || 0)+1)*limit) : data;
      return `<div class="collection-symbols" style="${sizeCss(cell.size)}">${slice.map((item,i) => {
        const label = typeof item === 'object' ? item.label : String(item);
        const action = typeof item === 'object' ? item.action || {symbol:item.value} : {symbol:String(item)};
        const id = `${name}_${i}`; cells.set(id,{name,cell:style,original:style,label,action});
        return `<button class="native-key" data-cell="${esc(id)}" aria-label="${esc(label)}">${layerHtml(root[selectedStyles(style.backgroundStyle,view)[0]],view)}${selectedStyles(style.foregroundStyle,view).map((ref) => layerHtml(root[ref],view,label)).join('')}</button>`;
      }).join('')}</div>`;
    }
    if (['horizontalCandidates','verticalCandidates'].includes(cell.type)) return `<div class="candidate-samples ${cell.type === 'verticalCandidates' ? 'expanded' : ''}">${['明','早','是','好','可以','我們','今天','喜歡','輸入','生活','時光','一起'].slice(0,cell.type === 'verticalCandidates' ? 12 : 6).map((word,i) => `<button data-sample="${word}" style="color:${cssColor(root[cell.candidateStyle]?.[i ? 'textColor' : 'preferredTextColor'],'#FFFFFF')}">${word}</button>`).join('')}</div>`;
    return `<div class="native-unsupported">${esc(cell.type)}<small>原生集合保留</small></div>`;
  }
  function nodesHtml(nodes = [], parent = 'column') {
    return nodes.map((node) => {
      if (node.Cell) { const cell = root[node.Cell] || {}; return cell.type && cell.type !== 'button' ? collectionHtml(node.Cell,cell) : cellHtml(node.Cell); }
      const kind = node.HStack ? 'HStack' : 'VStack';
      const data = node[kind]; if (!data) return '';
      const size = root[data.style]?.size;
      return `<div class="native-stack ${kind === 'HStack' ? 'native-row' : 'native-column'}" style="${sizeCss(size,parent)}">${nodesHtml(data.subviews,kind === 'HStack' ? 'row' : 'column')}</div>`;
    }).join('');
  }
  const preeditHeight = number(root.preeditHeight,0);
  const region = view.candidates === 'expanded' ? 'verticalCandidatesLayout' : view.candidates === 'normal' || view.preedit ? 'horizontalCandidatesLayout' : 'toolbarLayout';
  const toolbar = `<div class="native-toolbar" style="height:${number(root.toolbarHeight,42) + (view.candidates === 'expanded' ? number(root.keyboardHeight,224) : 0)}px">${nodesHtml(root[region] || [])}</div>`;
  const keys = view.candidates === 'expanded' ? '' : `<div class="native-keys" style="height:${number(root.keyboardHeight,224)}px;padding:${insetsCss(root.keyboardStyle?.insets)}">${nodesHtml(root.keyboardLayout || [])}</div>`;
  const legendDescription=view.locale==='en'?(view.capsLocked?'大寫鎖定字母':view.shifted?'大寫字母':'小寫字母'):legendLabel(p.legend);
  const preedit = preeditHeight ? `<div class="native-preedit" style="height:${preeditHeight}px;color:${cssColor(root.preeditText?.textColor,'#969FA5')}">${view.preedit ? 'ab' : `<span class="preedit-placeholder">${view.locale==='zh'?'中文':'英文'} · ${legendDescription}</span>`}</div>` : '';
  const tint=fill(board.normalColor),surface=SYSTEM_SURFACE[view.theme],background=Array.isArray(board.normalColor)?`${tint},${surface}`:`linear-gradient(${tint},${tint}),${surface}`;
  return { root,cells, html:`<div class="native-board ${p.behavior.animation ? 'animated' : ''}" style="background:${esc(background)};color:${cssColor(p.colors[view.theme].text)}">${preedit}${toolbar}${keys}</div>`, name: view.nativePath && p.nativeOverrides[view.nativePath] ? view.nativePath : `${view.theme}/${descriptorName(view)}.yaml` };
}

export function createDemoPng(p, theme = 'dark') {
  const root = buildNativeKeyboard(p,{theme,page:'main',locale:'zh',orientation:'portrait'});
  const scale = 2, width = 390, height = Number(root.preeditHeight)+Number(root.toolbarHeight)+Number(root.keyboardHeight);
  const canvas = document.createElement('canvas'); canvas.width = width*scale; canvas.height = height*scale;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('瀏覽器無法產生預覽圖。');
  ctx.scale(scale,scale);ctx.fillStyle=SYSTEM_SURFACE[theme];ctx.fillRect(0,0,width,height);ctx.fillStyle = cssColor(root.boardBackground.normalColor); ctx.fillRect(0,0,width,height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = p.colors[theme].text; ctx.font = '12px sans-serif'; ctx.fillText(`中文 · ${legendLabel(p.legend)}`,width/2,Number(root.preeditHeight)/2);
  const tools = p.toolbar, toolbarY = Number(root.preeditHeight);
  const paintForeground=(fg,x,y,maxWidth,box)=>{
    if(spaceSymbolColor(fg)&&box){drawSpaceSymbol(ctx,fg,box);return;}
    if(!fg)return;const color=cssColor(fg.normalColor,'#FFFFFF'),size=Number(fg.fontSize)||20,graphic=fg.buttonStyleType==='systemImage'?systemIcon(fg.systemImageName):null;
    if(graphic&&drawIcon(ctx,graphic,x,y,size,color))return;
    ctx.fillStyle=color;ctx.font=`${size}px sans-serif`;ctx.fillText(fg.text??'◇',x,y,maxWidth);
  };
  tools.forEach((id,i)=>{const cell=root[`tool_${id}`];for(const name of selectedStyles(cell?.foregroundStyle,{locale:'zh',simplified:false}))paintForeground(previewForegroundStyle(`tool_${id}`,root[name]),width/tools.length*(i+0.5),toolbarY+Number(root.toolbarHeight)/2,width/tools.length-4);});
  const yStart = toolbarY+Number(root.toolbarHeight), rows = root.keyboardLayout || [];
  rows.forEach((row,r) => { let x = 4; const available = width-8, rowHeight = Number(root.keyboardHeight)/rows.length;
    for (const node of row.HStack?.subviews || []) {
      const cell = root[node.Cell] || {}, ratio = /([\d.]+)\/([\d.]+)/.exec(cell.size?.width || '');
      const w = ratio ? available*Number(ratio[1])/Number(ratio[2]) : available/row.HStack.subviews.length;
      const bg = root[selectedStyles(cell.backgroundStyle,{locale:'zh',simplified:false})[0]];
      if (bg) { const gap = p.metrics.gap; ctx.fillStyle = cssColor(bg.normalColor); ctx.beginPath(); ctx.roundRect(x+gap/2,yStart+r*rowHeight+gap/2,w-gap,rowHeight-gap,Math.min(p.metrics.radius,w/2)); ctx.fill(); }
      for (const name of selectedStyles(cell.foregroundStyle,{locale:'zh',simplified:false})) {
        const fg = root[name];if(!fg)continue;
        paintForeground(fg,x+w*(fg.center?.x??0.5),yStart+(r+(fg.center?.y??0.5))*rowHeight,w-4,{x,y:yStart+r*rowHeight,width:w,height:rowHeight});
      }
      x+=w;
    }
  });
  return new Promise((resolve,reject) => canvas.toBlob(async (blob) => blob ? resolve(new Uint8Array(await blob.arrayBuffer())) : reject(new Error('無法產生 PNG。')),'image/png'));
}
