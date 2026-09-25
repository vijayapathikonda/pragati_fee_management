import api from './api';

export const getStudents = async (params: any) => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const getStudentById = async (id: number) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (data: any) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id: number, data: any) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const uploadStudentPhoto = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/students/${id}/photo`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const importStudents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/students/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const exportStudents = async (params: any) => {
  const response = await api.get('/students/export/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const deleteStudent = async (id: number) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};
