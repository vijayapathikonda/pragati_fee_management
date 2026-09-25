import api from './api';

export const collectFee = async (data: any) => {
  const response = await api.post('/payments/collect', data);
  return response.data;
};

export const getStudentReceipts = async (studentId: number) => {
  const response = await api.get(`/payments/student/${studentId}`);
  return response.data;
};

export const cancelReceipt = async (receiptId: number, reason: string) => {
  const response = await api.post(`/payments/${receiptId}/cancel`, { reason });
  return response.data;
};
