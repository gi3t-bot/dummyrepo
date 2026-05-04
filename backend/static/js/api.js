/**
 * api.js — Central API helper
 * All fetch calls go through here so we don't repeat auth headers everywhere.
 */

const API_BASE = 'http://127.0.0.1:8000/api';

/**
 * Store tokens after login
 */
export function saveTokens(access, refresh) {
  localStorage.setItem('access', access);
  localStorage.setItem('refresh', refresh);
}

export function getAccessToken() {
  return localStorage.getItem('access');
}

export function clearAuth() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
}

export function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

/**
 * Main fetch wrapper.
 * Automatically attaches Authorization header.
 * Throws on non-2xx responses with the error body.
 */
export async function apiFetch(path, options = {}) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: 'An unexpected error occurred.' };
    }
    throw errorData;
  }

  // 204 No Content — return null
  if (response.status === 204) return null;
  return response.json();
}

/**
 * Convenience methods
 */
export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, data)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(data) }),
  put:    (path, data)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(data) }),
  patch:  (path, data)   => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
};
