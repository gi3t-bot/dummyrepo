/**
 * dashboard.js — Loads stats, recent tasks, and projects for the dashboard page.
 */

import { api, getUser, clearAuth } from './api.js';
import { requireAuth, showToast, formatDate, statusBadge, initThemeToggle } from './utils.js';

// Protect this page
requireAuth();

const user = getUser();

// Set up UI with user info
document.getElementById('sidebar-username').textContent = user?.username || 'User';
document.getElementById('welcome-msg').textContent = `Welcome back, ${user?.first_name || user?.username}!`;
const roleBadge = document.getElementById('role-badge');
roleBadge.textContent = user?.role;
roleBadge.classList.add(user?.role === 'admin' ? 'badge-admin' : 'badge-member');

// Theme toggle
initThemeToggle('theme-btn');

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  clearAuth();
  window.location.href = '/';
});

/* Load dashboard stats */
async function loadStats() {
  try {
    const stats = await api.get('/tasks/dashboard/');
    document.getElementById('stat-total').textContent     = stats.total_tasks;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-progress').textContent  = stats.in_progress;
    document.getElementById('stat-overdue').textContent   = stats.overdue;
    document.getElementById('stat-mine').textContent      = stats.my_tasks;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/* Load recent tasks (my assigned tasks) */
async function loadRecentTasks() {
  const container = document.getElementById('recent-tasks');
  try {
    const tasks = await api.get('/tasks/');
    const myTasks = tasks.slice(0, 5); // Show first 5

    if (myTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>No tasks assigned yet.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${myTasks.map(task => `
              <tr>
                <td><a href="/tasks/">${task.title}</a></td>
                <td>${task.project}</td>
                <td>${statusBadge(task.status)}</td>
                <td>${formatDate(task.due_date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load tasks.</div>`;
  }
}

/* Load recent projects */
async function loadRecentProjects() {
  const container = document.getElementById('recent-projects');
  try {
    const projects = await api.get('/projects/');
    const recent = projects.slice(0, 4);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>No projects yet. ${user?.role === 'admin' ? '<a href="/projects/">Create one →</a>' : 'Ask your admin to add you.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
        ${recent.map(p => `
          <a href="/projects/?id=${p.id}" style="text-decoration:none;">
            <div class="stat-card" style="cursor:pointer;">
              <div style="font-weight:600; color:var(--text-primary); margin-bottom:0.25rem;">${p.name}</div>
              <div class="text-muted">${p.members_detail?.length || 0} members</div>
            </div>
          </a>
        `).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load projects.</div>`;
  }
}

// Load everything
loadStats();
loadRecentTasks();
loadRecentProjects();
