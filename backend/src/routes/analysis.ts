/**
 * 分析路由
 * 处理DSE插班可行性评估相关请求
 */

import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database/init.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { analyzeWithDeepSeek, StudentInfo, AnalysisResult } from '../services/deepseek.js'
import { 
  evaluateFeasibility, 
  enhanceWithAI,
  FeasibilityRequest,
  FeasibilityResult 
} from '../services/feasibilityEngine.js'

export const analysisRouter = Router()

// ===== 请求验证Schema =====

const subjectSchema = z.object({
  subject: z.string().min(1, '请选择科目'),
  currentScore: z.string().min(1, '请选择当前成绩'),
  targetScore: z.string().min(1, '请选择目标成绩'),
})

const analysisRequestSchema = z.object({
  enrollmentDate: z.string().min(1, '请选择插班日期'),
  semester: z.string().min(1, '请选择学期'),
  grade: z.string().min(1, '请选择年级'),
  age: z.number().min(12, '年龄不能小于12岁').max(20, '年龄不能大于20岁'),
  currentSchool: z.string().optional(),
  subjects: z.array(subjectSchema).min(1, '请至少添加一个科目'),
  targetSchools: z.array(z.string()).min(1, '请至少选择一所目标学校'),
  notes: z.string().optional(),
})

// ===== 路由处理 =====

/**
 * 提交分析请求
 * POST /api/analysis/submit
 */
analysisRouter.post('/submit', optionalAuth, async (req, res, next) => {
  try {
    // 验证请求数据
    const studentInfo = analysisRequestSchema.parse(req.body) as StudentInfo
    
    console.log('📊 收到分析请求:', {
      grade: studentInfo.grade,
      subjects: studentInfo.subjects.length,
      targetSchools: studentInfo.targetSchools,
    })

    // 调用DeepSeek API进行分析
    console.log('🤖 正在调用AI分析...')
    const analysisResult: AnalysisResult = await analyzeWithDeepSeek(studentInfo)
    console.log('✅ AI分析完成')

    // 生成记录ID
    const recordId = uuidv4()
    const now = new Date().toISOString()

    // 保存到数据库
    const db = getDatabase()
    db.prepare(`
      INSERT INTO analysis_records (id, user_id, student_info, result, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      recordId,
      req.userId || null,
      JSON.stringify(studentInfo),
      JSON.stringify(analysisResult),
      now
    )

    // 返回完整结果
    res.json({
      message: '分析完成',
      result: {
        id: recordId,
        createdAt: now,
        studentInfo,
        ...analysisResult,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取分析结果
 * GET /api/analysis/result/:id
 */
analysisRouter.get('/result/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = getDatabase()

    const record = db.prepare(`
      SELECT id, user_id, student_info, result, created_at
      FROM analysis_records WHERE id = ?
    `).get(id) as {
      id: string
      user_id: string | null
      student_info: string
      result: string
      created_at: string
    } | undefined

    if (!record) {
      throw new ApiError('分析记录不存在', 404)
    }

    const studentInfo = JSON.parse(record.student_info)
    const analysisResult = JSON.parse(record.result)

    res.json({
      result: {
        id: record.id,
        createdAt: record.created_at,
        studentInfo,
        ...analysisResult,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取历史记录
 * GET /api/analysis/history
 */
analysisRouter.get('/history', optionalAuth, async (req, res, next) => {
  try {
    const db = getDatabase()
    const userId = req.userId

    let records
    if (userId) {
      // 已登录用户：获取其所有记录
      records = db.prepare(`
        SELECT id, student_info, result, created_at
        FROM analysis_records
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId) as {
        id: string
        student_info: string
        result: string
        created_at: string
      }[]
    } else {
      // 未登录用户：返回空列表（或可以基于session/cookie实现）
      records = []
    }

    const history = records.map((record) => {
      const studentInfo = JSON.parse(record.student_info)
      const result = JSON.parse(record.result)

      return {
        id: record.id,
        createdAt: record.created_at,
        studentInfo,
        feasibilityScore: result.overallAssessment?.feasibilityScore || 0,
        summary: result.overallAssessment?.summary || '',
      }
    })

    res.json({ history })
  } catch (error) {
    next(error)
  }
})

/**
 * 删除历史记录
 * DELETE /api/analysis/history/:id
 */
