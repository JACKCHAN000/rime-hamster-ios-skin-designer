import { actionLabel } from './actions.js';
import {keyboardSwitchType} from './schema-binding.js';

const SYSTEM_IMAGES = {
  shift:'shift',shiftActive:'shift.fill',capsLock:'capslock.fill',backspace:'delete.left',return:'return',back:'arrow.uturn.backward',
  smile:'face.smiling',emoji:'face.smiling',script:'chevron.left.forwardslash.chevron.right',
  phrase:'text.bubble',
  clipboard:'doc.on.clipboard',copy:'doc.on.doc',cut:'scissors',
  dismiss:'chevron.down',collapse:'chevron.down',
  previousPage:'chevron.left',nextPage:'chevron.right',lineStart:'arrow.left.to.line',lineEnd:'arrow.right.to.line',
};
const SHORTCUT_GLYPHS = {
  '#copy':'copy','#cut':'cut','#paste':'clipboard','#行首':'lineStart','#行尾':'lineEnd',
  '#次选上屏':'②','#三选上屏':'③','#中英切换':'EN','#简繁切换':'繁',
  '#showPhraseView':'phrase','#showPasteboardView':'clipboard','#toggleScriptView':'script',
  '#keyboardMenu':'☰','#rimePreviousPage':'previousPage','#rimeNextPage':'nextPage',
  '#verticalCandidatesPageUp':'previousPage','#verticalCandidatesPageDown':'nextPage',
  '#subCollectionPageUp':'previousPage','#subCollectionPageDown':'nextPage',
  '#candidatesBarStateToggle':'collapse','#Enter':'return','#换行':'return',
};
const own = (map,key) => Object.hasOwn(map,key) ? map[key] : undefined;
export function glyphStyle(label) {
  if(label==='symbols')return {buttonStyleType:'text',text:'#+='};
  if(label==='traditional')return {buttonStyleType:'text',text:'繁'};
  const image = own(SYSTEM_IMAGES,label);
  return image ? {buttonStyleType:'systemImage',systemImageName:image} : {buttonStyleType:'text',text:label};
}
export function actionGlyph(action) {
  if (!action || action === 'none') return '';
  if (typeof action === 'string') return ({space:'␣',enter:'return',backspace:'backspace',shift:'shift',returnPrimaryKeyboard:'back',dismissKeyboard:'dismiss'})[action] || actionLabel(action);
  const shortcut = action.shortcut || action.shortcutCommand;
  if(action.floatKeyboardType)return '☰';
  if (shortcut && own(SHORTCUT_GLYPHS,shortcut)) return SHORTCUT_GLYPHS[shortcut];
  if (action.keyboardType) {
    if (/numeric|numberPad/i.test(action.keyboardType)) return '123';
    if (/symbol/i.test(action.keyboardType)) return 'symbols';
    if (action.keyboardType === 'emojis') return 'emoji';
  }
  return action.runScript || action.runScriptSilently ? 'script' : actionLabel(action);
}
export function actionStyle(action) {
  if(action && typeof action==='object')for(const key of ['symbol','character','sendKeys'])if(typeof action[key]==='string')return {buttonStyleType:'text',text:action[key]};
  return glyphStyle(actionGlyph(action));
}
export function accessibleKeyLabel(name, action, fallback, locale = 'zh') {
  if(Array.isArray(action?.combine)&&keyboardSwitchType(action))return '中英切換';
  if(name==='tool_traditional'&&locale==='en'&&(action?.shortcut==='#中英切换'||action?.rimeOption==='ascii_mode'))return fallback==='EN+'?'開啟 ASCII 模式':'關閉 ASCII 模式';
  if (action === 'returnPrimaryKeyboard') return locale === 'en' ? '返回英文鍵盤' : '返回中文鍵盤';
  if (typeof action === 'string') return ({space:'空白鍵',enter:'Enter／換行',shift:'Shift／切換大寫',backspace:'刪除',dismissKeyboard:'收起鍵盤'})[action] || fallback;
  if (action?.shortcut || action?.shortcutCommand) return actionLabel(action);
  if(action?.floatKeyboardType)return actionLabel(action);
  if (action?.keyboardType) {
    if(action.keyboardType==='alphabetic'||action.keyboardType==='pinyin')return '中英切換';
    if (action.keyboardType === 'emojis') return 'Emoji 鍵盤';
    if (/numeric|numberPad/i.test(action.keyboardType)) return '數字鍵盤';
    if (/symbol/i.test(action.keyboardType)) return '符號鍵盤';
  }
  return fallback;
}
export function editableGlyph(label) {
  return ({symbols:'#+=',back:'↶',return:'↵',shift:'⇧',backspace:'⌫',emoji:'☺',smile:'☺',previousPage:'‹',nextPage:'›',collapse:'⌄'})[label] || label;
}
