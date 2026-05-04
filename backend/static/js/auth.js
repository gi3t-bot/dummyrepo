/**
 * auth.js — Handles login and signup form logic
 */

import { api, saveTokens, saveUser } from './api.js';
import { showToast, showFormError, clearFormError, parseApiError, initThemeToggle } from './utils.js';

// Redirect if already logged in
if (localStorage.getItem('access')) {
  window.location.href = '/dashboard/';
}

// Initialize theme toggle
initThemeToggle('theme-btn');

/**
 * Tab switching between Login and Signup forms.
 * Made global so the onclick="switchTab()" in HTML can call it.
 */
window.switchTab = function(tab) {
  const loginForm   = document.getElementById('login-form');
  const signupForm  = document.getElementById('signup-form');
  const loginTab    = document.getElementById('tab-login');
  const signupTab   = document.getElementById('tab-signup');

  if (tab === 'login') {
    loginForm.style.display  = '';
    signupForm.style.display = 'none';
    loginTab.className  = 'btn btn-primary';
    signupTab.className = 'btn btn-outline';
  } else {
    loginForm.style.display  = 'none';
    signupForm.style.display = '';
    loginTab.className  = 'btn btn-outline';
    signupTab.className = 'btn btn-primary';
  }
};

/* ========================
   LOGIN
   ======================== */
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormError('login-error');

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showFormError('login-error', 'Please fill in all fields.');
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in...';

  try {
    const data = await api.post('/auth/login/', { username, password });

    // Save JWT tokens and user profile to localStorage
    saveTokens(data.access, data.refresh);
    saveUser(data.user);

    showToast('Welcome back, ' + data.user.username + '!');
    setTimeout(() => { window.location.href = '/dashboard/'; }, 600);

  } catch (err) {
    showFormError('login-error', parseApiError(err));
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
});

/* ========================
   SIGNUP
   ======================== */
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFormError('signup-error');

  const payload = {
    username:   document.getElementById('signup-username').value.trim(),
    email:      document.getElementById('signup-email').value.trim(),
    first_name: document.getElementById('signup-first').value.trim(),
    last_name:  document.getElementById('signup-last').value.trim(),
    password:   document.getElementById('signup-password').value,
    password2:  document.getElementById('signup-password2').value,
  };

  if (!payload.username || !payload.email || !payload.password) {
    showFormError('signup-error', 'Username, email, and password are required.');
    return;
  }

  if (payload.password !== payload.password2) {
    showFormError('signup-error', 'Passwords do not match.');
    return;
  }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    await api.post('/users/register/', payload);
    showToast('Account created! Please log in.');
    window.switchTab('login');
    // Pre-fill the username field for convenience
    document.getElementById('login-username').value = payload.username;
  } catch (err) {
    showFormError('signup-error', parseApiError(err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Account';
  }
});
