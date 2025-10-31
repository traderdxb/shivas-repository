import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const deviceAPI = {
  getAll: (params) => api.get('/api/devices', { params }),
  getById: (id) => api.get(`/api/devices/${id}`),
  create: (data) => api.post('/api/devices', data),
  update: (id, data) => api.put(`/api/devices/${id}`, data),
  delete: (id) => api.delete(`/api/devices/${id}`),
  getAvailable: () => api.get('/api/devices/available/list'),
};

export const simAPI = {
  getAll: (params) => api.get('/api/sims', { params }),
  getById: (id) => api.get(`/api/sims/${id}`),
  create: (data) => api.post('/api/sims', data),
  update: (id, data) => api.put(`/api/sims/${id}`, data),
  delete: (id) => api.delete(`/api/sims/${id}`),
  getAvailable: () => api.get('/api/sims/available/list'),
};

export const clientAPI = {
  getAll: (params) => api.get('/api/clients', { params }),
  getById: (id) => api.get(`/api/clients/${id}`),
  create: (data) => api.post('/api/clients', data),
  update: (id, data) => api.put(`/api/clients/${id}`, data),
  delete: (id) => api.delete(`/api/clients/${id}`),
};

export const vehicleAPI = {
  getAll: (params) => api.get('/api/vehicles', { params }),
  getById: (id) => api.get(`/api/vehicles/${id}`),
  create: (data) => api.post('/api/vehicles', data),
  update: (id, data) => api.put(`/api/vehicles/${id}`, data),
  delete: (id) => api.delete(`/api/vehicles/${id}`),
};

export const assignmentAPI = {
  getAll: (params) => api.get('/api/assignments', { params }),
  getById: (id) => api.get(`/api/assignments/${id}`),
  create: (data) => api.post('/api/assignments', data),
  update: (id, data) => api.put(`/api/assignments/${id}`, data),
  delete: (id) => api.delete(`/api/assignments/${id}`),
  getMasterlist: (params) => api.get('/api/assignments/platform/masterlist', { params }),
};

export const replacementAPI = {
  getAll: (params) => api.get('/api/replacements', { params }),
  create: (data) => api.post('/api/replacements', data),
};

export const removalAPI = {
  getAll: (params) => api.get('/api/removals', { params }),
  create: (data) => api.post('/api/removals', data),
};

export const renewalAPI = {
  getAll: (params) => api.get('/api/renewals', { params }),
  getByClient: (clientId, params) => api.get(`/api/renewals/client/${clientId}`, { params }),
  renew: (id, data) => api.put(`/api/renewals/${id}/renew`, data),
  updateStatuses: () => api.post('/api/renewals/update-statuses'),
};

export const taskAPI = {
  getAll: (params) => api.get('/api/tasks', { params }),
  getById: (id) => api.get(`/api/tasks/${id}`),
  create: (data) => api.post('/api/tasks', data),
  update: (id, data) => api.put(`/api/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/tasks/${id}`),
};

export const scheduleAPI = {
  getAll: (params) => api.get('/api/schedules', { params }),
  create: (data) => api.post('/api/schedules', data),
  update: (id, data) => api.put(`/api/schedules/${id}`, data),
  delete: (id) => api.delete(`/api/schedules/${id}`),
  sendNotification: (id) => api.post(`/api/schedules/${id}/send-notification`),
};

export const staticDataAPI = {
  getAll: () => api.get('/api/static-data'),
  getByCategory: (category) => api.get(`/api/static-data/${category}`),
  create: (data) => api.post('/api/static-data', data),
  update: (id, data) => api.put(`/api/static-data/${id}`, data),
  delete: (id) => api.delete(`/api/static-data/${id}`),
};

export const analyticsAPI = {
  getDashboard: (params) => api.get('/api/analytics/dashboard', { params }),
  getMonthly: (year, month) => api.get('/api/analytics/monthly', { params: { year, month } }),
};

export const reportAPI = {
  getActivitySummary: (params) => api.get('/api/reports/activity-summary', { params }),
  exportInventory: (type) => api.get(`/api/reports/export/inventory`, { params: { type }, responseType: 'blob' }),
  exportMasterlist: (platform) => api.get(`/api/reports/export/masterlist`, { params: { platform }, responseType: 'blob' }),
  generateCertificate: (assignmentId) => api.post('/api/reports/generate-certificate', { assignmentId }),
};

export const uploadAPI = {
  devices: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/uploads/devices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  sims: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/uploads/sims', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getTemplate: (type) => api.get(`/api/uploads/template/${type}`, { responseType: 'blob' }),
};

export const userAPI = {
  getAll: () => api.get('/api/users'),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

export default api;
