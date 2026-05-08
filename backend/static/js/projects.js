// projects.js
// handles the projects list and the project detail view

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

// only admins can create projects
if (user?.role === 'admin') {
  document.getElementById('new-project-btn').style.display = '';
}

let allProjects = [];
let currentProject = null;

// modal open/close helpers
// made them global so i can call openModal() from html onclick attributes
window.openModal  = (id) => document.getElementById(id).classList.add('open');
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

// clicking outside the modal closes it
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// LOAD ALL PROJECTS
async function loadProjects() {
  const container = document.getElementById('projects-container');
  try {
    allProjects = await api.get('/projects/');

    if (allProjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <p>${user?.role === 'admin' ? 'no projects yet, create one!' : 'you havent been added to any projects yet'}</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
        ${allProjects.map(p => `
          <div class="project-card" onclick="openProject(${p.id})">
            <h3>${p.name}</h3>
            <p>${p.description || 'no description'}</p>
            <div class="project-meta">
              👥 ${p.members_detail?.length || 0} members &nbsp;&bull;&nbsp;
              📅 ${formatDate(p.created_at?.slice(0,10))}
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">couldnt load projects</div>`;
  }
}

// OPEN PROJECT DETAIL
// hides the list and shows the detail view for the selected project
window.openProject = async function(projectId) {
  currentProject = allProjects.find(p => p.id === projectId);
  if (!currentProject) return;

  document.getElementById('projects-container').style.display = 'none';
  document.getElementById('project-detail').style.display = '';
  document.getElementById('detail-name').textContent = currentProject.name;
  document.getElementById('detail-description').textContent = currentProject.description || '';

  // show the admin buttons if needed
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

// MEMBERS
function renderMembers(members) {
  const container = document.getElementById('members-list');
  if (!members.length) {
    container.innerHTML = '<p class="text-muted">no members yet</p>';
    return;
  }
  container.innerHTML = members.map(m => {
    // admins can remove anyone except the project owner (cant remove yourself as owner)
    const canRemove = user?.role === 'admin' && m.id !== currentProject.owner;

    return `
    <div class="d-flex align-center gap-1" style="margin-bottom:6px;">
      <div style="width:28px;height:28px;background:#336699;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:12px;border-radius:2px;">
        ${m.username[0].toUpperCase()}
      </div>
      <div>
        <div style="font-size:13px;font-weight:bold;">${m.username}</div>
        <div class="text-muted">${m.email}</div>
      </div>
      <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
        <span class="badge badge-${m.role}">${m.role}</span>
        ${canRemove ? `<button class="btn btn-outline btn-sm" style="color:red;border-color:red;" onclick="removeMember(${m.id}, '${m.username}')">Remove</button>` : ''}
      </div>
    </div>
  `}).join('');
}

window.removeMember = async function(memberId, username) {
  if (!confirm(`remove ${username} from this project?`)) return;

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
    showToast(`${username} removed`);
  } catch (err) {
    showToast('failed to remove member');
  }
};

// load users into the select dropdown and open the add member modal
document.getElementById('add-member-btn').addEventListener('click', async () => {
  const select = document.getElementById('member-select');
  select.innerHTML = '<option>loading...</option>';
  try {
    const users = await api.get('/users/');
    const currentMemberIds = currentProject.members_detail.map(m => m.id);
    const available = users.filter(u => !currentMemberIds.includes(u.id));
    select.innerHTML = available.length
      ? available.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join('')
      : '<option disabled>everyone is already in this project</option>';
    openModal('member-modal');
  } catch {
    showToast('couldnt load users');
  }
});

document.getElementById('confirm-add-member-btn').addEventListener('click', async () => {
  const memberId = parseInt(document.getElementById('member-select').value);
  const existingIds = currentProject.members.map(Number);
  // use Set to avoid adding the same person twice
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
    showToast('member added!');
  } catch (err) {
    showToast('failed to add member');
  }
});

// TASKS IN THIS PROJECT (read only table)
async function loadProjectTasks(projectId) {
  const container = document.getElementById('project-tasks-list');
  try {
    const tasks = await api.get(`/tasks/?project=${projectId}`);
    if (!tasks.length) {
      container.innerHTML = '<p class="text-muted">no tasks in this project yet</p>';
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
    container.innerHTML = '<div class="alert alert-error">couldnt load tasks</div>';
  }
}

// ADD TASK FROM PROJECT DETAIL
// this button was just sitting there doing nothing lol, finally wiring it up
document.getElementById('add-task-btn').addEventListener('click', async () => {
  // reset the form
  clearFormError('project-task-form-error');
  document.getElementById('pt-title').value = '';
  document.getElementById('pt-description').value = '';
  document.getElementById('pt-status').value = 'pending';
  document.getElementById('pt-due').value = '';

  // show the project name in the modal header so user knows which project its for
  document.getElementById('project-task-modal-name').textContent = currentProject.name;

  // populate the assign-to dropdown with project members only
  // makes more sense than showing all users
  const assignSelect = document.getElementById('pt-assigned');
  assignSelect.innerHTML = '<option value="">— Unassigned —</option>' +
    (currentProject.members_detail || []).map(m =>
      `<option value="${m.id}">${m.username}</option>`
    ).join('');

  openModal('project-task-modal');
});

// save the new task
document.getElementById('pt-save-btn').addEventListener('click', async () => {
  clearFormError('project-task-form-error');

  const title = document.getElementById('pt-title').value.trim();
  if (!title) {
    showFormError('project-task-form-error', 'title cant be empty');
    return;
  }

  const payload = {
    title,
    description: document.getElementById('pt-description').value.trim(),
    project: currentProject.id,  // pre-filled, user doesnt pick this
    assigned_to: document.getElementById('pt-assigned').value || null,
    status: document.getElementById('pt-status').value,
    due_date: document.getElementById('pt-due').value || null,
  };

  const btn = document.getElementById('pt-save-btn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    await api.post('/tasks/', payload);
    closeModal('project-task-modal');
    showToast('task created!');
    // reload the task list so it shows up immediately
    await loadProjectTasks(currentProject.id);
  } catch (err) {
    showFormError('project-task-form-error', parseApiError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Task';
  }
});

// CREATE PROJECT MODAL
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
    showFormError('project-form-error', 'project name cant be empty');
    return;
  }

  const btn = document.getElementById('create-project-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    await api.post('/projects/', { name, description });
    closeModal('project-modal');
    showToast('project created!');
    await loadProjects();
  } catch (err) {
    showFormError('project-form-error', parseApiError(err));
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Project';
  }
});

// start
loadProjects();
