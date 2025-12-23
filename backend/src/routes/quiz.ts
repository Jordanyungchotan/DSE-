/**
 * DSE智能刷题 - API路由
 */

import { Router, Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { generateQuestions, gradeAnswer, QuizConfig } from '../services/quizGenerator.js'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'

export const quizRouter = Router()

/**
 * 刷题配置验证Schema
 */
const quizConfigSchema = z.object({
  grade: z.enum(['f4', 'f5', 'f6']),
  subject: z.string().min(1),
  difficulty: z.enum(['basic', 'standard', 'challenging', 'exam']),
  questionCount: z.number().min(1).max(30),
  timeLimit: z.number().optional(),
})

/**
 * 内存存储（生产环境应使用数据库）
 */
const quizSessions = new Map<string, {
  id: string
  userId?: string
  config: QuizConfig
  questions: Array<{
    id: string
    question: string
    questionType: string
    options?: string[]
    correctAnswer: string | number
    explanation: string
    topicTags: string[]
    estimatedTime: number
    difficultyScore: number
  }>
  status: 'active' | 'completed' | 'paused'
  createdAt: Date
  completedAt?: Date
  score?: number
  accuracy?: number
  timeSpent?: number
}>()

const quizHistory = new Map<string, Array<{
  id: string
  subject: string
  grade: string
  difficulty: string
  score: number
  accuracy: number
  completedAt: string
}>>()

/**
 * 开始刷题 - 生成题目
 * POST /api/quiz/start
 */
quizRouter.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 验证配置
    const config = quizConfigSchema.parse(req.body)

    // 生成唯一会话ID
    const sessionId = uuidv4()

    console.log(`[Quiz] 开始生成题目 - 会话ID: ${sessionId}, 配置:`, config)

    // 调用AI生成题目
    const questions = await generateQuestions(config)

    console.log(`[Quiz] 题目生成成功 - 共${questions.length}题`)

    // 保存会话（不包含答案，只返回题目内容）
    const session = {
      id: sessionId,
      userId: (req as Request & { userId?: string }).userId,
      config,
      questions,
      status: 'active' as const,
      createdAt: new Date(),
    }

    quizSessions.set(sessionId, session)

    // 返回题目（客户端版本不包含正确答案）
    const clientQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType,
      options: q.options,
      topicTags: q.topicTags,
      estimatedTime: q.estimatedTime,
      difficultyScore: q.difficultyScore,
      // 不返回 correctAnswer 和 explanation，直到用户提交答案
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }))

    res.json({
      success: true,
      sessionId,
      questions: clientQuestions,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ApiError('配置参数无效: ' + error.errors.map(e => e.message).join(', '), 400))
    } else {
      next(error)
    }
  }
})

/**
 * 提交答案并获取批改结果
 * POST /api/quiz/grade
 */
