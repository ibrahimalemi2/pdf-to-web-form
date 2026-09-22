/**
 * API Service for interacting with FastAPI PyMuPDF backend
 */
export const API_BASE_URL = 'http://127.0.0.1:8000';

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

/**
 * Helper to construct the raw PDF download/render URL.
 */
export function getDocumentPdfUrl(docId) {
  return `${API_BASE_URL}/document/${docId}/pdf`;
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
  getDocumentPdfUrl,
};

