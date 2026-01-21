import { create } from 'zustand'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'
import type { LeaderboardEntry, LeaderboardResponse } from '@/shared/domain'

/**
 * 积分排行榜系统 - 状态管理Store
 * 
 * 规则：
 * - 所有排名和分数计算都在后端完成
 * - 前端只负责请求 API 和存储数据
 * - UI 直接使用后端返回的数据，不做任何计算
 */

// ===== 类型定义 =====

/**
 * 排行榜时间范围选项（用于 UI 显示）
 */
export const TIME_RANGE_OPTIONS = [
  { id: 'all_time' as const, label: '总榜', icon: '🏆' },
]

/**
 * 速度分类（仅用于 UI 显示，不参与计算）
 */
export const SPEED_CATEGORIES = {
  lightning: { maxTime: 15, name: '闪电侠', icon: '⚡', description: '思维敏捷，快速反应' },
  fast: { minTime: 15, maxTime: 30, name: '快速答题手', icon: '🏃', description: '速度与准确兼备' },
  average: { minTime: 30, maxTime: 60, name: '稳健型', icon: '📊', description: '稳扎稳打，保证正确率' },
  careful: { minTime: 60, name: '深思熟虑型', icon: '🤔', description: '仔细思考，追求完美' }
} as const

/**
 * Store状态接口
 */
interface LeaderboardState {
  // 排行榜数据（直接使用后端返回的结构）
  leaderboardData: LeaderboardResponse | null
  
  // 当前用户排名
  currentUserRank: LeaderboardEntry | null
  
  // 状态
  loading: boolean
  error: string | null
  
  // 操作
  fetchLeaderboard: (limit?: number) => Promise<void>
  setError: (error: string | null) => void
  reset: () => void
}

/**
 * 排行榜状态管理Store
 * 
 * 简化版：
 * - 移除所有前端计算逻辑
 * - 直接使用后端返回的 LeaderboardResponse
 * - 不做排名、分数计算
 */
export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  // 初始状态
  leaderboardData: null,
  currentUserRank: null,
  loading: false,
  error: null,

  /**
   * 获取排行榜数据（直接调用后端 API）
   */
  fetchLeaderboard: async (limit = 50) => {
    set({ loading: true, error: null })

    try {
      const token = useAuthStore.getState().token
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await apiFetch(`/api/points/leaderboard?limit=${limit}`, { headers })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '获取排行榜失败')
      }

      const result = await response.json()
      
      if (result.code !== 0) {
        throw new Error(result.message || '获取排行榜失败')
      }

      // 直接使用后端返回的数据
      const data: LeaderboardResponse = result.data

      set({
        leaderboardData: data,
        currentUserRank: data.currentUserRank || null,
        loading: false
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      set({ loading: false, error: message })
    }
  },

  /**
   * 设置错误信息
   */
  setError: (error) => {
    set({ error })
  },

  /**
   * 重置状态
   */
  reset: () => {
    set({
      leaderboardData: null,
      currentUserRank: null,
      loading: false,
      error: null,
    })
  }
}))

// ===== 导出兼容类型（供旧代码过渡使用）=====

/**
 * @deprecated 使用 LeaderboardEntry from shared/domain
 */
export interface RankingEntry extends LeaderboardEntry {
  // 兼容旧字段
  displayName: string
  avatar?: string
  totalScore: number
  accuracy: number
  avgTimePerQuestion: number
  totalSessions: number
  totalQuestions: number
  rankChange?: number
  scoreChange?: number
  previousRank?: number
  badges?: Array<{
    id: string
    name: string
    description: string
    icon: string
    earnedDate: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  }>
  isAnonymous?: boolean
  hideSchool?: boolean
  grade?: string
  school?: string
}

/**
 * @deprecated 使用 LeaderboardResponse from shared/domain
 */
export interface LeaderboardView {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'all_time'
  name: string
  description: string
  icon: string
  filters: {
    subject?: string
    grade?: string
    difficulty?: string
    timeRange?: {
      start: string
      end: string
    }
  }
  rankings: RankingEntry[]
  totalParticipants: number
  userPosition?: number
  userRank?: RankingEntry
  statistics?: {
    averageScore: number
    medianScore: number
    top10Average: number
    scoreDistribution: Array<{
      range: string
      count: number
      percentage: number
    }>
  }
  lastUpdated: string
  nextUpdate?: string
  pagination: {
    currentPage: number
    totalPages: number
    pageSize: number
    totalItems: number
  }
}

// 保留类型导出以兼容旧代码
export type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'all_time'
export type RankingCriteria = 'composite' | 'accuracy' | 'speed' | 'subject'
