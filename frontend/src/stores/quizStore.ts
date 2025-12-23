import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '../config/api'
import { useAuthStore } from './authStore'

/**
 * DSE智能刷题系统 - 状态管理Store
 */

// ===== 类型定义 =====

/**
 * 支持的科目类型
 */
export const SUPPORTED_SUBJECTS = {
  CORE: [
    { id: 'chinese', name: '中国语文', icon: '📚' },
    { id: 'english', name: '英国语文', icon: '🇬🇧' },
    { id: 'math', name: '数学', icon: '🔢' },
    { id: 'ls', name: '公民与社会发展科', icon: '🌍' }
  ],
  SCIENCE_ELECTIVES: [
    { id: 'physics', name: '物理', icon: '⚛️' },
    { id: 'chemistry', name: '化学', icon: '🧪' },
    { id: 'biology', name: '生物', icon: '🧬' },
    { id: 'combined_science', name: '组合科学', icon: '🧫' }
  ],
  ARTS_ELECTIVES: [
    { id: 'economics', name: '经济', icon: '💰' },
    { id: 'geography', name: '地理', icon: '🗺️' },
    { id: 'history', name: '历史', icon: '📜' },
    { id: 'chinese_history', name: '中国历史', icon: '🏮' }
  ]
} as const

/**
 * 年级选项
 */
export const GRADE_LEVELS = [
  { id: 'f4', name: '中四', description: 'DSE第一年课程' },
  { id: 'f5', name: '中五', description: 'DSE第二年课程' },
  { id: 'f6', name: '中六', description: 'DSE第三年/应考年' }
] as const

/**
 * 难度级别
 */
export const DIFFICULTY_LEVELS = [
  { id: 'basic', name: '基础', description: '基础知识巩固', targetAccuracy: '>80%', color: '#52c41a' },
  { id: 'standard', name: '标准', description: '常规练习难度', targetAccuracy: '60-80%', color: '#1890ff' },
  { id: 'challenging', name: '挑战', description: '能力提升训练', targetAccuracy: '40-60%', color: '#fa8c16' },
  { id: 'exam', name: '考试难度', description: 'DSE真题模拟', targetAccuracy: '30-50%', color: '#f5222d' }
] as const

/**
 * 题目数量选项
 */
export const QUESTION_COUNT_OPTIONS = [
  { value: 5, label: '快速练习', description: '5题' },
  { value: 10, label: '标准练习', description: '10题' },
  { value: 15, label: '深度练习', description: '15题' },
  { value: 20, label: '模拟测试', description: '20题' }
] as const

/**
 * 题目类型
 */
export type QuestionType = 'multiple_choice' | 'short_answer' | 'calculation' | 'explanation'

/**
 * 刷题配置接口
 */
export interface QuizConfig {
  grade: string
  subject: string
  difficulty: string
  questionCount: number
  timeLimit?: number // 分钟
}

/**
 * 生成的题目接口
 */
export interface GeneratedQuestion {
  id: string
  question: string
  questionType: QuestionType
  options?: string[]
  correctAnswer: string | number
  explanation: string
  topicTags: string[]
  estimatedTime: number // 秒
  difficultyScore: number // 1-10
  userAnswer?: string | number
  isCorrect?: boolean
  timeSpent?: number
}

/**
 * 刷题会话接口
 */
export interface QuizSession {
  id: string
  config: QuizConfig
  status: 'active' | 'completed' | 'paused'
  questions: GeneratedQuestion[]
  currentQuestionIndex: number
  startTime: string
  endTime?: string
  timeSpent: number // 秒
  score?: number
  accuracy?: number
}

/**
 * 刷题报告接口
 */
export interface QuizReport {
  sessionId: string
  completedAt: string
  totalTime: number
  scores: {
    totalQuestions: number
    correctAnswers: number
    accuracy: number
    grade: string
  }
  questionTypeAnalysis: Record<string, { attempted: number; correct: number }>
  detailedAnswers: Array<{
    questionId: string
    question: string
    userAnswer: string | number | undefined
    correctAnswer: string | number
    isCorrect: boolean
    explanation: string
  }>
  recommendations: string[]
}

/**
 * Store状态接口
 */
interface QuizState {
  // 配置
  config: QuizConfig

  // 当前会话
  currentSession: QuizSession | null

  // 报告
  currentReport: QuizReport | null

  // 历史记录
  quizHistory: Array<{
    id: string
    subject: string
    grade: string
    difficulty: string
    score: number
    accuracy: number
    completedAt: string
  }>

  // 状态
  loading: boolean
  generating: boolean
  error: string | null

