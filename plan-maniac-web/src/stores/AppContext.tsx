import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, PlanItem } from '../types';
import { mockUser, mockPlans } from '../mock/data';

interface AppState {
  user: User | null;
  isLoggedIn: boolean;
  plans: PlanItem[];
  todayCompleted: boolean;
}

interface AppContextType extends AppState {
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  addPlan: (plan: PlanItem) => void;
  updatePlan: (id: string, updates: Partial<PlanItem>) => void;
  deletePlan: (id: string) => void;
  reorderPlans: (date: string, newOrder: PlanItem[]) => void;
  completeTodayPlans: () => void;
  addPoints: (amount: number) => void;
  getPlansForDate: (date: string) => PlanItem[];
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>(mockPlans);
  const [todayCompleted, setTodayCompleted] = useState(false);

  const login = useCallback((username: string, _password: string) => {
    // Demo: 任意账号密码都可登录
    setUser({ ...mockUser, username, nickname: username });
    setIsLoggedIn(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsLoggedIn(false);
    setTodayCompleted(false);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const addPlan = useCallback((plan: PlanItem) => {
    setPlans(prev => [...prev, plan]);
  }, []);

  const updatePlan = useCallback((id: string, updates: Partial<PlanItem>) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  const reorderPlans = useCallback((date: string, newOrder: PlanItem[]) => {
    setPlans(prev => {
      const otherPlans = prev.filter(p => p.date !== date);
      return [...otherPlans, ...newOrder];
    });
  }, []);

  const completeTodayPlans = useCallback(() => {
    setTodayCompleted(true);
  }, []);

  const addPoints = useCallback((amount: number) => {
    setUser(prev => prev ? { ...prev, points: prev.points + amount } : null);
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
      login,
      logout,
      updateUser,
      addPlan,
      updatePlan,
      deletePlan,
      reorderPlans,
      completeTodayPlans,
      addPoints,
      getPlansForDate,
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
