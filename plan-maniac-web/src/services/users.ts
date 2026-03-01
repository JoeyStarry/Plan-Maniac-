import apiClient from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  signature: string | null;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileParams {
  nickname?: string;
  avatar?: string;
  signature?: string;
}

export const usersApi = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/users/profile');
    return res.data;
  },

  updateProfile: async (params: UpdateProfileParams): Promise<UserProfile> => {
    const res = await apiClient.patch('/users/profile', params);
    return res.data;
  },
};
