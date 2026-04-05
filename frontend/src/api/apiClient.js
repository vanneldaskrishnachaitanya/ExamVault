// src/api/apiClient.js
import axios from 'axios';
import { auth } from '../auth/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://examvault-miqe.onrender.com';
console.log("API BASE URL:", BASE_URL);
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});
export const fetchFolders = (params) => api.get('/folders', { params }).then(r => r.data);
export const createFolder = (data)   => api.post('/folders', data).then(r => r.data);
export const deleteFolder = (id)     => api.delete(`/folders/${id}`).then(r => r.data);

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) { const token = await user.getIdToken(false); config.headers.Authorization = `Bearer ${token}`; }
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => { const message = err.response?.data?.message || err.message || 'An unexpected error occurred'; return Promise.reject(new Error(message)); }
);

export const loginToBackend = async (idToken) => {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, {}, { headers: { Authorization: `Bearer ${idToken}` } });
  return data.data.user;
};

// ── Files ─────────────────────────────────────────────────────
export const fetchFiles      = async (params={}) => { const { data } = await api.get('/files', { params }); return data.data; };
export const fetchFileById   = async (id) => { const { data } = await api.get(`/files/${id}`); return data.data.file; };
export const uploadFile      = async (formData, onProgress) => {
  const { data } = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
    onUploadProgress: onProgress ? (e) => onProgress(e.loaded, e.total) : undefined,
  });
  return data.data.file;
};
export const getPreviewUrl   = (id) => `${BASE_URL}/files/preview/${id}`;
export const getDownloadUrl  = (id) => `${BASE_URL}/files/download/${id}`;
export const reportFile      = async (fileId, reason, description='') => { const { data } = await api.post('/reports', { fileId, reason, description }); return data; };

// ── Admin files ────────────────────────────────────────────────
export const fetchPendingFiles = async (params={}) => { const { data } = await api.get('/admin/pending-files', { params }); return data.data; };
export const approveFile       = async (id)         => { const { data } = await api.patch(`/admin/files/${id}/approve`); return data; };
export const rejectFile        = async (id, note='') => { const { data } = await api.patch(`/admin/files/${id}/reject`, { note }); return data; };
export const deleteFile        = async (id)         => { const { data } = await api.delete(`/admin/files/${id}`); return data; };
export const fetchReports      = async (params={}) => { const { data } = await api.get('/admin/reports', { params }); return data.data; };
export const resolveReport     = async (id)         => { const { data } = await api.patch(`/admin/reports/${id}/resolve`); return data; };
export const toggleImportant   = async (id)         => { const { data } = await api.patch(`/admin/files/${id}/important`); return data.data; };

// ── Notifications ──────────────────────────────────────────────
export const fetchNotifications       = async ()   => { const { data } = await api.get('/notifications'); return data.data; };
export const markAllNotificationsRead = async ()   => { const { data } = await api.patch('/notifications/read-all'); return data; };
export const markNotificationRead     = async (id) => { const { data } = await api.patch(`/notifications/${id}/read`); return data; };
export const deleteNotification       = async (id) => { const { data } = await api.delete(`/notifications/${id}`); return data; };

// ── Announcements ──────────────────────────────────────────────
export const fetchAnnouncements  = async ()        => { const { data } = await api.get('/announcements'); return data.data; };
export const createAnnouncement  = async (payload) => { const { data } = await api.post('/admin/announcements', payload); return data.data; };
export const deleteAnnouncement  = async (id)      => { const { data } = await api.delete(`/admin/announcements/${id}`); return data; };
export const toggleAnnouncement  = async (id)      => { const { data } = await api.patch(`/admin/announcements/${id}`); return data.data; };

// ── Bookmarks ──────────────────────────────────────────────────
export const fetchBookmarks  = async ()        => { const { data } = await api.get('/bookmarks'); return data.data; };
export const addBookmark     = async (payload) => { const { data } = await api.post('/bookmarks', payload); return data.data; };
export const removeBookmark  = async (payload) => { const { data } = await api.delete('/bookmarks', { data: payload }); return data; };

