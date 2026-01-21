import { create } from 'zustand'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'

/**
 * 学习排行榜系统 - 状态管理Store
 * 
 * 规则：
 * - 排行榜基于学习行为（刷题数、正确率、速度）
 * - 与积分系统完全解耦
 * - 所有排名计算在后端完成
 * - 前端只负责请求 API 和存储数据
 */

// ===== 类型定义 =====

export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';

/**
 * 学习排行榜条目
 */
export interface LearningLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  quizCount: number;
  accuracy?: number;
  avgTime?: number;
  isCurrentUser?: boolean;
}

/**
 * 学习排行榜响应
 */
export interface LearningLeaderboardResponse {
  metric: LeaderboardMetric;
  range: LeaderboardRange;
  subject: LeaderboardSubject;
  entries: LearningLeaderboardEntry[];
  myRank?: LearningLeaderboardEntry;
  totalParticipants: number;
  lastUpdated: string;
}

/**
 * 用户学习统计
 */
export interface UserLearningStats {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  currentStreak: number;
  longestStreak: number;
  perfectSessions: number;
  recentScores: number[];
}

/**
 * 排行榜筛选选项
 */
export const METRIC_OPTIONS = [
  { id: 'QUIZ_COUNT' as LeaderboardMetric, label: '刷题数量', icon: '📊' },
  { id: 'ACCURACY' as LeaderboardMetric, label: '正确率', icon: '🎯' },
  { id: 'SPEED' as LeaderboardMetric, label: '答题速度', icon: '⚡' },
];

export const RANGE_OPTIONS = [
  { id: 'DAY' as LeaderboardRange, label: '今日', icon: '☀️' },
  { id: 'WEEK' as LeaderboardRange, label: '本周', icon: '📅' },
  { id: 'ALL' as LeaderboardRange, label: '总榜', icon: '🏆' },
];

export const SUBJECT_OPTIONS = [
  { id: 'ALL' as LeaderboardSubject, label: '全部科目' },
  { id: 'CHI' as LeaderboardSubject, label: '中文' },
  { id: 'ENG' as LeaderboardSubject, label: '英文' },
  { id: 'MATH' as LeaderboardSubject, label: '数学' },
  { id: 'PHYS' as LeaderboardSubject, label: '物理' },
  { id: 'CHEM' as LeaderboardSubject, label: '化学' },
  { id: 'BIO' as LeaderboardSubject, label: '生物' },
  { id: 'ECON' as LeaderboardSubject, label: '经济' },
  { id: 'HIST' as LeaderboardSubject, label: '历史' },
  { id: 'GEO' as LeaderboardSubject, label: '地理' },
];

/**
 * Store状态接口
 */
interface LeaderboardState {
  // 排行榜数据
  leaderboardData: LearningLeaderboardResponse | null;
  
  // 当前用户统计
  userStats: UserLearningStats | null;
  
  // 筛选条件
  filters: {
    metric: LeaderboardMetric;
    range: LeaderboardRange;
    subject: LeaderboardSubject;
  };
  
  // 状态
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchLeaderboard: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  updateFilters: (filters: Partial<LeaderboardState['filters']>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultFilters = {
  metric: 'QUIZ_COUNT' as LeaderboardMetric,
  range: 'ALL' as LeaderboardRange,
  subject: 'ALL' as LeaderboardSubject,
};

/**
 * 学习排行榜状态管理Store
 */
export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  // 初始状态
  leaderboardData: null,
  userStats: null,
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  /**
   * 获取学习排行榜数据
   */
  fetchLeaderboard: async () => {
    const { filters } = get();
    set({ loading: true, error: null });

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        metric: filters.metric,
        range: filters.range,
        subject: filters.subject,
        limit: '50',
      });

      const response = await apiFetch(`/api/leaderboard/learning?${params}`, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取排行榜失败');
      }

      const result = await response.json();
      
      if (result.code !== 0) {
        throw new Error(result.message || '获取排行榜失败');
      }

      set({
        leaderboardData: result.data,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      set({ loading: false, error: message });
    }
  },

  /**
   * 获取用户学习统计
   */
  fetchUserStats: async () => {
    const { isAuthenticated, token } = useAuthStore.getState();
    if (!isAuthenticated || !token) {
      set({ userStats: null });
      return;
    }

    try {
      const response = await apiFetch('/api/leaderboard/learning/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      if (result.code === 0 && result.data) {
        set({ userStats: result.data });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  },

  /**
   * 更新筛选条件并重新获取数据
   */
  updateFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // 自动重新获取数据
    get().fetchLeaderboard();
  },

  /**
   * 设置错误信息
   */
  setError: (error) => {
    set({ error });
  },

  /**
   * 重置状态
   */
  reset: () => {
    set({
      leaderboardData: null,
      userStats: null,
      filters: { ...defaultFilters },
      loading: false,
      error: null,
    });
  },
}));

// ===== 导出兼容类型（供旧代码过渡使用）=====

/** @deprecated 使用 LeaderboardMetric */
export type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'all_time';

/** @deprecated 使用 LeaderboardMetric */
export type RankingCriteria = 'composite' | 'accuracy' | 'speed' | 'subject';

/** @deprecated 使用 LearningLeaderboardEntry */
export interface RankingEntry extends LearningLeaderboardEntry {
  displayName: string;
  avatar?: string;
  totalScore: number;
  accuracyScore: number;
  speedScore: number;
  difficultyBonus: number;
  consistencyBonus: number;
  activityBonus: number;
  totalSessions: number;
  totalQuestions: number;
  rankChange?: number;
  scoreChange?: number;
  previousRank?: number;
  badges?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedDate: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  isAnonymous?: boolean;
  hideSchool?: boolean;
  grade?: string;
  school?: string;
}

/** @deprecated */
export const TIME_RANGE_OPTIONS = RANGE_OPTIONS;

/** @deprecated */
export const SPEED_CATEGORIES = {
  lightning: { maxTime: 15, name: '闪电侠', icon: '⚡', description: '思维敏捷，快速反应' },
  fast: { minTime: 15, maxTime: 30, name: '快速答题手', icon: '🏃', description: '速度与准确兼备' },
  average: { minTime: 30, maxTime: 60, name: '稳健型', icon: '📊', description: '稳扎稳打，保证正确率' },
  careful: { minTime: 60, name: '深思熟虑型', icon: '🤔', description: '仔细思考，追求完美' },
} as const;
