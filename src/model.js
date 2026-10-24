import { defaultSwipes } from './actions.js';
import {DEFAULT_SCHEMA_BINDING,bindLanguageAction} from './schema-binding.js';
import {collectionStyles} from './collection-style.js';
import {DEFAULT_SWIPE_HINTS,chineseLegend} from './presentation-settings.js';
export const PROJECT_FORMAT = 'hamster-skin-studio';
export const PROJECT_VERSION = 1;
export const clone = (value) => structuredClone(value);
export function languageAction(locale,binding){return bindLanguageAction({keyboardType:locale==='en'?'pinyin':'alphabetic'},binding);}

export const LAYOUTS = [
  { id: 'ios', name: 'iOS 27', description: '內縮字母排、寬空白鍵，繁中與英文各有兩頁符號。' },
];
export const APPEARANCES = [
  { id: 'glass', name: 'Liquid Glass', description: '柔和透光、細亮邊與輕盈陰影' },
  { id: 'frost', name: '霧面玻璃', description: '提高底色遮蔽，維持文字清晰' },
  { id: 'solid', name: '經典實色', description: '乾淨俐落的實色鍵帽' },
];
export const TOOL_OPTIONS = [
  ['menu', '菜單', {floatKeyboardType:'panel'}],
  ['symbols', '符號', { keyboardType: 'symbolic' }],
  ['emoji', 'Emoji 鍵盤', { keyboardType: 'emojis' }],
  ['script', '腳本', { shortcut: '#toggleScriptView' }],
  ['language', '中英', { shortcut: '#中英切换' }],
  ['traditional', '繁簡', { shortcut: '#简繁切换' }],
  ['phrase', '常用語', { shortcut: '#showPhraseView' }],
  ['clipboard', '剪貼簿', { shortcut: '#showPasteboardView' }],
  ['copy', '複製', { shortcut: '#copy' }],
  ['dismiss', '收起', 'dismissKeyboard'],
];
export const DEFAULT_TOOLBAR = ['menu','emoji','phrase','clipboard','script','traditional','dismiss'];
export const SYMBOL_CATEGORIES = {
  常用: ['，', '。', '、', '？', '！', '：', '；', '「', '」', '『', '』', '（', '）', '《', '》', '〈', '〉', '…', '—', '～', '・', '＠', '＃', '％'],
  括號: ['（', '）', '〔', '〕', '［', '］', '｛', '｝', '〈', '〉', '《', '》', '【', '】', '〖', '〗'],
  引號: ['「', '」', '『', '』', '“', '”', '‘', '’', '〝', '〞'],
  數學: ['＋', '−', '×', '÷', '＝', '≠', '≈', '≦', '≧', '±', '∞', '√', '∑', 'π', '％', '‰'],
  單位: ['℃', '℉', '°', '㎜', '㎝', '㎞', '㎡', '㎥', '㎎', '㎏', '㏄', '㏑'],
  貨幣: ['＄', 'NT$', 'HK$', 'US$', '€', '£', '¥', '₩', '₹', '₿'],
  箭頭: ['←', '↑', '→', '↓', '↖', '↗', '↘', '↙', '⇄', '⇅', '⇒', '⇐'],
  注音: [...'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ', 'ˊ', 'ˇ', 'ˋ', '˙'],
};

const SYMBOLS = {
  zh: [
    [['1','2','3','4','5','6','7','8','9','0'], ['-','/',':',';','(',')','$','@','「','」'], ['。','，','、','？','！','.']],
    [['[',']','{','}','#','%','^','*','+','='], ['_','—','\\','|','~','《','》','¥','&','・'], ['…',',','^_^','?','!','’']],
  ],
  en: [
    [['1','2','3','4','5','6','7','8','9','0'], ['-','/',':',';','(',')','$','&','@','"'], ['.',',','?','!',"'"]],
    [['[',']','{','}','#','%','^','*','+','='], ['_','\\','|','~','<','>','€','£','¥','•'], ['.',',','?','!',"'"]],
  ],
};