  // 操作
  updateConfig: (config: Partial<QuizConfig>) => void
  resetConfig: () => void
  startQuiz: () => Promise<void>
  submitAnswer: (answer: string | number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  finishQuiz: () => Promise<void>
  pauseQuiz: () => void
  resumeQuiz: () => void
  generateReport: () => void
  loadQuizHistory: () => Promise<void>
  saveWrongQuestion: (question: GeneratedQuestion, userAnswer: string | number) => Promise<void>
  setError: (error: string | null) => void
  clearSession: () => void
}

// 默认配置
const defaultConfig: QuizConfig = {
  grade: 'f5',
  subject: 'math',
  difficulty: 'standard',
  questionCount: 10,
  timeLimit: undefined
}

/**
 * 刷题状态管理Store
 */
export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      // 初始状态
      config: { ...defaultConfig },
      currentSession: null,
      currentReport: null,
      quizHistory: [],
      loading: false,
      generating: false,
      error: null,

      /**
       * 更新刷题配置
       */
      updateConfig: (newConfig: Partial<QuizConfig>) => {
        set((state) => ({
          config: { ...state.config, ...newConfig }
        }))
      },

      /**
       * 重置配置
       */
      resetConfig: () => {
        set({ config: { ...defaultConfig } })
      },

      /**
       * 开始刷题 - 调用后端生成题目
       */
      startQuiz: async () => {
        const { config } = get()
        set({ loading: true, generating: true, error: null })

        try {
          const token = useAuthStore.getState().token
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await apiFetch('/api/quiz/start', {
            method: 'POST',
            headers,
            body: JSON.stringify(config)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || '开始刷题失败')
          }

          const data = await response.json()

          const session: QuizSession = {
            id: data.sessionId,
            config,
            status: 'active',
            questions: data.questions,
            currentQuestionIndex: 0,
            startTime: new Date().toISOString(),
            timeSpent: 0
          }

          set({
            currentSession: session,
            loading: false,
            generating: false
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, generating: false, error: message })
          throw error
        }
      },

      /**
       * 提交当前题目答案
       */
      submitAnswer: (answer: string | number) => {
        const { currentSession } = get()
        if (!currentSession) return

        const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex]
        if (!currentQuestion) return

        // 判断答案是否正确
        const isCorrect = String(answer).toLowerCase().trim() === 
                         String(currentQuestion.correctAnswer).toLowerCase().trim()

        // 更新题目状态
        const updatedQuestions = currentSession.questions.map((q, index) => {
          if (index === currentSession.currentQuestionIndex) {
            return {
              ...q,
              userAnswer: answer,
              isCorrect
            }
          }
          return q
        })

