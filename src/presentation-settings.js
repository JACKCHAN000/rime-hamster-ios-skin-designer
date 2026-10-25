import {spaceSymbolStyle,spaceSymbolColor} from './space-symbol.js';
import {hiddenSwipeHint} from './actions.js';
import {keyboardBoardColor} from './keyboard-material.js';
import {isRawSpaceAction,rawSpaceAction,isLiteralSpaceAction,literalSpaceAction} from './space-behavior.js';

// RIME cangjie5.schema.yaml's A–Z display mapping (Z is the symbol key).
export const CANGJIE_ROOTS=Object.freeze(Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map((key,i)=>[key,[...'日月金木水火土竹戈十大中一弓人心手口尸廿山女田難卜符'][i]])));
export const DEFAULT_SWIPE_HINTS=Object.freeze({scale:150,colors:Object.freeze({dark:'#A6ABB3',light:'#596571'})});
export const legendLabel=(mode)=>({cangjie:'倉頡字根',uppercase:'大寫字母',lowercase:'小寫字母'})[mode]||'字母';
export const chineseLegend=(key,mode)=>mode==='cangjie'?CANGJIE_ROOTS[key]:mode==='uppercase'?key.toUpperCase():key;

// Apply shared controls to recognisable generated layers, including old native overrides.
export function applyKeyPresentation(root,p,{theme='dark',locale='zh'}={}){
  const board=root.boardBackground;
  if(board?.buttonStyleType==='geometry'&&typeof board.normalColor==='string'&&board.normalColor.slice(0,7).toUpperCase()===p.colors[theme].background.toUpperCase())board.normalColor=keyboardBoardColor(p,theme);
  for(const [name,cell] of Object.entries(root))if((name==='key_space'||/^key_space_choice_\d+_\d+$/.test(name))&&(cell?.action==='space'||isLiteralSpaceAction(cell?.action))){
    if(p.behavior.spaceAction==='rawThenSpace'&&(cell.preeditStateAction===undefined||isRawSpaceAction(cell.preeditStateAction))){cell.action=literalSpaceAction();cell.preeditStateAction=rawSpaceAction();}
    else if(p.behavior.spaceAction!=='rawThenSpace'&&isRawSpaceAction(cell.preeditStateAction)){cell.action='space';delete cell.preeditStateAction;}
  }
  const hints=p.swipeHints||DEFAULT_SWIPE_HINTS;
  let migratedPeriod=false;
  for(const [name,style] of Object.entries(root)){
    if(!style||typeof style!=='object'||Array.isArray(style))continue;
    if(locale==='en'&&/^key_(period|m)(?:_|$)/.test(name)){
      const ascii=(value)=>value==='，'?',':value==='。'?'.':value;
      if(style.buttonStyleType==='text'&&['，','。'].includes(style.text)){style.text=ascii(style.text);if(name.startsWith('key_period'))migratedPeriod=true;}
      for(const field of ['action','swipeUpAction','swipeDownAction','preeditStateAction'])if(['，','。'].includes(style[field]?.symbol)){
        style[field]={...style[field],symbol:ascii(style[field].symbol)};if(name.startsWith('key_period'))migratedPeriod=true;
      }
    }
    const hint=/^key_(.+)_swipe(?:Up|Down)_hint$/.exec(name);
    if(hint&&['text','systemImage'].includes(style.buttonStyleType)){
      style.fontSize=(CANGJIE_ROOTS[hint[1]]?7:6)*hints.scale/100;style.normalColor=hints.colors[theme];style.highlightColor=hints.colors[theme];
    }
    const letter=/^key_([a-z])(?:_choice_\d+_\d+)?_fg$/.exec(name);
    if(locale==='zh'&&letter&&p.keys[`zh:${letter[1]}`]?.label===undefined&&style.buttonStyleType==='text'&&[letter[1],letter[1].toUpperCase(),CANGJIE_ROOTS[letter[1]]].includes(style.text))style.text=chineseLegend(letter[1],p.legend);
  }
  const periodHint=migratedPeriod&&root[root.key_period?.hintSymbolsStyle];
  if(Array.isArray(periodHint?.symbolStyles)){
    const selected=root[periodHint.symbolStyles[periodHint.selectedIndex??0]]?.action,seen=new Set();
    periodHint.symbolStyles=periodHint.symbolStyles.filter((name)=>{const key=JSON.stringify(root[name]?.action);if(seen.has(key))return false;seen.add(key);return true;});
    const selectedIndex=periodHint.symbolStyles.findIndex((name)=>JSON.stringify(root[name]?.action)===JSON.stringify(selected));periodHint.selectedIndex=Math.max(0,selectedIndex);
  }
  const period=root.key_period;
  if(period&&['zh','en'].includes(locale)){
    for(const direction of ['Up','Down']){
      const field=`swipe${direction}Action`,action=period[field],custom=p.keys[`${locale}:period`]?.[field];
      const oldDefault=action===undefined||action?.character==='/'||action?.symbol==='/'||action?.symbol===(direction==='Up'?(locale==='en'?',':'，'):'?');
      if(p.behavior.swipePreset!=='off'&&custom===undefined&&oldDefault)period[field]={character:'/'};
      if(hiddenSwipeHint('period',period[field])){
        const hint=`key_period_swipe${direction}_hint`;
        for(const ref of ['foregroundStyle','uppercasedStateForegroundStyle','capsLockedStateForegroundStyle']){
          if(Array.isArray(period[ref]))period[ref]=period[ref].filter((name)=>name!==hint);
          else if(period[ref]===hint&&root.key_period_fg)period[ref]='key_period_fg';
        }
      }
    }
  }
  for(const id of ['key_symbols','tool_symbols']){
    const fg=root[`${id}_fg`];if(!fg||(id==='key_symbols'&&p.keys[`${locale}:symbols`]?.label!==undefined))continue;
    if(fg.systemImageName==='number'||fg.buttonStyleType==='text'&&['#','#+='].includes(fg.text))root[`${id}_fg`]={buttonStyleType:'text',text:'#+=',fontSize:14,normalColor:fg.normalColor,highlightColor:fg.highlightColor,center:fg.center||{x:.5,y:.5}};
  }
  const cell=root.key_space,fg=root.key_space_fg;
  if(cell&&fg?.buttonStyleType==='text'&&fg.text==='␣'){
    const layers=Array.isArray(cell.foregroundStyle)&&cell.foregroundStyle.every((name)=>typeof name==='string')?cell.foregroundStyle:typeof cell.foregroundStyle==='string'?[cell.foregroundStyle]:null;
    if(!layers)return root;
    const color=/^#[a-f0-9]{6}$/i.test(fg.normalColor)?fg.normalColor:spaceSymbolColor(root.key_space_openBox)||p.colors[theme].text;
    root.key_space_openBox=spaceSymbolStyle(color,p.metrics.gap);fg.normalColor='#00000000';fg.highlightColor='#00000000';
    if(!layers.includes('key_space_openBox'))cell.foregroundStyle=[...layers,'key_space_openBox'];
  }
  return root;
}
