import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    // Handle unauthorized, maybe redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export const getFileUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  // Static assets bundled with the frontend (e.g. /students/*.jpeg in public directory)
  if (path.startsWith('/students/') || path.startsWith('students/')) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  const baseURL = (import.meta as any).env.VITE_API_BASE_URL || '/api';
  if (baseURL.startsWith('http')) {
    const url = new URL(baseURL);
    return `${url.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  
  return path;
};

export default api;
