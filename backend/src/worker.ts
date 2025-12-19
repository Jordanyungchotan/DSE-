/**
 * DSE插班分析系统 - Cloudflare Workers 后端
 * 
 * 适配 Cloudflare Workers 运行环境
 */

export interface Env {
  // D1 数据库绑定
  DB: D1Database
  // 环境变量
  DEEPSEEK_API_KEY: string
  JWT_SECRET: string
  CORS_ORIGIN: string
}

// 允许的 CORS 来源列表
const ALLOWED_ORIGINS = [
  'https://dse-analysis.pages.dev',
  'https://dse-analysis-frontend.pages.dev',
  'http://localhost:3000',
  'http://localhost:5173',
]

// 检查是否是允许的来源
function isAllowedOrigin(origin: string | null, envOrigin?: string): boolean {
  if (!origin) return false
  if (envOrigin && origin === envOrigin) return true
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // 允许所有 *.pages.dev 子域名
  if (origin.endsWith('.pages.dev')) return true
  return false
}

// CORS 头部
const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
})

// JSON 响应
const jsonResponse = (data: unknown, status = 200, origin = '*') => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  })
}

// 错误响应
const errorResponse = (message: string, status = 500, origin = '*') => {
  return jsonResponse({ error: message }, status, origin)
}

// 简单的密码哈希（使用 Web Crypto API）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'dse-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password)
  return inputHash === hash
}

// 生成 JWT
async function generateToken(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 } // 7天过期
  
  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(fullPayload))
  const signatureInput = `${base64Header}.${base64Payload}`
  
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput))
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
  
  return `${base64Header}.${base64Payload}.${base64Signature}`
}

// 验证 JWT
async function verifyToken(token: string, secret: string): Promise<{ userId: string; email: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [header, payload, signature] = parts
    const signatureInput = `${header}.${payload}`
    
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(signatureInput))
    
    if (!valid) return null
    
    const payloadData = JSON.parse(atob(payload))
    if (payloadData.exp < Math.floor(Date.now() / 1000)) return null
    
    return { userId: payloadData.userId, email: payloadData.email }
  } catch {
    return null
  }
}

// DeepSeek API 调用
async function analyzeWithDeepSeek(studentInfo: StudentInfo, apiKey: string): Promise<AnalysisResult> {
  if (!apiKey) {
    return generateMockResult(studentInfo)
  }

  try {
    const prompt = buildAnalysisPrompt(studentInfo)
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位专业的香港DSE教育顾问，擅长分析学生情况并提供升学建议。请用JSON格式回复。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status)
      return generateMockResult(studentInfo)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return generateMockResult(studentInfo)
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return generateMockResult(studentInfo)
    }

    return JSON.parse(jsonMatch[0]) as AnalysisResult
  } catch (error) {
    console.error('DeepSeek error:', error)
    return generateMockResult(studentInfo)
  }
}

// 类型定义
interface StudentInfo {
  enrollmentDate: string
  semester: string
  grade: string
  age: number
  currentSchool: string
  subjects: { subject: string; currentScore: string; targetScore: string }[]
  targetSchools: string[]
  notes: string
}

interface AnalysisResult {
  overallAssessment: {
    feasibilityScore: number
    summary: string
    keyStrengths: string[]
    keyWeaknesses: string[]
  }
  subjectAnalyses: {
    subject: string
    currentLevel: string
    targetLevel: string
    gap: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    estimatedTimeToImprove: string
  }[]
  schoolAssessments: {
    schoolName: string
    admissionProbability: number
    requirements: string[]
    gaps: string[]
    recommendations: string[]
  }[]
  studyPlan: {
    weeklySchedule: string[]
    monthlyGoals: string[]
    resources: string[]
  }
  additionalAdvice: string[]
}

// 科目名称映射
const SUBJECT_NAME_MAP: Record<string, string> = {
  chinese: '中国语文', english: '英国语文', math: '数学',
  liberal: '公民与社会发展', physics: '物理', chemistry: '化学',
  biology: '生物', economics: '经济', bafs: '企业会计与财务概论',
  geography: '地理', history: '历史', ict: '资讯及通讯科技',
  m1: '数学延伸部分(M1)', m2: '数学延伸部分(M2)',
}

