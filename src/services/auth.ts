import { api } from './api';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', { email, password });
    localStorage.setItem('token', response.access_token);
    return response;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
  
  getMe: (): Promise<UserResponse> => {
    return api.get<UserResponse>('/auth/me');
  },
  
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  }
};