export function createProject() {
  return {
    format: PROJECT_FORMAT, version: PROJECT_VERSION, editorRevision: 14,
    meta: { name: '霧光 · 中文', author: '', description: '為日常打字，留一點光。' },
    layout: 'ios', appearance: 'glass', legend: 'cangjie',
    dimensions: { portrait: { keyboardHeight: 224, toolbarHeight: 42, preeditHeight: 22 }, landscape: { keyboardHeight: 160, toolbarHeight: 36, preeditHeight: 20 } },
    metrics: { gap: 5, radius: 10, fontSize: 22, keyOpacity: 24, border: 0.5, shadow: 0.16 },
    colors: {
      dark: { background: '#202124', key: '#FFFFFF', text: '#FFFFFF', accent: '#B8DFFF' },
      light: { background: '#D9DFE5', key: '#FFFFFF', text: '#18202A', accent: '#B8DFFF' },
    },
    toolbar: [...DEFAULT_TOOLBAR],
    schemaBinding:{...DEFAULT_SCHEMA_BINDING},
    swipeHints:clone(DEFAULT_SWIPE_HINTS),
    behavior: { symbolTap: 'ios', symbolHold: 'hamster', animation: true, showPreedit: true, bottomRow: 'enhanced', swipePreset:'reference', hintStyle:'text' },
    symbolPages: clone(SYMBOLS), collections: clone(SYMBOL_CATEGORIES),
    keys: {}, nativeOverrides: {}, assets: {}, compatibility: { source: null, warnings: [] },
  };
}

// Additive migration: keep user colours, actions, native overrides, and toolbar order.
export function upgradeProject(value) {
  const p = clone(value);
  if (p?.format !== PROJECT_FORMAT || p.version !== PROJECT_VERSION || (p.editorRevision ?? 1) >= 14) return p;
  const previousToolbar=Array.isArray(p.toolbar)?[...p.toolbar]:null;
  if ((p.editorRevision ?? 1) < 2) {
    if (p.behavior && p.behavior.bottomRow === undefined) p.behavior.bottomRow = 'enhanced';
    if (Array.isArray(p.toolbar)) for (const id of ['emoji','script']) {
      if (!p.toolbar.includes(id) && p.toolbar.length < 10) {
        const at = p.toolbar.indexOf('dismiss');p.toolbar.splice(at < 0 ? p.toolbar.length : at,0,id);
      }
    }
  }
  if ((p.editorRevision ?? 1)<3 && Array.isArray(p.toolbar) && !p.toolbar.includes('menu') && p.toolbar.length<10) p.toolbar.unshift('menu');
  if (p.behavior) {
    if (p.behavior.swipePreset===undefined) p.behavior.swipePreset='reference';
    if (p.behavior.hintStyle===undefined) p.behavior.hintStyle='text';
  }
  if((p.editorRevision??1)<5 && Array.isArray(p.toolbar) && JSON.stringify(p.toolbar)!==JSON.stringify(DEFAULT_TOOLBAR)){
    p.compatibility ||= {source:null,warnings:[]};
    p.compatibility.previousToolbar ||= previousToolbar || [...p.toolbar];
    p.toolbar=[...DEFAULT_TOOLBAR];
  }
  if((p.editorRevision??1)<6&&Array.isArray(p.toolbar))p.toolbar=p.toolbar.filter((id)=>id!=='language');
  if((p.editorRevision??1)<7){
    for(const [theme,previous] of [['dark','#BDE3BE'],['light','#4C7655']])if(p.colors?.[theme]?.accent?.toUpperCase()===previous)p.colors[theme].accent='#B8DFFF';
    for(const locale of ['zh','en']){
    const key=p.keys?.[`${locale}:language`],action=key?.action;
    if(action?.shortcut==='#中英切换'||action?.shortcutCommand==='#中英切换'){
      p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousLanguageActions ||= {};p.compatibility.previousLanguageActions[locale]=clone(action);key.action=languageAction(locale);
    }
    }
    repairGeneratedOverrides(p);
  }
  if((p.editorRevision??1)<8)repairToolbarPresentation(p);
  if((p.editorRevision??1)<9)repairSwipeAppearance(p);
  p.schemaBinding ||= {...DEFAULT_SCHEMA_BINDING};
  if((p.editorRevision??1)<11)repairSymbolAppearance(p);
  if(['ryan','workbench'].includes(p.layout)){
    p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousLayout ||= p.layout;p.layout='ios';
  }
  if(p.meta?.name==='霧光 · 速成')p.meta.name='霧光 · 中文';
  p.swipeHints ||= clone(DEFAULT_SWIPE_HINTS);
  if((p.editorRevision??1)<13&&p.legend==='uppercase'){p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousLegend ||= p.legend;p.legend='cangjie';}
  if(p.schemaBinding.zh==='quick_ice'){
    p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousChineseSchemaId ||= p.schemaBinding.zh;p.schemaBinding.zh='quick5_lite';
  }
  p.editorRevision = 14;
  return p;
}

