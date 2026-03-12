// src/api/apiClient.js
import axios from 'axios';
import { auth } from '../auth/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vnr-academic-repository-1.onrender.com';
console.log("API BASE URL:", BASE_URL);
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});
export const fetchFolders = (params) =>
  api.get('/files/folders', { params }).then(r => r.data.data);

export const createFolder = (data) =>
  api.post('/files/folders', data).then(r => r.data.data);

export const deleteFolder = (id) =>
  api.delete(`/admin/folders/${id}`).then(r => r.data);
// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(false);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const loginToBackend = async (idToken) => {
  const { data } = await axios.post(
    `${BASE_URL}/auth/login`,
    {},
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return data.data.user;
};

// ── Files ─────────────────────────────────────────────────────
export const fetchFiles = async (params = {}) => {
  const { data } = await api.get('/files', { params });
  return data.data;
};

export const fetchFileById = async (id) => {
  const { data } = await api.get(`/files/${id}`);
  return data.data.file;
};

export const uploadFile = async (formData, onProgress) => {
  const { data } = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(e.loaded, e.total)
      : undefined,
  });
  return data.data.file;
};

export const getPreviewUrl  = (id) => `${BASE_URL}/files/preview/${id}`;
export const getDownloadUrl = (id) => `${BASE_URL}/files/download/${id}`;

export const reportFile = async (fileId, reason, description = '') => {
  const { data } = await api.post('/reports', { fileId, reason, description });
  return data;
};

// ── Admin ─────────────────────────────────────────────────────
export const fetchPendingFiles = async (params = {}) => {
  const { data } = await api.get('/admin/pending-files', { params });
  return data.data;
};

export const approveFile = async (id) => {
  const { data } = await api.patch(`/admin/files/${id}/approve`);
  return data;
};

export const rejectFile = async (id, note = '') => {
  const { data } = await api.patch(`/admin/files/${id}/reject`, { note });
  return data;
};

export const deleteFile = async (id) => {
  const { data } = await api.delete(`/admin/files/${id}`);
  return data;
};

export const fetchReports = async (params = {}) => {
  const { data } = await api.get('/admin/reports', { params });
  return data.data;
};

export const resolveReport = async (id) => {
  const { data } = await api.patch(`/admin/reports/${id}/resolve`);
  return data;
};

export default api;