const GRADE_NAME_MAP: Record<string, string> = {
  form4: '中四', form5: '中五', form6: '中六',
}

// 构建分析提示词
function buildAnalysisPrompt(studentInfo: StudentInfo): string {
  const subjectsText = studentInfo.subjects
    .map(s => `  - ${SUBJECT_NAME_MAP[s.subject] || s.subject}: 当前${s.currentScore}级，目标${s.targetScore}级`)
    .join('\n')

  return `你是一位资深的香港DSE教育专家。请根据以下学生信息，提供专业的插班分析和建议。

学生信息：
- 插班日期：${studentInfo.enrollmentDate}
- 年级：${GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade}
- 年龄：${studentInfo.age}岁
- 当前学校：${studentInfo.currentSchool || '未填写'}

各科目成绩：
${subjectsText}

目标学校：${studentInfo.targetSchools.join('、')}

请以JSON格式返回分析结果，包含：overallAssessment, subjectAnalyses, schoolAssessments, studyPlan, additionalAdvice`
}

// 生成模拟结果
function generateMockResult(studentInfo: StudentInfo): AnalysisResult {
  const baseScore = studentInfo.grade === 'form6' ? 60 : studentInfo.grade === 'form4' ? 75 : 70

  return {
    overallAssessment: {
      feasibilityScore: baseScore,
      summary: `该学生目前就读${GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade}，计划于${studentInfo.enrollmentDate}插班。根据提供的成绩信息，整体学术表现中等偏上。建议重点加强薄弱科目的学习，为目标学校的录取做好准备。`,
      keyStrengths: ['学习态度积极', '部分科目基础扎实', '有明确的目标规划'],
      keyWeaknesses: ['部分科目需要提升', '时间管理能力待加强', '需要更多实战练习'],
    },
    subjectAnalyses: studentInfo.subjects.map(s => ({
      subject: SUBJECT_NAME_MAP[s.subject] || s.subject,
      currentLevel: s.currentScore,
      targetLevel: s.targetScore,
      gap: parseInt(s.targetScore) > parseInt(s.currentScore) ? `差${parseInt(s.targetScore) - parseInt(s.currentScore)}级` : '已达标',
      strengths: ['有一定基础', '学习态度积极'],
      weaknesses: ['需要提升', '部分知识点需巩固'],
      recommendations: ['每天复习30分钟', '完成每周练习题', '定期进行模拟测试'],
      estimatedTimeToImprove: '2-3个月',
    })),
    schoolAssessments: studentInfo.targetSchools.map((school, i) => ({
      schoolName: school,
      admissionProbability: Math.max(40, baseScore - i * 10),
      requirements: ['优异的DSE成绩', '良好的品行记录', '面试表现优秀'],
      gaps: ['部分科目成绩需提升', '需准备面试'],
      recommendations: ['重点提升薄弱科目', '准备自我介绍', '了解学校文化'],
    })),
    studyPlan: {
      weeklySchedule: ['周一至周五：每天2小时自习', '周六：难题训练', '周日：综合复习'],
      monthlyGoals: ['第1个月：夯实基础', '第2个月：针对性提升', '第3个月：模拟训练'],
      resources: ['DSE历年真题集', '各科知识点总结', '在线模拟平台'],
    },
    additionalAdvice: ['保持规律作息', '定期与老师沟通', '适当体育锻炼', '保持积极心态'],
  }
}

