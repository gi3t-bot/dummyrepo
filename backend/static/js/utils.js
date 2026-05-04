/**
 * utils.js — Shared UI utilities used across all pages
 */

/**
 * Show a brief toast notification at the bottom-right corner.
 * @param {string} message
 * @param {number} duration - ms to show (default 3000)
 */
export function showToast(message, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Format a date string to a readable format.
 * e.g. "2025-12-31" → "Dec 31, 2025"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

/**
 * Return a status badge HTML string.
 */
export function statusBadge(status) {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

/**
 * Dark mode toggle — reads/writes data-theme on <html>.
 * Persists choice in localStorage so there's no flicker on reload
 * (theme is applied immediately in <head> via an inline script).
 */
export function initThemeToggle(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  function update() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark ? '☀️ Light' : '🌙 Dark';
  }

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    update();
  });

  update();
}

/**
 * Redirect to login if no token is present.
 * Call this at the top of every protected page.
 */
export function requireAuth() {
  if (!localStorage.getItem('access')) {
    window.location.href = '/';
    return;
  }

  // Intercept the browser's "Back" button
  if (!window.backBlockerInitialized) {
    window.backBlockerInitialized = true;
    
    // Push a dummy state into the history stack to trap the back button
    history.pushState(null, '', location.href);
    
    window.addEventListener('popstate', () => {
      // The user clicked "Back"
      if (confirm('Are you sure you want to logout?')) {
        // They clicked Yes -> clear tokens and go to login
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        // They clicked No -> stay on the page by pushing another dummy state
        history.pushState(null, '', location.href);
      }
    });
  }
}

/**
 * Display a form error alert above the submit button.
 */
export function showFormError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-error">⚠️ ${message}</div>`;
}

export function clearFormError(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/**
 * Flatten DRF error responses into a single readable string.
 * DRF returns errors like: { "email": ["already exists"], "password": ["too short"] }
 */
export function parseApiError(err) {
  if (typeof err === 'string') return err;
  if (err.detail) return err.detail;
  // Flatten field errors
  return Object.entries(err)
    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
    .join(' | ');
}
