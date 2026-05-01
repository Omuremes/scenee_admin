import { api, tokenStorage } from './api';

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
    tokenStorage.setTokens(response.access_token, response.refresh_token);
    return response;
  },

  logout: () => {
    tokenStorage.clear();
    window.location.href = '/login';
  },

  getMe: (): Promise<UserResponse> => api.get<UserResponse>('/auth/me'),

  isAuthenticated: (): boolean => !!tokenStorage.getAccess(),
};
