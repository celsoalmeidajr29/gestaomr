/**
 * MRSys — wrapper HTTP do frontend.
 *
 * Substitui o uso de window.storage por chamadas JSON ao backend PHP.
 * Mantém o cookie de sessão e injeta o CSRF token em métodos não-GET.
 *
 * Uso:
 *   import api, { auth } from './api';
 *   const data = await api.get('/servicos.php');
 *   await auth.login(email, senha);
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || '/api';

let csrfToken = null;

export function setCsrf(token) {
  csrfToken = token || null;
}

export function getCsrf() {
  return csrfToken;
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (body !== undefined && body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (method !== 'GET' && method !== 'HEAD' && csrfToken) {
    opts.headers['X-CSRF-Token'] = csrfToken;
  }
  if (signal) {
    opts.signal = signal;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let resp;
  try {
    resp = await fetch(url, opts);
  } catch (e) {
    const err = new Error('Falha de rede ao acessar o servidor');
    err.cause = e;
    err.network = true;
    throw err;
  }

  let payload = null;
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      payload = await resp.json();
    } catch (_) {
      payload = null;
    }
  } else {
    payload = { ok: false, error: `Resposta não-JSON do servidor (status ${resp.status})` };
  }

  if (!resp.ok || payload?.ok === false) {
    const err = new Error(payload?.error || `Erro HTTP ${resp.status}`);
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }

  return payload?.data ?? null;
}

const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export const auth = {
  async login(email, senha) {
    const data = await api.post('/auth/login.php', { email, senha });
    if (data?.csrf_token) setCsrf(data.csrf_token);
    return data;
  },
  async logout() {
    try {
      await api.post('/auth/logout.php');
    } finally {
      setCsrf(null);
    }
  },
  async me() {
    const data = await api.get('/auth/me.php');
    if (data?.csrf_token) setCsrf(data.csrf_token);
    return data;
  },
};

export default api;
