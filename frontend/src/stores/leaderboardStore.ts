import { create } from 'zustand'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'

/**
 * DSE刷题排行榜系统 - 状态管理Store
 */

// ===== 类型定义 =====

/**
 * 排行榜类型
 */
export type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'all_time'

/**
 * 排名标准
 */
export type RankingCriteria = 'composite' | 'accuracy' | 'speed' | 'subject'

/**
 * 难度等级权重配置
 */
export const DIFFICULTY_WEIGHTS = {
  basic: { bonus: 0, standardTime: 30 },
  standard: { bonus: 5, standardTime: 45 },
  challenging: { bonus: 10, standardTime: 60 },
  exam: { bonus: 20, standardTime: 75 }
} as const

/**
 * 年级排名权重调整
 */
export const GRADE_RANKING_ADJUSTMENTS = {
  f4: { speedWeight: 0.15, accuracyWeight: 0.45, difficultyWeight: 0.25, consistencyWeight: 0.15 },
  f5: { speedWeight: 0.20, accuracyWeight: 0.40, difficultyWeight: 0.25, consistencyWeight: 0.15 },
  f6: { speedWeight: 0.25, accuracyWeight: 0.35, difficultyWeight: 0.25, consistencyWeight: 0.15 }
} as const

/**
 * 速度分类
 */
export const SPEED_CATEGORIES = {
  lightning: { maxTime: 15, name: '闪电侠', icon: '⚡', description: '思维敏捷，快速反应' },
  fast: { minTime: 15, maxTime: 30, name: '快速答题手', icon: '🏃', description: '速度与准确兼备' },
  average: { minTime: 30, maxTime: 60, name: '稳健型', icon: '📊', description: '稳扎稳打，保证正确率' },
  careful: { minTime: 60, name: '深思熟虑型', icon: '🤔', description: '仔细思考，追求完美' }
} as const

/**
 * 排行榜时间范围选项
 */
export const TIME_RANGE_OPTIONS = [
  { id: 'daily' as LeaderboardType, label: '今日', icon: '☀️' },
  { id: 'weekly' as LeaderboardType, label: '本周', icon: '📅' },
  { id: 'monthly' as LeaderboardType, label: '本月', icon: '🗓️' },
  { id: 'all_time' as LeaderboardType, label: '总榜', icon: '🏆' }
]

/**
 * 徽章接口
 */
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedDate: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/**
 * 排名条目接口
 */
export interface RankingEntry {
  rank: number
  userId: string
  displayName: string
  avatar?: string
  grade?: string
  school?: string
  
  // 分数信息
  totalScore: number
  accuracyScore: number
  speedScore: number
  difficultyBonus: number
  consistencyBonus: number
  activityBonus: number
  
  // 统计信息
  accuracy: number
  avgTimePerQuestion: number
  totalSessions: number
  totalQuestions: number
  
  // 变化信息
  rankChange?: number
  scoreChange?: number
  previousRank?: number
  
  // 徽章
  badges?: Badge[]
  
  // 隐私设置
  isAnonymous?: boolean
  hideSchool?: boolean
  
  // 标识
  isCurrentUser?: boolean
}

/**
 * 排行榜统计信息
 */
export interface LeaderboardStatistics {
  averageScore: number
  medianScore: number
  top10Average: number
  scoreDistribution: Array<{
    range: string
    count: number
    percentage: number
  }>
}

/**
 * 排行榜视图接口
 */
export interface LeaderboardView {
  id: string
  type: LeaderboardType
  name: string
  description: string
  icon: string
  
  // 筛选条件
  filters: {
    subject?: string
    grade?: string
    difficulty?: string
    timeRange?: {
      start: string
      end: string
    }
  }
  
  // 数据
  rankings: RankingEntry[]
  totalParticipants: number
  userPosition?: number
  userRank?: RankingEntry
  
  // 统计
  statistics?: LeaderboardStatistics
  
  // 更新时间
  lastUpdated: string
  nextUpdate?: string
  
  // 分页
  pagination: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
  }
}

/**
 * 用户排名统计
 */
export interface UserRankingStats {
  totalSessions: number
  totalQuestions: number
  correctAnswers: number
  totalTimeSpent: number
  averageAccuracy: number
  averageTimePerQuestion: number
  currentStreak: number
  longestStreak: number
  perfectSessions: number
  activityLevel: 'low' | 'medium' | 'high' | 'excellent'
  recentScores: number[]
}

/**
 * 排名评分结果
 */
export interface RankingScore {
  accuracyScore: number
  speedScore: number
  difficultyBonus: number
  consistencyBonus: number
  activityBonus: number
  totalScore: number
}

/**
 * Store状态接口
 */
interface LeaderboardState {
  // 当前排行榜
  currentLeaderboard: LeaderboardView | null
  
  // 用户排名
  userRank: RankingEntry | null
  userStats: UserRankingStats | null
  
  // 筛选条件
  filters: {
    type: LeaderboardType
    criteria: RankingCriteria
    subject: string
    grade: string
    difficulty: string
  }
  
  // 状态
  loading: boolean
  error: string | null
  
