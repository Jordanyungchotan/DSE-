import { create } from 'zustand'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'

/**
 * 排行榜系统 - 状态管理Store
 * 
 * 支持两类排行榜：
 * A. 学习排行榜（核心）- 基于刷题行为
 * B. 激励排行榜（辅助）- 基于积分
 */

// ===== 学习排行榜类型 =====

export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';

// ===== 激励排行榜类型 =====

export type IncentiveLeaderboardType = 'POINTS_TOTAL' | 'POINTS_WEEKLY';

// ===== V2 排行榜类型（新增）=====

export type LeaderboardV2Type = 'points' | 'intensity' | 'accuracy' | 'streak' | 'module_mastery' | 'weekly_questions' | 'achievements';

export interface LeaderboardV2Entry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  score: number;
  detail?: string;
  isCurrentUser?: boolean;
}

export interface LeaderboardV2Response {
  type: LeaderboardV2Type;
  title?: string;
  rankings: LeaderboardV2Entry[];
  currentUserRank?: LeaderboardV2Entry & { percentile?: number };
  myRank?: LeaderboardV2Entry & { percentile: number };
  totalParticipants: number;
  lastUpdated: string;
}

// ===== 接口定义 =====

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
  effectiveQuizCount?: number;
}

/**
 * 我的排名信息（带分析）
 */
export interface MyRankInfo extends LearningLeaderboardEntry {
  percentile: number;
  gapToNext?: {
    metric: string;
    value: number;
  };
  strengths: string[];
  weaknesses: string[];
}

/**
 * 学习排行榜响应
 */
export interface LearningLeaderboardResponse {
  metric: LeaderboardMetric;
  range: LeaderboardRange;
  subject: LeaderboardSubject;
  entries: LearningLeaderboardEntry[];
  myRank?: MyRankInfo;
  totalParticipants: number;
  lastUpdated: string;
  antiCheatNotice?: string;
}

/**
 * 激励排行榜条目
 */
export interface IncentiveLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  totalPoints: number;
  weeklyPoints?: number;
  isCurrentUser?: boolean;
  isTopRanker?: boolean;
  privileges?: string[];
}

/**
 * 激励排行榜响应
 */
export interface IncentiveLeaderboardResponse {
  type: IncentiveLeaderboardType;
  entries: IncentiveLeaderboardEntry[];
  myRank?: IncentiveLeaderboardEntry & { percentile: number };
  totalParticipants: number;
  lastUpdated: string;
  topRankerPrivileges?: {
    rank: number;
    privileges: string[];
  }[];
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
  effectiveQuizzes: number;
  filteredQuizzes: number;
}

// ===== 筛选选项 =====

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

export const INCENTIVE_TYPE_OPTIONS = [
  { id: 'POINTS_TOTAL' as IncentiveLeaderboardType, label: '积分总榜', icon: '💰' },
  { id: 'POINTS_WEEKLY' as IncentiveLeaderboardType, label: '周积分榜', icon: '📈' },
];

// ===== V2 排行榜选项（新增）=====

export const V2_TYPE_OPTIONS = [
  { id: 'points' as LeaderboardV2Type, label: '积分', icon: '💰', color: '#faad14' },
  { id: 'intensity' as LeaderboardV2Type, label: '学习强度', icon: '🔥', color: '#ff4d4f' },
  { id: 'streak' as LeaderboardV2Type, label: '连续学习', icon: '📅', color: '#52c41a' },
  { id: 'achievements' as LeaderboardV2Type, label: '成就数量', icon: '🏆', color: '#722ed1' },
];

// ===== Store 状态接口 =====

interface LeaderboardState {
  // 当前排行榜类型
  leaderboardCategory: 'learning' | 'incentive' | 'v2';
  
  // 学习排行榜数据
  learningData: LearningLeaderboardResponse | null;
  
  // 激励排行榜数据
  incentiveData: IncentiveLeaderboardResponse | null;
  
  // V2 排行榜数据（新增）
  v2Data: LeaderboardV2Response | null;
  
  // 当前用户统计
  userStats: UserLearningStats | null;
  
  // 学习排行榜筛选
  learningFilters: {
    metric: LeaderboardMetric;
    range: LeaderboardRange;
    subject: LeaderboardSubject;
  };
  
  // 激励排行榜筛选
  incentiveFilters: {
    type: IncentiveLeaderboardType;
  };
  
  // V2 排行榜筛选（新增）
  v2Filters: {
    type: LeaderboardV2Type;
  };
  
  // 状态
  loading: boolean;
  error: string | null;
  