// ── Analytics ──────────────────────────────────────────────────
export const fetchAnalytics   = async () => { const { data } = await api.get('/admin/analytics'); return data.data; };
export const fetchPublicStats = async () => { const { data } = await api.get('/stats'); return data.data; };

// ── Search ────────────────────────────────────────────────────
export const globalSearch = async (params={}) => { const { data } = await api.get('/search', { params }); return data.data; };

// ── Ratings ────────────────────────────────────────────────────
export const getFileRatings = async (fileId)                   => { const { data } = await api.get(`/ratings/${fileId}`); return data.data; };
export const rateFile       = async (fileId, stars, comment='') => { const { data } = await api.post(`/ratings/${fileId}`, { stars, comment }); return data.data; };
export const deleteRating   = async (fileId)                   => { const { data } = await api.delete(`/ratings/${fileId}`); return data; };

// ── Download history ───────────────────────────────────────────
export const recordDownloadApi    = async (fileId) => { try { await api.post(`/downloads/record/${fileId}`); } catch {} };
export const fetchDownloadHistory = async ()       => { const { data } = await api.get('/downloads'); return data.data; };

// ── Users (admin) ──────────────────────────────────────────────
export const fetchAllUsers    = async (params={}) => { const { data } = await api.get('/admin/users', { params }); return data.data; };
export const toggleUserActive = async (id)        => { const { data } = await api.patch(`/admin/users/${id}/toggle`); return data.data; };

// ── Branches ──────────────────────────────────────────────────
export const fetchBranches    = async ()           => { const { data } = await api.get('/branches'); return data.data; };
export const fetchAllBranches = async ()           => { const { data } = await api.get('/admin/branches'); return data.data; };
export const createBranch     = async (payload)    => { const { data } = await api.post('/admin/branches', payload); return data.data; };
export const updateBranch     = async (id, payload) => { const { data } = await api.patch(`/admin/branches/${id}`, payload); return data.data; };
export const deleteBranch     = async (id)         => { const { data } = await api.delete(`/admin/branches/${id}`); return data; };

// ── Events ────────────────────────────────────────────────────
export const fetchEvents       = async (params={})  => { const { data } = await api.get('/events', { params }); return data.data; };
export const fetchEventClubs   = async ()           => { const { data } = await api.get('/events/clubs'); return data.data; };
export const createEvent       = async (formData)   => { const { data } = await api.post('/admin/events', formData, { headers:{'Content-Type':'multipart/form-data'}, timeout:60000 }); return data.data; };
export const toggleEventComplete = async (id)       => { const { data } = await api.patch(`/admin/events/${id}/complete`); return data.data; };
export const deleteEvent       = async (id)         => { const { data } = await api.delete(`/admin/events/${id}`); return data; };

// ── Exams ────────────────────────────────────────────────────
export const fetchExams         = async ()          => { const { data } = await api.get('/exams'); return data.data; };
export const createExam         = async (payload)   => { const { data } = await api.post('/exams', payload); return data.data; };
export const deleteExam         = async (id)        => { const { data } = await api.delete(`/exams/${id}`); return data; };

// ── Coding platforms ──────────────────────────────────────────
export const getCodingItems       = async ()        => { const { data } = await api.get('/coding'); return data.data; };
export const suggestPlatform      = async (payload) => { const { data } = await api.post('/coding/suggest', payload); return data.data; };
export const getAllCodingItems     = async ()        => { const { data } = await api.get('/admin/coding'); return data.data; };
export const createCodingItem     = async (payload) => { const { data } = await api.post('/admin/coding', payload); return data.data; };
export const deleteCodingItem     = async (id)      => { const { data } = await api.delete(`/admin/coding/${id}`); return data; };
export const toggleCodingItem     = async (id)      => { const { data } = await api.patch(`/admin/coding/${id}`); return data.data; };
export const getCodingSuggestions = async ()        => { const { data } = await api.get('/admin/coding/suggestions'); return data.data; };
export const reviewSuggestion     = async (id, action, adminNote='') => { const { data } = await api.patch(`/admin/coding/suggestions/${id}`, { action, adminNote }); return data; };

