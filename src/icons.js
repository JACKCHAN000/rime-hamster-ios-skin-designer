const paths = {
  keyboard: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M7 9h.01M12 9h.01M17 9h.01M7 12h.01M12 12h.01M17 12h.01M8 16h8"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3A8.8 8.8 0 0 0 12 3Z"/><path d="M7 10h.01M10 6.5h.01M15 7h.01M17 11h.01"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M9 10v10"/>',
  key: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="m9 15 3-7 3 7m-5-2h4"/>',
  symbols: '<path d="m9 3-3 18m12-18-3 18M3 9h18M2 15h18"/>',
  toolbar: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 10v4m4-4v4m4-4v4"/>',
  message: '<path d="M6 4h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-3v4l-5-4H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"/><path d="M7 9h10M7 13h8"/>',
  clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v4H9ZM8 11h8M8 15h8M8 19h5"/>',
  settings: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>',
  edit: '<path d="M12 4H4v16h16v-8M15 3l6 6-9 9-4 1 1-4Z"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -3)"/>',
  redo: '<path d="m15 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12" transform="translate(0 -3)"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m8 4 8 8-8 8"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shift: '<path d="m12 3 9 9h-5v8H8v-8H3Z"/>',
  shiftActive: '<path d="m12 3 9 9h-5v8H8v-8H3Z" fill="currentColor"/>',
  capsLock: '<path d="m12 2 9 9h-5v7H8v-7H3Z" fill="currentColor"/><path d="M8 22h8"/>',
  backspace: '<path d="m8 5-7 7 7 7h13V5Zm3 4 6 6m-6 0 6-6"/>',
  return: '<path d="M20 5v6a4 4 0 0 1-4 4H4m5-5-5 5 5 5"/>',
  back: '<path d="m9 5-5 5 5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -3)"/>',
  left: '<path d="m15 4-8 8 8 8"/>',
  right: '<path d="m9 4 8 8-8 8"/>',
  lineStart: '<path d="M4 4v16m16-8H8m5-5-5 5 5 5"/>',
  lineEnd: '<path d="M20 4v16M4 12h12m-5-5 5 5-5 5"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.2 8.2 12.3 12.3M8.2 15.8 20.5 3.5"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7 13a5 5 0 0 0 10 0"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 7M4 3v7h7"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function icon(name, size = 20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.key}</svg>`; }
export const systemIcon = (name) => ({ 'shift':'shift','shift.fill':'shiftActive','capslock.fill':'capsLock','capslock':'capsLock','delete.left':'backspace','delete.left.fill':'backspace','return':'return','face.smiling':'smile','chevron.left.forwardslash.chevron.right':'code','globe':'globe','number':'symbols','doc.on.clipboard':'clipboard','doc.on.doc':'copy','arrow.uturn.backward':'back','keyboard.chevron.compact.down':'down','chevron.down':'down','chevron.left':'left','chevron.right':'right','scissors':'cut','arrow.left.to.line':'lineStart','arrow.right.to.line':'lineEnd','gearshape':'settings','folder':'folder','tshirt':'shirt','square.and.arrow.up':'upload','arrow.clockwise':'reset','square.and.pencil':'edit','text.bubble':'message','character.book.closed':'book' })[typeof name === 'object' && name ? name.ios : name];

// Reuse the same local vector paths for the PNG export, without font substitutes.
export function iconShapes(name) {
  if (!Object.hasOwn(paths,name)) return [];
  return [...paths[name].matchAll(/<(path|rect|circle|ellipse)\b([^>]*)\/?\s*>/g)].map((match) => ({
    type:match[1],attributes:Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1],attribute[2]])),
  }));
}
export function drawIcon(ctx,name,x,y,size,color) {
  const shapes=iconShapes(name);if(!shapes.length)return false;
  ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/24,size/24);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';
  for(const {type,attributes:a} of shapes){
    ctx.save();const transform=/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(a.transform || '');if(transform)ctx.translate(Number(transform[1]),Number(transform[2]));
    if(type==='path'){const path=new Path2D(a.d);if(a.fill==='currentColor')ctx.fill(path);ctx.stroke(path);}
    else{ctx.beginPath();if(type==='rect')ctx.roundRect(Number(a.x),Number(a.y),Number(a.width),Number(a.height),Number(a.rx||0));else if(type==='circle')ctx.arc(Number(a.cx),Number(a.cy),Number(a.r),0,Math.PI*2);else ctx.ellipse(Number(a.cx),Number(a.cy),Number(a.rx),Number(a.ry),0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  ctx.restore();return true;
}