        set({
          currentSession: {
            ...currentSession,
            questions: updatedQuestions
          }
        })
      },

      /**
       * 下一题
       */
      nextQuestion: () => {
        const { currentSession } = get()
        if (!currentSession) return

        const nextIndex = currentSession.currentQuestionIndex + 1
        if (nextIndex < currentSession.questions.length) {
          set({
            currentSession: {
              ...currentSession,
              currentQuestionIndex: nextIndex
            }
          })
        }
      },

      /**
       * 上一题
       */
      previousQuestion: () => {
        const { currentSession } = get()
        if (!currentSession) return

        const prevIndex = currentSession.currentQuestionIndex - 1
        if (prevIndex >= 0) {
          set({
            currentSession: {
              ...currentSession,
              currentQuestionIndex: prevIndex
            }
          })
        }
      },

      /**
       * 结束刷题
       */
      finishQuiz: async () => {
        const { currentSession } = get()
        if (!currentSession) return

        set({ loading: true })

        try {
          // 计算成绩
          const answeredQuestions = currentSession.questions.filter(q => q.userAnswer !== undefined)
          const correctAnswers = answeredQuestions.filter(q => q.isCorrect).length
          const totalQuestions = currentSession.questions.length
          const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

          // 计算用时
          const startTime = new Date(currentSession.startTime).getTime()
          const endTime = Date.now()
          const timeSpent = Math.round((endTime - startTime) / 1000)

          // 更新会话
          const completedSession: QuizSession = {
            ...currentSession,
            status: 'completed',
            endTime: new Date().toISOString(),
            timeSpent,
            score: correctAnswers,
            accuracy
          }

          set({
            currentSession: completedSession,
            loading: false
          })

          // 保存到历史记录
          const token = useAuthStore.getState().token
          if (token) {
            try {
              await apiFetch('/api/quiz/save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sessionId: completedSession.id,
                  config: completedSession.config,
                  questions: completedSession.questions,
                  score: correctAnswers,
                  accuracy,
                  timeSpent
                })
              })
            } catch (e) {
              console.warn('保存刷题记录失败:', e)
            }
          }

          // 生成报告
          get().generateReport()
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
        }
      },

      /**
       * 暂停刷题
       */
      pauseQuiz: () => {
        const { currentSession } = get()
        if (!currentSession) return

        set({
          currentSession: {
            ...currentSession,
            status: 'paused'
          }
        })
      },

      /**
       * 继续刷题
       */
      resumeQuiz: () => {
        const { currentSession } = get()
        if (!currentSession) return

        set({
          currentSession: {
            ...currentSession,
            status: 'active'
          }
        })
      },

      /**
       * 生成刷题报告
       */
      generateReport: () => {
        const { currentSession } = get()
        if (!currentSession) return

        const totalQuestions = currentSession.questions.length
        const correctAnswers = currentSession.questions.filter(q => q.isCorrect).length
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

        // 计算等级
        let grade = 'F'
        if (accuracy >= 90) grade = 'A+'
        else if (accuracy >= 80) grade = 'A'
        else if (accuracy >= 70) grade = 'B'
        else if (accuracy >= 60) grade = 'C'
        else if (accuracy >= 50) grade = 'D'
        else if (accuracy >= 40) grade = 'E'

        // 按题目类型统计
        const questionTypeAnalysis: Record<string, { attempted: number; correct: number }> = {}
        currentSession.questions.forEach((q) => {
          if (!questionTypeAnalysis[q.questionType]) {
            questionTypeAnalysis[q.questionType] = { attempted: 0, correct: 0 }
          }
          if (q.userAnswer !== undefined) {
            questionTypeAnalysis[q.questionType].attempted++
            if (q.isCorrect) {
              questionTypeAnalysis[q.questionType].correct++
            }
          }
        })

        // 生成详细答案记录
        const detailedAnswers = currentSession.questions.map((q) => ({
          questionId: q.id,
          question: q.question,
          userAnswer: q.userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect: q.isCorrect || false,
          explanation: q.explanation
        }))

        // 生成建议
        const recommendations: string[] = []
        if (accuracy < 60) {
          recommendations.push('建议复习基础知识点，巩固基本概念')
          recommendations.push('尝试降低难度，循序渐进地提升')
        } else if (accuracy < 80) {
          recommendations.push('表现不错！继续加强练习可以更进一步')
          recommendations.push('关注错题，理解错误原因')
        } else {
          recommendations.push('表现优秀！可以尝试更高难度的挑战')
          recommendations.push('保持这种学习状态，持续进步')
        }

        const report: QuizReport = {
          sessionId: currentSession.id,
          completedAt: currentSession.endTime || new Date().toISOString(),
          totalTime: currentSession.timeSpent,
          scores: {
            totalQuestions,
            correctAnswers,
            accuracy: Math.round(accuracy * 10) / 10,
            grade
          },
          questionTypeAnalysis,
          detailedAnswers,
          recommendations
        }

        set({ currentReport: report })
      },

      /**
       * 加载刷题历史
       */
      loadQuizHistory: async () => {
        const token = useAuthStore.getState().token
        if (!token) return

        set({ loading: true })

        try {
          const response = await apiFetch('/api/quiz/history', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (!response.ok) {
            throw new Error('加载历史记录失败')
          }

          const data = await response.json()
          set({
            quizHistory: data.history || [],
            loading: false
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知错误'
          set({ loading: false, error: message })
        }
      },

      /**
       * 保存错题到错题本
       */
      saveWrongQuestion: async (question: GeneratedQuestion, userAnswer: string | number) => {
        const token = useAuthStore.getState().token
        if (!token) return

        const { currentSession } = get()
        if (!currentSession) return

        try {
          await apiFetch('/api/quiz/wrong-questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              questionId: question.id,
              questionText: question.question,
              questionType: question.questionType,
              subject: currentSession.config.subject,
              topic: question.topicTags?.[0] || '综合',
              userAnswer: String(userAnswer),
              correctAnswer: String(question.correctAnswer),
              explanation: question.explanation
            })
          })
        } catch (error) {
          console.warn('保存错题失败:', error)
        }
      },

      /**
       * 设置错误信息
       */
      setError: (error: string | null) => {
        set({ error })
      },

      /**
       * 清除当前会话
       */
      clearSession: () => {
        set({
          currentSession: null,
          currentReport: null,
          error: null
        })
      }
    }),
    {
      name: 'dse-quiz-storage',
      partialize: (state: QuizState) => ({
        config: state.config,
        quizHistory: state.quizHistory
      } as unknown as QuizState)
    }
  )
)

