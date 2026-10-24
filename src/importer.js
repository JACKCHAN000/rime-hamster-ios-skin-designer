import { unzipSync, strFromU8 } from 'fflate';
import { assertProject, createProject, safeArchivePath, validateProject, upgradeProject } from './model.js';
import { parseNativeYaml } from './native.js';

const MAX_FILE = 12 * 1024 * 1024, MAX_TOTAL = 32 * 1024 * 1024;
export function extractArchive(bytes) {
  if (bytes.byteLength > MAX_FILE) throw new Error('匯入檔案不能超過 12 MB。');
  let size = 0, count = 0;
  const archive = unzipSync(bytes, { filter(file) {
    if (file.name.endsWith('/')) return false;
    if (!safeArchivePath(file.name)) throw new Error(`壓縮檔含不安全路徑：${file.name}`);
    size += file.originalSize; count += 1;
    if (file.originalSize > 8 * 1024 * 1024 || size > MAX_TOTAL || count > 256) throw new Error('皮膚包檔案過多或解壓縮大小超過限制。');
    return true;
  } });
  const paths = Object.keys(archive);
  const first = paths[0]?.split('/')[0];
  const strip = first && !['light','dark','fonts','sound','resources','jsonnet'].includes(first) && paths.every((p) => p.includes('/') && p.split('/')[0] === first);
  return Object.fromEntries(Object.entries(archive).map(([path,content]) => [strip ? path.slice(first.length + 1) : path,content]));
}
function base64(bytes) { let binary = ''; for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(binary); }
function parseJson(text) { try { return JSON.parse(text); } catch { throw new Error('JSON 內容不正確，請檢查檔案。'); } }
function recognizedRyan(value) { return value && typeof value === 'object' && value.skinInfo && (value.palette || value.spaceKeyLayout) && !value.schemaVersion; }
export function convertRyan(settings) {
  if (!recognizedRyan(settings)) throw new Error('這不是可辨識的 Ryan 設定格式。');
  const p = createProject();
  if (typeof settings.skinInfo.name === 'string' && settings.skinInfo.name.trim()) p.meta.name = settings.skinInfo.name.slice(0,80);
  if (typeof settings.skinInfo.author === 'string') p.meta.author = settings.skinInfo.author;
  const color = (value) => typeof value === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value.slice(0,7) : null;
  for (const theme of ['dark','light']) {
    const palette = settings.palette?.[theme] || {};
    for (const [source,target] of [['bg','background'],['keyNormal','key'],['textMain','text']]) if (color(palette[source])) p.colors[theme][target] = color(palette[source]);
  }
  if (typeof settings.palette?.dark?.keyNormal === 'string' && settings.palette.dark.keyNormal.length === 9) p.metrics.keyOpacity = Math.max(8,Math.round(parseInt(settings.palette.dark.keyNormal.slice(7),16)/255*100));
  if (Number.isFinite(settings.groups?.alphabetSize)) p.metrics.fontSize = Math.max(12,Math.min(36,settings.groups.alphabetSize));
  const mapping = { 3:'language',4:'traditional',5:'phrase',6:'clipboard',7:'symbols',8:'emoji',2:'dismiss' };
  if (Array.isArray(settings.toolbarButtons)) {
    const toolbar = settings.toolbarButtons.map((id) => mapping[id]).filter(Boolean);
    if (toolbar.length) p.toolbar = [...new Set(toolbar)].slice(0,10);
  }
  for (const id of ['menu','emoji','script']) if (!p.toolbar.includes(id) && p.toolbar.length<10) {const at=p.toolbar.indexOf('dismiss');p.toolbar.splice(at<0?p.toolbar.length:at,0,id);}
  p.compatibility = { source:'ryan-settings', originalSettings: settings, warnings: ['已轉換皮膚資訊、基本配色、字級及工具列。原始設定完整保存在專案內。', '原版蝦米專用長按／滑動序列、逐鍵微調與單手設定尚未自動轉換；不會改寫中文方案的送鍵。', '匯入後使用 iOS 佈局，原始設定仍完整保留。'] };
  assertProject(p); return p;
}
export function importBytes(bytes, filename) {
  if (bytes.byteLength > MAX_FILE) throw new Error('匯入檔案不能超過 12 MB。');
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) {
    const value = parseJson(strFromU8(bytes));
    if (recognizedRyan(value)) return { project: convertRyan(value), message:'已轉換 Ryan 設定，請查看相容性說明。' };
    assertProject(value); return { project:upgradeProject(value), message:'專案已載入，所有設定已還原。' };
  }
  let files;
  if (/\.(cskin|zip)$/.test(lower)) files = extractArchive(bytes);
  else if (/\.ya?ml$/.test(lower)) files = { 'light/pinyin_portrait.yaml':bytes, 'dark/pinyin_portrait.yaml':bytes, 'config.yaml':new TextEncoder().encode('pinyin:\n  iPhone:\n    portrait: pinyin_portrait\n    landscape: pinyin_portrait\n  iPad:\n    portrait: pinyin_portrait\n    landscape: pinyin_portrait\n    floating: pinyin_portrait\n') };
  else throw new Error('支援 .json、.cskin、.zip、.yaml、.yml。');
  const projectEntry = Object.entries(files).find(([path]) => path === 'studio.project.json' || path === 'project.json');
  if (projectEntry) {
    const value = parseJson(strFromU8(projectEntry[1]));
    if (validateProject(value).length === 0) return { project:upgradeProject(value), message:'已還原造型所專案。' };
    if (projectEntry[0] === 'studio.project.json') assertProject(value);
  }
  const ryanEntry = Object.entries(files).find(([path]) => /(^|\/)settings\.json$/i.test(path));
  if (ryanEntry) {
    const settings = parseJson(strFromU8(ryanEntry[1]));
    if (recognizedRyan(settings)) return { project:convertRyan(settings), message:'已辨識 Ryan 皮膚包並轉換基本設定。' };
  }
  const p = createProject(); p.meta.name = filename.replace(/\.(cskin|zip|ya?ml)$/i,'').slice(0,80) || '匯入皮膚';
  const sourceYaml = {};
  for (const [path,content] of Object.entries(files)) {
    if (/\.ya?ml$/i.test(path)) sourceYaml[path] = strFromU8(content);
    if (path === 'config.yaml') p.nativeConfig = parseNativeYaml(strFromU8(content));
    else if (/^(light|dark)\/[^/]+\.yaml$/i.test(path)) p.nativeOverrides[path] = parseNativeYaml(strFromU8(content));
    else if (!['studio.project.json','project.json','demo.png','README.md'].includes(path)) p.assets[path] = base64(content);
  }
  if (!Object.keys(p.nativeOverrides).length) throw new Error('沒有找到可辨識的鍵盤 YAML。任意 Jsonnet 原始碼目前需先在元書編譯成 YAML。');
  if (typeof p.nativeConfig?.name === 'string' && p.nativeConfig.name.trim()) p.meta.name = p.nativeConfig.name.slice(0,80);
  if (typeof p.nativeConfig?.author === 'string') p.meta.author = p.nativeConfig.author;
  p.compatibility = { source:'native-yaml', sourceYaml, warnings:['已保留原生 YAML、裝置映射與附帶資源。原文（含註解）也保存在專案 sourceYaml 中。請在「原生 YAML」選取匯入檔案檢視。', '原生檔案優先於通用表單；複雜圖片、動畫及 RIME 狀態在網頁僅提供近似預覽。'] };
  assertProject(p);
  return { project:p, nativePath:Object.keys(p.nativeOverrides)[0], message:'原生皮膚已載入；原始設定與資源已保留。' };
}
