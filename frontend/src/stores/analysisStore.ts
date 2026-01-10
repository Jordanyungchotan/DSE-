import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'

/**
 * 科目成绩接口
 */
export interface SubjectScore {
  subject: string      // 科目名称
  currentScore: string // 当前成绩/等级
  targetScore: string  // 目标成绩/等级
}

/**
 * 学生信息接口
 */
export interface StudentInfo {
  enrollmentDate: string      // 插班日期
  semester: string            // 学期
  grade: string               // 年级（中一至中六）
  age: number                 // 年龄
  currentSchool: string       // 当前学校
  subjects: SubjectScore[]    // 科目成绩列表
  targetSchools: string[]     // 目标学校
  notes: string               // 备注
  // 个人特质信息
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
 * 分析结果 - 学校评估
 */
export interface SchoolAssessment {
  schoolName: string
  admissionProbability: number
  requirements: string[]
  gaps: string[]
  recommendations: string[]
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
  subjects: [],
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
          
          const data = await response.json()
          set({
            history: data.history || [],
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