// 主请求处理
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const requestOrigin = request.headers.get('Origin')
    
    // 动态确定允许的 origin
    const origin = isAllowedOrigin(requestOrigin, env.CORS_ORIGIN) 
      ? requestOrigin! 
      : (env.CORS_ORIGIN || '*')

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }

    try {
      // 健康检查 - 添加调试信息
      if (path === '/api/health') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          debug: {
            requestOrigin,
            allowedOrigin: origin,
            hasDB: !!env.DB,
            hasJwtSecret: !!env.JWT_SECRET,
            hasDeepseekKey: !!env.DEEPSEEK_API_KEY,
          }
        }, 200, origin)
      }

      // 用户注册
      if (path === '/api/auth/register' && request.method === 'POST') {
        const body = await request.json() as { name: string; email: string; password: string }
        const { name, email, password } = body

        if (!name || !email || !password) {
          return errorResponse('请填写完整信息', 400, origin)
        }

        // 检查邮箱是否已存在
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
        if (existing) {
          return errorResponse('该邮箱已被注册', 400, origin)
        }

        const userId = crypto.randomUUID()
        const passwordHash = await hashPassword(password)
        const now = new Date().toISOString()

        await env.DB.prepare(
          'INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(userId, name, email, passwordHash, now, now).run()

        const token = await generateToken({ userId, email }, env.JWT_SECRET)

        return jsonResponse({
          message: '注册成功',
          user: { id: userId, name, email, createdAt: now },
          token,
        }, 201, origin)
      }

      // 用户登录
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json() as { email: string; password: string }
        const { email, password } = body

        const user = await env.DB.prepare(
          'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?'
        ).bind(email).first() as { id: string; name: string; email: string; password_hash: string; created_at: string } | null

        if (!user) {
          return errorResponse('邮箱或密码错误', 401, origin)
        }

        const valid = await verifyPassword(password, user.password_hash)
        if (!valid) {
          return errorResponse('邮箱或密码错误', 401, origin)
        }

        const token = await generateToken({ userId: user.id, email: user.email }, env.JWT_SECRET)

        return jsonResponse({
          message: '登录成功',
          user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
          token,
        }, 200, origin)
      }

      // 提交分析
      if (path === '/api/analysis/submit' && request.method === 'POST') {
        const body = await request.json() as StudentInfo

        // 调用 DeepSeek API
        const analysisResult = await analyzeWithDeepSeek(body, env.DEEPSEEK_API_KEY)

        const recordId = crypto.randomUUID()
        const now = new Date().toISOString()

        // 获取用户ID（如果有token）
        let userId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
          userId = tokenData?.userId || null
        }

        // 保存到数据库
        await env.DB.prepare(
          'INSERT INTO analysis_records (id, user_id, student_info, result, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(recordId, userId, JSON.stringify(body), JSON.stringify(analysisResult), now).run()

        return jsonResponse({
          message: '分析完成',
          result: {
            id: recordId,
            createdAt: now,
            studentInfo: body,
            ...analysisResult,
          },
        }, 200, origin)
      }

      // 获取分析结果
      if (path.startsWith('/api/analysis/result/') && request.method === 'GET') {
        const id = path.split('/').pop()
        
        const record = await env.DB.prepare(
          'SELECT id, student_info, result, created_at FROM analysis_records WHERE id = ?'
        ).bind(id).first() as { id: string; student_info: string; result: string; created_at: string } | null

        if (!record) {
          return errorResponse('记录不存在', 404, origin)
        }

        return jsonResponse({
          result: {
            id: record.id,
            createdAt: record.created_at,
            studentInfo: JSON.parse(record.student_info),
            ...JSON.parse(record.result),
          },
        }, 200, origin)
      }

      // 获取历史记录
      if (path === '/api/analysis/history' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return jsonResponse({ history: [] }, 200, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return jsonResponse({ history: [] }, 200, origin)
        }

        const records = await env.DB.prepare(
          'SELECT id, student_info, result, created_at FROM analysis_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
        ).bind(tokenData.userId).all()

        const history = (records.results || []).map((r: Record<string, unknown>) => {
          const result = JSON.parse(r.result as string) as AnalysisResult
          return {
            id: r.id,
            createdAt: r.created_at,
            studentInfo: JSON.parse(r.student_info as string),
            feasibilityScore: result.overallAssessment?.feasibilityScore || 0,
            summary: result.overallAssessment?.summary || '',
          }
        })

        return jsonResponse({ history }, 200, origin)
      }

      // 根路径 - 显示 API 状态
      if (path === '/' || path === '') {
        return jsonResponse({
          name: 'DSE Analysis API',
          version: '1.0.0',
          status: 'running',
          endpoints: [
            'GET /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/analysis/submit',
            'GET /api/analysis/result/:id',
            'GET /api/analysis/history',
          ],
        }, 200, origin)
      }

      // 404
      return errorResponse('接口不存在', 404, origin)

    } catch (error) {
      console.error('Error:', error)
      return errorResponse('服务器错误', 500, origin)
    }
  },
}