analysisRouter.delete('/history/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const db = getDatabase()

    // 检查记录是否属于当前用户
    const record = db.prepare(`
      SELECT id, user_id FROM analysis_records WHERE id = ?
    `).get(id) as { id: string; user_id: string | null } | undefined

    if (!record) {
      throw new ApiError('记录不存在', 404)
    }

    if (record.user_id !== req.userId) {
      throw new ApiError('无权删除此记录', 403)
    }

    // 删除记录
    db.prepare('DELETE FROM analysis_records WHERE id = ?').run(id)

    res.json({ message: '删除成功' })
  } catch (error) {
    next(error)
  }
})

/**
 * 批量获取科目信息
 * GET /api/analysis/subjects
 */
analysisRouter.get('/subjects', (_req, res) => {
  const subjects = [
    { value: 'chinese', label: '中国语文', category: 'core' },
    { value: 'english', label: '英国语文', category: 'core' },
    { value: 'math', label: '数学', category: 'core' },
    { value: 'liberal', label: '公民与社会发展', category: 'core' },
    { value: 'physics', label: '物理', category: 'elective' },
    { value: 'chemistry', label: '化学', category: 'elective' },
    { value: 'biology', label: '生物', category: 'elective' },
    { value: 'economics', label: '经济', category: 'elective' },
    { value: 'bafs', label: '企业会计与财务概论', category: 'elective' },
    { value: 'geography', label: '地理', category: 'elective' },
    { value: 'history', label: '历史', category: 'elective' },
    { value: 'ict', label: '资讯及通讯科技', category: 'elective' },
    { value: 'm1', label: '数学延伸部分(M1)', category: 'elective' },
    { value: 'm2', label: '数学延伸部分(M2)', category: 'elective' },
  ]

  res.json({ subjects })
})

/**
 * 获取成绩等级列表
 * GET /api/analysis/grades
 * 
 * @deprecated points 字段使用固定的 7 分制换算，仅供参考。
 * 不同大学/课程有不同的换算规则（如城大2025: 5**=8.5）。
 * 
 * TODO: 禁止在大学分析 (JUPAS) 中依赖此 points 值。
 * 前端应仅使用 value/label 用于下拉选择，
 * 实际分数计算由后端根据课程规则完成。
 */
analysisRouter.get('/grades', (_req, res) => {
  // @deprecated - points 仅供参考，不同课程换算不同
  const grades = [
    { value: '5**', label: '5**', points: 7 },
    { value: '5*', label: '5*', points: 6 },
    { value: '5', label: '5', points: 5 },
    { value: '4', label: '4', points: 4 },
    { value: '3', label: '3', points: 3 },
    { value: '2', label: '2', points: 2 },
    { value: '1', label: '1', points: 1 },
    { value: 'U', label: 'U (不予评级)', points: 0 },
  ]

  res.json({ grades })
})

/**
 * 获取香港中学列表
 * GET /api/analysis/schools
 */
analysisRouter.get('/schools', (_req, res) => {
  const schools = {
    hongKongIsland: [
      '皇仁书院',
      '英皇书院',
      '圣保罗男女中学',
      '圣若瑟书院',
      '香港华仁书院',
      '嘉诺撒圣心书院',
      '圣士提反女子中学',
      '金文泰中学',
    ],
    kowloon: [
      '喇沙书院',
      '拔萃男书院',
      '拔萃女书院',
      '协恩中学',
      '华英中学',
      '九龙华仁书院',
      '玛利诺修院学校',
      '圣芳济书院',
    ],
    newTerritories: [
      '圣保罗书院',
      '培正中学',
      '沙田官立中学',
      '浸信会吕明才中学',
      '圣公会曾肇添中学',
      '保良局百周年李兆忠纪念中学',
      '天主教郭得胜中学',
      '沙田培英中学',
    ],
  }

  res.json({ schools })
})

// ============================================================
// 新版可行性评估API
// ============================================================

/**
 * 可行性评估请求验证Schema
 */
