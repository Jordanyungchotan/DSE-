import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'
import type { LearningStatus, RankPosition, ScoreSource } from '@/shared/domain'

/**
 * 插班科目学习状态（核心输入结构）
 * 
 * 设计说明：
 * - status: 系统分析的唯一判断依据
 * - rankPosition: 可选辅助信息
 * - schoolScore: 仅供顾问参考，不参与系统分析
 */
export interface TransferSubjectInput {
  /** 科目 Key */
  subject: string

  /** 
   * 学习状态（系统分析主判断）
   * - strong: 明显跟得上 / 有优势
   * - ok: 勉强跟得上
   * - weak: 明显吃力
   */
  status: LearningStatus

  /**
   * 校内相对位置（可选辅助信息）
   * - top: 前 25%
   * - mid: 中间 50%
   * - bottom: 后 25%
   */
  rankPosition?: RankPosition

  // ===== 以下为顾问参考字段，不参与系统分析 =====

  /**
   * 校内成绩（0-100）
   * ⚠️ 仅供顾问/老师参考，不得用于系统分析或风险判断
   */
  schoolScore?: number

  /**
   * 成绩来源
   * - latest: 最近一次
   * - average: 学期平均
   */
  scoreSource?: ScoreSource
}

/**
 * 科目成绩接口（旧版，仅用于大学申请分析）
 * @deprecated 插班分析请使用 TransferSubjectInput
 */
export interface SubjectScore {
  subject: string      // 科目名称
  currentScore: string // 当前成绩/等级
  targetScore: string  // 目标成绩/等级
}

/**
 * 学生信息接口（插班分析 - 基于学习状态）
 * 
 * ⚠️ 重要：不再包含旧的 subjects / grades / level 字段
 * 后端会拒绝包含这些旧字段的请求
 */
export interface StudentInfo {
  enrollmentDate: string      // 插班日期
  semester: string            // 学期
  grade: string               // 年级（中一至中六）
  age: number                 // 年龄
  currentSchool: string       // 当前学校
  
  /**
   * 科目学习状态（插班分析核心输入）
   * 系统分析仅使用 status 字段
   */
  subjectStatuses: TransferSubjectInput[]
  
  targetSchools: string[]     // 目标学校
  notes: string               // 备注
  
  // 个人特质信息（可选）
  hobbies?: string[]          // 兴趣爱好
  strengths?: string[]        // 个人特长
  extracurriculars?: string[] // 课外活动
  achievements?: string       // 获奖经历
}

/**
 * 分析结果 - 科目分析
 */
export interface SubjectAnalysis {
  subject: string
  currentLevel: string
  targetLevel: string
  gap: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  estimatedTimeToImprove: string
}

/**
 * 可行性等级类型
 */
export type FeasibilityLevel = 'A' | 'B' | 'C' | 'D' | 'E'

/**
 * 可行性等级配置
 */
export const FEASIBILITY_LEVEL_CONFIG: Record<FeasibilityLevel, {
  label: string
  color: 'success' | 'processing' | 'warning' | 'error' | 'default'
  description: string
  actionText: string
}> = {
  'A': { 
    label: '可行性高', 
    color: 'success', 
    description: '条件匹配度良好，通过适当准备有较大机会',
    actionText: '建议立即准备申请材料'
  },
  'B': { 
    label: '可行性较高', 
    color: 'processing', 
    description: '基本符合要求，部分方面需加强',
    actionText: '建议针对性提升后申请'
  },
  'C': { 
    label: '可行性中等', 
    color: 'warning', 
    description: '存在一定差距，需要较长时间准备',
    actionText: '建议制定3-6个月提升计划'
  },
  'D': { 
    label: '可行性较低', 
    color: 'error', 
    description: '差距较大，需要显著提升或调整目标',
    actionText: '建议调整目标学校或长期准备'
  },
  'E': { 
    label: '可行性低', 
    color: 'default', 
    description: '当前条件与目标差距显著',
    actionText: '建议重新评估升学规划'
  },
}

/**
 * 分析结果 - 学校评估
 */
export interface SchoolAssessment {
  schoolName: string
  feasibilityLevel: FeasibilityLevel
  levelLabel: string
  levelColor: string
  requirements: string[]
  gaps: string[]
  recommendations: string[]
  // 兼容旧数据
  admissionProbability?: number
}

/**
 * 完整分析结果接口
 */