function repairSymbolAppearance(p){
  for(const [path,root] of Object.entries(p.nativeOverrides||{})){
    const match=/^(dark|light)\/symbolic_(portrait|landscape)\.yaml$/.exec(path);
    if(!match||root.symbolCell?.backgroundStyle!=='keyBackground'||root.symbolCell?.foregroundStyle!=='symbolText')continue;
    const remember=(id)=>{
      if(!Object.hasOwn(root,id))return;
      p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousSymbolAppearance ||= {};p.compatibility.previousSymbolAppearance[path] ||= {};
      p.compatibility.previousSymbolAppearance[path][id]=clone(root[id]);
    };
    const styles=collectionStyles(resolveAppearance(p,match[1]));
    for(const id of ['symbolItemBackground','symbolCategoryCell','symbolCategoryText'])if(!Object.hasOwn(root,id))root[id]=styles[id];
    remember('symbolCell');root.symbolCell={...root.symbolCell,backgroundStyle:'symbolItemBackground'};
    remember('symbolText');root.symbolText={...styles.symbolText,...root.symbolText,badgeFontSize:8,badgeNormalColor:'#00000000',badgeHighlightColor:'#00000000'};
    if(root.symbolCategories?.cellStyle==='symbolCell'){
      remember('symbolCategories');root.symbolCategories={...root.symbolCategories,cellStyle:'symbolCategoryCell',displaySeparatorLine:false};
    }
    for(const id of ['collectionPrevious','collectionNext','collectionReturn'])if(root[id]?.backgroundStyle==='keyBackground'){
      remember(id);root[id]={...root[id],backgroundStyle:'symbolItemBackground'};
    }
  }
}

function repairSwipeAppearance(p){
  for(const [path,root] of Object.entries(p.nativeOverrides||{})){
    if(!/^(light|dark)\/[^/]+\.yaml$/.test(path))continue;
    for(const [name,cell] of Object.entries(root)){
      if(!name.startsWith('key_')||!cell||typeof cell!=='object'||Array.isArray(cell))continue;
      for(const direction of ['Up','Down']){
        const field=`swipe${direction}ForegroundStyle`,value=cell[field],generated=`${name}_swipe${direction}_active`;
        if(value!==generated&&!(Array.isArray(value)&&value.length===1&&value[0]===generated))continue;
        p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousSwipeAppearance ||= {};p.compatibility.previousSwipeAppearance[path] ||= {};p.compatibility.previousSwipeAppearance[path][name] ||= {};
        p.compatibility.previousSwipeAppearance[path][name][field]=clone(value);delete cell[field];
      }
    }
  }
}

