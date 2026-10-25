export const SPACE_ACTIONS=[['candidate','一般空白：首選候選上屏'],['rawThenSpace','原碼上屏，再加空格（輸入中）']];
export const literalSpaceAction=()=>({symbol:' '});
export const isLiteralSpaceAction=(action)=>action?.symbol===' ';
export const rawSpaceAction=()=>({combine:['enter',literalSpaceAction()]});
export const isRawSpaceAction=(action)=>Array.isArray(action?.combine)&&action.combine.length===2&&action.combine[0]==='enter'&&isLiteralSpaceAction(action.combine[1]);
export const rawSpacePreviewText=(preedit,raw='ab')=>(preedit?raw:'')+' ';
