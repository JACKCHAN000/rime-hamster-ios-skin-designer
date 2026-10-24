import {keyboardSwitchType} from './schema-binding.js';
export const SHORTCUT_PRESETS = [
  ['#keyboardMenu','鍵盤菜單'],
  ['#copy','複製'],['#cut','剪下'],['#paste','貼上'],
  ['#行首','移到行首'],['#行尾','移到行尾'],
  ['#次选上屏','次選上屏'],['#三选上屏','三選上屏'],
  ['#中英切换','中英切換'],['#简繁切换','繁簡切換'],
  ['#showPhraseView','常用語'],['#showPasteboardView','剪貼簿'],
  ['#toggleScriptView','腳本面板'],['#方案切换','方案切換'],
  ['#rimePreviousPage','候選上一頁'],['#rimeNextPage','候選下一頁'],
  ['#candidatesBarStateToggle','展開／收合候選'],
  ['#左手模式','左手模式'],['#右手模式','右手模式'],
];
export const ACTION_TYPES = [
  ['shortcut','元書快捷指令'],['symbol','直接輸出符號'],['character','送字元給 RIME'],
  ['sendKeys','RIME 按鍵序列'],['keyboardType','切換鍵盤'],['runScript','執行指定腳本'],
  ['runScriptSilently','靜默執行腳本'],['standard','標準動作'],['disabled','停用此方向'],
  ['combine','組合動作（JSON）'],
];
const shortcut = (name) => ({shortcut:name});
const symbol = (text) => ({symbol:text});
export const hiddenSwipeHint=(keyId,action)=>keyId==='period'&&(action?.character==='/'||action?.sendKeys==='/');
export function defaultSwipes(key, locale = 'zh', preset = 'reference') {
  if (preset === 'off') return {};
  const letter = key.id;
  if(letter==='period')return {swipeUpAction:{character:'/'},swipeDownAction:{character:'/'}};
  const index = 'qwertyuiop'.indexOf(letter);
  if (letter.length === 1 && index >= 0) return {swipeUpAction:symbol('1234567890'[index]),swipeDownAction:symbol('!@#$%^&*()'[index])};
  if (preset === 'reference') {
    const pairs={a:['`','~'],s:['-','_'],d:['=','+'],f:['[','{'],g:[']','}'],h:['\\','|'],j:['/','?'],k:[';',':'],l:["'",'"'],z:['_'],x:['「'],c:['」'],v:['<'],b:['>'],n:[','],m:[locale==='en'?'.':'。']};
    return pairs[letter] ? {swipeUpAction:symbol(pairs[letter][0]),...(pairs[letter][1]!==undefined?{swipeDownAction:symbol(pairs[letter][1])}:{})} : {};
  }
  const pairs = {
    a:[shortcut('#行首'),shortcut('#行尾')], s:[symbol('-'),symbol('_')], d:[symbol('='),symbol('+')],
    f:[symbol('['),symbol('{')], g:[symbol(']'),symbol('}')], h:[symbol('\\'),symbol('|')],
    j:[symbol('/'),symbol('?')], k:[symbol(';'),symbol(':')], l:[symbol("'"),symbol('"')],
    z:[shortcut('#showPhraseView'),shortcut('#toggleScriptView')], x:[shortcut('#cut'),symbol('「')],
    c:[shortcut('#copy'),symbol('」')], v:[shortcut('#paste'),symbol('、')], b:[symbol('《'),symbol('》')],
    n:[shortcut('#次选上屏'),shortcut('#rimePreviousPage')], m:[shortcut('#三选上屏'),shortcut('#rimeNextPage')],
    space:[shortcut('#次选上屏'),shortcut('#三选上屏')], language:[shortcut('#中英切换'),shortcut('#简繁切换')],
    shift:[shortcut('#中英切换'),shortcut('#简繁切换')], backspace:[shortcut('#行首'),shortcut('#行尾')],
    symbols:[{keyboardType:`ios_${locale}_symbols_2`},{keyboardType:'symbolic'}],
    numeric:[{keyboardType:'numeric'},'returnPrimaryKeyboard'],
    enter:[shortcut('#Enter'),shortcut('#换行')],
  };
  return pairs[letter] ? {swipeUpAction:pairs[letter][0],swipeDownAction:pairs[letter][1]} : {};
}
export function actionLabel(action) {
  if (!action || action === 'none') return '';
  if(Array.isArray(action.combine)&&keyboardSwitchType(action))return keyboardSwitchType(action)==='alphabetic'?'英文＋方案':'中文＋方案';
  if (typeof action === 'string') return ({space:'空白',enter:'換行',tab:'Tab',shift:'Shift',backspace:'刪除',returnPrimaryKeyboard:'返回',dismissKeyboard:'收起'})[action] || action;
  const command = action.shortcut || action.shortcutCommand;
  if (command) return SHORTCUT_PRESETS.find(([id]) => id === command)?.[1] || ({'#Enter':'換行','#换行':'換行'})[command] || command;
  if(action.floatKeyboardType)return action.floatKeyboardType==='panel'?'浮動菜單':'浮動鍵盤';
  if (action.keyboardType) return ({numeric:'數字',symbolic:'符號',emojis:'Emoji',pinyin:'中文',alphabetic:'英文'})[action.keyboardType] || (/symbols_2$/.test(action.keyboardType)?'#+=':/symbols_1$/.test(action.keyboardType)?'123':action.keyboardType);
  return action.symbol ?? action.character ?? action.sendKeys ?? (action.runScript || action.runScriptSilently ? '腳本' : '動作');
}
export function actionParts(action) {
  if (!action || action === 'none') return ['disabled',''];
  if(Array.isArray(action.combine))return ['combine',JSON.stringify(action.combine)];
  return typeof action === 'string' ? ['standard',action] : Object.entries(action)[0];
}
export function actionFromFields(type,value) {
  if (type === 'disabled') return 'none';
  if(type==='combine'){
    let parsed;try{parsed=JSON.parse(value);}catch{throw new Error('組合動作需要有效的 JSON 陣列。');}
    if(!Array.isArray(parsed))throw new Error('組合動作必須是 JSON 陣列。');return {combine:parsed};
  }
  return type === 'standard' ? value : {[type]:value};
}
