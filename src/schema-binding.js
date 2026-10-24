export const DEFAULT_SCHEMA_BINDING=Object.freeze({enabled:true,zh:'quick5_lite',en:'melt_eng'});

export function keyboardSwitchType(action,depth=0){
  if(depth>8)return null;
  if(['pinyin','alphabetic'].includes(action?.keyboardType))return action.keyboardType;
  if(Array.isArray(action?.combine))return action.combine.map((item)=>keyboardSwitchType(item,depth+1)).find(Boolean)||null;
  return null;
}
export function bindLanguageAction(action,binding){
  const type=keyboardSwitchType(action);if(!type)return action;
  const plain=action&&Object.keys(action).length===1&&action.keyboardType===type;
  const steps=action?.combine;
  const canonical=Array.isArray(steps)&&steps.length>=2&&Object.keys(action).length===1&&Object.keys(steps[0]||{}).length===1&&steps[0]?.keyboardType===type&&Object.keys(steps.at(-1)||{}).length===1&&typeof steps.at(-1)?.switchRimeSchema==='string'&&steps.slice(1,-1).every((step)=>step&&Object.keys(step).length===1&&Number.isInteger(step.delay)&&step.delay>=0&&step.delay<=10000);
  if(!plain&&!canonical)return action;
  if(!binding?.enabled)return {keyboardType:type};
  const id=binding[type==='pinyin'?'zh':'en'];if(typeof id!=='string'||!id.trim())throw new Error('請先填寫中文與英文的輸入方案 ID。');
  return {combine:[{keyboardType:type},...(canonical?steps.slice(1,-1):[]),{switchRimeSchema:id.trim()}]};
}
export function applySchemaBindings(root,binding){
  const result=structuredClone(root);
  for(const [name,cell] of Object.entries(result)){
    if(!cell||typeof cell!=='object'||Array.isArray(cell))continue;
    if(['key_language','tool_language','cnenButton'].includes(name)||/^key_language_(choice_|hold)/.test(name)){
      if(cell.action)cell.action=bindLanguageAction(cell.action,binding);
    }
  }
  return result;
}
