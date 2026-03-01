import apiClient from './client';

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  userId: string;
}

export const pointsApi = {
  getHistory: async (): Promise<PointTransaction[]> => {
    const res = await apiClient.get('/points/history');
    return res.data;
  },

  add: async (amount: number, reason: string): Promise<PointTransaction> => {
    const res = await apiClient.post('/points/add', { amount, reason });
    return res.data;
  },

  deduct: async (amount: number, reason: string): Promise<PointTransaction> => {
    const res = await apiClient.post('/points/deduct', { amount, reason });
    return res.data;
  },
};