function repairToolbarPresentation(p){
  for(const [path,root] of Object.entries(p.nativeOverrides||{})){
    const match=/^(dark|light)\/(pinyin|alphabetic|numeric(?:_en)?|ios_(?:zh|en)_symbols_[12]|symbolic)_(portrait|landscape)\.yaml$/.exec(path);if(!match)continue;
    const theme=match[1],english=/^(alphabetic|numeric_en|ios_en_)/.test(match[2]),ink=p.colors[theme].text;
    const remember=(id)=>{if(!root[id])return;p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousToolbarPresentation ||= {};p.compatibility.previousToolbarPresentation[path] ||= {};p.compatibility.previousToolbarPresentation[path][id] ||= clone(root[id]);};
    for(const id of ['key_language','tool_language'])if(root[id]){remember(id);root[id].backgroundStyle=id==='key_language'?'keyBackground':'languageToolbarBackground';}
    if(root.languageEnglishBackground&&root.keyBackground){remember('languageEnglishBackground');root.languageEnglishBackground=clone(root.keyBackground);}
    for(const id of ['key_language_fg','key_language_en_fg','tool_language_en_fg'])if(root[id]){remember(id);root[id].normalColor=ink;root[id].highlightColor=ink;}
    for(const id of ['languageToolbarEnglishBackground','languageToolbarBackground'])if(root[id]){remember(id);root[id]={buttonStyleType:'geometry',normalColor:'#00000000'};}
    for(const [id] of TOOL_OPTIONS){
      const name=`tool_${id}`,fg=`${name}_fg`;
      if(root[name]?.action){remember(name);root[name].bounds={alignment:'center',width:28,height:28};}
      if(root[fg]?.buttonStyleType==='systemImage'){remember(fg);Object.assign(root[fg],{fontSize:17,fontWeight:'medium',contentMode:'center',center:{x:0.5,y:0.5}});}
    }
    if(root.tool_dismiss_fg?.buttonStyleType==='systemImage'){remember('tool_dismiss_fg');root.tool_dismiss_fg.systemImageName='chevron.down';}
    if(english&&root.tool_traditional){
      remember('tool_traditional');root.tool_traditional.action={shortcut:'#中英切换'};root.tool_traditional.foregroundStyle=[{conditionKey:'rime$ascii_mode',conditionValue:false,styleName:'tool_ascii_off_fg'},{conditionKey:'rime$ascii_mode',conditionValue:true,styleName:'tool_ascii_on_fg'}];root.tool_traditional.notification=['englishAsciiOffNotification','englishAsciiOnNotification'];
      root.tool_ascii_off_fg={buttonStyleType:'text',text:'EN+',fontSize:15,fontWeight:'medium',normalColor:ink,highlightColor:ink,center:{x:0.5,y:0.5}};root.tool_ascii_on_fg={...root.tool_ascii_off_fg,text:'EN-'};
      root.englishAsciiOffNotification={notificationType:'rime',rimeNotificationType:'optionChanged',rimeOptionName:'ascii_mode',rimeOptionValue:false,foregroundStyle:'tool_ascii_off_fg'};root.englishAsciiOnNotification={...root.englishAsciiOffNotification,rimeOptionValue:true,foregroundStyle:'tool_ascii_on_fg'};
    }
  }
}

