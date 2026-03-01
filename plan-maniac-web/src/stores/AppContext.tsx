import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, PlanItem } from '../types';
import { authApi } from '../services/auth';
import { plansApi } from '../services/plans';
import { usersApi } from '../services/users';
import { pointsApi } from '../services/points';

interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  plans: PlanItem[];
  todayCompleted: boolean;
  loading: boolean;
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  addPlan: (plan: Omit<PlanItem, 'id' | 'createdAt' | 'userId' | 'updatedAt'>) => Promise<PlanItem | null>;
  updatePlan: (id: string, updates: Partial<PlanItem>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  reorderPlans: (date: string, newOrder: PlanItem[]) => Promise<void>;
  completeTodayPlans: () => void;
  addPoints: (amount: number, reason?: string) => Promise<void>;
  getPlansForDate: (date: string) => PlanItem[];
  fetchPlansForDate: (date: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('access_token'));
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  // On mount, if token exists reload profile from server
  useEffect(() => {
    if (isLoggedIn) {
      usersApi.getProfile().then((profile) => {
        const u: User = {
          id: profile.id,
          username: profile.username,
          nickname: profile.nickname || profile.username,
          email: profile.email,
          avatar: profile.avatar || '',
          signature: profile.signature || '',
          points: profile.points,
          createdAt: profile.createdAt,
        };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      }).catch(() => {
        // Token invalid — force logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUser(null);
      });
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.login({ username, password });
      localStorage.setItem('access_token', res.access_token);
      const u: User = {
        id: res.user.id,
        username: res.user.username,
        nickname: res.user.nickname || res.user.username,
        email: res.user.email,
        avatar: res.user.avatar || '',
        signature: '',
        points: res.user.points,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      setIsLoggedIn(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.register({ username, email, password });
      localStorage.setItem('access_token', res.access_token);
      const u: User = {
        id: res.user.id,
        username: res.user.username,
        nickname: res.user.nickname || res.user.username,
        email: res.user.email,
        avatar: res.user.avatar || '',
        signature: '',
        points: res.user.points,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('user', JSON.stringify(u));
      setUser(u);
      setIsLoggedIn(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    setPlans([]);
    setTodayCompleted(false);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const fetchPlansForDate = useCallback(async (date: string) => {
    try {
      setLoading(true);
      const fetched = await plansApi.getAll(date);
      setPlans(prev => {
        const otherDays = prev.filter(p => p.date !== date);
        const mapped = fetched.map(p => ({
          ...p,
          startTime: p.startTime ?? undefined,
          endTime: p.endTime ?? undefined,
          description: p.description ?? undefined,
        }));
        return [...otherDays, ...mapped];
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const addPlan = useCallback(async (planData: Omit<PlanItem, 'id' | 'createdAt' | 'userId' | 'updatedAt'>): Promise<PlanItem | null> => {
    try {
      const created = await plansApi.create({
        content: planData.content,
        date: planData.date,
        color: planData.color,
        startTime: planData.startTime,
        endTime: planData.endTime,
        description: planData.description,
      });
      const mapped: PlanItem = {
        ...created,
        startTime: created.startTime ?? undefined,
        endTime: created.endTime ?? undefined,
        description: created.description ?? undefined,
      };
      setPlans(prev => [...prev, mapped]);
      return mapped;
    } catch {
      return null;
    }
  }, []);

  const updatePlan = useCallback(async (id: string, updates: Partial<PlanItem>) => {
    try {
      const updated = await plansApi.update(id, {
        content: updates.content,
        color: updates.color,
        completed: updates.completed,
        startTime: updates.startTime ?? null,
        endTime: updates.endTime ?? null,
        description: updates.description ?? null,
        order: updates.order,
      });
      setPlans(prev => prev.map(p => p.id === id ? {
        ...p,
        ...updated,
        startTime: updated.startTime ?? undefined,
        endTime: updated.endTime ?? undefined,
        description: updated.description ?? undefined,
      } : p));
    } catch {
      // Optimistic update fallback
      setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    try {
      await plansApi.delete(id);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch {
      // ignore
    }
  }, []);

  const reorderPlans = useCallback(async (date: string, newOrder: PlanItem[]) => {
    // Optimistic update
    setPlans(prev => {
      const otherPlans = prev.filter(p => p.date !== date);
      return [...otherPlans, ...newOrder];
    });
    try {
      await plansApi.reorder(date, newOrder.map((p, i) => ({ id: p.id, order: i })));
    } catch {
      // ignore
    }
  }, []);

  const completeTodayPlans = useCallback(() => {
    setTodayCompleted(true);
  }, []);

  const addPoints = useCallback(async (amount: number, reason = '完成今日计划') => {
    try {
      await pointsApi.add(amount, reason);
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, points: prev.points + amount };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Optimistic fallback
      setUser(prev => prev ? { ...prev, points: prev.points + amount } : null);
    }
  }, []);

  const getPlansForDate = useCallback((date: string) => {
    return plans
      .filter(p => p.date === date)
      .sort((a, b) => a.order - b.order);
  }, [plans]);

  return (
    <AppContext.Provider value={{
      user,
      isLoggedIn,
      plans,
      todayCompleted,
      loading,
      login,
      register,
      logout,
      updateUser,
      addPlan,
      updatePlan,
      deletePlan,
      reorderPlans,
      completeTodayPlans,
      addPoints,
      getPlansForDate,
      fetchPlansForDate,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
