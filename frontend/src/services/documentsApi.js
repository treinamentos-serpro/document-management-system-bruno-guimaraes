const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Não foi possível concluir a solicitação.');
  }

  return response;
}

export async function listDocuments(token) {
  const response = await request('/documents', token);
  return response.json();
}

export async function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', token, { method: 'POST', body: formData });
  return response.json();
}

export async function downloadDocument(id, token) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, token);
  return response.blob();
}