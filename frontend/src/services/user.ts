import api from './api';

export const getUsers = async (skip = 0, limit = 100) => {
  const response = await api.get('/users/', { params: { skip, limit } });
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await api.post('/users/', data);
  return response.data;
};

export const updateUser = async (id: number, data: any) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const changePassword = async (data: any) => {
  const response = await api.post('/auth/change-password', data);
  return response.data;
};