export interface AnalysisResult {
  id: string
  createdAt: string
  studentInfo: StudentInfo
  overallAssessment: {
    feasibilityScore: number
    feasibilityLevel?: FeasibilityLevel
    levelDescription?: string
    summary: string
    keyStrengths: string[]
    keyWeaknesses: string[]
  }
  subjectAnalyses: SubjectAnalysis[]
  schoolAssessments: SchoolAssessment[]
  studyPlan: {
    weeklySchedule: string[]
    monthlyGoals: string[]
    resources: string[]
  }
  additionalAdvice: string[]
  /** 免责声明 */
  disclaimer?: string
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  id: string
  createdAt: string
  studentInfo: StudentInfo
  feasibilityScore: number
  summary: string
}

/**
 * 分析状态接口
 */
interface AnalysisState {
  // 表单数据
  formData: StudentInfo
  
  // 分析结果
  currentResult: AnalysisResult | null
  
  // 历史记录
  history: HistoryItem[]
  
  // 状态
  loading: boolean
  error: string | null
  
  // 操作
  updateFormData: (data: Partial<StudentInfo>) => void
  resetFormData: () => void
  submitAnalysis: () => Promise<string>
  loadResult: (id: string) => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// 默认表单数据
const defaultFormData: StudentInfo = {
  enrollmentDate: '',
  semester: '',
  grade: '',
  age: 16,
  currentSchool: '',
  subjectStatuses: [],
  // 注意：不包含旧的 subjects 字段，后端会拒绝
  targetSchools: [],
  notes: '',
}

/**
 * 分析状态管理Store
 */
export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // 初始状态
      formData: { ...defaultFormData },
      currentResult: null,
      history: [],
      loading: false,
      error: null,

      /**
       * 更新表单数据
       */
      updateFormData: (data: Partial<StudentInfo>) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }))
      },

      /**
       * 重置表单数据
       */
      resetFormData: () => {
        set({ formData: { ...defaultFormData } })
      },

      /**
       * 提交分析请求
       * @returns 分析结果ID
       */
      submitAnalysis: async () => {
        const { formData } = get()
        set({ loading: true, error: null })
        
        try {
          // 获取 token 以关联用户
          const token = useAuthStore.getState().token
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await apiFetch('/api/analysis/submit', {
            method: 'POST',
            headers,
            body: JSON.stringify(formData),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || errorData.message || '分析请求失败')
          }
          
          const data = await response.json()
          set({
            currentResult: data.result,
            loading: false,
          })
          
          // 添加到历史记录
          const historyItem: HistoryItem = {
            id: data.result.id,
            createdAt: data.result.createdAt,
            studentInfo: formData,
            feasibilityScore: data.result.overallAssessment.feasibilityScore,
            summary: data.result.overallAssessment.summary,
          }
          
          set((state) => ({
            history: [historyItem, ...state.history],
          }))
          
          return data.result.id
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
          throw error
        }
      },

      /**
       * 加载分析结果
       */
      loadResult: async (id: string) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiFetch(`/api/analysis/result/${id}`)
          
          if (!response.ok) {
            throw new Error('无法加载分析结果')
          }
          
          const data = await response.json()
          set({
            currentResult: data.result,
            loading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
          throw error
        }
      },

      /**
       * 加载历史记录
       * 
       * API 契约: GET /api/analysis/history
       * 响应格式: { code: number, data: { history: HistoryItem[] }, message: string }
       */
      loadHistory: async () => {
        set({ loading: true, error: null })
        
        try {
          // 获取 token
          const token = useAuthStore.getState().token
          const headers: Record<string, string> = {}
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await apiFetch('/api/analysis/history', { headers })
          
          if (!response.ok) {
            throw new Error('无法加载历史记录')
          }
          
          const result = await response.json() as {
            code: number
            data: { history: HistoryItem[] }
            message: string
          }
          
          if (result.code !== 0) {
            throw new Error(result.message || '加载历史记录失败')
          }
          
          set({
            history: result.data.history,
            loading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
          throw error
        }
      },

      /**
       * 删除历史记录项
       */
      deleteHistoryItem: async (id: string) => {
        try {
          // 获取 token
          const token = useAuthStore.getState().token
          if (!token) {
            throw new Error('请先登录')
          }

          const response = await apiFetch(`/api/analysis/history/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || '删除失败')
          }
          
          set((state) => ({
            history: state.history.filter((item) => item.id !== id),
          }))
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ error: message })
          throw error
        }
      },

      /**
       * 设置加载状态
       */
      setLoading: (loading: boolean) => {
        set({ loading })
      },

      /**
       * 设置错误信息
       */
      setError: (error: string | null) => {
        set({ error })
      },
    }),
    {
      name: 'dse-analysis-storage',
      partialize: (state) => ({
        formData: state.formData,
        history: state.history,
      }),
    }
  )
)
