// A neutral stand-in for the iOS material; native skins reveal the system backdrop.
export const SYSTEM_SURFACE=Object.freeze({dark:'#242629',light:'#E1E2E7'});
export function keyboardBoardColor(project,theme){
  const configured=(project.metrics.backgroundOpacity??1)/100;
  const opacity=project.appearance==='solid'?1:project.appearance==='frost'?Math.max(.68,configured):configured;
  return project.colors[theme].background+Math.round(opacity*255).toString(16).padStart(2,'0');
}
