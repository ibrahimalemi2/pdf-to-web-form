/**
 * API Service for interacting with FastAPI PyMuPDF backend
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Uploads a multipart PDF to FastAPI backend and returns extracted text blocks,
 * bounding boxes, structural layout fingerprint, and template match resolution.
 */
export async function uploadPdf(file) {
  if (!file) {
    throw new Error('No PDF file provided for upload.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Failed to upload and parse PDF';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(`${errorDetail} (Status ${response.status})`);
  }

  return await response.json();
}

/**
 * Fetches pre-parsed sample PDF data from the backend.
 */
export async function fetchSamplePdf() {
  const response = await fetch(`${API_BASE_URL}/sample-pdf`);
  if (!response.ok) {
    throw new Error(`Failed to load sample document: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetches pre-parsed sample assignment PDF data with template memory integration.
 */
export async function fetchSampleAssignment() {
  const response = await fetch(`${API_BASE_URL}/sample-assignment-pdf`);
  if (!response.ok) {
    throw new Error(`Failed to load assignment document: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Retrieves cached document metadata and fields by docId.
 */
export async function fetchDocument(docId) {
  const response = await fetch(`${API_BASE_URL}/document/${docId}`);
  if (!response.ok) {
    throw new Error(`Document not found: ${docId}`);
  }
  return await response.json();
}

/**
 * Saves or updates a form template in the SQLite database by fingerprint.
 */
export async function saveTemplate(payload) {
  const response = await fetch(`${API_BASE_URL}/templates/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = 'Failed to save template';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(`${errorDetail} (Status ${response.status})`);
  }

  return await response.json();
}

/**
 * Lists all learned templates stored in the SQLite database.
 */
export async function listTemplates() {
  const response = await fetch(`${API_BASE_URL}/templates`);
  if (!response.ok) {
    throw new Error(`Failed to list templates: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Retrieves a learned template by document structural fingerprint.
 */
export async function getTemplate(fingerprint) {
  const response = await fetch(`${API_BASE_URL}/templates/${encodeURIComponent(fingerprint)}`);
  if (!response.ok) {
    throw new Error(`Template not found for fingerprint: ${fingerprint}`);
  }
  return await response.json();
}

/**
 * Deletes a learned template from SQLite by ID.
 */
export async function deleteTemplate(templateId) {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Helper to construct the rendered page PNG URL.
 */
export function getPageImageUrl(docId, pageNumber = 1, dpi = 150) {
  return `${API_BASE_URL}/document/${docId}/page/${pageNumber}.png?dpi=${dpi}`;
}

export function getFormPreviewUrl(formId) {
  return `${API_BASE_URL}/api/forms/${formId}/preview.png`;
}

/**
 * Helper to construct the raw PDF download/render URL.
 */
export function getDocumentPdfUrl(docId) {
  return `${API_BASE_URL}/document/${docId}/pdf`;
}

/**
 * Fills the PDF document with submitted responses and triggers browser file download.
 */
export async function downloadFilledPdf({ documentId, filename, formData, fields, pdfFile = null }) {
  let pdfBase64 = null;
  if (pdfFile instanceof File || pdfFile instanceof Blob) {
    try {
      pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          const base64 = typeof res === 'string' && res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });
    } catch (e) {
      console.warn('Could not encode pdfFile to base64:', e);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/fill-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        filename,
        formData,
        fields,
        pdfBase64
      }),
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE_URL}. Please make sure the Python server is running.`);
  }

  if (!response.ok) {
    let errorDetail = 'Failed to generate filled PDF';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(`${errorDetail} (Status ${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename ? `Filled_${filename.replace(/\.pdf$/i, '')}.pdf` : 'Filled_Document.pdf';
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);

  return cleanName;
}

// -------------------------------------------------------------
// Authentication & Creator Sessions
// -------------------------------------------------------------

const TOKEN_KEY = 'consulardoc_auth_token';
const USER_KEY = 'consulardoc_auth_user';

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.error('Failed to store auth token', e);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.error('Failed to store user profile', e);
  }
}

export function clearAuthSession() {
  setAuthToken(null);
  setStoredUser(null);
}

function authHeaders(headers = {}) {
  const token = getAuthToken();
  if (token) {
    return { ...headers, Authorization: `Bearer ${token}` };
  }
  return headers;
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Registration failed');
  }

  if (data.token) setAuthToken(data.token);
  if (data.user) setStoredUser(data.user);
  return data;
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Login failed');
  }

  if (data.token) setAuthToken(data.token);
  if (data.user) setStoredUser(data.user);
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (response.status === 401) {
      clearAuthSession();
      return null;
    }

    if (!response.ok) return null;
    const data = await response.json();
    if (data.user) setStoredUser(data.user);
    return data.user;
  } catch {
    return getStoredUser();
  }
}

export async function updateUserProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to update profile');
  }
  if (data.user) setStoredUser(data.user);
  return data.user;
}

// -------------------------------------------------------------
// Creator Forms Management (Drafts & Published)
// -------------------------------------------------------------

export async function fetchUserForms(status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/forms${query}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load forms');
  }
  return data.forms || [];
}

export async function fetchUserForm(formId) {
  const response = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load form');
  }
  return data.form;
}

export async function saveUserForm(payload) {
  const response = await fetch(`${API_BASE_URL}/api/forms`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to save form');
  }
  return data.form;
}

export async function updateFormStatus(formId, status) {
  const response = await fetch(`${API_BASE_URL}/api/forms/${formId}/status`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to update form status');
  }
  return data;
}

export async function deleteUserForm(formId) {
  const response = await fetch(`${API_BASE_URL}/api/forms/${formId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to delete form');
  }
  return data;
}

// -------------------------------------------------------------
// Public Portal & Zero-Retention Client Filling
// -------------------------------------------------------------

export async function fetchPublicPortal(portalSlug) {
  const response = await fetch(`${API_BASE_URL}/api/public/portal/${encodeURIComponent(portalSlug)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Public portal not found');
  }
  return data;
}

export async function fetchPublicForm(formSlug) {
  const response = await fetch(`${API_BASE_URL}/api/public/form/${encodeURIComponent(formSlug)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Published form not found');
  }
  return data.form;
}

export async function downloadPublicFilledPdf(formSlug, formData, fallbackFilename = 'Official_Form.pdf') {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/public/form/${encodeURIComponent(formSlug)}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData }),
    });
  } catch {
    throw new Error(`Cannot reach server at ${API_BASE_URL}.`);
  }

  if (!response.ok) {
    let errorDetail = 'Failed to generate stamped document';
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(`${errorDetail} (Status ${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // Extract filename from header or fallback
  let downloadName = fallbackFilename;
  const disp = response.headers.get('Content-Disposition');
  if (disp && disp.includes('filename=')) {
    const match = disp.match(/filename="?([^";]+)"?/);
    if (match && match[1]) downloadName = match[1];
  }

  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);

  return downloadName;
}

export default {
  API_BASE_URL,
  checkBackendHealth,
  uploadPdf,
  fetchSamplePdf,
  fetchSampleAssignment,
  fetchDocument,
  saveTemplate,
  listTemplates,
  getTemplate,
  deleteTemplate,
  getPageImageUrl,
  getFormPreviewUrl,
  getDocumentPdfUrl,
  downloadFilledPdf,
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
  registerUser,
  loginUser,
  fetchCurrentUser,
  updateUserProfile,
  fetchUserForms,
  fetchUserForm,
  saveUserForm,
  updateFormStatus,
  deleteUserForm,
  fetchPublicPortal,
  fetchPublicForm,
  downloadPublicFilledPdf,
};



