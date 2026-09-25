import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lightweight client-side cache & in-flight deduplication for master data and license status
const responseCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<AxiosResponse<any>>>();
const CACHE_TTL_MS = 45000; // 45 seconds

const isCacheableGet = (url?: string) => {
  if (!url) return false;
  return url.includes('/masters/') || url.includes('/license/status');
};

const buildCacheKey = (url: string, params?: any) => {
  return `${url}::${params ? JSON.stringify(params) : ''}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Invalidate cache on any write operation
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') {
    responseCache.clear();
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  const config = error.config;
  // Automatically retry idempotent GET requests up to 2 times on network errors or 5xx server errors
  if (
    config &&
    (!config.method || config.method.toLowerCase() === 'get') &&
    (!error.response || error.response.status >= 500)
  ) {
    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount < 2) {
      config.__retryCount += 1;
      const delayMs = config.__retryCount * 600;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }
  }

  if (error.response?.status === 401) {
    // Handle unauthorized, maybe redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// Wrap api.get with in-flight deduplication and 45s TTL caching for master/license endpoints
const originalGet = api.get.bind(api);
api.get = ((url: string, config?: any) => {
  if (isCacheableGet(url)) {
    const key = buildCacheKey(url, config?.params);
    const now = Date.now();
    const cached = responseCache.get(key);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config || {},
      } as AxiosResponse<any>);
    }
    const existingInFlight = inFlightRequests.get(key);
    if (existingInFlight) {
      return existingInFlight;
    }
    const reqPromise = originalGet(url, config)
      .then((res) => {
        responseCache.set(key, { data: res.data, timestamp: Date.now() });
        inFlightRequests.delete(key);
        return res;
      })
      .catch((err) => {
        inFlightRequests.delete(key);
        throw err;
      });
    inFlightRequests.set(key, reqPromise);
    return reqPromise;
  }
  return originalGet(url, config);
}) as typeof api.get;

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

