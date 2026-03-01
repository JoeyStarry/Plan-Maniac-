// 用户类型
export interface User {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  signature: string;
  points: number;
  createdAt: string;
}

// 计划项类型
export interface PlanItem {
  id: string;
  content: string;
  order: number;
  color: 'red' | 'yellow' | 'white';
  completed: boolean;
  source: 'user' | 'pico'; // 区分用户自建和Pico生成
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm 如 "09:00"
  endTime?: string;   // HH:mm 如 "10:30"
  description?: string; // 计划详情备注
  createdAt: string;
}

// 当日计划完成状态
export interface DayStatus {
  date: string; // YYYY-MM-DD
  allCompleted: boolean;
  planCount: number;
  completedCount: number;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'pico';
  content: string;
  type: 'text' | 'image' | 'voice';
  imageUrl?: string;
  timestamp: string;
}

// 计划分类
export interface PlanCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  size: 'large' | 'medium' | 'small';
}

// 名言类型
export interface Quote {
  text: string;
  author: string;
  backgroundImage: string;
}
