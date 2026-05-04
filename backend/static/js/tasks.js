/**
 * tasks.js — Task listing, creation (admin), and status update (member)
 */

import { api, getUser, clearAuth } from './api.js';
import { requireAuth, showToast, formatDate, statusBadge, initThemeToggle, parseApiError, showFormError, clearFormError } from './utils.js';

requireAuth();

const user = getUser();
document.getElementById('sidebar-username').textContent = user?.username || '';
initThemeToggle('theme-btn');

document.getElementById('logout-btn').addEventListener('click', () => {
  clearAuth();
  window.location.href = '/';
});

// Admin sees "New Task" button
if (user?.role === 'admin') {
  document.getElementById('new-task-btn').style.display = '';
}

let allTasks = [];

/* ========================
   MODAL HELPERS
   ======================== */
window.openModal  = (id) => document.getElementById(id).classList.add('open');
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

/* ========================
   LOAD TASKS
   ======================== */
async function loadTasks() {
  const container = document.getElementById('tasks-container');
  const statusFilter = document.getElementById('filter-status').value;

  try {
    let url = '/tasks/';
    if (statusFilter) url += `?status=${statusFilter}`;
    allTasks = await api.get(url);

    // Client-side status filter fallback
    let filtered = allTasks;
    if (statusFilter) {
      filtered = allTasks.filter(t => t.status === statusFilter);
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>No tasks found.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(task => `
              <tr>
                <td style="font-weight:500;">${task.title}</td>
                <td class="text-secondary">${task.project}</td>
                <td>${task.assigned_to_detail?.username || '—'}</td>
                <td>
                  ${statusBadge(task.status)}
                  ${task.is_overdue ? '<span class="badge badge-overdue" style="margin-left:4px;">Overdue</span>' : ''}
                </td>
                <td>${formatDate(task.due_date)}</td>
                <td>
                  ${user?.role === 'admin'
                    ? `<button class="btn btn-outline btn-sm" onclick="openEditModal(${task.id})">Edit</button>
                       <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})" style="margin-left:4px;">Del</button>`
                    : `<button class="btn btn-outline btn-sm" onclick="openStatusModal(${task.id})">Update</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load tasks.</div>`;
  }
}

// Filter on change
document.getElementById('filter-status').addEventListener('change', loadTasks);

/* ========================
   CREATE / EDIT TASK MODAL (Admin)
   ======================== */
let editingTask = null;

document.getElementById('new-task-btn').addEventListener('click', async () => {
  editingTask = null;
  clearFormError('task-form-error');
  document.getElementById('task-modal-title').textContent = 'Create Task';
  document.getElementById('save-task-btn').textContent = 'Create Task';
  document.getElementById('edit-task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-description').value = '';
  document.getElementById('task-status').value = 'pending';
  document.getElementById('task-due').value = '';

  await populateProjectsAndUsers();
  openModal('task-modal');
});

window.openEditModal = async function(taskId) {
  editingTask = allTasks.find(t => t.id === taskId);
  if (!editingTask) return;

  clearFormError('task-form-error');
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('save-task-btn').textContent = 'Save Changes';
  document.getElementById('edit-task-id').value = editingTask.id;
  document.getElementById('task-title').value = editingTask.title;
  document.getElementById('task-description').value = editingTask.description || '';
  document.getElementById('task-status').value = editingTask.status;
  document.getElementById('task-due').value = editingTask.due_date || '';

  await populateProjectsAndUsers(editingTask.project, editingTask.assigned_to);
  openModal('task-modal');
};

async function populateProjectsAndUsers(selectedProject = null, selectedUser = null) {
  const [projects, users] = await Promise.all([
    api.get('/projects/'),
    api.get('/users/'),
  ]);

  const projectSelect = document.getElementById('task-project');
  projectSelect.innerHTML = projects.map(p =>
    `<option value="${p.id}" ${p.id === selectedProject ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const userSelect = document.getElementById('task-assigned');
  userSelect.innerHTML = '<option value="">— Unassigned —</option>' +
    users.map(u =>
      `<option value="${u.id}" ${u.id === selectedUser ? 'selected' : ''}>${u.username}</option>`
    ).join('');
}

document.getElementById('save-task-btn').addEventListener('click', async () => {
  clearFormError('task-form-error');

  const title = document.getElementById('task-title').value.trim();
  const project = document.getElementById('task-project').value;
  if (!title || !project) {
    showFormError('task-form-error', 'Title and project are required.');
    return;
  }

  const payload = {
    title,
    description: document.getElementById('task-description').value.trim(),
    project: parseInt(project),
    assigned_to: document.getElementById('task-assigned').value || null,
    status: document.getElementById('task-status').value,
    due_date: document.getElementById('task-due').value || null,
  };

  const btn = document.getElementById('save-task-btn');
  btn.disabled = true;

  try {
    const taskId = document.getElementById('edit-task-id').value;
    if (taskId) {
      await api.put(`/tasks/${taskId}/`, payload);
      showToast('Task updated!');
    } else {
      await api.post('/tasks/', payload);
      showToast('Task created!');
    }
    closeModal('task-modal');
    await loadTasks();
  } catch (err) {
    showFormError('task-form-error', parseApiError(err));
  } finally {
    btn.disabled = false;
  }
});

/* ========================
   DELETE TASK (Admin)
   ======================== */
window.deleteTask = async function(taskId) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await api.delete(`/tasks/${taskId}/`);
    showToast('Task deleted.');
    await loadTasks();
  } catch {
    showToast('Failed to delete task.');
  }
};

/* ========================
   UPDATE STATUS (Member)
   ======================== */
window.openStatusModal = function(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  document.getElementById('status-task-id').value = task.id;
  document.getElementById('status-task-title').textContent = `📋 ${task.title}`;
  document.getElementById('new-status').value = task.status;
  openModal('status-modal');
};

document.getElementById('confirm-status-btn').addEventListener('click', async () => {
  const taskId = document.getElementById('status-task-id').value;
  const status = document.getElementById('new-status').value;

  const btn = document.getElementById('confirm-status-btn');
  btn.disabled = true;

  try {
    await api.patch(`/tasks/${taskId}/`, { status });
    showToast('Status updated!');
    closeModal('status-modal');
    await loadTasks();
  } catch {
    showToast('Failed to update status.');
  } finally {
    btn.disabled = false;
  }
});

// Initialize
loadTasks();