const feasibilityRequestSchema = z.object({
  student: z.object({
    age: z.number().min(10).max(20),
    gender: z.enum(['male', 'female']),
    currentGrade: z.string(), // S1-S6
    scores: z.record(z.string(), z.number().min(0).max(100)),
    currentSchool: z.string().optional(),
    currentBand: z.number().min(1).max(3).optional(),
    strengths: z.array(z.string()).optional(),
    extracurriculars: z.array(z.string()).optional(),
  }),
  targetSchool: z.object({
    schoolId: z.string().optional(),
    schoolName: z.string().min(1),
    bandLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    district: z.string().min(1),
    gender: z.enum(['boys', 'girls', 'coed']).optional(),
    type: z.enum(['government', 'aided', 'dss', 'private']).optional(),
    englishRequirement: z.enum(['high', 'medium', 'low']).optional(),
  }),
})

/**
 * 插班可行性评估
 * POST /api/analysis/feasibility
 * 
 * 基于规则引擎 + AI推理的可行性等级评估
 * 输出A/B/C/D等级，不输出具体百分比
 */
analysisRouter.post('/feasibility', optionalAuth, async (req, res, next) => {
  try {
    // 验证请求数据
    const request = feasibilityRequestSchema.parse(req.body) as FeasibilityRequest
    
    console.log('📊 收到可行性评估请求:', {
      grade: request.student.currentGrade,
      targetSchool: request.targetSchool.schoolName,
      band: request.targetSchool.bandLevel,
    })

    // 1. 规则引擎评估
    console.log('🔧 执行规则引擎评估...')
    let result: FeasibilityResult = evaluateFeasibility(request)
    
    // 2. AI增强（如有API密钥）
    const aiApiKey = process.env.DEEPSEEK_API_KEY
    if (aiApiKey) {
      console.log('🤖 AI增强评估中...')
      result = await enhanceWithAI(request, result, aiApiKey)
    }
    
    console.log('✅ 评估完成，可行性等级:', result.feasibilityLevel)

    // 3. 保存记录
    const recordId = uuidv4()
    const now = new Date().toISOString()
    
    const db = getDatabase()
    db.prepare(`
      INSERT INTO analysis_records (id, user_id, student_info, result, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      recordId,
      req.userId || null,
      JSON.stringify(request),
      JSON.stringify(result),
      now
    )

    // 4. 返回结果
    res.json({
      success: true,
      result: {
        id: recordId,
        createdAt: now,
        ...result,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取可行性评估结果
 * GET /api/analysis/feasibility/:id
 */
analysisRouter.get('/feasibility/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = getDatabase()

    const record = db.prepare(`
      SELECT id, user_id, student_info, result, created_at
      FROM analysis_records WHERE id = ?
    `).get(id) as {
      id: string
      user_id: string | null
      student_info: string
      result: string
      created_at: string
    } | undefined    if (!record) {
      throw new ApiError('评估记录不存在', 404)
    }

    const studentInfo = JSON.parse(record.student_info)
    const result = JSON.parse(record.result) as FeasibilityResult

    res.json({
      success: true,
      result: {
        id: record.id,
        createdAt: record.created_at,
        request: studentInfo,
        ...result,
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * 获取学校排名数据（供前端选择目标学校）
 * GET /api/analysis/school-rankings
 */
analysisRouter.get('/school-rankings', async (req, res, next) => {
  try {
    const district = req.query.district as string | undefined
    const band = req.query.band ? parseInt(req.query.band as string) : undefined
    
    // 这里可以从数据库获取学校排名数据
    // 暂时返回静态数据
    const schools = [
      { name: '聖保羅男女中學', band: 1, district: '中西區', type: 'dss' },
      { name: '拔萃女書院', band: 1, district: '油尖旺區', type: 'dss' },
      { name: '拔萃男書院', band: 1, district: '九龍城區', type: 'dss' },
      { name: '喇沙書院', band: 1, district: '九龍城區', type: 'aided' },
      { name: '聖公會曾肇添中學', band: 1, district: '沙田區', type: 'aided' },
      { name: '英皇書院', band: 1, district: '中西區', type: 'government' },
      { name: '皇仁書院', band: 1, district: '灣仔區', type: 'government' },
      { name: '浸信會呂明才中學', band: 1, district: '沙田區', type: 'aided' },
      // ... 更多学校
    ]

    let filtered = schools
    if (district) {
      filtered = filtered.filter(s => s.district === district)
    }
    if (band) {
      filtered = filtered.filter(s => s.band === band)
    }

    res.json({ success: true, schools: filtered })
  } catch (error) {
    next(error)
  }
})