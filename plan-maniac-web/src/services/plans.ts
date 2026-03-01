import apiClient from './client';

export interface PlanItem {
  id: string;
  content: string;
  order: number;
  color: 'red' | 'yellow' | 'white';
  completed: boolean;
  source: 'user' | 'pico';
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  categoryId?: string | null;
}

export interface CreatePlanParams {
  content: string;
  date: string;
  color?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  categoryId?: string;
}

export interface UpdatePlanParams {
  content?: string;
  color?: string;
  completed?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  order?: number;
}

export const plansApi = {
  getAll: async (date?: string): Promise<PlanItem[]> => {
    const res = await apiClient.get('/plans', { params: { date } });
    return res.data;
  },

  create: async (params: CreatePlanParams): Promise<PlanItem> => {
    const res = await apiClient.post('/plans', params);
    return res.data;
  },

  update: async (id: string, params: UpdatePlanParams): Promise<PlanItem> => {
    const res = await apiClient.patch(`/plans/${id}`, params);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/plans/${id}`);
  },

  reorder: async (date: string, orderData: { id: string; order: number }[]): Promise<void> => {
    await apiClient.post('/plans/reorder', { date, orderData });
  },
};
