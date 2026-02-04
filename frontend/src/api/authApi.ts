import api from './client';
import { AuthUser } from '../features/auth/authSlice';

export type AuthResponse = {
  user: AuthUser;
  token: {
    accessToken: string;
    expiresIn: number;
  };
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
  return response.data;
};

export const register = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/register', { email, password, fullName });
  return response.data;
};

export const logout = async (): Promise<void> => {
  await api.post('/api/auth/logout');
};

export const me = async (): Promise<AuthResponse['user']> => {
  const response = await api.get<{ user: AuthUser }>('/api/auth/me');
  return response.data.user;
};