  // 操作
  fetchLeaderboard: (options?: Partial<LeaderboardState['filters']>) => Promise<void>
  fetchUserRank: () => Promise<void>
  updateFilters: (filters: Partial<LeaderboardState['filters']>) => void
  calculateRankingScore: (session: QuizSessionData, userStats: UserRankingStats) => RankingScore
  setError: (error: string | null) => void
}

/**
 * 刷题会话数据（用于计算排名）
 */
interface QuizSessionData {
  accuracy: number
  totalTime: number
  questionCount: number
  difficulty: string
}

// 默认筛选条件
const defaultFilters = {
  type: 'weekly' as LeaderboardType,
  criteria: 'composite' as RankingCriteria,
  subject: 'all',
  grade: 'all',
  difficulty: 'all'
}

/**
 * 计算速度得分
 */
function calculateSpeedScore(avgTime: number, difficulty: string): number {
  const standardTimes: Record<string, number> = {
    basic: 30,
    standard: 45,
    challenging: 60,
    exam: 75
  }
  
  const standardTime = standardTimes[difficulty] || 45
  
  if (avgTime <= standardTime * 0.5) return 20
  if (avgTime <= standardTime * 0.8) return 15
  if (avgTime <= standardTime) return 10
  if (avgTime <= standardTime * 1.5) return 5
  return 0
}

/**
 * 计算难度加成
 */
function calculateDifficultyBonus(difficulty: string): number {
  const bonuses: Record<string, number> = {
    basic: 0,
    standard: 5,
    challenging: 10,
    exam: 20
  }
  return bonuses[difficulty] || 0
}

/**
 * 计算稳定性加成
 */
function calculateConsistencyBonus(recentScores: number[]): number {
  if (recentScores.length < 5) return 0
  
  const scores = recentScores.slice(0, 5)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  
  if (stdDev < 5) return 10
  if (stdDev < 10) return 7
  if (stdDev < 15) return 4
  return 0
}

/**
 * 计算活跃度加成
 */
function calculateActivityBonus(activityLevel: string): number {
  const bonuses: Record<string, number> = {
    low: 0,
    medium: 3,
    high: 6,
    excellent: 10
  }
  return bonuses[activityLevel] || 0
}

/**
 * 排行榜状态管理Store
 */
export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  // 初始状态
  currentLeaderboard: null,
  userRank: null,
  userStats: null,
  filters: { ...defaultFilters },
  loading: false,
  error: null,

  /**
   * 获取排行榜数据
   */
  fetchLeaderboard: async (options = {}) => {
    const { filters } = get()
    const mergedFilters = { ...filters, ...options }
    
    set({ loading: true, error: null, filters: mergedFilters })

    try {
      const params = new URLSearchParams()
      params.set('type', mergedFilters.type)
      params.set('criteria', mergedFilters.criteria)
      if (mergedFilters.subject !== 'all') params.set('subject', mergedFilters.subject)
      if (mergedFilters.grade !== 'all') params.set('grade', mergedFilters.grade)
      if (mergedFilters.difficulty !== 'all') params.set('difficulty', mergedFilters.difficulty)

      const token = useAuthStore.getState().token
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await apiFetch(`/api/leaderboard?${params.toString()}`, { headers })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取排行榜失败')
      }

      const data = await response.json()

      set({
        currentLeaderboard: data.leaderboard,
        userRank: data.userRank || null,
        loading: false
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      set({ loading: false, error: message })
    }
  },

  /**
   * 获取用户排名详情
   */
  fetchUserRank: async () => {
    const { isAuthenticated, token } = useAuthStore.getState()
    if (!isAuthenticated || !token) {
      set({ userRank: null, userStats: null })
      return
    }

    set({ loading: true })

    try {
      const response = await apiFetch('/api/leaderboard/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('获取用户排名失败')
      }

      const data = await response.json()

      set({
        userRank: data.userRank,
        userStats: data.userStats,
        loading: false
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      set({ loading: false, error: message })
    }
  },

  /**
   * 更新筛选条件
   */
  updateFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  /**
   * 计算排名评分
   */
  calculateRankingScore: (session: QuizSessionData, userStats: UserRankingStats): RankingScore => {
    // 1. 正确率得分（0-40分）
    const accuracyScore = Math.min(session.accuracy * 40, 40)
    
    // 2. 速度得分（0-20分）
    const avgTimePerQuestion = session.totalTime / session.questionCount
    const speedScore = calculateSpeedScore(avgTimePerQuestion, session.difficulty)
    
    // 3. 难度加成（0-20分）
    const difficultyBonus = calculateDifficultyBonus(session.difficulty)
    
    // 4. 稳定性加成（0-10分）
    const consistencyBonus = calculateConsistencyBonus(userStats.recentScores)
    
    // 5. 活跃度加成（0-10分）
    const activityBonus = calculateActivityBonus(userStats.activityLevel)
    
    // 6. 计算总分
    const totalScore = accuracyScore + speedScore + difficultyBonus + consistencyBonus + activityBonus

    return {
      accuracyScore,
      speedScore,
      difficultyBonus,
      consistencyBonus,
      activityBonus,
      totalScore
    }
  },

  /**
   * 设置错误信息
   */
  setError: (error) => {
    set({ error })
  }
}))


