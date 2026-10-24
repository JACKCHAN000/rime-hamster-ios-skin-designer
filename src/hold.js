import { effectiveCell,selectedStyles,cssColor } from './preview.js';
import { esc,icon,systemIcon } from './icons.js';
import { actionLabel } from './actions.js';

export function createHoldModel(root,cell,view){
  const grid=root[cell.hintSymbolsGridStyle];
  const validGrid=grid&&Array.isArray(grid.symbolRows)&&grid.symbolRows.some((row)=>Array.isArray(row)&&row.some((name)=>name&&root[name]));
  const hint=validGrid?grid:root[cell.hintSymbolsStyle];if(!hint)return null;
  const rows=validGrid?hint.symbolRows:[hint.symbolStyles];
  if(!rows.every(Array.isArray)||!rows.some((row)=>row.some((name)=>name&&root[name])))return null;
  const initial=validGrid?hint.selected??null:{row:0,col:hint.selectedIndex??0};
  const selected=initial&&rows[initial.row]?.[initial.col]&&root[rows[initial.row][initial.col]]?initial:null;
  const choices=rows.flatMap((row,r)=>row.map((name,c)=>{
    if(!name||!root[name])return null;
    const effective=effectiveCell(root[name],root,view),style=root[selectedStyles(effective.foregroundStyle,view)[0]]||{};
    return {name,row:r,col:c,action:effective.action,label:style.text??actionLabel(effective.action),icon:systemIcon(style.systemImageName),normal:cssColor(style.normalColor,'#FFFFFF'),active:cssColor(style.highlightColor,'#152B3D')};
  })).filter(Boolean);
  return {hint,rows,selected,origin:selected||hint.anchor||{row:0,col:0},singleRow:!validGrid,choices,choiceRoot:Object.fromEntries(choices.map((choice)=>[choice.name,{action:choice.action}]))};
}
export function holdMarkup(model){
  const columns=Math.max(...model.rows.map((row)=>row.length));
  return model.rows.map((row,r)=>Array.from({length:columns},(_,c)=>{
    const choice=model.choices.find((choice)=>choice.row===r&&choice.col===c);if(!choice)return '<span class="hold-hole"></span>';
    const active=model.selected?.row===r&&model.selected?.col===c;
    return `<span class="hold-choice ${active?'active':''}" role="option" aria-selected="${active}" aria-label="${esc(choice.label)}" data-row="${r}" data-col="${c}" style="--choice-ink:${choice.normal};--choice-active-ink:${choice.active}">${choice.icon?icon(choice.icon,21):esc(choice.label)}</span>`;
  }).join('')).join('');
}
