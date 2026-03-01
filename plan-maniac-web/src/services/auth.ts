import apiClient from './client';

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    nickname: string;
    email: string;
    avatar: string | null;
    points: number;
  };
}

export const authApi = {
  register: async (params: RegisterParams): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/register', params);
    return res.data;
  },

  login: async (params: LoginParams): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/login', params);
    return res.data;
  },
};
