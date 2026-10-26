/**
 * api.js — centralized API client for TraceNest dashboard.
 *
 * All requests attach the JWT from localStorage.
 * On 401, the token is cleared and the user is redirected to /login.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API error');
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
    create: (data)   => request('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    del:    (id)     => request(`/api/projects/${id}`, { method: 'DELETE' }),
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
