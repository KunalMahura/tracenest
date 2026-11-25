/**
 * api.js — centralized API client for TraceNest dashboard.
 *
 * All requests attach the JWT from localStorage.
 * On 401, the token is cleared and the user is redirected to /login.
 */

// Empty in local dev → relative /api/* URLs, proxied by Vite (see vite.config.js).
// Set at build time in production (Vercel env var / Docker build arg).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Absolute API URL shown in SDK snippets (falls back to this origin in dev). */
export const PUBLIC_API_URL = API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

const BASE = API_BASE;

function getToken() {
  return localStorage.getItem('tn_token');
}

export function setToken(token) {
  localStorage.setItem('tn_token', token);
}

export function clearToken() {
  localStorage.removeItem('tn_token');
  localStorage.removeItem('tn_user');
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  // A 401 on login/register means bad credentials, not an expired session
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json().catch(() => ({ success: false, error: `API returned ${res.status}` }));
  if (!json.success) {
    const detail = json.details?.[0]?.message;
    throw new Error(detail || json.error || 'API error');
  }
  return json.data;
}

// ── Auth ───────────────────────────────────────────────────────────
export const api = {
  auth: {
    login:    (email, password) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (name, email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    me:       () => request('/api/auth/me'),
  },

  // ── Projects ────────────────────────────────────────────────────
  projects: {
    list:   ()       => request('/api/projects'),
    get:    (id)     => request(`/api/projects/${id}`),
    create: (data)   => request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    del:    (id)     => request(`/api/projects/${id}`, { method: 'DELETE' }),
    regenerateKey: (id) => request(`/api/projects/${id}/regenerate-key`, { method: 'POST' }),
    usage:  (id)     => request(`/api/projects/${id}/usage`),
  },

  // ── Logs ────────────────────────────────────────────────────────
  logs: {
    search: (params) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
      return request(`/api/logs?${q}`);
    },
    get:    (id) => request(`/api/logs/${id}`),
  },

  // ── Analytics ───────────────────────────────────────────────────
  analytics: {
    overview:    (projectId, range) => request(`/api/analytics/overview?projectId=${projectId}&range=${range}`),
    throughput:  (projectId, range) => request(`/api/analytics/throughput?projectId=${projectId}&range=${range}&buckets=40`),
    latency:     (projectId, range) => request(`/api/analytics/latency?projectId=${projectId}&range=${range}`),
    topEndpoints:(projectId, range) => request(`/api/analytics/top-endpoints?projectId=${projectId}&range=${range}&n=8`),
    topFailing:  (projectId, range) => request(`/api/analytics/top-failing?projectId=${projectId}&range=${range}&n=8`),
  },

  // ── Alerts ──────────────────────────────────────────────────────
  alerts: {
    list:        (projectId)     => request(`/api/alerts?projectId=${projectId}&limit=50`),
    listRules:   (projectId)     => request(`/api/alerts/rules?projectId=${projectId}`),
    createRule:  (data)          => request('/api/alerts/rules', { method: 'POST', body: JSON.stringify(data) }),
    updateRule:  (id, data)      => request(`/api/alerts/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteRule:  (id)            => request(`/api/alerts/rules/${id}`, { method: 'DELETE' }),
    resolve:     (id)            => request(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),
  },
};
