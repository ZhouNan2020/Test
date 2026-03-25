/**
 * API client – all backend calls go through here.
 * The current user is stored in localStorage as { user_id, username, role }.
 */

const BASE = '/api';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('edc_user') || 'null');
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const user = getUser();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (user) headers['x-user-id'] = user.user_id;

  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Projects ────────────────────────────────────────────────────────────────
export const getProjects = () => apiFetch('/projects');
export const getProject = (id) => apiFetch('/projects/' + id);
export const createProject = (body) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) });
export const updateProject = (id, body) => apiFetch('/projects/' + id, { method: 'PUT', body: JSON.stringify(body) });
export const deleteProject = (id) => apiFetch('/projects/' + id, { method: 'DELETE' });

// ─── Forms ───────────────────────────────────────────────────────────────────
export const getForms = (projectId) => apiFetch('/projects/' + projectId + '/forms');
export const getForm = (formId) => apiFetch('/forms/' + formId);
export const createForm = (projectId, body) => apiFetch('/projects/' + projectId + '/forms', { method: 'POST', body: JSON.stringify(body) });
export const updateForm = (formId, body) => apiFetch('/forms/' + formId, { method: 'PUT', body: JSON.stringify(body) });
export const deleteForm = (formId) => apiFetch('/forms/' + formId, { method: 'DELETE' });

// ─── Fields ──────────────────────────────────────────────────────────────────
export const createField = (formId, body) => apiFetch('/forms/' + formId + '/fields', { method: 'POST', body: JSON.stringify(body) });
export const updateField = (formId, fieldId, body) => apiFetch('/forms/' + formId + '/fields/' + fieldId, { method: 'PUT', body: JSON.stringify(body) });
export const deleteField = (formId, fieldId) => apiFetch('/forms/' + formId + '/fields/' + fieldId, { method: 'DELETE' });

// ─── Entries ─────────────────────────────────────────────────────────────────
export const getEntries = (formId) => apiFetch('/forms/' + formId + '/entries');
export const getEntry = (entryId) => apiFetch('/entries/' + entryId);
export const submitEntry = (formId, body) => apiFetch('/forms/' + formId + '/entries', { method: 'POST', body: JSON.stringify(body) });
export const deleteEntry = (entryId) => apiFetch('/entries/' + entryId, { method: 'DELETE' });

// ─── Users ───────────────────────────────────────────────────────────────────
export const getUsers = () => apiFetch('/users');
