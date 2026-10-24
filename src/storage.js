import { validateProject, upgradeProject } from './model.js';
const KEY = 'hamster-skin-studio:project:v1';
const LIBRARY = 'hamster-skin-studio:library:v1';
export function loadDraft() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return value && validateProject(value).length === 0 ? upgradeProject(value) : null; } catch { return null; }
}
export function saveDraft(project) { localStorage.setItem(KEY, JSON.stringify(project)); }
export function listTemplates() { try { const items = JSON.parse(localStorage.getItem(LIBRARY)); return Array.isArray(items) ? items.filter((x) => x?.project && validateProject(x.project).length === 0).map((x) => ({...x,project:upgradeProject(x.project)})) : []; } catch { return []; } }
export function saveTemplate(project) { const items = listTemplates(); items.unshift({ id: crypto.randomUUID(), name: project.meta.name, savedAt: new Date().toISOString(), project }); localStorage.setItem(LIBRARY, JSON.stringify(items.slice(0, 20))); }
export function deleteTemplate(id) { localStorage.setItem(LIBRARY, JSON.stringify(listTemplates().filter((x) => x.id !== id))); }
