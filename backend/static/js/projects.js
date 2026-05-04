/**
 * projects.js — Handles the projects list view and project detail view.
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

// Show admin-only buttons
if (user?.role === 'admin') {
  document.getElementById('new-project-btn').style.display = '';
}

let allProjects = [];
let currentProject = null;

/* ========================
   MODAL HELPERS
   ======================== */
window.openModal  = (id) => document.getElementById(id).classList.add('open');
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

// Close modal when clicking backdrop
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

/* ========================
   LOAD PROJECTS LIST
   ======================== */
async function loadProjects() {
  const container = document.getElementById('projects-container');
  try {
    allProjects = await api.get('/projects/');

    if (allProjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>${user?.role === 'admin' ? 'No projects yet. Create your first one!' : 'You haven\'t been added to any projects yet.'}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
        ${allProjects.map(p => `
          <div class="card" style="cursor:pointer;" onclick="openProject(${p.id})">
            <div class="card-body">
              <h3 style="margin-bottom:0.25rem;">${p.name}</h3>
              <p class="text-muted" style="margin-bottom:1rem;">${p.description || 'No description.'}</p>
              <div class="d-flex align-center justify-between">
                <span class="text-muted" style="font-size:0.8rem;">👥 ${p.members_detail?.length || 0} members</span>
                <span class="text-muted" style="font-size:0.8rem;">📅 ${formatDate(p.created_at?.slice(0,10))}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load projects.</div>`;
  }
}

/* ========================
   OPEN PROJECT DETAIL
   ======================== */
window.openProject = async function(projectId) {
  currentProject = allProjects.find(p => p.id === projectId);
  if (!currentProject) return;

  document.getElementById('projects-container').style.display = 'none';
  document.getElementById('project-detail').style.display = '';
  document.getElementById('detail-name').textContent = currentProject.name;
  document.getElementById('detail-description').textContent = currentProject.description || '';

  // Show admin-only buttons
  if (user?.role === 'admin') {
    document.getElementById('add-member-btn').style.display = '';
    document.getElementById('add-task-btn').style.display = '';
  }

  renderMembers(currentProject.members_detail || []);
  await loadProjectTasks(projectId);
};

document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('project-detail').style.display = 'none';
  document.getElementById('projects-container').style.display = '';
});

/* ========================
   MEMBERS
   ======================== */
function renderMembers(members) {
  const container = document.getElementById('members-list');
  if (!members.length) {
    container.innerHTML = '<p class="text-muted">No members yet.</p>';
    return;
  }
  container.innerHTML = members.map(m => {
    // Admins can remove anyone EXCEPT the original project owner
    const canRemove = user?.role === 'admin' && m.id !== currentProject.owner;
    
    return `
    <div class="d-flex align-center gap-1" style="margin-bottom:0.5rem;">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);font-size:0.85rem;">
        ${m.username[0].toUpperCase()}
      </div>
      <div>
        <div style="font-weight:500;font-size:0.9rem;">${m.username}</div>
        <div class="text-muted" style="font-size:0.75rem;">${m.email}</div>
      </div>
      <div style="margin-left:auto; display:flex; align-items:center; gap:0.5rem;">
        <span class="badge badge-${m.role}">${m.role}</span>
        ${canRemove ? `<button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; color: var(--danger); border-color: var(--danger);" onclick="removeMember(${m.id}, '${m.username}')">Remove</button>` : ''}
      </div>
    </div>
  `}).join('');
}

window.removeMember = async function(memberId, username) {
  if (!confirm(`Remove ${username} from this project?`)) return;
  
  const existingIds = currentProject.members.map(Number);
  const newMembers = existingIds.filter(id => id !== memberId);

  try {
    const updated = await api.put(`/projects/${currentProject.id}/`, {
      name: currentProject.name,
      description: currentProject.description,
      members: newMembers,
    });
    currentProject = updated;
    renderMembers(updated.members_detail || []);
    showToast(`${username} removed from the project.`);
  } catch (err) {
    showToast('Failed to remove member.');
  }
};

// Add member button
document.getElementById('add-member-btn').addEventListener('click', async () => {
  // Load all users into select
  const select = document.getElementById('member-select');
  select.innerHTML = '<option>Loading...</option>';
  try {
    const users = await api.get('/users/');
    const currentMemberIds = currentProject.members_detail.map(m => m.id);
    const available = users.filter(u => !currentMemberIds.includes(u.id));
    select.innerHTML = available.length
      ? available.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')
      : '<option disabled>All users already added</option>';
    openModal('member-modal');
  } catch {
    showToast('Failed to load users');
  }
});

document.getElementById('confirm-add-member-btn').addEventListener('click', async () => {
  const memberId = parseInt(document.getElementById('member-select').value);
  const existingIds = currentProject.members.map(Number);
  const newMembers = [...new Set([...existingIds, memberId])];

  try {
    const updated = await api.put(`/projects/${currentProject.id}/`, {
      name: currentProject.name,
      description: currentProject.description,
      members: newMembers,
    });
    currentProject = updated;
    renderMembers(updated.members_detail || []);
    closeModal('member-modal');
    showToast('Member added!');
  } catch (err) {
    showToast('Failed to add member');
  }
});

/* ========================
   PROJECT TASKS
   ======================== */
async function loadProjectTasks(projectId) {
  const container = document.getElementById('project-tasks-list');
  try {
    const tasks = await api.get(`/tasks/?project=${projectId}`);
    if (!tasks.length) {
      container.innerHTML = '<p class="text-muted">No tasks in this project yet.</p>';
      return;
    }
    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Due Date</th></tr></thead>
          <tbody>
            ${tasks.map(t => `
              <tr>
                <td>${t.title}</td>
                <td>${t.assigned_to_detail?.username || '—'}</td>
                <td>${statusBadge(t.status)}</td>
                <td>${formatDate(t.due_date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch {
    container.innerHTML = '<div class="alert alert-error">Failed to load tasks.</div>';
  }
}

/* ========================
   CREATE PROJECT MODAL
   ======================== */
document.getElementById('new-project-btn').addEventListener('click', () => {
  clearFormError('project-form-error');
  document.getElementById('project-name').value = '';
  document.getElementById('project-description').value = '';
  openModal('project-modal');
});

document.getElementById('create-project-btn').addEventListener('click', async () => {
  clearFormError('project-form-error');
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();

  if (!name) {
    showFormError('project-form-error', 'Project name is required.');
    return;
  }

  const btn = document.getElementById('create-project-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    await api.post('/projects/', { name, description });
    closeModal('project-modal');
    showToast('Project created!');
    await loadProjects();
  } catch (err) {
    showFormError('project-form-error', parseApiError(err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Project';
  }
});

// Initialize
loadProjects();
