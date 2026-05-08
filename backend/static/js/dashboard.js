// dashboard.js
// loads the stats, recent tasks and projects for the dashboard page

import { api, getUser, clearAuth } from './api.js';
import { requireAuth, showToast, formatDate, statusBadge, initThemeToggle } from './utils.js';

// kick out if not logged in
requireAuth();

const user = getUser();

// fill in the user info at the top
document.getElementById('sidebar-username').textContent = user?.username || 'User';
document.getElementById('welcome-msg').textContent = `welcome back, ${user?.first_name || user?.username}!`;
const roleBadge = document.getElementById('role-badge');
roleBadge.textContent = user?.role;
roleBadge.classList.add(user?.role === 'admin' ? 'badge-admin' : 'badge-member');

initThemeToggle('theme-btn');

document.getElementById('logout-btn').addEventListener('click', () => {
  clearAuth();
  window.location.href = '/';
});

// fetch the numbers from the backend and put them in the boxes
async function loadStats() {
  try {
    const stats = await api.get('/tasks/dashboard/');
    document.getElementById('stat-total').textContent     = stats.total_tasks;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-progress').textContent  = stats.in_progress;
    document.getElementById('stat-overdue').textContent   = stats.overdue;
    document.getElementById('stat-mine').textContent      = stats.my_tasks;
  } catch (err) {
    console.error('stats failed to load:', err);
  }
}

// show the 5 most recent tasks assigned to me
async function loadRecentTasks() {
  const container = document.getElementById('recent-tasks');
  try {
    const tasks = await api.get('/tasks/');
    const myTasks = tasks.slice(0, 5);

    if (myTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>no tasks assigned yet</p>
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
    container.innerHTML = `<div class="alert alert-error">couldnt load tasks</div>`;
  }
}

// show the 4 most recent projects
async function loadRecentProjects() {
  const container = document.getElementById('recent-projects');
  try {
    const projects = await api.get('/projects/');
    const recent = projects.slice(0, 4);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>${user?.role === 'admin' ? '<a href="/projects/">create a project first →</a>' : 'ask your admin to add you to a project'}</p>
        </div>`;
      return;
    }

    // just a simple grid of plain boxes
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
        ${recent.map(p => `
          <a href="/projects/?id=${p.id}" style="text-decoration:none;">
            <div class="project-card">
              <h3>${p.name}</h3>
              <p class="project-meta">${p.members_detail?.length || 0} members</p>
            </div>
          </a>
        `).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">couldnt load projects</div>`;
  }
}

// run everything
loadStats();
loadRecentTasks();
loadRecentProjects();
