// Shift is a one-shot uppercase state; a second quick press locks it.
export function nextShiftState(state,now){
  if(state.capsLocked)return {shifted:false,capsLocked:false,lastShiftTap:null};
  if(state.lastShiftTap!==null&&state.lastShiftTap!==undefined&&now-state.lastShiftTap>=0&&now-state.lastShiftTap<=400)return {shifted:true,capsLocked:true,lastShiftTap:null};
  return {shifted:!state.shifted,capsLocked:false,lastShiftTap:now};
}
export function afterCharacterState(state){return state.capsLocked?{shifted:true,capsLocked:true,lastShiftTap:null}:{shifted:false,capsLocked:false,lastShiftTap:null};}
export function caseState(mode){return {shifted:mode!=='lower',capsLocked:mode==='locked',lastShiftTap:null};}
export function letterCaseMode(state){return state.capsLocked?'locked':state.shifted?'upper':'lower';}
