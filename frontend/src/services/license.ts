import api from './api';

export interface LicenseInfo {
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TAMPERED' | 'UNLICENSED';
  message: string;
  days_remaining: number;
  hours_remaining: number;
  expires_at: string | null;
  issued_at: string | null;
  school_name: string | null;
  server_id: string | null;
  current_server_id: string;
  is_write_allowed: boolean;
}

export const getLicenseStatus = async (): Promise<LicenseInfo> => {
  const response = await api.get('/license/status');
  return response.data;
};

export const getServerFingerprint = async (): Promise<{ server_id: string }> => {
  const response = await api.get('/license/fingerprint');
  return response.data;
};

export const uploadLicenseFile = async (file: File): Promise<{ message: string; license: LicenseInfo }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/license/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