// ── Syllabus ──────────────────────────────────────────────────
export const fetchSyllabus  = async (params={})  => { const { data } = await api.get('/syllabus', { params }); return data.data; };
export const uploadSyllabus = async (formData)   => { const { data } = await api.post('/admin/syllabus', formData, { headers:{'Content-Type':'multipart/form-data'}, timeout:120000 }); return data.data; };
export const deleteSyllabus = async (id)         => { const { data } = await api.delete(`/admin/syllabus/${id}`); return data; };

// ── Timetable ─────────────────────────────────────────────────
export const fetchTimetable   = async (params={}) => { const { data } = await api.get('/timetable', { params }); return data.data; };
export const uploadTimetable  = async (formData)  => { const { data } = await api.post('/admin/timetable', formData, { headers:{'Content-Type':'multipart/form-data'}, timeout:120000 }); return data.data; };
export const deleteTimetable  = async (id)        => { const { data } = await api.delete(`/admin/timetable/${id}`); return data; };

// ── Feedback ──────────────────────────────────────────────────
export const fetchFeedback       = async (params={})   => { const { data } = await api.get('/feedback', { params }); return data.data; };
export const submitFeedback      = async (payload)     => { const { data } = await api.post('/feedback', payload); return data.data; };
export const upvoteFeedback      = async (id)          => { const { data } = await api.patch(`/feedback/${id}/upvote`); return data.data; };
export const reviewFeedback      = async (id, payload) => { const { data } = await api.patch(`/admin/feedback/${id}`, payload); return data.data; };
export const deleteFeedbackAdmin = async (id)          => { const { data } = await api.delete(`/admin/feedback/${id}`); return data; };

// ── Quotes ────────────────────────────────────────────────────
export const fetchTodayQuotes    = async ()          => { const { data } = await api.get('/quotes/today'); return data.data; };
export const fetchQuoteSettings      = async ()          => { const { data } = await api.get('/admin/quotes/settings'); return data.data; };
export const toggleQuoteEnabled      = async ()          => { const { data } = await api.patch('/admin/quotes/settings/toggle'); return data.data; };
export const toggleQuoteAutoFallback = async ()          => { const { data } = await api.patch('/admin/quotes/settings/toggle-auto'); return data.data; };
export const toggleQuoteShowAuthor   = async ()          => { const { data } = await api.patch('/admin/quotes/settings/toggle-author'); return data.data; };
export const fetchQuoteSections  = async ()          => { const { data } = await api.get('/admin/quotes/sections'); return data.data; };
export const createQuoteSection  = async (payload)   => { const { data } = await api.post('/admin/quotes/sections', payload); return data.data; };
export const updateQuoteSection  = async (id, payload) => { const { data } = await api.patch(`/admin/quotes/sections/${id}`, payload); return data.data; };
export const deleteQuoteSection  = async (id)        => { const { data } = await api.delete(`/admin/quotes/sections/${id}`); return data; };
export const fetchQuotesBySection= async (secId)     => { const { data } = await api.get(`/admin/quotes/sections/${secId}/quotes`); return data.data; };
export const createQuote         = async (payload)   => { const { data } = await api.post('/admin/quotes', payload); return data.data; };
export const updateQuote         = async (id, payload) => { const { data } = await api.patch(`/admin/quotes/${id}`, payload); return data.data; };
export const deleteQuote         = async (id)        => { const { data } = await api.delete(`/admin/quotes/${id}`); return data; };

// ── Polls ─────────────────────────────────────────────────────
export const fetchActivePolls  = async ()            => { const { data } = await api.get('/polls'); return data.data; };
export const votePoll          = async (id, optionIds) => { const { data } = await api.post(`/polls/${id}/vote`, { optionIds }); return data.data; };
export const fetchAllPolls     = async ()            => { const { data } = await api.get('/admin/polls'); return data.data; };
export const createPoll        = async (payload)     => { const { data } = await api.post('/admin/polls', payload); return data.data; };
export const togglePoll        = async (id)          => { const { data } = await api.patch(`/admin/polls/${id}`); return data.data; };
export const deletePoll        = async (id)          => { const { data } = await api.delete(`/admin/polls/${id}`); return data; };

export default api;
