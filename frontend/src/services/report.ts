import api from './api';

export const getReport = async (reportType: string, params: any) => {
  const response = await api.get(`/reports/${reportType}`, { params });
  return response.data;
};

export const downloadReport = async (reportType: string, format: string, params: any) => {
  const downloadParams = { ...params, format };
  const response = await api.get(`/reports/${reportType}`, { 
    params: downloadParams,
    responseType: 'blob' 
  });
  
  // Trigger file download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  const contentDisposition = response.headers['content-disposition'];
  let filename = `report.${format}`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (filenameMatch && filenameMatch.length === 2) {
      filename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
