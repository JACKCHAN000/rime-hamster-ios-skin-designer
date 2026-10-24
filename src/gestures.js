// Pure gesture decisions: DOM pointer capture and timers are kept in app.js.
export function selectHoldCell(hint, rows, origin, dx, dy, options = {}) {
  const threshold = hint.moveThreshold ?? 10;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return hint.symbolRows ? hint.selected ?? null : { row:0,col:hint.selectedIndex ?? 0 };
  if(options.singleRow && Math.abs(dy)>Math.max(110,Number(hint.size?.height||44)*2.5))return null;
  if(options.singleRow && Math.abs(dx)<threshold)return {row:0,col:hint.selectedIndex??0};
  const row = options.singleRow ? 0 : origin.row + Math.round(dy / (hint.moveStep?.vertical || 44));
  const col = origin.col + Math.round(dx / (hint.moveStep?.horizontal || 44));
  if (row < -1 || col < -1 || row > rows.length || col > Math.max(...rows.map((r) => r.length))) return null;
  return rows.flatMap((r,ri) => r.map((name,ci) => name ? {row:ri,col:ci,distance:(row-ri)**2+(col-ci)**2} : null)).filter(Boolean).sort((a,b) => a.distance-b.distance)[0] || null;
}
export function selectHoldAtPoint(hint,rows,origin,dx,dy,point,rectangles=[],panelRect=null,options={}){
  const contains=(rect)=>point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom;
  const hit=rectangles.find(contains);
  if(hit)return {row:hit.row,col:hit.col};
  if(panelRect&&contains(panelRect)&&rectangles.length){
    const nearest=[...rectangles].sort((a,b)=>(point.x-(a.left+a.right)/2)**2+(point.y-(a.top+a.bottom)/2)**2-((point.x-(b.left+b.right)/2)**2+(point.y-(b.top+b.bottom)/2)**2))[0];
    return {row:nearest.row,col:nearest.col};
  }
  return selectHoldCell(hint,rows,origin,dx,dy,options);
}
export function releaseDecision(press, root) {
  if (press.held) {
    const name = press.selected && press.rows[press.selected.row]?.[press.selected.col];
    return { kind:'hold',action:name ? root[name]?.action : undefined };
  }
  if (Math.abs(press.dy)>22 && Math.abs(press.dy)>Math.abs(press.dx)) return { kind:'swipe',action:press.info.cell[press.dy < 0 ? 'swipeUpAction' : 'swipeDownAction'] };
  return Math.hypot(press.dx,press.dy)<16 ? {kind:'tap'} : {kind:'cancel'};
}