quizRouter.post('/grade', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, questionId, userAnswer } = req.body

    if (!sessionId || !questionId || userAnswer === undefined) {
      throw new ApiError('缺少必要参数', 400)
    }

    const session = quizSessions.get(sessionId)
    if (!session) {
      throw new ApiError('会话不存在或已过期', 404)
    }

    const question = session.questions.find((q) => q.id === questionId)
    if (!question) {
      throw new ApiError('题目不存在', 404)
    }

    // 批改答案
    const result = await gradeAnswer(question as Parameters<typeof gradeAnswer>[0], userAnswer)

    res.json({
      success: true,
      ...result,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 保存刷题结果
 * POST /api/quiz/save
 */
quizRouter.post('/save', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { sessionId, config, questions, score, accuracy, timeSpent } = req.body

    if (!sessionId) {
      throw new ApiError('缺少会话ID', 400)
    }

    // 更新会话状态
    const session = quizSessions.get(sessionId)
    if (session) {
      session.status = 'completed'
      session.completedAt = new Date()
      session.score = score
      session.accuracy = accuracy
      session.timeSpent = timeSpent
    }

    // 保存到用户历史记录
    const historyRecord = {
      id: sessionId,
      subject: config.subject,
      grade: config.grade,
      difficulty: config.difficulty,
      score: score || 0,
      accuracy: accuracy || 0,
      completedAt: new Date().toISOString(),
    }

    const userHistory = quizHistory.get(userId) || []
    userHistory.unshift(historyRecord)
    
    // 只保留最近50条记录
    if (userHistory.length > 50) {
      userHistory.pop()
    }
    
    quizHistory.set(userId, userHistory)

    console.log(`[Quiz] 保存刷题记录 - 用户: ${userId}, 会话: ${sessionId}, 成绩: ${score}/${questions?.length || 0}`)

    res.json({
      success: true,
      message: '刷题记录已保存',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取刷题历史
 * GET /api/quiz/history
 */
quizRouter.get('/history', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const history = quizHistory.get(userId) || []

    res.json({
      success: true,
      history,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取会话详情
 * GET /api/quiz/session/:id
 */
quizRouter.get('/session/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const session = quizSessions.get(id)

    if (!session) {
      throw new ApiError('会话不存在或已过期', 404)
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        config: session.config,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        score: session.score,
        accuracy: session.accuracy,
        questionCount: session.questions.length,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取刷题统计
 * GET /api/quiz/stats
 */
quizRouter.get('/stats', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const history = quizHistory.get(userId) || []

    if (history.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalSessions: 0,
          totalQuestions: 0,
          averageAccuracy: 0,
          subjectStats: {},
          recentTrend: [],
        },
      })
    }

    // 计算统计数据
    const totalSessions = history.length
    const totalAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0)
    const averageAccuracy = Math.round(totalAccuracy / totalSessions * 10) / 10

    // 按科目统计
    const subjectStats: Record<string, { sessions: number; averageAccuracy: number }> = {}
    history.forEach((h) => {
      if (!subjectStats[h.subject]) {
        subjectStats[h.subject] = { sessions: 0, averageAccuracy: 0 }
      }
      subjectStats[h.subject].sessions++
      subjectStats[h.subject].averageAccuracy += h.accuracy
    })

    Object.keys(subjectStats).forEach((subject) => {
      subjectStats[subject].averageAccuracy = 
        Math.round(subjectStats[subject].averageAccuracy / subjectStats[subject].sessions * 10) / 10
    })

    // 最近7天趋势
    const recentTrend = history.slice(0, 7).map((h) => ({
      date: h.completedAt.split('T')[0],
      accuracy: h.accuracy,
      subject: h.subject,
    }))

    res.json({
      success: true,
      stats: {
        totalSessions,
        totalQuestions: history.reduce((sum, h) => sum + h.score, 0),
        averageAccuracy,
        subjectStats,
        recentTrend,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 错题本存储
 */
const wrongQuestions = new Map<string, Array<{
  id: string
  questionId: string
  questionText: string
  questionType: string
  subject: string
  topic: string
  userAnswer: string
  correctAnswer: string
  explanation: string
  wrongCount: number
  status: 'unreviewed' | 'reviewed' | 'mastered'
  firstAttemptDate: string
  lastAttemptDate: string
}>>()

/**
 * 获取错题列表
 * GET /api/quiz/wrong-questions
 */
quizRouter.get('/wrong-questions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const questions = wrongQuestions.get(userId) || []

    res.json({
      success: true,
      questions,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 添加错题
 * POST /api/quiz/wrong-questions
 */
quizRouter.post('/wrong-questions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { questionId, questionText, questionType, subject, topic, userAnswer, correctAnswer, explanation } = req.body

    const userQuestions = wrongQuestions.get(userId) || []
    
    // 检查是否已存在
    const existingIndex = userQuestions.findIndex(q => q.questionId === questionId)
    
    if (existingIndex >= 0) {
      // 更新错题次数
      userQuestions[existingIndex].wrongCount++
      userQuestions[existingIndex].lastAttemptDate = new Date().toISOString().split('T')[0]
      userQuestions[existingIndex].status = 'unreviewed'
    } else {
      // 添加新错题
      const newQuestion = {
        id: uuidv4(),
        questionId,
        questionText,
        questionType,
        subject,
        topic: topic || '综合',
        userAnswer: String(userAnswer),
        correctAnswer: String(correctAnswer),
        explanation,
        wrongCount: 1,
        status: 'unreviewed' as const,
        firstAttemptDate: new Date().toISOString().split('T')[0],
        lastAttemptDate: new Date().toISOString().split('T')[0],
      }
      userQuestions.unshift(newQuestion)
    }

    wrongQuestions.set(userId, userQuestions)

    res.json({
      success: true,
      message: '错题已添加',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 更新错题状态
 * PATCH /api/quiz/wrong-questions/:id/status
 */
quizRouter.patch('/wrong-questions/:id/status', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { id } = req.params
    const { status } = req.body

    if (!['reviewed', 'mastered', 'unreviewed'].includes(status)) {
      throw new ApiError('无效的状态值', 400)
    }

    const userQuestions = wrongQuestions.get(userId) || []
    const questionIndex = userQuestions.findIndex(q => q.id === id)

    if (questionIndex === -1) {
      throw new ApiError('错题不存在', 404)
    }

    userQuestions[questionIndex].status = status
    wrongQuestions.set(userId, userQuestions)

    res.json({
      success: true,
      message: '状态已更新',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 删除错题
 * DELETE /api/quiz/wrong-questions/:id
 */
quizRouter.delete('/wrong-questions/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { id } = req.params

    const userQuestions = wrongQuestions.get(userId) || []
    const filteredQuestions = userQuestions.filter(q => q.id !== id)
    wrongQuestions.set(userId, filteredQuestions)

    res.json({
      success: true,
      message: '错题已删除',
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 健康检查
 */
quizRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'quiz',
    activeSessions: quizSessions.size,
  })
})

