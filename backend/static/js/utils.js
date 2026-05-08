// utils.js
// random helper stuff used everywhere, put it all here so i dont repeat myself

// shows a little popup at the bottom right corner
// disappears after 3 seconds by default
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

// formats "2025-12-31" → "Dec 31, 2025"
// the T00:00:00 trick is bc without it js shifts the date by timezone
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// returns the colored badge html for a task status
export function statusBadge(status) {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

// dark mode toggle
// saves to localstorage so it doesnt reset on refresh
// the inline script in <head> reads this before the page loads so no flicker
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

// redirect to login if theres no token
// also blocks the back button after logout so you cant go back to the dashboard
export function requireAuth() {
  if (!localStorage.getItem('access')) {
    window.location.href = '/';
    return;
  }

  // this part is a bit hacky but it works
  // push a dummy state so the back button triggers our popstate handler
  if (!window.backBlockerInitialized) {
    window.backBlockerInitialized = true;

    history.pushState(null, '', location.href);

    window.addEventListener('popstate', () => {
      // user clicked back
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        // they said no, push another dummy state so they stay
        history.pushState(null, '', location.href);
      }
    });
  }
}

// shows a red error box above the form
export function showFormError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-error">⚠️ ${message}</div>`;
}

export function clearFormError(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

// django rest framework returns errors like { "email": ["already exists"] }
// this flattens that into a readable string
export function parseApiError(err) {
  if (typeof err === 'string') return err;
  if (err.detail) return err.detail;
  return Object.entries(err)
    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
    .join(' | ');
}
