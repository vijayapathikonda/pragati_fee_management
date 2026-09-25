import api from './api';

export interface ArtifactField {
  key: string;
  label: string;
  type: string;
  default?: string;
}

export interface ArtifactSummary {
  id: string;
  title: string;
  category: string;
  filename: string;
  description: string;
  icon: string;
  type: 'student' | 'staff' | 'admin';
  fields: ArtifactField[];
  file_exists: boolean;
  file_size: number;
}

export interface ArtifactDetail extends ArtifactSummary {
  filepath: string;
  paragraphs: string[];
  raw_text: string;
}

export const getArtifacts = async (): Promise<ArtifactSummary[]> => {
  const response = await api.get('/artifacts');
  return response.data;
};

export const getArtifact = async (id: string): Promise<ArtifactDetail> => {
  const response = await api.get(`/artifacts/${id}`);
  return response.data;
};

export const downloadArtifact = async (id: string, filename: string) => {
  const response = await api.get(`/artifacts/${id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
