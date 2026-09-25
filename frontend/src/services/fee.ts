import api from './api';

export const createFeeAssignment = async (data: any) => {
  const response = await api.post('/fee-assignments/', data);
  return response.data;
};

export const bulkCreateFeeAssignments = async (data: any) => {
  const response = await api.post('/fee-assignments/bulk', data);
  return response.data;
};

export const getStudentFees = async (studentId: number) => {
  const response = await api.get(`/fee-assignments/student/${studentId}`);
  return response.data;
};

export const updateFeeAssignment = async (id: number, data: any) => {
  const response = await api.put(`/fee-assignments/${id}`, data);
  return response.data;
};

export const deleteFeeAssignment = async (id: number) => {
  const response = await api.delete(`/fee-assignments/${id}`);
  return response.data;
};

export const getGradeFeeStatus = async (academicYearId: number, gradeId: number, feeCategoryId: number) => {
  const response = await api.get('/fee-assignments/grade-status', {
    params: {
      academic_year_id: academicYearId,
      grade_id: gradeId,
      fee_category_id: feeCategoryId,
    },
  });
  return response.data;
};

export const batchAssignFees = async (data: any) => {
  const response = await api.post('/fee-assignments/batch-assign', data);
  return response.data;
};
