export function insertPreviewText(paper,text,{testing=false,fromGesture=false}={}){
  if(!testing&&!fromGesture)return false;
  paper.setRangeText(String(text),paper.selectionStart,paper.selectionEnd,'end');
  return true;
}