  // 操作
  setLeaderboardCategory: (category: 'learning' | 'incentive' | 'v2') => void;
  fetchLearningLeaderboard: () => Promise<void>;
  fetchIncentiveLeaderboard: () => Promise<void>;
  fetchV2Leaderboard: () => Promise<void>;
  fetchUserStats: () => Promise<void>;
  updateLearningFilters: (filters: Partial<LeaderboardState['learningFilters']>) => void;
  updateIncentiveFilters: (filters: Partial<LeaderboardState['incentiveFilters']>) => void;
  updateV2Filters: (filters: Partial<LeaderboardState['v2Filters']>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultLearningFilters = {
  metric: 'QUIZ_COUNT' as LeaderboardMetric,
  range: 'ALL' as LeaderboardRange,
  subject: 'ALL' as LeaderboardSubject,
};

const defaultIncentiveFilters = {
  type: 'POINTS_TOTAL' as IncentiveLeaderboardType,
};

const defaultV2Filters = {
  type: 'points' as LeaderboardV2Type,
};

/**
 * 排行榜状态管理Store
 */
export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  // 初始状态
  leaderboardCategory: 'v2',  // 默认使用 V2 排行榜
  learningData: null,
  incentiveData: null,
  v2Data: null,
  userStats: null,
  learningFilters: { ...defaultLearningFilters },
  incentiveFilters: { ...defaultIncentiveFilters },
  v2Filters: { ...defaultV2Filters },
  loading: false,
  error: null,

  /**
   * 设置当前排行榜类别
   */
  setLeaderboardCategory: (category) => {
    set({ leaderboardCategory: category });
    // 自动加载对应数据
    if (category === 'learning') {
      get().fetchLearningLeaderboard();
    } else if (category === 'incentive') {
      get().fetchIncentiveLeaderboard();
    } else {
      get().fetchV2Leaderboard();
    }
  },

  /**
   * 获取学习排行榜数据
   */
  fetchLearningLeaderboard: async () => {
    const { learningFilters } = get();
    set({ loading: true, error: null });

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        metric: learningFilters.metric,
        range: learningFilters.range,
        subject: learningFilters.subject,
        limit: '50',
      });

      const response = await apiFetch(`/api/leaderboard/learning?${params}`, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取学习排行榜失败');
      }

      const result = await response.json();
      
      if (result.code !== 0) {
        throw new Error(result.message || '获取学习排行榜失败');
      }

      set({
        learningData: result.data,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      set({ loading: false, error: message });
    }
  },

  /**
   * 获取激励排行榜数据
   */
  fetchIncentiveLeaderboard: async () => {
    const { incentiveFilters } = get();
    set({ loading: true, error: null });

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        type: incentiveFilters.type,
        limit: '50',
      });

      const response = await apiFetch(`/api/leaderboard/incentive?${params}`, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取积分排行榜失败');
      }

      const result = await response.json();
      
      if (result.code !== 0) {
        throw new Error(result.message || '获取积分排行榜失败');
      }

      set({
        incentiveData: result.data,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      set({ loading: false, error: message });
    }
  },

  /**
   * 获取 V2 排行榜数据（新增）
   */
  fetchV2Leaderboard: async () => {
    const { v2Filters } = get();
    set({ loading: true, error: null });

    try {
      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        type: v2Filters.type,
        limit: '50',
      });

      const response = await apiFetch(`/api/leaderboard/v2?${params}`, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取排行榜失败');
      }

      const result = await response.json();
      
      if (result.code !== 0) {
        throw new Error(result.message || '获取排行榜失败');
      }

      set({
        v2Data: result.data,
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
   * 更新学习排行榜筛选条件
   */
  updateLearningFilters: (newFilters) => {
    set((state) => ({
      learningFilters: { ...state.learningFilters, ...newFilters },
    }));
    get().fetchLearningLeaderboard();
  },

  /**
   * 更新激励排行榜筛选条件
   */
  updateIncentiveFilters: (newFilters) => {
    set((state) => ({
      incentiveFilters: { ...state.incentiveFilters, ...newFilters },
    }));
    get().fetchIncentiveLeaderboard();
  },

  /**
   * 更新 V2 排行榜筛选条件（新增）
   */
  updateV2Filters: (newFilters) => {
    set((state) => ({
      v2Filters: { ...state.v2Filters, ...newFilters },
    }));
    get().fetchV2Leaderboard();
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
      leaderboardCategory: 'v2',
      learningData: null,
      incentiveData: null,
      v2Data: null,
      userStats: null,
      learningFilters: { ...defaultLearningFilters },
      incentiveFilters: { ...defaultIncentiveFilters },
      v2Filters: { ...defaultV2Filters },
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
