import api from './api';

export const getDashboardSummary = async (params?: any) => {
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
};
