import api from './api';

export const getSettings = async (group: string) => {
  const response = await api.get(`/admin/settings/${group}`);
  return response.data;
};

export const updateSettings = async (group: string, settings: any) => {
  const response = await api.put(`/admin/settings/${group}`, { settings });
  return response.data;
};

export const getAuditLogs = async (skip = 0, limit = 100) => {
  const response = await api.get('/admin/audit-logs', { params: { skip, limit } });
  return response.data;
};

export const triggerBackup = async () => {
  const response = await api.post('/admin/backup', {}, { responseType: 'blob' });
  
  // Trigger file download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'uploads_backup.zip');
  document.body.appendChild(link);
  link.click();
  link.remove();
};
