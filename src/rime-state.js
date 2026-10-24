export function asciiModeValue(view){return typeof view.asciiMode==='boolean'?view.asciiMode:view.locale==='en';}
export function toggleAsciiMode(view){return {asciiMode:!asciiModeValue(view)};}
