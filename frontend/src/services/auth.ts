import api from './api';
import { UserLogin, LoginResponse, UserResponse } from '../types/auth';

export const login = async (data: UserLogin): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const getMe = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>('/auth/me');
  return response.data;
};
