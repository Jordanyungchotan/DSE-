import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'
import type { LearningStatus, RankPosition, ScoreSource } from '@/shared/domain'
import type { 
  TransferAnalysisResultV2, 
  TransferAnalysisInputV2,
  TransferAnalysisResponseV2,
} from '../types/transferAnalysisV2'

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
  programme?: string  // 具体专业/课程名称
  programmeCode?: string  // 课程代码
  field?: string  // 专业领域
  matchScore?: number  // 综合匹配度
  academicScore?: number  // 学术匹配度
  personalScore?: number  // 特质匹配度
  riskLevel?: string  // 风险等级
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
  
  // ===== Transfer V2 专用状态 =====
  transferResultV2: TransferAnalysisResultV2 | null
  
  // 操作
  updateFormData: (data: Partial<StudentInfo>) => void
  resetFormData: () => void
  submitAnalysis: () => Promise<string>
  loadResult: (id: string) => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistoryItem: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // ===== Transfer V2 专用方法 =====
  /** 提交插班分析 V2（纯规则引擎） */
  submitTransferAnalysisV2: (payload: TransferAnalysisInputV2) => Promise<string>
  /** 提交插班分析 AI 增强（规则 + AI） */
  submitTransferAnalysisAI: (payload: TransferAnalysisInputV2) => Promise<string>
  /** 加载插班分析 V2 结果 */
  loadTransferResultV2: (id: string) => Promise<void>
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
      
      // ===== Transfer V2 初始状态 =====
      transferResultV2: null,

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
      /**
       * 提交插班分析
       * 【修复】从 /api/analysis/submit（不存在）改为 /api/transfer/analyze
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

          // 【修复】调用正确的后端接口 /api/transfer/analyze
          // 后端需要: { targetSchools, targetGrade?, languagePreference? }
          const requestBody = {
            targetSchools: formData.targetSchools,
            targetGrade: formData.grade,  // 映射 grade -> targetGrade
            // 可扩展: languagePreference, subjectStatuses 等
          }

          const response = await apiFetch('/api/transfer/analyze', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          })
          
          // 【加强】错误处理：检查 HTTP 状态
          if (!response.ok) {
            let errorMsg = `请求失败 (${response.status})`
            try {
              const errorData = await response.json()
              errorMsg = errorData.error || errorData.message || errorMsg
            } catch {
              // 可能返回 HTML 而非 JSON
              errorMsg = `接口返回异常 (${response.status})`
            }
            throw new Error(errorMsg)
          }
          
          const data = await response.json()
          
          // 【修复】后端返回 { success, data: { analysis_id, results, summary } }
          // 需要转换为前端期望的格式
          if (!data.success) {
            throw new Error(data.error || '分析失败')
          }

          // 【核心修复】从后端获取真实的 analysis_id，禁止前端自行生成
          const analysisId = data.data?.analysis_id
          if (!analysisId) {
            console.error('[Transfer] 后端未返回 analysis_id', data)
            throw new Error('分析创建失败：后端未返回有效的分析记录 ID')
          }
          
          const createdAt = new Date().toISOString()
          const backendResults = data.data?.results || []
          const backendSummary = data.data?.summary || {}
          
          // 计算综合风险评分（基于分析结果）
          const highRisk = backendSummary.highRisk || 0
          const mediumRisk = backendSummary.mediumRisk || 0
          const lowRisk = backendSummary.lowRisk || 0
          const total = highRisk + mediumRisk + lowRisk
          // 风险越高，可行性分数越低
          const feasibilityScore = total > 0 
            ? Math.round((lowRisk * 100 + mediumRisk * 60 + highRisk * 30) / total)
            : 50
          
          const summaryText = total > 0
            ? `共分析 ${total} 所目标学校，其中高风险 ${highRisk} 所，中风险 ${mediumRisk} 所，低风险 ${lowRisk} 所`
            : '暂无分析结果'

          // 构建兼容 AnalysisResult 的完整结构
          // FeasibilityLevel: 'A' | 'B' | 'C' | 'D' | 'E'
          const feasibilityLevel: FeasibilityLevel = 
            feasibilityScore >= 80 ? 'A' : 
            feasibilityScore >= 60 ? 'B' : 
            feasibilityScore >= 40 ? 'C' : 
            feasibilityScore >= 20 ? 'D' : 'E'
          
          const result: AnalysisResult = {
            id: analysisId,
            createdAt,
            studentInfo: formData,
            overallAssessment: {
              feasibilityScore,
              feasibilityLevel,
              levelDescription: feasibilityScore >= 70 ? '可行性较高' : feasibilityScore >= 40 ? '有一定风险' : '风险较高',
              summary: summaryText,
              keyStrengths: lowRisk > 0 ? [`${lowRisk} 所低风险学校可重点考虑`] : [],
              keyWeaknesses: highRisk > 0 ? [`${highRisk} 所高风险学校竞争激烈`] : [],
            },
            // 后端返回的学校分析结果转换为 schoolAssessments
            // 【修复】字段名必须与 SchoolAssessment 接口和 ResultPage 完全一致
            schoolAssessments: backendResults.map((school: any) => ({
              // 基础字段
              schoolName: school.school || school.schoolName || '未知学校',
              programme: school.programme ?? '',
              
              // 评分字段
              matchScore: school.matchScore ?? (school.riskLevel === 'low' ? 85 : school.riskLevel === 'medium' ? 60 : 35),
              
              // 风险/可行性字段
              feasibilityLevel: school.feasibilityLevel ?? (school.riskLevel === 'low' ? 'A' : school.riskLevel === 'medium' ? 'B' : 'C') as 'A' | 'B' | 'C' | 'D' | 'E',
              levelLabel: school.levelLabel ?? (school.riskLevel === 'low' ? '低风险' : school.riskLevel === 'medium' ? '中风险' : '高风险'),
              levelColor: school.levelColor ?? (school.riskLevel === 'low' ? 'success' : school.riskLevel === 'medium' ? 'warning' : 'error'),
              
              // ResultPage 必需的数组字段（必须有 fallback）
              requirements: school.requirements ?? school.notes ?? [],
              recommendations: school.recommendations ?? (school.riskLevel === 'low' ? ['可作为主要目标'] : ['谨慎考虑']),
              gaps: school.gaps ?? (school.riskLevel === 'high' ? ['竞争激烈', '名额有限'] : []),
            })),
            subjectAnalyses: [],  // 后端暂不返回科目分析
            studyPlan: {
              weeklySchedule: [],
              monthlyGoals: [],
              resources: [],
            },
            additionalAdvice: backendResults.length > 0 
              ? ['建议优先申请低风险学校作为保底', '高风险学校可作为冲刺目标']
              : [],
            disclaimer: data.data?.disclaimer || '此分析僅供參考，不構成任何錄取承諾',
          }

          set({
            currentResult: result,
            loading: false,
          })
          
          // 添加到历史记录
          const historyItem: HistoryItem = {
            id: result.id,
            createdAt: result.createdAt,
            studentInfo: formData,
            feasibilityScore: result.overallAssessment.feasibilityScore,
            summary: result.overallAssessment.summary,
          }
          
          set((state) => ({
            history: [historyItem, ...state.history],
          }))
          
          return result.id
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          console.error('[Transfer Analysis Error]', message)
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

      // =====================
      // Transfer V2 专用方法
      // =====================

      /**
       * 提交插班分析 V2（纯规则引擎）
       * 
       * POST /api/transfer/analyze/v2
       * - 使用后端返回的真实 analysis_id
       * - 保存完整 V2 结构到 store
       * - ❌ 禁止生成临时 ID
       * - ❌ 禁止复用 submitAnalysis（JUPAS）
       */
      submitTransferAnalysisV2: async (payload: TransferAnalysisInputV2): Promise<string> => {
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

          const response = await apiFetch('/api/transfer/analyze/v2', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          })
          
          // 严格错误处理
          if (!response.ok) {
            let errorMsg = `请求失败 (${response.status})`
            try {
              const errorData = await response.json()
              errorMsg = errorData.error || errorData.message || errorMsg
            } catch {
              errorMsg = `接口返回异常 (${response.status})`
            }
            throw new Error(errorMsg)
          }
          
          const data: TransferAnalysisResponseV2 = await response.json()
          
          if (!data.success || !data.data) {
            throw new Error(data.error || '分析失败')
          }

          // 【核心】从后端获取真实的 analysis_id
          const analysisId = data.data.analysis_id
          if (!analysisId) {
            console.error('[Transfer V2] 后端未返回 analysis_id', data)
            throw new Error('分析创建失败：后端未返回有效的分析记录 ID')
          }
          
          // 保存完整 V2 结果到 store
          set({
            transferResultV2: data.data.result,
            loading: false,
          })
          
          return analysisId
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          console.error('[Transfer V2 Error]', message)
          set({ loading: false, error: message })
          throw error
        }
      },

      /**
       * 提交插班分析 AI 增强（规则 + AI）
       * 
       * POST /api/transfer/analyze/ai
       * - 先执行 V2 规则分析
       * - 再调用 AI 增强（可选）
       * - AI 失败自动降级为纯规则结果
       * - ❌ 禁止生成临时 ID
       */
      submitTransferAnalysisAI: async (payload: TransferAnalysisInputV2): Promise<string> => {
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

          const response = await apiFetch('/api/transfer/analyze/ai', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          })
          
          // 严格错误处理
          if (!response.ok) {
            let errorMsg = `请求失败 (${response.status})`
            try {
              const errorData = await response.json()
              errorMsg = errorData.error || errorData.message || errorMsg
            } catch {
              errorMsg = `接口返回异常 (${response.status})`
            }
            throw new Error(errorMsg)
          }
          
          const data: TransferAnalysisResponseV2 = await response.json()
          
          if (!data.success || !data.data) {
            throw new Error(data.error || '分析失败')
          }

          // 【核心】从后端获取真实的 analysis_id
          const analysisId = data.data.analysis_id
          if (!analysisId) {
            console.error('[Transfer AI] 后端未返回 analysis_id', data)
            throw new Error('分析创建失败：后端未返回有效的分析记录 ID')
          }
          
          // 保存完整 V2 结果到 store（可能包含 AI 增强）
          set({
            transferResultV2: data.data.result,
            loading: false,
          })
          
          console.log('[Transfer AI] 分析完成，aiEnabled =', data.data.result.aiEnabled)
          
          return analysisId
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          console.error('[Transfer AI Error]', message)
          set({ loading: false, error: message })
          throw error
        }
      },

      /**
       * 加载插班分析 V2 结果
       * 
       * GET /api/analysis/result/:id
       * - 直接设置 transferResultV2
       * - 不做任何字段转换
       */
      loadTransferResultV2: async (id: string): Promise<void> => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiFetch(`/api/analysis/result/${id}`)
          
          if (!response.ok) {
            throw new Error('无法加载分析结果')
          }
          
          const data = await response.json()
          
          // 后端返回 { result: TransferAnalysisResultV2 }
          const result = data.result as TransferAnalysisResultV2
          
          // 验证是否为 V2 结构
          if (!result || result.meta?.version !== 'v2') {
            throw new Error('此分析记录不是 V2 格式')
          }
          
          set({
            transferResultV2: result,
            loading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
          throw error
        }
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
