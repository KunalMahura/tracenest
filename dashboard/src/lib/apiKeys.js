/**
 * The server stores only a hash of each API key, so the raw key can be shown
 * just once — right after a project is created or its key regenerated.
 * We keep it in sessionStorage (cleared when the tab closes) so the Setup
 * Guide can pre-fill snippets during the same session.
 */
const PREFIX = 'tn_key_';

export function rememberApiKey(projectId, apiKey) {
  try { sessionStorage.setItem(PREFIX + projectId, apiKey); } catch { /* storage disabled */ }
}

export function recallApiKey(projectId) {
  try { return sessionStorage.getItem(PREFIX + projectId); } catch { return null; }
}

export function forgetApiKey(projectId) {
  try { sessionStorage.removeItem(PREFIX + projectId); } catch { /* ignore */ }
}