function repairGeneratedOverrides(p){
  for(const [path,root] of Object.entries(p.nativeOverrides||{})){
    const match=/^(dark|light)\/(pinyin|alphabetic)_(portrait|landscape)\.yaml$/.exec(path);if(!match)continue;
    const [_,theme,type]=match,locale=type==='alphabetic'?'en':'zh';
    const remember=(id)=>{
      p.compatibility ||= {source:null,warnings:[]};p.compatibility.previousGeneratedFields ||= {};p.compatibility.previousGeneratedFields[path] ||= {};
      if(!Object.hasOwn(p.compatibility.previousGeneratedFields[path],id))p.compatibility.previousGeneratedFields[path][id]=clone(root[id]);
    };
    for(const id of 'qwertyuiopasdfghjklzxcvbnm'){
      const name=`key_${id}`,cell=root[name],fg=root[`${name}_fg`];if(locale!=='en')continue;
      if(fg?.buttonStyleType==='text'&&fg.text===id.toUpperCase()&&p.keys?.[`en:${id}`]?.label===undefined){remember(`${name}_fg`);fg.text=id;}
      if(cell?.action?.character===id){remember(name);cell.uppercasedStateAction ||= {character:id.toUpperCase()};cell.uppercasedStateForegroundStyle ||= [`${name}_upper_fg`];cell.capsLockedStateForegroundStyle ||= clone(cell.uppercasedStateForegroundStyle);}
    }
    if(root.key_shift?.action==='shift'){
      remember('key_shift');root.key_shift.uppercasedStateAction='shift';root.key_shift.uppercasedStateForegroundStyle ||= 'key_shift_upper_fg';root.key_shift.capsLockedStateForegroundStyle ||= 'key_shift_caps_fg';
    }
    if(root.key_language?.action?.shortcut==='#中英切换'||root.key_language?.action?.shortcutCommand==='#中英切换'){
      remember('key_language');root.key_language.action=languageAction(locale);root.key_language.foregroundStyle=`key_language_${locale}_fg`;root.key_language.backgroundStyle=locale==='en'?'languageEnglishBackground':'keyBackground';
      if(Array.isArray(root.key_language.notification))root.key_language.notification=root.key_language.notification.filter((id)=>!/^key_language_(zh|en)_notification$/.test(id));
    }
    const oldAccent=theme==='dark'?'#BDE3BE':'#4C7655',newAccent='#B8DFFF';
    const newInk=theme==='dark'?newAccent:'#'+[1,3,5].map((at)=>Math.round(parseInt(newAccent.slice(at,at+2),16)*0.42).toString(16).padStart(2,'0')).join('');
    for(const [id,node] of Object.entries(root)){
      if(!node||typeof node!=='object'||Array.isArray(node))continue;
      const replace=(obj)=>{for(const [key,value] of Object.entries(obj)){
        if(typeof value==='string'&&/color$/i.test(key)&&/^#[a-f0-9]{6}([a-f0-9]{2})?$/i.test(value)&&value.slice(0,7).toUpperCase()===oldAccent){remember(id);obj[key]=(['text','systemImage'].includes(obj.buttonStyleType)||/(Text|Index)Color$/.test(key)?newInk:newAccent)+value.slice(7);}
        else if(value&&typeof value==='object')replace(value);
      }};replace(node);
    }
    if(root.hintSelected?.buttonStyleType==='geometry'){
      remember('hintSelected');const base=theme==='dark'?0:255,amount=theme==='dark'?0.35:0.18;
      const fill='#'+[1,3,5].map((at)=>Math.round(parseInt(newAccent.slice(at,at+2),16)*amount+base*(1-amount)).toString(16).padStart(2,'0')).join('');
      root.hintSelected.normalColor=fill;root.hintSelected.highlightColor=fill;root.hintSelected.normalBorderColor=newInk;root.hintSelected.highlightBorderColor=newInk;
    }
    if(root.returnActiveFg?.normalColor?.toUpperCase()==='#102218'){remember('returnActiveFg');root.returnActiveFg.normalColor='#142B3D';root.returnActiveFg.highlightColor='#142B3D';}
  }
}

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const validColor = (v) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v);
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function validateProject(p) {
  const errors = [];
  if (!object(p) || p.format !== PROJECT_FORMAT || p.version !== PROJECT_VERSION) return ['這不是支援的造型所專案（格式或版本不符）。'];
  if (!object(p.meta) || typeof p.meta.name !== 'string' || !p.meta.name.trim() || p.meta.name.length > 80) errors.push('皮膚名稱必須是 1–80 個字。');
  if (typeof p.meta?.author !== 'string' || typeof p.meta?.description !== 'string') errors.push('皮膚資訊格式不正確。');
  if (!LAYOUTS.some((x) => x.id === p.layout) && !((p.editorRevision??1)<12 && ['ryan','workbench'].includes(p.layout))) errors.push('佈局模板不支援。');
  if (!APPEARANCES.some((x) => x.id === p.appearance)) errors.push('外觀主題不支援。');
  if (!['cangjie','uppercase', 'lowercase'].includes(p.legend)) errors.push('字面模式不支援。');
  if(p.swipeHints!==undefined&&(!object(p.swipeHints)||!finite(p.swipeHints.scale,50,250)||!object(p.swipeHints.colors)||!['dark','light'].every((theme)=>validColor(p.swipeHints.colors[theme]))))errors.push('上下滑提示大小需為 50–250%，並提供深淺色的有效顏色。');
  for (const mode of ['portrait', 'landscape']) for (const [key, min, max] of [['keyboardHeight', 100, 450], ['toolbarHeight', 24, 90], ['preeditHeight', 0, 60]]) {
    if (!finite(p.dimensions?.[mode]?.[key], min, max)) errors.push(`${mode}.${key} 超出支援範圍。`);
  }
  for (const theme of ['dark', 'light']) for (const key of ['background', 'key', 'text', 'accent']) if (!validColor(p.colors?.[theme]?.[key])) errors.push(`${theme}.${key} 色碼不正確。`);
  for (const [key, min, max] of [['gap', 0, 14], ['radius', 0, 28], ['fontSize', 12, 36], ['keyOpacity', 8, 100], ['border', 0, 3], ['shadow', 0, 1]]) if (!finite(p.metrics?.[key], min, max)) errors.push(`${key} 超出支援範圍。`);
  if (!Array.isArray(p.toolbar) || p.toolbar.length > 10 || p.toolbar.some((id) => !TOOL_OPTIONS.some((t) => t[0] === id))) errors.push('工具列設定不正確。');
  if (!object(p.behavior) || !['ios','hamster'].includes(p.behavior.symbolTap) || !['ios','hamster','none'].includes(p.behavior.symbolHold) || typeof p.behavior.animation !== 'boolean' || typeof p.behavior.showPreedit !== 'boolean') errors.push('操作設定不正確。');
  if (p.behavior?.bottomRow !== undefined && !['enhanced','legacy'].includes(p.behavior.bottomRow)) errors.push('底列配置不支援。');
  if (p.behavior?.swipePreset !== undefined && !['reference','full','off'].includes(p.behavior.swipePreset)) errors.push('滑動預設不支援。');
  if (p.behavior?.hintStyle !== undefined && !['text','icons'].includes(p.behavior.hintStyle)) errors.push('提示樣式不支援。');
  if(p.schemaBinding!==undefined){
    if(!object(p.schemaBinding)||typeof p.schemaBinding.enabled!=='boolean')errors.push('方案綁定設定不正確。');
    else for(const [locale,label] of [['zh','中文'],['en','英文']]){
      const id=p.schemaBinding[locale];
      if(typeof id!=='string'||id.length>128||(/[\s/\\\x00-\x1F]/u.test(id))||['.','..'].includes(id)||(p.schemaBinding.enabled&&!id))errors.push(`${label}方案 ID 必須填寫有效的方案識別碼（最多 128 字，不能有空白或路徑分隔符號）。`);
    }
  }
  for (const locale of ['zh','en']) {
    const pages = p.symbolPages?.[locale];
    if (!Array.isArray(pages) || pages.length !== 2 || pages.some((page) => !Array.isArray(page) || page.length !== 3 || page.some((row, index) => !Array.isArray(row) || row.length !== (index < 2 ? 10 : locale === 'zh' ? 6 : 5) || row.some((s) => typeof s !== 'string' || s.length > 32)))) errors.push(`${locale} 符號頁結構不正確。`);
  }
  if (!object(p.collections) || !Object.keys(p.collections).length || Object.keys(p.collections).length > 50 || Object.entries(p.collections).some(([name, values]) => name.length > 40 || !Array.isArray(values) || values.length > 300 || values.some((x) => typeof x !== 'string' || x.length > 64))) errors.push('符號分類不正確。');
  if (!object(p.keys) || Object.values(p.keys).some((v) => !object(v) || (v.label !== undefined && (typeof v.label !== 'string' || v.label.length > 40)) || ['action','swipeUpAction','swipeDownAction'].some((k) => v[k] !== undefined && !isAction(v[k])))) errors.push('自訂按鍵格式不正確。');
  if (object(p.keys) && Object.values(p.keys).some((v) => v?.longPress !== undefined && (!object(v.longPress) || !Array.isArray(v.longPress.rows) || !v.longPress.rows.length || v.longPress.rows.length > 6 || v.longPress.rows.some((row) => !Array.isArray(row) || !row.length || row.length > 8 || row.some((item) => item !== null && (typeof item !== 'string' || item.length > 32)))))) errors.push('長按網格最多 6 行、8 列，每格最多 32 個字。');
  if (!object(p.nativeOverrides) || Object.entries(p.nativeOverrides).some(([key, value]) => !safeArchivePath(key) || !/^(light|dark)\/[^/]+\.yaml$/i.test(key) || !object(value))) errors.push('進階 YAML 路徑或內容不正確。');
  if (p.nativeConfig !== undefined && !object(p.nativeConfig)) errors.push('原生皮膚映射必須是物件。');
  if (p.compatibility !== undefined && (!object(p.compatibility) || !Array.isArray(p.compatibility.warnings) || p.compatibility.warnings.some((x) => typeof x !== 'string'))) errors.push('匯入相容性資訊格式不正確。');
  if (!object(p.assets) || Object.entries(p.assets).some(([path, value]) => !safeArchivePath(path) || typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))) errors.push('保留資源格式不正確。');
  return errors;
}
export function assertProject(p) { const errors = validateProject(p); if (errors.length) throw new Error(errors.join('\n')); return p; }
export function isAction(a, depth = 0) {
  if (depth > 5) return false;
  if (typeof a === 'string') return a.length > 0 && a.length < 100;
  if (!object(a) || Object.keys(a).length !== 1) return false;
  const [key, value] = Object.entries(a)[0];
  if (key === 'combine') return Array.isArray(value) && value.length <= 20 && value.every((x) => isAction(x, depth + 1));
  if (key === 'delay') return finite(value, 0, 10000);
  return ['character','symbol','sendKeys','shortcut','shortcutCommand','keyboardType','floatKeyboardType','switchRimeSchema','rimeOption','openURL','runScript','runScriptSilently','openScript','ai','phrase','snippet','userNotification'].includes(key) && typeof value === 'string' && value.length <= 4096;
}
export function safeArchivePath(path) { return typeof path === 'string' && path.length < 240 && !/^[\/\\]|^[a-z]:|\\|\x00/i.test(path) && !path.split('/').some((x) => x === '..' || x === '.') && path.split('/').every(Boolean); }
export function safeName(name) { return name.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 80) || '元書皮膚'; }
export function alpha(color, opacity) { return color + Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0'); }

export function resolveAppearance(p, theme) {
  const colors = p.colors[theme];
  const opacity = p.appearance === 'solid' ? 1 : p.appearance === 'frost' ? Math.max(0.68, p.metrics.keyOpacity / 100) : p.metrics.keyOpacity / 100;
  return { ...colors, opacity, fill: alpha(colors.key, opacity), activeFill: alpha(colors.key, Math.min(1, opacity + 0.18)), radius: p.metrics.radius, gap: p.metrics.gap, fontSize: p.metrics.fontSize, border: p.appearance === 'solid' ? 0 : p.metrics.border, shadow: p.metrics.shadow };
}

function control(id, label, role, action, width = 1) { return { id, label, role, action, width }; }
function symbolTarget(kind, locale) { return kind === 'hamster' ? 'symbolic' : `ios_${locale}_symbols_1`; }
export function keyboardRows(p, { page = 'main', locale = 'zh', shifted = false, capsLocked=false } = {}) {
  const symbolKey = control('symbols', 'symbols', 'function', { keyboardType: symbolTarget(p.behavior.symbolTap, locale) }, 1.05);
  if (p.behavior.symbolHold !== 'none') symbolKey.holdAction = { keyboardType: symbolTarget(p.behavior.symbolHold, locale) };
  const bottom = () => {
    if (p.behavior.bottomRow !== 'legacy') {
      const onSymbols = page === 'symbols1' || page === 'symbols2';
      const start = onSymbols ? control('return','back','function','returnPrimaryKeyboard',1.05) : symbolKey;
      const numeric = control('numeric',page === 'numeric' ? 'back' : '123','function',page === 'numeric' ? 'returnPrimaryKeyboard' : {keyboardType:locale === 'zh' ? 'numeric' : 'studio_en_numeric'},1.05);
      const period = control('period',locale==='en'?'.':'。','symbol',{symbol:locale==='en'?'.':'。'},0.95);
      period.longPress = {rows:[locale==='en'?[',','.','!','?']:['，','。',',','.','!','?']],selected:{row:0,col:1}};
      return [start,numeric,control('language',locale==='en'?'EN':'中','function',languageAction(locale,p.schemaBinding),1.15),control('space','␣','space','space',3.65),period,control('enter','return','enter','enter',2.15)];
    }
    const start = page === 'main' ? symbolKey : control('return', 'back', 'function', 'returnPrimaryKeyboard', 1.2);
    const emoji = control('emoji', '☺', 'emoji', { keyboardType: 'emojis' }, 1.1);
    return [start, emoji, control('space','␣','space','space',5.1), control('enter','return','enter','enter',2.6)];
  };
  let rows;
  if (page === 'main') {
    const letters = (str) => [...str].map((id) => control(id, locale==='en'?(shifted||capsLocked?id.toUpperCase():id):chineseLegend(id,p.legend), 'letter', { character: locale === 'en' && (shifted||capsLocked) ? id.toUpperCase() : id }));
    rows = [letters('qwertyuiop'), [control('spacer_left','','spacer',null,0.5), ...letters('asdfghjkl'), control('spacer_right','','spacer',null,0.5)], [control('shift','shift','function','shift',1.5), ...letters('zxcvbnm'), control('backspace','backspace','function','backspace',1.5)], bottom()];
  } else if (page === 'numeric') {
    const digit = (n) => control(`digit_${n}`,String(n),'symbol',{symbol:String(n)},9);
    const operator = (id,label,value=label) => control(`numeric_${id}`,label,'symbol',{symbol:value},5);
    rows = [
      [operator('plus','+'),operator('minus','−','-'),digit(1),digit(2),digit(3),control('backspace','backspace','function','backspace',7)],
      [operator('multiply','*'),operator('divide','/'),digit(4),digit(5),digit(6),{...symbolKey,width:7}],
      [operator('open_paren','('),operator('close_paren',')'),digit(7),digit(8),digit(9),control('enter','return','enter','enter',7)],
      [control('numeric','back','function','returnPrimaryKeyboard',5),control('language',locale==='en'?'EN':'中','function',languageAction(locale,p.schemaBinding),5),{...operator('dot','.'),width:9},digit(0),{...operator('equal','='),width:9},control('space','␣','space','space',7)],
    ];
  } else {
    const n = page === 'symbols2' ? 1 : 0;
    const data = p.symbolPages[locale][n];
    const sym = (row, r) => row.map((label, i) => control(`sym_${locale}_${n}_${r}_${i}`, label, 'symbol', { symbol: label }));
    rows = [sym(data[0],0),sym(data[1],1),[control('symbols_toggle',n ? '123' : '#+=','function',{ keyboardType: `ios_${locale}_symbols_${n ? 1 : 2}` },1.35),...sym(data[2],2),control('backspace','backspace','function','backspace',1.35)],bottom()];
  }
  return rows.map((row) => row.map((key) => {
    const custom = p.keys[`${locale}:${key.id}`] || {};
    return { ...key, ...(key.role !== 'spacer' ? defaultSwipes(key,locale,p.behavior.swipePreset || 'reference') : {}), ...Object.fromEntries(['label','action','swipeUpAction','swipeDownAction','longPress'].filter((field) => custom[field] !== undefined).map((field) => [field, custom[field]])) };
  }));
}

export function keyboardDescriptors() {
  return [...['zh','en'].flatMap((locale) => ['main','symbols1','symbols2'].flatMap((page) => ['portrait','landscape'].map((orientation) => ({ locale, page, orientation, name: page === 'main' ? `${locale === 'zh' ? 'pinyin' : 'alphabetic'}_${orientation}` : `ios_${locale}_${page === 'symbols1' ? 'symbols_1' : 'symbols_2'}_${orientation}` })))),...['zh','en'].flatMap((locale) => ['portrait','landscape'].map((orientation) => ({page:'numeric',locale,orientation,name:`numeric${locale === 'en' ? '_en' : ''}_${orientation}`}))),...['portrait','landscape'].map((orientation)=>({page:'panel',locale:'zh',orientation,name:`panel_${orientation}`}))];
}
export function pageFromAction(action, currentLocale = 'zh') {
  if (action === 'returnPrimaryKeyboard') return { page: 'main', locale: currentLocale };
  if (action?.keyboardType === 'symbolic') return { page: 'hamster', locale: currentLocale };
  if(action?.keyboardType==='pinyin')return {page:'main',locale:'zh'};
  if(action?.keyboardType==='alphabetic')return {page:'main',locale:'en'};
  if (['numeric','numberPad'].includes(action?.keyboardType)) return {page:'numeric',locale:currentLocale};
  if (action?.keyboardType === 'studio_en_numeric') return {page:'numeric',locale:'en'};
  const match = /^ios_(zh|en)_symbols_([12])$/.exec(action?.keyboardType || '');
  if (match) return { page: `symbols${match[2]}`, locale: match[1] };
  return null;
}
