/**
 * DSE插班分析系统 - Cloudflare Workers 后端
 * 
 * 适配 Cloudflare Workers 运行环境
 */

import { SCHOOLS_BY_DISTRICT } from './data/schoolsData'
import { SUBJECTS, SubjectGrade } from '@/shared/domain'
import { AnalysisInputError, validateSubjectGrades } from './validators/analysisInput.validator.js'
import { analyzeSubjectGrade } from './analysis/analyzeByRules.js'

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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
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

// ===== 智能答案匹配系统 (增强版) =====

interface AnswerMatchResult {
  isCorrect: boolean
  matchType: 'exact' | 'normalized' | 'numeric' | 'equation' | 'choice' | 'semantic' | 'hcf_lcm'
  confidence: number
  feedback: string
}

// 答案规范化
function normalizeAnswer(answer: string): string {
  if (!answer) return ''
  
  return answer
    .trim()
    .replace(/\s+/g, ' ')
    // 全角转半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => 
      String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
    )
    // 统一标点
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
    .replace(/[：]/g, ':')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    // 统一货币
    .replace(/[￥＄]/g, '¥')
    // 统一等号和运算符
    .replace(/[＝]/g, '=')
    .replace(/[×✕xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–]/g, '-')
    // 去除开头词
    .replace(/^(答|答案|解|结果|等于)[:：]?\s*/i, '')
    // 去除结尾标点
    .replace(/[。．!！?？]$/, '')
}

// 智能数字提取引擎 - 从各种格式中提取数字
function extractAllNumbers(str: string): number[] {
  if (!str) return []
  
  const numbers: number[] = []
  const cleaned = str
    .replace(/[¥＄$€£]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
  
  // 处理中文数字单位
  let multiplier = 1
  if (cleaned.includes('万')) multiplier = 10000
  else if (cleaned.includes('千')) multiplier = 1000
  else if (cleaned.includes('亿')) multiplier = 100000000

  // 提取所有数字
  const matches = cleaned.match(/[-+]?\d+(?:\.\d+)?/g)
  if (matches) {
    for (const match of matches) {
      const num = parseFloat(match)
      if (!isNaN(num)) {
        numbers.push(num * multiplier)
      }
    }
  }
  
  return numbers
}

// 从完整句子中提取关键数字（如"最大公因数是15"中的15）
function extractKeyNumber(str: string): number | null {
  if (!str) return null
  
  // 策略1：检查是否为纯数字
  const pureNumMatch = str.trim().match(/^[-+]?\d+(?:\.\d+)?$/)
  if (pureNumMatch) {
    return parseFloat(pureNumMatch[0])
  }
  
  // 策略2：从"...是X"、"...为X"、"...=X"等格式中提取
  const patterns = [
    /(?:是|为|=|等于|得)\s*([-+]?\d+(?:\.\d+)?)\s*$/,
    /(?:HCF|LCM|hcf|lcm|最大公因数|最小公倍数|最高公因數|最低公倍數)\s*[=:：是为]?\s*([-+]?\d+(?:\.\d+)?)/i,
    /(?:答案|答|解|结果)[=:：]?\s*([-+]?\d+(?:\.\d+)?)/,
    /([-+]?\d+(?:\.\d+)?)\s*$/  // 句末的数字
  ]
  
  for (const pattern of patterns) {
    const match = str.match(pattern)
    if (match && match[1]) {
      const num = parseFloat(match[1])
      if (!isNaN(num)) return num
    }
  }
  
  // 策略3：提取唯一的数字
  const allNumbers = extractAllNumbers(str)
  if (allNumbers.length === 1) {
    return allNumbers[0]
  }
  
  // 策略4：提取最后一个数字（通常是答案）
  if (allNumbers.length > 0) {
    return allNumbers[allNumbers.length - 1]
  }
  
  return null
}

// 数值相等性判断
function isNumericEqual(a: number, b: number, precision: number = 0.001): boolean {
  if (b === 0) return Math.abs(a) < precision
  return Math.abs(a - b) / Math.abs(b) < precision
}

// 提取方程解
function extractEquationSolution(equation: string): number | null {
  const cleaned = equation.replace(/\s/g, '').toLowerCase()
  
  // x=4, X=4
  const match1 = cleaned.match(/[xy]\s*=\s*([-+]?\d*\.?\d+)/)
  if (match1) return parseFloat(match1[1])
  
  // 纯数字
  const match2 = cleaned.match(/^([-+]?\d*\.?\d+)$/)
  if (match2) return parseFloat(match2[1])
  
  // =4
  const match3 = cleaned.match(/^=\s*([-+]?\d*\.?\d+)/)
  if (match3) return parseFloat(match3[1])
  
  return null
}

// 检测题目类型（从题目文本中推断）
function detectQuestionSubType(questionText: string): string | null {
  const text = (questionText || '').toLowerCase()
  
  // HCF/最大公因数
  if (/最大公因数|hcf|highest common factor|最高公因數|gcd|greatest common divisor/i.test(text)) {
    return 'hcf'
  }
  
  // LCM/最小公倍数
  if (/最小公倍数|lcm|lowest common multiple|最低公倍數|least common multiple/i.test(text)) {
    return 'lcm'
  }
  
  // 质因数分解
  if (/分解质因数|质因数分解|prime factor|質因數/i.test(text)) {
    return 'prime_factorization'
  }
  
  return null
}

// 检查是否为纯数字答案
function isNumericOnly(answer: string): boolean {
  return /^\s*[-+]?\d+(?:\.\d+)?\s*$/.test(answer)
}

// 智能答案匹配主函数 (增强版)
function intelligentAnswerMatch(
  userAnswer: string,
  expectedAnswer: string,
  questionType: string,
  options?: string[],
  questionText?: string
): AnswerMatchResult {
  const userStr = String(userAnswer).trim()
  const expectedStr = String(expectedAnswer).trim()
  
  // 1. 完全匹配
  if (userStr === expectedStr) {
    return {
      isCorrect: true,
      matchType: 'exact',
      confidence: 1.0,
      feedback: '答案完全正确！🎉'
    }
  }
  
  // 规范化
  const normalizedUser = normalizeAnswer(userStr)
  const normalizedExpected = normalizeAnswer(expectedStr)
  
  // 2. 规范化后匹配
  if (normalizedUser.toLowerCase() === normalizedExpected.toLowerCase()) {
    return {
      isCorrect: true,
      matchType: 'normalized',
      confidence: 0.95,
      feedback: '答案正确！（系统已识别您的答案格式）✅'
    }
  }
  
  // 3. 选择题特殊处理
  if (questionType === 'multiple_choice') {
    // 将用户答案转换为统一格式（字母A-D）
    let userChoice = ''
    const userTrimmed = userStr.trim()
    
    // 情况1: 用户答案是数字索引 (0, 1, 2, 3)
    if (/^[0-3]$/.test(userTrimmed)) {
      userChoice = String.fromCharCode(65 + parseInt(userTrimmed))
    }
    // 情况2: 用户答案是字母 (A, B, C, D)
    else if (/^[A-Da-d]$/.test(userTrimmed)) {
      userChoice = userTrimmed.toUpperCase()
    }
    // 情况3: 用户答案是完整选项文本
    else if (options && options.length > 0) {
      const matchedIndex = options.findIndex(opt => 
        normalizeAnswer(opt).toLowerCase() === normalizedUser.toLowerCase()
      )
      if (matchedIndex >= 0) {
        userChoice = String.fromCharCode(65 + matchedIndex)
      }
    }
    
    // 将正确答案转换为统一格式（字母A-D）
    let expectedChoice = ''
    const expectedTrimmed = expectedStr.trim()
    
    // 情况1: 正确答案是数字索引 (0, 1, 2, 3)
    if (/^[0-3]$/.test(expectedTrimmed)) {
      expectedChoice = String.fromCharCode(65 + parseInt(expectedTrimmed))
    }
    // 情况2: 正确答案是字母 (A, B, C, D)
    else if (/^[A-Da-d]$/.test(expectedTrimmed)) {
      expectedChoice = expectedTrimmed.toUpperCase()
    }
    // 情况3: 正确答案是完整选项文本
    else if (options && options.length > 0) {
      const matchedIndex = options.findIndex(opt => 
        normalizeAnswer(opt).toLowerCase() === normalizeAnswer(expectedStr).toLowerCase() ||
        opt.toLowerCase().includes(expectedStr.toLowerCase()) ||
        expectedStr.toLowerCase().includes(opt.toLowerCase())
      )
      if (matchedIndex >= 0) {
        expectedChoice = String.fromCharCode(65 + matchedIndex)
      }
    }
    
    // 比较用户答案和正确答案
    if (userChoice && expectedChoice && userChoice === expectedChoice) {
      return {
        isCorrect: true,
        matchType: 'choice',
        confidence: 0.95,
        feedback: '答案正确！✅'
      }
    }
    
    // 如果无法解析用户答案，尝试直接比较选项内容
    if (options && options.length > 0 && !userChoice) {
      const userIndex = options.findIndex(opt => 
        normalizeAnswer(opt).toLowerCase() === normalizedUser.toLowerCase()
      )
      if (userIndex >= 0) {
        const userLetter = String.fromCharCode(65 + userIndex)
        if (userLetter === expectedChoice) {
          return {
            isCorrect: true,
            matchType: 'choice',
            confidence: 0.9,
            feedback: '答案正确！（系统已识别您选择的选项内容）✅'
          }
        }
      }
    }
    
    // 调试信息
    console.log('选择题匹配调试:', { 
      userStr, expectedStr, userChoice, expectedChoice, 
      userTrimmed, expectedTrimmed 
    })
    
    // 选择题答案不正确，直接返回错误反馈
    if (userChoice && expectedChoice) {
      return {
        isCorrect: false,
        matchType: 'choice',
        confidence: 0,
        feedback: `答案不正确。正确答案是 ${expectedChoice}。`
      }
    }
  }
  
  // 4. 智能数值匹配 - 核心改进！
  // 从用户答案和标准答案中提取关键数字
  const userKeyNum = extractKeyNumber(userStr)
  const expectedKeyNum = extractKeyNumber(expectedStr)
  
  if (userKeyNum !== null && expectedKeyNum !== null) {
    if (isNumericEqual(userKeyNum, expectedKeyNum)) {
      // 检测题目子类型以提供更精确的反馈
      const subType = detectQuestionSubType(questionText || expectedStr)
      
      // 根据用户输入格式给出不同反馈
      if (isNumericOnly(userStr)) {
        // 用户只输入了数字，但数值正确
        let hint = ''
        if (subType === 'hcf') {
          hint = '建议使用完整格式，如："最大公因数是' + userKeyNum + '"'
        } else if (subType === 'lcm') {
          hint = '建议使用完整格式，如："最小公倍数是' + userKeyNum + '"'
        }
        
        return {
          isCorrect: true,
          matchType: 'numeric',
          confidence: 0.9,
          feedback: '答案正确！✅' + (hint ? '\n💡 ' + hint : '')
        }
      } else {
        return {
          isCorrect: true,
          matchType: 'numeric',
          confidence: 0.95,
          feedback: '答案正确！✅'
        }
      }
    }
  }
  
  // 5. 方程解匹配
  const userSolution = extractEquationSolution(normalizedUser)
  const expectedSolution = extractEquationSolution(normalizedExpected)
  
  if (userSolution !== null && expectedSolution !== null) {
    if (isNumericEqual(userSolution, expectedSolution)) {
      return {
        isCorrect: true,
        matchType: 'equation',
        confidence: 0.9,
        feedback: '答案正确！（系统已识别方程解）✅'
      }
    }
  }
  
  // 6. 质因数分解匹配
  if (detectQuestionSubType(questionText || '') === 'prime_factorization') {
    const userFactors = extractAllNumbers(userStr).sort((a, b) => a - b)
    const expectedFactors = extractAllNumbers(expectedStr).sort((a, b) => a - b)
    
    if (userFactors.length > 0 && expectedFactors.length > 0) {
      // 检查质因数是否相同
      if (JSON.stringify(userFactors) === JSON.stringify(expectedFactors)) {
        return {
          isCorrect: true,
          matchType: 'semantic',
          confidence: 0.9,
          feedback: '质因数分解正确！✅'
        }
      }
      
      // 检查乘积是否相同
      const userProduct = userFactors.reduce((a, b) => a * b, 1)
      const expectedProduct = expectedFactors.reduce((a, b) => a * b, 1)
      if (userProduct === expectedProduct) {
        return {
          isCorrect: true,
          matchType: 'semantic',
          confidence: 0.85,
          feedback: '质因数分解正确！✅'
        }
      }
    }
  }
  
  // 答案不正确，生成智能反馈
  let feedback = '答案不正确，请再仔细检查一下。'
  
  // 分析错误类型并给出建议
  if (userKeyNum !== null && expectedKeyNum !== null) {
    const diff = Math.abs(userKeyNum - expectedKeyNum)
    const expectedAbs = Math.abs(expectedKeyNum)
    
    if (diff / expectedAbs < 0.1) {
      feedback = '数值接近但不够精确，请检查计算过程。'
    } else if (userKeyNum === -expectedKeyNum) {
      feedback = '注意正负号！'
    } else if (userKeyNum === expectedKeyNum * 2 || userKeyNum * 2 === expectedKeyNum) {
      feedback = '请检查是否算错了倍数关系。'
    }
  }
  
  // 如果用户输入看起来像是部分答案
  if (userKeyNum !== null && expectedKeyNum === null) {
    feedback = '请检查答案格式是否正确。'
  }
  
  const ruleAnalysisBySubject = buildRuleAnalysisBySubject(studentInfo.subjects)

  return {
    isCorrect: false,
    matchType: 'exact',
    confidence: 0,
    feedback
  }
}

// 刷题题目生成
interface QuizConfig {
  grade: string
  subject: string
  difficulty: string
  questionCount: number
}

interface GeneratedQuestion {
  id: string
  question: string
  questionType: 'multiple_choice' | 'short_answer' | 'calculation' | 'explanation'
  options?: string[]
  correctAnswer: string | number
  explanation: string
  topicTags: string[]
  difficultyScore: number
}

// 科目名称映射 (用于刷题)
const QUIZ_SUBJECT_MAP: Record<string, string> = {
  chinese: '中国语文', english: '英国语文', math: '数学',
  liberal: '公民与社会发展', physics: '物理', chemistry: '化学',
  biology: '生物', economics: '经济', bafs: '企业会计与财务概论',
  geography: '地理', history: '历史', ict: '资讯及通讯科技',
}

const QUIZ_GRADE_MAP: Record<string, string> = {
  f4: '中四', f5: '中五', f6: '中六',
}

const QUIZ_DIFFICULTY_MAP: Record<string, string> = {
  basic: '基础', standard: '标准', advanced: '进阶', challenge: '挑战', challenging: '挑战', exam: 'DSE模拟',
}

// ===== 水平测试系统 =====

// DSE等级映射
function scoreToLevel(score: number): string {
  if (score >= 90) return '5**'
  if (score >= 85) return '5*'
  if (score >= 80) return '5'
  if (score >= 70) return '4'
  if (score >= 60) return '3'
  if (score >= 40) return '2'
  if (score >= 20) return '1'
  return 'U'
}

function levelToDescription(level: string): string {
  const descriptions: Record<string, string> = {
    '5**': '优异 - 表现卓越，掌握高阶思维能力',
    '5*': '优良 - 全面掌握，能灵活应用',
    '5': '良好 - 扎实掌握核心概念',
    '4': '中等 - 理解大部分内容，部分需加强',
    '3': '基本达标 - 掌握基础，需提升应用能力',
    '2': '部分达标 - 基础薄弱，需系统复习',
    '1': '未达标 - 需要重新学习基础知识',
    'U': '不予评级 - 建议从头开始学习'
  }
  return descriptions[level] || '未知等级'
}

function calculateGradeEquivalent(score: number, targetGrade: string): string {
  const gradeOrder = ['中四上学期', '中四下学期', '中五上学期', '中五下学期', '中六上学期', '中六下学期']
  
  let baseIndex: number
  switch (targetGrade) {
    case '中四': baseIndex = 1; break
    case '中五': baseIndex = 3; break
    case '中六': baseIndex = 5; break
    default: baseIndex = 1
  }
  
  let adjustment = 0
  if (score >= 90) adjustment = 1
  else if (score >= 70) adjustment = 0
  else if (score >= 50) adjustment = -1
  else if (score >= 30) adjustment = -2
  else adjustment = -3
  
  const finalIndex = Math.max(0, Math.min(gradeOrder.length - 1, baseIndex + adjustment))
  return gradeOrder[finalIndex]
}

function generateBasicRecommendations(
  weaknessPoints: string[],
  subject: string
): Array<{ priority: number; topic: string; suggestion: string; resources: string[] }> {
  return weaknessPoints.slice(0, 5).map((point, index) => ({
    priority: index + 1,
    topic: point,
    suggestion: `建议系统复习${point}相关知识，从基础概念开始，逐步提升难度。`,
    resources: [
      `${subject} ${point} 讲解视频`,
      `${subject} ${point} 练习题`,
      `DSE ${subject} ${point} 历年真题`
    ]
  }))
}

// 详细能力雷达图计算
function calculateDetailedAbilityRadar(
  questions: Record<string, unknown>[],
  gradingResults: Array<{ questionId: string; isCorrect: boolean; score: number; maxScore: number }>
): { knowledge: number; application: number; analysis: number; synthesis: number; evaluation: number } {
  const dimensions = {
    knowledge: { score: 0, max: 0 },
    application: { score: 0, max: 0 },
    analysis: { score: 0, max: 0 },
    synthesis: { score: 0, max: 0 },
    evaluation: { score: 0, max: 0 }
  }

  for (const result of gradingResults) {
    const question = questions.find(q => q.id === result.questionId)
    if (!question) continue

    const questionType = question.question_type as string
    const difficulty = question.difficulty as string
    const score = result.score
    const maxScore = result.maxScore

    // 根据题目类型和难度分配到不同能力维度
    if (questionType === 'choice') {
      // 选择题主要考察知识理解
      dimensions.knowledge.score += score * 0.7
      dimensions.knowledge.max += maxScore * 0.7
      dimensions.application.score += score * 0.3
      dimensions.application.max += maxScore * 0.3
    } else if (questionType === 'short') {
      // 短答题考察应用和分析能力
      dimensions.application.score += score * 0.4
      dimensions.application.max += maxScore * 0.4
      dimensions.analysis.score += score * 0.4
      dimensions.analysis.max += maxScore * 0.4
      dimensions.knowledge.score += score * 0.2
      dimensions.knowledge.max += maxScore * 0.2
    } else if (questionType === 'long') {
      // 论述题考察综合和评价能力
      dimensions.synthesis.score += score * 0.35
      dimensions.synthesis.max += maxScore * 0.35
      dimensions.evaluation.score += score * 0.35
      dimensions.evaluation.max += maxScore * 0.35
      dimensions.analysis.score += score * 0.3
      dimensions.analysis.max += maxScore * 0.3
    }

    // 高难度题额外贡献评价维度
    if (difficulty === 'hard') {
      dimensions.evaluation.score += score * 0.2
      dimensions.evaluation.max += maxScore * 0.2
    }
  }

  // 计算百分比得分
  const calcPercent = (dim: { score: number; max: number }) =>
    dim.max > 0 ? Math.min(100, Math.round((dim.score / dim.max) * 100)) : 50

  return {
    knowledge: calcPercent(dimensions.knowledge),
    application: calcPercent(dimensions.application),
    analysis: calcPercent(dimensions.analysis),
    synthesis: calcPercent(dimensions.synthesis),
    evaluation: calcPercent(dimensions.evaluation)
  }
}

// AI个性化报告生成
async function generateAIPersonalizedReport(
  apiKey: string,
  testInfo: {
    subject: string
    grade: string
    score: number
    level: string
    abilityRadar: Record<string, number>
    strengthPoints: string[]
    weaknessPoints: string[]
    totalQuestions: number
    correctCount: number
    timeSpent: number
  }
): Promise<{
  summary: string
  detailedAnalysis: string
  recommendations: Array<{
    priority: number
    topic: string
    currentLevel: string
    targetLevel: string
    actionPlan: string
    resources: string[]
    estimatedTime: string
  }>
  progressTimeline: {
    week1: string
    week2: string
    month1: string
    month3: string
  }
  encouragement: string
}> {
  try {
    const prompt = `作为一位专业的DSE学业顾问，请根据以下测试结果，为学生生成详细的个性化学习建议报告。

【测试信息】
- 科目：${testInfo.subject}
- 年级：${testInfo.grade}
- 得分：${testInfo.score}分
- DSE预测等级：${testInfo.level}
- 答题情况：${testInfo.correctCount}/${testInfo.totalQuestions} 题正确
- 用时：${Math.floor(testInfo.timeSpent / 60)}分钟

【能力维度分析】
- 知识理解：${testInfo.abilityRadar.knowledge}%
- 应用能力：${testInfo.abilityRadar.application}%
- 分析能力：${testInfo.abilityRadar.analysis}%
- 综合能力：${testInfo.abilityRadar.synthesis}%
- 评价能力：${testInfo.abilityRadar.evaluation}%

【优势知识点】
${testInfo.strengthPoints.length > 0 ? testInfo.strengthPoints.join('、') : '暂无突出优势'}

【薄弱知识点】
${testInfo.weaknessPoints.length > 0 ? testInfo.weaknessPoints.join('、') : '表现均衡'}

请生成一份包含以下内容的JSON格式报告：
{
  "summary": "2-3句话总结学生整体水平",
  "detailedAnalysis": "详细分析各能力维度的表现和改进方向",
  "recommendations": [
    {
      "priority": 1,
      "topic": "需要改进的知识点",
      "currentLevel": "当前水平描述",
      "targetLevel": "目标水平",
      "actionPlan": "具体行动计划（100字左右）",
      "resources": ["推荐资源1", "推荐资源2"],
      "estimatedTime": "预计所需时间"
    }
  ],
  "progressTimeline": {
    "week1": "第一周目标",
    "week2": "第二周目标",
    "month1": "第一个月目标",
    "month3": "三个月后目标"
  },
  "encouragement": "鼓励性话语，给予学生信心"
}

请只返回JSON，不要有其他内容。`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位经验丰富的香港DSE学业规划顾问，擅长为学生制定个性化的学习计划。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error('AI API error')
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    let content = data.choices[0]?.message?.content || '{}'
    
    // 清理JSON
    if (content.startsWith('```json')) content = content.slice(7)
    if (content.startsWith('```')) content = content.slice(3)
    if (content.endsWith('```')) content = content.slice(0, -3)
    content = content.trim()

    return JSON.parse(content)
  } catch (error) {
    console.error('Generate AI report error:', error)
    
    // 返回基础报告
    return {
      summary: `您在${testInfo.subject}科目的水平测试中获得了${testInfo.score}分，预测DSE等级为${testInfo.level}。`,
      detailedAnalysis: `根据测试结果，您的知识理解能力表现${testInfo.abilityRadar.knowledge >= 70 ? '良好' : '需要加强'}，应用能力${testInfo.abilityRadar.application >= 70 ? '达标' : '有待提升'}。建议针对薄弱知识点进行专项练习。`,
      recommendations: testInfo.weaknessPoints.slice(0, 3).map((point, idx) => ({
        priority: idx + 1,
        topic: point,
        currentLevel: '基础薄弱',
        targetLevel: '熟练掌握',
        actionPlan: `建议每天花30分钟复习${point}相关内容，从基础概念入手，配合练习题巩固。`,
        resources: [`${testInfo.subject} ${point} 教程`, `DSE历年真题`],
        estimatedTime: '2-3周'
      })),
      progressTimeline: {
        week1: '巩固基础概念，完成基础练习',
        week2: '进行综合练习，查漏补缺',
        month1: '完成系统复习，尝试模拟测试',
        month3: '达到目标等级，保持学习习惯'
      },
      encouragement: '学习是一个持续进步的过程，每一次努力都会让你离目标更近一步。加油！'
    }
  }
}

// 水平测试知识点库
const LEVEL_TEST_TOPICS: Record<string, Record<string, string[]>> = {
  '数学': {
    '中四': ['二次方程', '函数及图像', '直线方程', '多项式', '指数与对数', '三角比', '概率初步'],
    '中五': ['等差及等比数列', '变分', '概率', '统计', '三角函数', '圆的方程', '二项式定理'],
    '中六': ['微分', '积分', '向量', '矩阵', '线性规划', '概率分布', '复数']
  },
  '物理': {
    '中四': ['热学', '力学基础', '光学', '电学入门', '波动基础'],
    '中五': ['力与运动', '能量', '波动', '电路', '电磁感应'],
    '中六': ['电磁学', '原子物理', '量子概念', '核物理', '天体物理']
  },
  '化学': {
    '中四': ['微观世界', '金属', '酸碱盐', '氧化还原', '化学键'],
    '中五': ['化学反应速率', '化学平衡', '有机化学基础', '碳化合物'],
    '中六': ['电化学', '分析化学', '工业化学', '化学与环境']
  },
  '生物': {
    '中四': ['细胞与生命', '遗传学基础', '生态系统', '分类学'],
    '中五': ['人体生理', '植物生理', '微生物', '生物技术'],
    '中六': ['分子生物学', '生物技术', '进化论', '生态平衡']
  },
  '经济': {
    '中四': ['基本经济概念', '需求与供给', '市场结构', '弹性'],
    '中五': ['宏观经济', '货币与银行', '国际贸易', '经济指标'],
    '中六': ['经济增长', '政府政策', '全球化', '经济周期']
  },
  '中文': {
    '中四': ['阅读理解', '写作技巧', '古文阅读', '语文知识', '修辞手法'],
    '中五': ['文言文', '文学赏析', '议论文', '实用文', '说明文'],
    '中六': ['综合能力', '文学创作', '批判思维', '经典篇章']
  },
  '英文': {
    '中四': ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Writing Basics', 'Listening'],
    '中五': ['Essay Writing', 'Listening Skills', 'Speaking', 'Data Handling', 'Summary'],
    '中六': ['Advanced Writing', 'Critical Reading', 'Integrated Skills', 'Oral Communication']
  },
  '通识教育': {
    '中四': ['个人成长', '今日香港', '现代中国', '公共卫生'],
    '中五': ['全球化', '能源与环境', '科技发展', '人权法治'],
    '中六': ['综合议题', '独立专题研究', '批判思维']
  }
}

// ===== 题目缓存系统 =====

interface CachedQuestion {
  id: string
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  correctAnswer: string
  scoringPoints?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyWeight: number
  estimatedTime: number
  knowledgePoints: string[]
  topic?: string
  maxScore: number
}

// 从缓存获取题目
async function getQuestionsFromCache(
  db: D1Database,
  subject: string,
  grade: string,
  questionType: 'choice' | 'short' | 'long',
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): Promise<CachedQuestion[]> {
  try {
    // 查询已审核的高质量缓存题目
    const result = await db.prepare(`
      SELECT * FROM question_cache 
      WHERE subject = ? AND grade = ? AND question_type = ? AND difficulty = ?
        AND review_status = 'approved' AND quality_rating >= 3.0
      ORDER BY RANDOM()
      LIMIT ?
    `).bind(subject, grade, questionType, difficulty, count).all()

    const difficultyWeights = { easy: 0.8, medium: 1.0, hard: 1.3 }
    const estimatedTimes = {
      choice: { easy: 30, medium: 60, hard: 90 },
      short: { easy: 120, medium: 180, hard: 240 },
      long: { easy: 300, medium: 420, hard: 600 }
    }
    const maxScores = {
      choice: { easy: 1, medium: 1, hard: 2 },
      short: { easy: 2, medium: 3, hard: 4 },
      long: { easy: 4, medium: 6, hard: 8 }
    }

    return result.results.map((q: Record<string, unknown>) => ({
      id: crypto.randomUUID(), // 使用新ID避免重复
      questionText: q.question_text as string,
      questionType: q.question_type as 'choice' | 'short' | 'long',
      options: q.options ? JSON.parse(q.options as string) : undefined,
      correctAnswer: q.correct_answer as string,
      scoringPoints: q.scoring_points ? JSON.parse(q.scoring_points as string) : undefined,
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      difficultyWeight: difficultyWeights[difficulty],
      estimatedTime: estimatedTimes[questionType][difficulty],
      knowledgePoints: q.knowledge_points ? JSON.parse(q.knowledge_points as string) : [],
      topic: q.topic as string | undefined,
      maxScore: maxScores[questionType][difficulty]
    }))
  } catch (error) {
    console.error('Get cached questions error:', error)
    return []
  }
}

// 保存题目到缓存
async function saveQuestionsToCache(
  db: D1Database,
  subject: string,
  grade: string,
  questions: CachedQuestion[]
): Promise<void> {
  try {
    const now = new Date().toISOString()
    
    for (const q of questions) {
      // 检查是否已存在相似题目（简单去重）
      const existing = await db.prepare(`
        SELECT id FROM question_cache 
        WHERE subject = ? AND grade = ? AND question_type = ? 
          AND question_text = ?
        LIMIT 1
      `).bind(subject, grade, q.questionType, q.questionText).first()

      if (!existing) {
        const cacheId = crypto.randomUUID()
        await db.prepare(`
          INSERT INTO question_cache (
            id, grade, subject, topic, question_type, difficulty,
            question_text, options, correct_answer, scoring_points,
            knowledge_points, estimated_time, usage_count,
            review_status, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', 'ai', ?, ?)
        `).bind(
          cacheId,
          grade,
          subject,
          q.topic || null,
          q.questionType,
          q.difficulty,
          q.questionText,
          q.options ? JSON.stringify(q.options) : null,
          q.correctAnswer,
          q.scoringPoints ? JSON.stringify(q.scoringPoints) : null,
          JSON.stringify(q.knowledgePoints),
          q.estimatedTime,
          now,
          now
        ).run()
      }
    }
  } catch (error) {
    console.error('Save questions to cache error:', error)
  }
}

// 更新缓存题目使用统计
async function updateCacheUsageStats(
  db: D1Database,
  questionIds: string[]
): Promise<void> {
  try {
    const now = new Date().toISOString()
    for (const id of questionIds) {
      await db.prepare(`
        UPDATE question_cache 
        SET usage_count = usage_count + 1, last_used = ?
        WHERE id = ?
      `).bind(now, id).run()
    }
  } catch (error) {
    console.error('Update cache usage stats error:', error)
  }
}

// 水平测试题目生成函数（带缓存支持）
async function generateLevelTestQuestionsWithCache(
  db: D1Database,
  subject: string,
  grade: string,
  distribution: { choice: number; short: number; long: number },
  apiKey: string
): Promise<CachedQuestion[]> {
  const allQuestions: CachedQuestion[] = []
  const questionsToGenerate: { type: 'choice' | 'short' | 'long'; count: number }[] = []

  // 难度分配
  const difficultyDistribution = (count: number) => ({
    easy: Math.round(count * 0.3),
    medium: Math.round(count * 0.5),
    hard: count - Math.round(count * 0.3) - Math.round(count * 0.5)
  })

  // 尝试从缓存获取题目
  for (const [type, count] of Object.entries(distribution) as [('choice' | 'short' | 'long'), number][]) {
    const diffDist = difficultyDistribution(count)
    let typeQuestions: CachedQuestion[] = []
    let neededCount = count

    for (const [diff, diffCount] of Object.entries(diffDist) as [('easy' | 'medium' | 'hard'), number][]) {
      if (diffCount > 0) {
        const cached = await getQuestionsFromCache(db, subject, grade, type, diff, diffCount)
        typeQuestions = typeQuestions.concat(cached)
        neededCount -= cached.length
      }
    }

    allQuestions.push(...typeQuestions)

    // 记录需要生成的数量
    if (neededCount > 0) {
      questionsToGenerate.push({ type, count: neededCount })
    }
  }

  // 如果缓存不足，调用AI生成新题目
  if (questionsToGenerate.length > 0) {
    const aiDistribution = {
      choice: questionsToGenerate.find(q => q.type === 'choice')?.count || 0,
      short: questionsToGenerate.find(q => q.type === 'short')?.count || 0,
      long: questionsToGenerate.find(q => q.type === 'long')?.count || 0
    }

    // 只有当确实需要生成题目时才调用AI
    if (aiDistribution.choice > 0 || aiDistribution.short > 0 || aiDistribution.long > 0) {
      const aiQuestions = await generateLevelTestQuestions(subject, grade, aiDistribution, apiKey)
      allQuestions.push(...aiQuestions)

      // 异步保存到缓存（不阻塞响应）
      saveQuestionsToCache(db, subject, grade, aiQuestions).catch(console.error)
    }
  }

  // 如果题目仍然不足，使用备用题目
  const totalNeeded = distribution.choice + distribution.short + distribution.long
  if (allQuestions.length < totalNeeded * 0.8) {
    return generateFallbackLevelTestQuestions(subject, grade, distribution)
  }

  return allQuestions
}

// 水平测试题目生成函数
async function generateLevelTestQuestions(
  subject: string,
  grade: string,
  distribution: { choice: number; short: number; long: number },
  apiKey: string
): Promise<Array<{
  id: string
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  correctAnswer: string
  scoringPoints?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyWeight: number
  estimatedTime: number
  knowledgePoints: string[]
  topic?: string
  maxScore: number
}>> {
  const topics = LEVEL_TEST_TOPICS[subject]?.[grade] || ['综合知识']
  const questions: Array<{
    id: string
    questionText: string
    questionType: 'choice' | 'short' | 'long'
    options?: string[]
    correctAnswer: string
    scoringPoints?: string[]
    difficulty: 'easy' | 'medium' | 'hard'
    difficultyWeight: number
    estimatedTime: number
    knowledgePoints: string[]
    topic?: string
    maxScore: number
  }> = []

  // 构建提示词
  const isEnglish = subject === '英文'
  const systemPrompt = isEnglish 
    ? `You are a Hong Kong DSE English Language examination expert. Generate high-quality test questions following the HKEAA curriculum guidelines. All questions and answers must be in English.`
    : `你是一位资深的香港DSE考试出题专家。请严格按照香港考评局${subject}科${grade}课程纲要生成高质量的测试题目。使用简体中文。`

  const promptText = isEnglish
    ? `Generate a level test for Form ${grade === '中四' ? '4' : grade === '中五' ? '5' : '6'} English.

Topics: ${topics.join(', ')}

Please generate:
- ${distribution.choice} multiple choice questions (mix of easy, medium, hard)
- ${distribution.short} short answer questions (mix of easy, medium, hard)
- ${distribution.long} extended writing questions (mix of easy, medium, hard)

Return in JSON format:
{
  "choice_questions": [
    {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct_answer": "A", "explanation": "...", "knowledge_points": ["..."], "difficulty": "easy|medium|hard"}
  ],
  "short_questions": [
    {"question": "...", "correct_answer": "...", "scoring_points": ["..."], "knowledge_points": ["..."], "difficulty": "easy|medium|hard"}
  ],
  "long_questions": [
    {"question": "...", "correct_answer": "...", "scoring_points": ["..."], "knowledge_points": ["..."], "difficulty": "easy|medium|hard"}
  ]
}

Return only JSON.`
    : `请为${grade}${subject}学生生成水平测试题目。

【知识范围】
${topics.join('、')}

【题目要求】
1. 选择题 ${distribution.choice} 道（基础、中等、进阶各占约30%、50%、20%）
2. 短答题 ${distribution.short} 道（需提供评分要点）
3. 论述题 ${distribution.long} 道（需提供评分标准）

【返回格式】
请返回JSON格式：
{
  "choice_questions": [
    {"question": "题目内容", "options": ["A. 选项", "B. 选项", "C. 选项", "D. 选项"], "correct_answer": "A", "explanation": "解释", "knowledge_points": ["知识点"], "difficulty": "easy|medium|hard"}
  ],
  "short_questions": [
    {"question": "题目内容", "correct_answer": "标准答案", "scoring_points": ["得分点1", "得分点2"], "knowledge_points": ["知识点"], "difficulty": "easy|medium|hard"}
  ],
  "long_questions": [
    {"question": "题目内容", "correct_answer": "参考答案", "scoring_points": ["评分点1", "评分点2"], "knowledge_points": ["知识点"], "difficulty": "easy|medium|hard"}
  ]
}

只返回JSON，不要其他内容。`

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptText }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices[0]?.message?.content || '{}'
    
    // 清理并解析JSON
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7)
    }
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3)
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3)
    }

    const parsed = JSON.parse(cleanedContent) as {
      choice_questions?: Array<{
        question: string
        options: string[]
        correct_answer: string
        explanation?: string
        knowledge_points: string[]
        difficulty: string
      }>
      short_questions?: Array<{
        question: string
        correct_answer: string
        scoring_points?: string[]
        knowledge_points: string[]
        difficulty: string
      }>
      long_questions?: Array<{
        question: string
        correct_answer: string
        scoring_points?: string[]
        knowledge_points: string[]
        difficulty: string
      }>
    }

    // 处理选择题
    const difficultyWeights = { easy: 0.8, medium: 1.0, hard: 1.3 }
    const estimatedTimes = {
      choice: { easy: 30, medium: 60, hard: 90 },
      short: { easy: 120, medium: 180, hard: 240 },
      long: { easy: 300, medium: 420, hard: 600 }
    }
    const maxScores = {
      choice: { easy: 1, medium: 1, hard: 2 },
      short: { easy: 2, medium: 3, hard: 4 },
      long: { easy: 4, medium: 6, hard: 8 }
    }

    for (const q of (parsed.choice_questions || [])) {
      const diff = (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard'
      questions.push({
        id: crypto.randomUUID(),
        questionText: q.question,
        questionType: 'choice',
        options: q.options,
        correctAnswer: q.correct_answer,
        difficulty: diff,
        difficultyWeight: difficultyWeights[diff],
        estimatedTime: estimatedTimes.choice[diff],
        knowledgePoints: q.knowledge_points || [],
        maxScore: maxScores.choice[diff]
      })
    }

    for (const q of (parsed.short_questions || [])) {
      const diff = (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard'
      questions.push({
        id: crypto.randomUUID(),
        questionText: q.question,
        questionType: 'short',
        correctAnswer: q.correct_answer,
        scoringPoints: q.scoring_points,
        difficulty: diff,
        difficultyWeight: difficultyWeights[diff],
        estimatedTime: estimatedTimes.short[diff],
        knowledgePoints: q.knowledge_points || [],
        maxScore: maxScores.short[diff]
      })
    }

    for (const q of (parsed.long_questions || [])) {
      const diff = (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard'
      questions.push({
        id: crypto.randomUUID(),
        questionText: q.question,
        questionType: 'long',
        correctAnswer: q.correct_answer,
        scoringPoints: q.scoring_points,
        difficulty: diff,
        difficultyWeight: difficultyWeights[diff],
        estimatedTime: estimatedTimes.long[diff],
        knowledgePoints: q.knowledge_points || [],
        maxScore: maxScores.long[diff]
      })
    }

  } catch (error) {
    console.error('Generate level test questions error:', error)
    // 生成备用题目
    return generateFallbackLevelTestQuestions(subject, grade, distribution)
  }

  // 如果题目不足，补充备用题目
  if (questions.length < 10) {
    return generateFallbackLevelTestQuestions(subject, grade, distribution)
  }

  return questions
}

// 备用题目生成
function generateFallbackLevelTestQuestions(
  subject: string,
  grade: string,
  distribution: { choice: number; short: number; long: number }
): Array<{
  id: string
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  correctAnswer: string
  scoringPoints?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyWeight: number
  estimatedTime: number
  knowledgePoints: string[]
  topic?: string
  maxScore: number
}> {
  const questions: Array<{
    id: string
    questionText: string
    questionType: 'choice' | 'short' | 'long'
    options?: string[]
    correctAnswer: string
    scoringPoints?: string[]
    difficulty: 'easy' | 'medium' | 'hard'
    difficultyWeight: number
    estimatedTime: number
    knowledgePoints: string[]
    topic?: string
    maxScore: number
  }> = []

  // 根据科目生成基础题目
  const fallbackQuestions: Record<string, Array<{
    text: string
    type: 'choice' | 'short' | 'long'
    options?: string[]
    answer: string
    points?: string[]
    kp: string[]
    diff: 'easy' | 'medium' | 'hard'
  }>> = {
    '数学': [
      { text: '解方程：2x + 5 = 13', type: 'short', answer: 'x = 4', points: ['移项正确', '计算正确'], kp: ['一元一次方程'], diff: 'easy' },
      { text: '若 x² - 5x + 6 = 0，求 x 的值', type: 'short', answer: 'x = 2 或 x = 3', points: ['因式分解正确', '求解正确'], kp: ['二次方程'], diff: 'medium' },
      { text: '计算：sin²30° + cos²30° = ?', type: 'choice', options: ['A. 0', 'B. 0.5', 'C. 1', 'D. 2'], answer: 'C', kp: ['三角恒等式'], diff: 'easy' },
      { text: '已知等差数列首项为2，公差为3，求第10项', type: 'short', answer: 'a₁₀ = 2 + (10-1)×3 = 29', points: ['公式正确', '计算正确'], kp: ['等差数列'], diff: 'medium' }
    ],
    '物理': [
      { text: '一个物体从静止开始做自由落体运动，2秒后的速度是多少？(g=10m/s²)', type: 'short', answer: 'v = gt = 10×2 = 20 m/s', points: ['公式正确', '计算正确'], kp: ['自由落体运动'], diff: 'easy' },
      { text: '关于牛顿第一定律，下列说法正确的是：', type: 'choice', options: ['A. 物体不受力就静止', 'B. 物体受力才能运动', 'C. 物体不受力保持匀速直线运动或静止', 'D. 力是维持运动的原因'], answer: 'C', kp: ['牛顿运动定律'], diff: 'easy' }
    ],
    '化学': [
      { text: '水的化学式是什么？', type: 'choice', options: ['A. H₂O', 'B. CO₂', 'C. NaCl', 'D. O₂'], answer: 'A', kp: ['化学式'], diff: 'easy' },
      { text: '解释为什么钠与水反应会产生气泡', type: 'short', answer: '钠是活泼金属，与水发生置换反应生成氢气和氢氧化钠', points: ['指出生成氢气', '反应类型正确'], kp: ['金属活动性'], diff: 'medium' }
    ],
    '英文': [
      { text: 'Choose the correct form: She ___ to school every day.', type: 'choice', options: ['A. go', 'B. goes', 'C. going', 'D. went'], answer: 'B', kp: ['Present Simple Tense'], diff: 'easy' },
      { text: 'Write a short paragraph (50-80 words) about your favorite hobby.', type: 'long', answer: 'Model answer about hobbies with proper grammar and vocabulary', points: ['Content relevance', 'Grammar accuracy', 'Vocabulary range', 'Coherence'], kp: ['Writing Skills'], diff: 'medium' }
    ],
    '中文': [
      { text: '"锲而不舍"的意思是什么？', type: 'choice', options: ['A. 坚持不懈', 'B. 半途而废', 'C. 三心二意', 'D. 急于求成'], answer: 'A', kp: ['成语理解'], diff: 'easy' },
      { text: '阅读以下文段，概括其主旨大意', type: 'short', answer: '根据文段内容归纳中心思想', points: ['理解正确', '概括准确'], kp: ['阅读理解'], diff: 'medium' }
    ]
  }

  const subjectQuestions = fallbackQuestions[subject] || fallbackQuestions['数学']
  
  // 生成选择题
  for (let i = 0; i < distribution.choice; i++) {
    const q = subjectQuestions.find(sq => sq.type === 'choice') || subjectQuestions[0]
    questions.push({
      id: crypto.randomUUID(),
      questionText: q.text,
      questionType: 'choice',
      options: q.options,
      correctAnswer: q.answer,
      difficulty: q.diff,
      difficultyWeight: q.diff === 'easy' ? 0.8 : q.diff === 'medium' ? 1.0 : 1.3,
      estimatedTime: q.diff === 'easy' ? 30 : q.diff === 'medium' ? 60 : 90,
      knowledgePoints: q.kp,
      maxScore: q.diff === 'hard' ? 2 : 1
    })
  }

  // 生成短答题
  for (let i = 0; i < distribution.short; i++) {
    const q = subjectQuestions.find(sq => sq.type === 'short') || subjectQuestions[0]
    questions.push({
      id: crypto.randomUUID(),
      questionText: q.text,
      questionType: 'short',
      correctAnswer: q.answer,
      scoringPoints: q.points,
      difficulty: q.diff,
      difficultyWeight: q.diff === 'easy' ? 0.8 : q.diff === 'medium' ? 1.0 : 1.3,
      estimatedTime: q.diff === 'easy' ? 120 : q.diff === 'medium' ? 180 : 240,
      knowledgePoints: q.kp,
      maxScore: q.diff === 'easy' ? 2 : q.diff === 'medium' ? 3 : 4
    })
  }

  // 生成论述题
  for (let i = 0; i < distribution.long; i++) {
    const q = subjectQuestions.find(sq => sq.type === 'long') || subjectQuestions[0]
    questions.push({
      id: crypto.randomUUID(),
      questionText: q.text,
      questionType: 'long',
      correctAnswer: q.answer,
      scoringPoints: q.points,
      difficulty: 'medium',
      difficultyWeight: 1.0,
      estimatedTime: 420,
      knowledgePoints: q.kp,
      maxScore: 6
    })
  }

  return questions
}

// AI评分主观题
async function gradeSubjectiveAnswer(
  questionText: string,
  correctAnswer: string,
  userAnswer: string,
  scoringPoints: string[],
  maxScore: number,
  apiKey: string
): Promise<{ score: number; feedback: string }> {
  if (!userAnswer || userAnswer.trim() === '') {
    return { score: 0, feedback: '未作答' }
  }

  try {
    const prompt = `你是一位经验丰富的DSE阅卷老师。请根据评分标准对学生答案评分。

【题目】
${questionText}

【标准答案】
${correctAnswer}

【评分要点】
${scoringPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

【满分】${maxScore}分

【学生答案】
${userAnswer}

请评分并返回JSON格式：
{"score": 0, "feedback": "评语"}

只返回JSON。`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error('API error')
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices[0]?.message?.content || '{}'
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```json')) cleanedContent = cleanedContent.slice(7)
    if (cleanedContent.startsWith('```')) cleanedContent = cleanedContent.slice(3)
    if (cleanedContent.endsWith('```')) cleanedContent = cleanedContent.slice(0, -3)

    const result = JSON.parse(cleanedContent) as { score: number; feedback: string }
    return {
      score: Math.min(Math.max(0, result.score), maxScore),
      feedback: result.feedback || '已评分'
    }
  } catch (error) {
    console.error('Grade subjective answer error:', error)
    // 简单关键词匹配评分
    const keywords = correctAnswer.split(/[,，。、\s]+/).filter(k => k.length > 1)
    let matchCount = 0
    for (const kw of keywords) {
      if (userAnswer.includes(kw)) matchCount++
    }
    const ratio = keywords.length > 0 ? matchCount / keywords.length : 0
    const score = Math.round(maxScore * ratio)
    return {
      score,
      feedback: score >= maxScore * 0.6 ? '答案基本正确' : '答案需要改进'
    }
  }
}

// ===== 题目多样性增强系统 =====

// 场景库 - 用于随机化题目背景（各科目独立）
const SCENARIO_LIBRARY: Record<string, string[]> = {
  math: [
    '小明在超市购物时', '学校运动会期间', '工程师设计建筑时', '班级郊游活动中',
    '图书馆整理图书时', '农场收获季节', '餐厅准备食材时', '银行计算利息时',
    '物流公司配送时', '电影院安排座位', '游乐场设计游戏', '公司分配奖金时',
    '旅行规划路线时', '装修房屋时', '学校分配教室时', '比赛安排赛程时'
  ],
  physics: [
    '电梯升降过程中', '汽车行驶实验中', '过山车运动分析', '跳伞运动研究',
    '火箭发射实验', '游泳池水压测量', '电路实验室测试', '太阳能板效率测试',
    '高铁制动分析', '桥梁承重测试', '风力发电研究'
  ],
  chemistry: [
    '实验室制备气体时', '食品保存研究中', '环境污染物检测', '药物合成实验',
    '电池效率测试', '水质检测实验', '金属腐蚀分析', '废水处理研究'
  ],
  english: [
    'Reading comprehension passage', 'Grammar fill-in-the-blank', 'Vocabulary multiple choice', 'Sentence error correction',
    'Cloze test practice', 'Essay writing guidance', 'Synonym identification', 'Tense and voice usage',
    'Clause structure analysis', 'Speaking scenario', 'Letter writing format', 'Main idea comprehension'
  ],
  chinese: [
    '文言文阅读', '白话文理解', '成语运用情境', '修辞手法分析',
    '诗词鉴赏题目', '作文审题立意', '古诗文默写', '阅读理解分析',
    '语病修改练习', '文学常识考查', '标点符号运用', '词语辨析题'
  ],
  liberal: [
    '社会议题讨论', '公共政策分析', '环境保护议题', '科技发展影响',
    '全球化现象探讨', '人权法治问题', '可持续发展目标', '香港社会时事'
  ],
  biology: [
    '细胞结构观察', '遗传实验分析', '生态系统研究', '人体系统功能',
    '植物生理实验', '动物行为研究', '微生物培养', '进化论证据'
  ],
  economics: [
    '市场供需分析', '价格机制运作', '国际贸易情境', '货币政策影响',
    '企业成本核算', '消费者行为研究', '经济周期分析', '香港经济发展'
  ],
  geography: [
    '地形地貌分析', '气候变化研究', '人口分布特征', '城市规划案例',
    '自然灾害防治', '资源开发利用', '环境可持续发展', '地图判读技巧'
  ],
  history: [
    '历史事件分析', '史料解读练习', '历史人物评价', '文明发展比较',
    '近代史事件', '香港历史发展', '世界大战影响', '社会变革研究'
  ],
  ict: [
    '程序设计基础', '数据结构应用', '网络安全案例', '系统开发流程',
    '数据库设计', '人工智能应用', '软件测试方法', '信息处理技术'
  ],
  bafs: [
    '财务报表分析', '成本会计计算', '企业管理案例', '投资决策分析',
    '预算编制方法', '现金流量管理', '审计程序应用', '税务筹划方案'
  ]
}

// 数字生成器 - 避免常见数字
function generateDiverseNumbers(difficulty: string, count: number): string[] {
  const ranges: Record<string, { min: number, max: number }[]> = {
    basic: [{ min: 2, max: 25 }, { min: 15, max: 50 }, { min: 30, max: 100 }],
    standard: [{ min: 3, max: 60 }, { min: 20, max: 150 }, { min: 50, max: 500 }],
    challenging: [{ min: 5, max: 100 }, { min: 50, max: 300 }, { min: 100, max: 1000 }],
    exam: [{ min: 7, max: 150 }, { min: 100, max: 500 }, { min: 200, max: 2000 }]
  }
  
  const diffRanges = ranges[difficulty] || ranges.standard
  const numbers: string[] = []
  const usedNumbers = new Set<number>()
  
  // 避免的常见数字组合
  const avoidNumbers = [10, 20, 30, 50, 100, 12, 24, 36, 48, 60]
  
  for (let i = 0; i < count; i++) {
    const range = diffRanges[i % diffRanges.length]
    let num: number
    let attempts = 0
    
    do {
      num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
      attempts++
    } while ((usedNumbers.has(num) || avoidNumbers.includes(num)) && attempts < 20)
    
    usedNumbers.add(num)
    numbers.push(num.toString())
  }
  
  return numbers
}

// 选择随机场景
function selectRandomScenario(subject: string): string {
  const scenarios = SCENARIO_LIBRARY[subject] || SCENARIO_LIBRARY.math
  return scenarios[Math.floor(Math.random() * scenarios.length)]
}

// 生成多样性提示词
function generateDiversityInstructions(recentTopics?: string[]): string[] {
  const instructions = [
    '确保每道题目的情境和背景都完全不同',
    '使用不同的数字组合，避免使用12、24、36、45、60等常见组合',
    '问题的表述方式要多样化，不要使用相同的句式',
    '每道题的知识点侧重要有差异'
  ]
  
  if (recentTopics && recentTopics.length > 0) {
    instructions.push(`避免与以下知识点过于相似：${recentTopics.slice(0, 3).join('、')}`)
  }
  
  return instructions
}

// 带超时的fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 25000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 各科目题目类型指导
const SUBJECT_QUESTION_GUIDANCE: Record<string, string> = {
  english: `【IMPORTANT: English Subject Requirements】
- ALL questions, options, and explanations MUST be written in ENGLISH!
- Question types: grammar (tenses, prepositions, articles), vocabulary, reading comprehension, error correction
- Do NOT write questions in Chinese!
- Example format:
  Question: "Choose the correct word: She _____ to school every day."
  Options: ["goes", "go", "going", "went"]
  Explanation: "The subject 'She' is third person singular, so we use 'goes'."
⚠️ NO math questions! English language questions ONLY!
⚠️ ALL content must be in ENGLISH!`,
  
  chinese: `【中国语文题目要求】
- 阅读理解：白话文/文言文理解
- 语文知识：成语、修辞、语病、标点
- 文学常识：作家作品、文体知识
- 写作技巧：审题立意、结构分析
⚠️ 禁止出数学计算题！只出语文相关题目！`,
  
  math: `【数学题目要求】
- 可出计算题、应用题、几何题
- 使用提供的数字参考
- 包含详细解题步骤`,
  
  physics: `【物理题目要求】
- 力学、电学、热学、光学、波动等
- 可包含计算和概念题
- 需要物理公式应用`,
  
  chemistry: `【化学题目要求】
- 化学方程式、反应类型
- 物质结构、元素性质
- 实验操作和现象分析`,
  
  biology: `【生物题目要求】
- 细胞结构、遗传变异
- 生态系统、人体生理
- 实验设计与分析`,
  
  liberal: `【公民与社会发展题目要求】
- 社会议题分析
- 公共政策评价
- 时事热点讨论
⚠️ 禁止出数学计算题！`,
  
  economics: `【经济题目要求】
- 供需分析、市场结构
- 宏观经济政策
- 国际贸易理论`,
  
  geography: `【地理题目要求】
- 自然地理：地形、气候、水文
- 人文地理：人口、城市、产业
- 地图判读与分析`,
  
  history: `【历史题目要求】
- 史料分析与解读
- 历史事件因果
- 历史评价与比较
⚠️ 禁止出数学计算题！`,
  
  ict: `【资讯及通讯科技题目要求】
- 程序设计基础
- 数据结构与算法
- 网络与系统安全`,
  
  bafs: `【企业会计与财务概论题目要求】
- 财务报表分析
- 成本与管理会计
- 企业管理概念`
}

// 生成刷题题目（增强版 - 带多样性控制和重试机制）
async function generateQuizQuestions(config: QuizConfig, apiKey: string): Promise<GeneratedQuestion[]> {
  const subjectName = QUIZ_SUBJECT_MAP[config.subject] || config.subject
  const gradeName = QUIZ_GRADE_MAP[config.grade] || config.grade
  const difficultyName = QUIZ_DIFFICULTY_MAP[config.difficulty] || config.difficulty

  // 如果没有API Key，返回备用题库题目
  if (!apiKey) {
    console.warn('No API key, using fallback questions')
    return generateFallbackQuestions(config)
  }

  // 重试机制：最多重试2次
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // 生成多样性元素
      const scenario = selectRandomScenario(config.subject)
      const suggestedNumbers = generateDiverseNumbers(config.difficulty, 5)
      
      // 获取科目特定的题目指导
      const subjectGuidance = SUBJECT_QUESTION_GUIDANCE[config.subject] || ''
      
      // 判断是否为非数学科目（不需要数字参考）
      const isNonMathSubject = ['english', 'chinese', 'liberal', 'history'].includes(config.subject)
      
      // 判断是否为英语科目（需要用英文出题）
      const isEnglishSubject = config.subject === 'english'
      
      // 简化提示词以加快响应
      const systemPrompt = isEnglishSubject
        ? `You are a DSE English Language exam expert. Generate questions in ENGLISH ONLY. Output in strict JSON format.`
        : `你是DSE ${subjectName}考试专家。你必须生成${subjectName}科目的题目，不能生成其他科目的题目！用简体中文生成题目，严格按JSON格式输出。`

      const userPrompt = isEnglishSubject
        ? `Generate ${config.questionCount} DSE English Language ${difficultyName} questions for ${gradeName} students.

${subjectGuidance}

Topic reference: "${scenario}"

⚠️ ALL questions, options, and explanations MUST be in ENGLISH!
⚠️ Use letters A/B/C/D for multiple choice answers!
⚠️ This is ENGLISH LANGUAGE subject - test grammar, vocabulary, reading comprehension!

JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question in English",
      "questionType": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Explanation in English",
      "topicTags": ["Grammar", "Vocabulary"],
      "difficultyScore": 3
    }
  ]
}

questionType: multiple_choice/short_answer
Return JSON only, no other text.`
        : `【重要】生成${config.questionCount}道${gradeName}【${subjectName}】${difficultyName}题目。

⚠️⚠️⚠️ 这是【${subjectName}】科目！不是数学！⚠️⚠️⚠️

${subjectGuidance}

场景参考："${scenario}"
${isNonMathSubject ? '' : `数字参考：${suggestedNumbers.join('、')}`}

⚠️ 必须使用简体中文！
⚠️ 选择题答案用字母A/B/C/D！
⚠️ 题目必须是【${subjectName}】相关内容！

JSON格式：
{
  "questions": [
    {
      "id": "q1",
      "question": "题目内容",
      "questionType": "multiple_choice",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "correctAnswer": "A",
      "explanation": "解析",
      "topicTags": ["${subjectName}知识点"],
      "difficultyScore": 3
    }
  ]
}

questionType: multiple_choice/short_answer${isNonMathSubject ? '' : '/calculation'}
只返回JSON，无其他文字。`

      const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.85, // 略微提高温度增加多样性
      }),
    })

      if (!response.ok) {
        console.error(`DeepSeek API error (attempt ${attempt}):`, response.status)
        if (attempt < 2) continue // 重试
        return generateFallbackQuestions(config)
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error(`Empty response (attempt ${attempt})`)
        if (attempt < 2) continue
        return generateFallbackQuestions(config)
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error(`Invalid JSON format (attempt ${attempt})`)
        if (attempt < 2) continue
        return generateFallbackQuestions(config)
      }

      const parsed = JSON.parse(jsonMatch[0]) as { questions: GeneratedQuestion[] }
      
      // 验证返回的题目数量
      if (!parsed.questions || parsed.questions.length === 0) {
        console.error(`No questions returned (attempt ${attempt})`)
        if (attempt < 2) continue
        return generateFallbackQuestions(config)
      }

      return parsed.questions.map((q, i) => ({
        ...q,
        id: `q${i + 1}_${Date.now()}`,
      }))
    } catch (error) {
      console.error(`Generate questions error (attempt ${attempt}):`, error)
      if (attempt < 2) continue
      return generateFallbackQuestions(config)
    }
  }

  return generateFallbackQuestions(config)
}

// 备用题库 - 真实的DSE题目
const FALLBACK_QUESTIONS: Record<string, GeneratedQuestion[]> = {
  math: [
    {
      id: 'fb_math_1',
      question: '若 x² - 5x + 6 = 0，求 x 的值。',
      questionType: 'multiple_choice',
      options: ['x = 2 或 x = 3', 'x = 1 或 x = 6', 'x = -2 或 x = -3', 'x = 2 或 x = -3'],
      correctAnswer: 'A',
      explanation: '将方程分解因式：x² - 5x + 6 = (x - 2)(x - 3) = 0，所以 x = 2 或 x = 3。',
      topicTags: ['二次方程', '因式分解'],
      difficultyScore: 2,
    },
    {
      id: 'fb_math_2',
      question: '一个圆的半径为 7 cm，求这个圆的面积。（取 π = 22/7）',
      questionType: 'multiple_choice',
      options: ['154 cm²', '44 cm²', '49 cm²', '308 cm²'],
      correctAnswer: 'A',
      explanation: '圆的面积 = πr² = (22/7) × 7² = (22/7) × 49 = 22 × 7 = 154 cm²',
      topicTags: ['圆', '面积'],
      difficultyScore: 2,
    },
    {
      id: 'fb_math_3',
      question: '若 3a + 2b = 12 且 a - b = 1，求 a + b 的值。',
      questionType: 'multiple_choice',
      options: ['4', '5', '6', '3'],
      correctAnswer: 'A',
      explanation: '由 a - b = 1 得 a = b + 1。代入第一个方程：3(b+1) + 2b = 12，3b + 3 + 2b = 12，5b = 9，b = 1.8。a = 2.8。a + b = 4.6 ≈ 4',
      topicTags: ['联立方程', '代数'],
      difficultyScore: 3,
    },
    {
      id: 'fb_math_4',
      question: '在一个等差数列中，首项为 3，公差为 4，求第 10 项。',
      questionType: 'multiple_choice',
      options: ['39', '43', '35', '40'],
      correctAnswer: 'A',
      explanation: '等差数列第n项公式：an = a1 + (n-1)d = 3 + (10-1)×4 = 3 + 36 = 39',
      topicTags: ['数列', '等差数列'],
      difficultyScore: 2,
    },
    {
      id: 'fb_math_5',
      question: '某商品原价为 $200，先打八折，再加价 10%，求最终售价。',
      questionType: 'multiple_choice',
      options: ['$176', '$180', '$160', '$172'],
      correctAnswer: 'A',
      explanation: '打八折后：200 × 0.8 = 160。加价10%后：160 × 1.1 = 176。',
      topicTags: ['百分比', '商业数学'],
      difficultyScore: 2,
    },
  ],
  physics: [
    {
      id: 'fb_physics_1',
      question: '一个物体从静止开始做匀加速直线运动，加速度为 2 m/s²，求 5 秒后的速度。',
      questionType: 'multiple_choice',
      options: ['10 m/s', '25 m/s', '5 m/s', '2.5 m/s'],
      correctAnswer: 'A',
      explanation: '由公式 v = u + at，其中 u = 0（静止），a = 2 m/s²，t = 5 s。v = 0 + 2 × 5 = 10 m/s',
      topicTags: ['运动学', '匀加速运动'],
      difficultyScore: 2,
    },
    {
      id: 'fb_physics_2',
      question: '一个质量为 5 kg 的物体受到 20 N 的力作用，求其加速度。',
      questionType: 'multiple_choice',
      options: ['4 m/s²', '100 m/s²', '0.25 m/s²', '25 m/s²'],
      correctAnswer: 'A',
      explanation: '由牛顿第二定律 F = ma，a = F/m = 20/5 = 4 m/s²',
      topicTags: ['力学', '牛顿定律'],
      difficultyScore: 2,
    },
    {
      id: 'fb_physics_3',
      question: '以下哪项关于电流的叙述是正确的？',
      questionType: 'multiple_choice',
      options: ['电流的方向与电子流动方向相反', '电流的方向与电子流动方向相同', '电流只能在固体中流动', '电流的单位是伏特'],
      correctAnswer: 'A',
      explanation: '传统上规定电流方向是正电荷流动的方向，而在导体中实际流动的是电子（带负电），所以电流方向与电子流动方向相反。',
      topicTags: ['电学', '电流'],
      difficultyScore: 2,
    },
  ],
  chemistry: [
    {
      id: 'fb_chem_1',
      question: '以下哪种物质是酸？',
      questionType: 'multiple_choice',
      options: ['盐酸 (HCl)', '氢氧化钠 (NaOH)', '氯化钠 (NaCl)', '水 (H₂O)'],
      correctAnswer: 'A',
      explanation: '盐酸(HCl)是一种强酸，在水中会电离出氢离子(H⁺)。氢氧化钠是碱，氯化钠是盐，水是中性物质。',
      topicTags: ['酸碱', '物质分类'],
      difficultyScore: 1,
    },
    {
      id: 'fb_chem_2',
      question: '氧气的化学式是什么？',
      questionType: 'multiple_choice',
      options: ['O₂', 'O₃', 'CO₂', 'H₂O'],
      correctAnswer: 'A',
      explanation: '氧气由两个氧原子组成，化学式为O₂。O₃是臭氧，CO₂是二氧化碳，H₂O是水。',
      topicTags: ['化学式', '元素'],
      difficultyScore: 1,
    },
    {
      id: 'fb_chem_3',
      question: '以下哪种反应是中和反应？',
      questionType: 'multiple_choice',
      options: ['酸和碱反应生成盐和水', '金属和酸反应生成氢气', '燃烧反应', '分解反应'],
      correctAnswer: 'A',
      explanation: '中和反应是指酸和碱反应生成盐和水的反应。例如：HCl + NaOH → NaCl + H₂O',
      topicTags: ['化学反应', '中和反应'],
      difficultyScore: 2,
    },
  ],
  english: [
    {
      id: 'fb_eng_1',
      question: 'Choose the correct form of the verb: She _____ to school every day.',
      questionType: 'multiple_choice',
      options: ['goes', 'go', 'going', 'gone'],
      correctAnswer: 'A',
      explanation: 'The subject "She" is third person singular. In present simple tense, verbs need to add -s/-es, so we use "goes".',
      topicTags: ['Grammar', 'Tenses', 'Subject-Verb Agreement'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_2',
      question: 'Which word is a synonym for "happy"?',
      questionType: 'multiple_choice',
      options: ['joyful', 'sad', 'angry', 'tired'],
      correctAnswer: 'A',
      explanation: '"Joyful" means full of joy or happiness, making it a synonym for "happy". The other options have opposite or unrelated meanings.',
      topicTags: ['Vocabulary', 'Synonyms'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_3',
      question: 'Choose the correct preposition: The book is _____ the table.',
      questionType: 'multiple_choice',
      options: ['on', 'in', 'at', 'by'],
      correctAnswer: 'A',
      explanation: 'We use "on" to indicate something is on the surface of another object. "In" means inside, "at" indicates a point, and "by" means beside.',
      topicTags: ['Grammar', 'Prepositions'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_4',
      question: 'Find the error in this sentence: "He don\'t like apples."',
      questionType: 'multiple_choice',
      options: ['"don\'t" should be "doesn\'t"', '"like" should be "likes"', '"He" should be "Him"', 'No error'],
      correctAnswer: 'A',
      explanation: 'The subject "He" is third person singular, so the auxiliary verb should be "doesn\'t" instead of "don\'t". The correct sentence is "He doesn\'t like apples."',
      topicTags: ['Grammar', 'Subject-Verb Agreement', 'Error Correction'],
      difficultyScore: 2,
    },
    {
      id: 'fb_eng_5',
      question: 'Choose the correct tense: By next year, I _____ from university.',
      questionType: 'multiple_choice',
      options: ['will have graduated', 'graduated', 'am graduating', 'have graduated'],
      correctAnswer: 'A',
      explanation: '"By next year" indicates a point in the future, so we need the future perfect tense "will have + past participle" to show an action completed before that time.',
      topicTags: ['Grammar', 'Tenses', 'Future Perfect'],
      difficultyScore: 3,
    },
  ],
  chinese: [
    {
      id: 'fb_chi_1',
      question: '下列哪个成语使用正确？',
      questionType: 'multiple_choice',
      options: ['他学习刻苦，成绩突飞猛进。', '这道题很简单，真是难以置信。', '他跑步很慢，健步如飞。', '天气炎热，我们瑟瑟发抖。'],
      correctAnswer: 'A',
      explanation: '"突飞猛进"形容进步很快，用来形容学习进步是正确的。其他选项成语使用不当。',
      topicTags: ['成语', '语言运用'],
      difficultyScore: 2,
    },
    {
      id: 'fb_chi_2',
      question: '"床前明月光，疑是地上霜"出自哪位诗人？',
      questionType: 'multiple_choice',
      options: ['李白', '杜甫', '白居易', '王维'],
      correctAnswer: 'A',
      explanation: '这两句诗出自唐代诗人李白的《静夜思》。',
      topicTags: ['诗词', '文学常识'],
      difficultyScore: 1,
    },
    {
      id: 'fb_chi_3',
      question: '下列句子没有语病的是：',
      questionType: 'multiple_choice',
      options: ['同学们认真听取并讨论了校长的报告。', '通过这次活动，使我受益匪浅。', '他的写作水平有了明显的改进。', '为了防止这类事故不再发生，我们必须加强管理。'],
      correctAnswer: 'A',
      explanation: 'A句语序正确，先"听取"后"讨论"符合逻辑。B句滥用介词导致主语缺失；C句"水平"应与"提高"搭配；D句"防止...不再"否定不当。',
      topicTags: ['语法', '病句辨析'],
      difficultyScore: 3,
    },
    {
      id: 'fb_chi_4',
      question: '"比喻"是一种常见的修辞手法，下列哪句使用了比喻？',
      questionType: 'multiple_choice',
      options: ['弯弯的月亮像小船。', '春天来了，花儿开了。', '他高兴得跳了起来。', '这本书很有趣。'],
      correctAnswer: 'A',
      explanation: '"月亮像小船"将月亮比作小船，是明喻。其他句子没有使用比喻修辞。',
      topicTags: ['修辞手法', '比喻'],
      difficultyScore: 2,
    },
  ],
  liberal: [
    {
      id: 'fb_lib_1',
      question: '以下哪项是可持续发展的核心理念？',
      questionType: 'multiple_choice',
      options: ['满足当代需求又不损害后代满足需求的能力', '只关注经济增长', '只关注环境保护', '只关注社会发展'],
      correctAnswer: 'A',
      explanation: '可持续发展强调在满足当代人需求的同时，不损害后代满足其需求的能力，需要平衡经济、社会和环境三个方面。',
      topicTags: ['可持续发展', '环境保护'],
      difficultyScore: 2,
    },
    {
      id: 'fb_lib_2',
      question: '以下哪项最能体现公民责任？',
      questionType: 'multiple_choice',
      options: ['遵守法律法规，积极参与社区服务', '只关注个人利益', '逃避纳税义务', '不参与公共事务'],
      correctAnswer: 'A',
      explanation: '公民责任包括遵守法律、履行义务、参与公共事务和社区服务等方面。',
      topicTags: ['公民责任', '社会参与'],
      difficultyScore: 2,
    },
  ],
}

// 生成备用题目 - 使用真实题库
function generateFallbackQuestions(config: QuizConfig): GeneratedQuestion[] {
  const subjectName = QUIZ_SUBJECT_MAP[config.subject] || config.subject
  
  // 获取对应科目的备用题目，如果没有则使用数学题目
  let questionPool = FALLBACK_QUESTIONS[config.subject] || FALLBACK_QUESTIONS.math
  
  // 如果题库题目不够，则复制并修改
  const questions: GeneratedQuestion[] = []
  for (let i = 0; i < config.questionCount; i++) {
    const poolIndex = i % questionPool.length
    const baseQuestion = questionPool[poolIndex]
    
    questions.push({
      ...baseQuestion,
      id: `fallback_${i + 1}_${Date.now()}`,
      question: i >= questionPool.length 
        ? `【${subjectName}】${baseQuestion.question}` 
        : baseQuestion.question,
      topicTags: [...(baseQuestion.topicTags || []), subjectName],
      difficultyScore: config.difficulty === 'basic' ? 2 : config.difficulty === 'standard' ? 3 : 4,
    })
  }

  return questions
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
          { role: 'system', content: '你是一位专业的香港DSE教育顾问，擅长分析学生情况并提供升学建议。请用JSON格式回复。绝对禁止输出任何百分比或成功率数字。' },
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

    const ruleAnalysisBySubject = buildRuleAnalysisBySubject(studentInfo.subjects)

    // 解析 AI 返回的结果
    const rawResult = JSON.parse(jsonMatch[0])
    
    // 标准化处理结果，确保格式正确
    return normalizeAnalysisResult(rawResult, ruleAnalysisBySubject)
  } catch (error) {
    console.error('DeepSeek error:', error)
    return generateMockResult(studentInfo)
  }
}

// 标准化 AI 返回的分析结果
function normalizeAnalysisResult(
  raw: Record<string, unknown>,
  ruleAnalysisBySubject: Map<string, { current: ReturnType<typeof analyzeSubjectGrade>; target: ReturnType<typeof analyzeSubjectGrade> }>
): AnalysisResult {
  const overallScore = (raw.overallAssessment as Record<string, unknown>)?.feasibilityScore as number || 70
  const overallLevel = calculateFeasibilityLevel(overallScore)
  
  // 处理学校评估，将百分比转换为等级
  const rawSchoolAssessments = (raw.schoolAssessments as Record<string, unknown>[]) || []
  const schoolAssessments = rawSchoolAssessments.map((school) => {
    // 如果 AI 仍然返回了 admissionProbability，转换为等级
    let level: FeasibilityLevelType = 'C'
    if (school.admissionProbability !== undefined) {
      level = calculateFeasibilityLevel(school.admissionProbability as number)
    } else if (school.feasibilityLevel) {
      // 验证并使用 AI 返回的等级
      const rawLevel = (school.feasibilityLevel as string).toUpperCase()
      if (['A', 'B', 'C', 'D', 'E'].includes(rawLevel)) {
        level = rawLevel as FeasibilityLevelType
      }
    }
    
    return {
      schoolName: school.schoolName as string,
      feasibilityLevel: level,
      levelLabel: FEASIBILITY_LEVEL_CONFIG[level].label,
      levelColor: FEASIBILITY_LEVEL_CONFIG[level].color,
      requirements: (school.requirements as string[]) || [],
      gaps: (school.gaps as string[]) || [],
      recommendations: (school.recommendations as string[]) || [],
    }
  })
  
  return {
    overallAssessment: {
      feasibilityScore: overallScore,
      feasibilityLevel: overallLevel,
      levelDescription: FEASIBILITY_LEVEL_CONFIG[overallLevel].description,
      summary: ((raw.overallAssessment as Record<string, unknown>)?.summary as string) || '',
      keyStrengths: ((raw.overallAssessment as Record<string, unknown>)?.keyStrengths as string[]) || [],
      keyWeaknesses: ((raw.overallAssessment as Record<string, unknown>)?.keyWeaknesses as string[]) || [],
    },
    subjectAnalyses: ((raw.subjectAnalyses as Record<string, unknown>[]) || []).map((s) => {
      const subjectName = s.subject as string
      const ruleAnalysis = ruleAnalysisBySubject.get(subjectName) || {
        current: analyzeSubjectGrade({
          subject: subjectName as SubjectGrade['subject'],
          value: (s.currentLevel as string) || '',
        }),
        target: analyzeSubjectGrade({
          subject: subjectName as SubjectGrade['subject'],
          value: (s.targetLevel as string) || '',
        }),
      }
      return {
        subject: subjectName,
        currentLevel: s.currentLevel as string,
        targetLevel: s.targetLevel as string,
        gap: s.gap as string,
        strengths: (s.strengths as string[]) || [],
        weaknesses: (s.weaknesses as string[]) || [],
        recommendations: (s.recommendations as string[]) || [],
        estimatedTimeToImprove: s.estimatedTimeToImprove as string,
        ruleAnalysis,
      }
    }),
    schoolAssessments,
    studyPlan: {
      weeklySchedule: ((raw.studyPlan as Record<string, unknown>)?.weeklySchedule as string[]) || [],
      monthlyGoals: ((raw.studyPlan as Record<string, unknown>)?.monthlyGoals as string[]) || [],
      resources: ((raw.studyPlan as Record<string, unknown>)?.resources as string[]) || [],
    },
    additionalAdvice: (raw.additionalAdvice as string[]) || [],
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
  // 个人特质信息
  hobbies?: string[]           // 兴趣爱好
  strengths?: string[]         // 个人特长
  extracurriculars?: string[]  // 课外活动
  achievements?: string        // 获奖经历
}

// 可行性等级定义
type FeasibilityLevelType = 'A' | 'B' | 'C' | 'D' | 'E'

const FEASIBILITY_LEVEL_CONFIG: Record<FeasibilityLevelType, { 
  label: string
  color: string
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

// 根据分数计算可行性等级
function calculateFeasibilityLevel(score: number): FeasibilityLevelType {
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 35) return 'D'
  return 'E'
}

interface AnalysisResult {
  overallAssessment: {
    feasibilityScore: number
    feasibilityLevel: FeasibilityLevelType
    levelDescription: string
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
    ruleAnalysis: {
      current: ReturnType<typeof analyzeSubjectGrade>
      target: ReturnType<typeof analyzeSubjectGrade>
    }
  }[]
  schoolAssessments: {
    schoolName: string
    feasibilityLevel: FeasibilityLevelType
    levelLabel: string
    levelColor: string
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
  // 旧格式兼容
  form4: '中四', form5: '中五', form6: '中六',
  form1: '中一', form2: '中二', form3: '中三',
  // 新格式
  S1: '中一', S2: '中二', S3: '中三',
  S4: '中四', S5: '中五', S6: '中六',
  // 直接中文也兼容
  '中一': '中一', '中二': '中二', '中三': '中三',
  '中四': '中四', '中五': '中五', '中六': '中六',
}

function buildRuleAnalysisBySubject(subjects: StudentInfo['subjects']) {
  const map = new Map<string, { current: ReturnType<typeof analyzeSubjectGrade>; target: ReturnType<typeof analyzeSubjectGrade> }>()
  for (const subject of subjects) {
    map.set(subject.subject, {
      current: analyzeSubjectGrade({
        subject: subject.subject as SubjectGrade['subject'],
        value: subject.currentScore,
      }),
      target: analyzeSubjectGrade({
        subject: subject.subject as SubjectGrade['subject'],
        value: subject.targetScore,
      }),
    })
  }
  return map
}

// 构建分析提示词
function buildAnalysisPrompt(studentInfo: StudentInfo): string {
  const subjectsText = studentInfo.subjects
    .map(s => `  - ${SUBJECT_NAME_MAP[s.subject] || s.subject}: 当前${s.currentScore}级，目标${s.targetScore}级`)
    .join('\n')

  const subjectNames = studentInfo.subjects.map(s => SUBJECT_NAME_MAP[s.subject] || s.subject)

  // 获取年级名称，确保不会为空
  const gradeName = GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade || '中四'
  
  // 计算距离插班的时间
  let timeToEnrollment = ''
  if (studentInfo.enrollmentDate) {
    const enrollDate = new Date(studentInfo.enrollmentDate)
    const now = new Date()
    const diffDays = Math.ceil((enrollDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 0) {
      const months = Math.floor(diffDays / 30)
      const days = diffDays % 30
      timeToEnrollment = months > 0 ? `约${months}个月${days > 0 ? days + '天' : ''}` : `${diffDays}天`
    } else {
      timeToEnrollment = '即将进行'
    }
  }
  
  return `你是一位资深的香港DSE教育专家。请根据以下【已完整提供】的学生信息，提供专业的插班分析和建议。

【学生基本信息】（★重要：以下所有信息均已完整提供，请直接使用进行分析）：
- 插班目标日期：${studentInfo.enrollmentDate || '近期'}
- 目标学期：${studentInfo.semester || '下学期'}
- 距离插班时间：${timeToEnrollment || '待确定'}
- 当前年级：${gradeName}
- 学生年龄：${studentInfo.age || 16}岁
- 原就读学校：${studentInfo.currentSchool || '（学生未填写，请忽略此项）'}

【各科目成绩详情】（共${studentInfo.subjects.length}个科目）：
${subjectsText}

【目标学校】（共${studentInfo.targetSchools.length}所）：${studentInfo.targetSchools.join('、')}

【个人特质与综合素质】：
- 兴趣爱好：${studentInfo.hobbies?.length ? studentInfo.hobbies.join('、') : '未填写'}
- 个人特长：${studentInfo.strengths?.length ? studentInfo.strengths.join('、') : '未填写'}
- 课外活动：${studentInfo.extracurriculars?.length ? studentInfo.extracurriculars.join('、') : '未填写'}
- 获奖经历：${studentInfo.achievements || '未填写'}

【学生备注】：${studentInfo.notes || '无'}

请严格按照以下JSON格式返回分析结果，不要添加任何其他内容：

{
  "overallAssessment": {
    "feasibilityScore": <0-100的整数，表示插班可行性评分>,
    "summary": "<综合评估摘要，200字以内>",
    "keyStrengths": ["优势1", "优势2", "优势3"],
    "keyWeaknesses": ["待改进项1", "待改进项2", "待改进项3"]
  },
  "subjectAnalyses": [
    {
      "subject": "<科目名称>",
      "currentLevel": "<当前等级>",
      "targetLevel": "<目标等级>",
      "gap": "<差距描述，如'差1级'或'已达标'>",
      "strengths": ["科目优势1", "科目优势2"],
      "weaknesses": ["待改进1", "待改进2"],
      "recommendations": ["建议1", "建议2", "建议3"],
      "estimatedTimeToImprove": "<预计提升时间>"
    }
  ],
  "schoolAssessments": [
    {
      "schoolName": "<学校名称>",
      "feasibilityLevel": "<A/B/C/D/E，可行性等级>",
      "requirements": ["录取要求1", "录取要求2"],
      "gaps": ["与学校要求的差距1", "差距2"],
      "recommendations": ["针对该校的建议1", "建议2"]
    }
  ],
  "studyPlan": {
    "weeklySchedule": ["周一安排", "周二安排", "..."],
    "monthlyGoals": ["第1个月目标", "第2个月目标", "..."],
    "resources": ["推荐资源1", "推荐资源2", "..."]
  },
  "additionalAdvice": ["建议1", "建议2", "建议3", "建议4"]
}

【★★★ 可行性等级说明（必须严格遵守）★★★】
- A级：学生条件与学校要求高度匹配，通过适当准备有较大机会
- B级：基本符合学校要求，部分方面需针对性加强
- C级：与学校要求存在一定差距，需要较长时间准备
- D级：差距较大，需要显著提升或考虑调整目标学校
- E级：当前条件与目标学校要求差距显著，建议重新评估

【★★★ 绝对禁止输出百分比或成功率 ★★★】
- ❌ 禁止："录取概率70%"、"成功率65%"、"admissionProbability"
- ✅ 正确：使用 A/B/C/D/E 等级表示可行性

重要注意事项：
1. subjectAnalyses 必须包含以下科目的分析：${subjectNames.join('、')}
2. schoolAssessments 必须包含以下学校的评估：${studentInfo.targetSchools.join('、')}
3. 所有数组字段不能为空
4. 只返回JSON，不要有其他文字说明
5. 【★★★★ 最重要 - 绝对禁止以下内容 ★★★★】
   在 keyWeaknesses 和所有其他字段中，严禁出现任何关于"信息缺失"的表述！
   
   ❌ 禁止的表述（一个都不能出现）：
   - "未提供插班具体时间" 
   - "未提供插班时间"
   - "缺乏原校背景"
   - "缺乏课外活动信息"
   - "背景信息不足"
   - "信息缺失"
   - "资料不完整"
   - "未明确"
   - "未提供"
   - "规划紧迫性不明"
   
   ✅ keyWeaknesses 应该只包含【学术能力相关】的待改进项，例如：
   - "英文成绩需要提升至X级"
   - "数学基础需要加强"
   - "目标学校竞争激烈，需提前准备"
   - "准备时间${timeToEnrollment || '有限'}，需抓紧复习"

6. 请充分利用以上所有信息进行分析：
   - 根据【插班日期】和【距离时间】评估准备时间是否充足
   - 根据【年级】评估与目标学校课程的衔接
   - 根据【各科成绩】评估学术竞争力
   - 根据【目标学校】评估录取难度
   - 根据【个人特质】评估综合素质和面试优势
   - 如有【获奖经历】，请作为加分项纳入评估
   - 如有【课外活动】，请评估是否有助于申请
   - 如有【备注】信息，请纳入分析考量
   
7. 关于个人特质的分析要求：
   - 如果学生填写了兴趣爱好、特长、课外活动等，请在keyStrengths中体现
   - 综合评估时考虑学术成绩+综合素质的整体竞争力
   - 在建议中可以提到如何在面试中展示个人特质`
}

// 生成模拟结果
function generateMockResult(studentInfo: StudentInfo): AnalysisResult {
  // 处理各种年级格式
  const grade = studentInfo.grade || 'S4'
  const isHighGrade = ['form6', 'S6', 'S5', 'form5', '中五', '中六'].includes(grade)
  const isLowGrade = ['form4', 'S4', 'S1', 'S2', 'S3', 'form1', 'form2', 'form3', '中一', '中二', '中三', '中四'].includes(grade)
  const baseScore = isHighGrade ? 60 : isLowGrade ? 75 : 70
  const gradeName = GRADE_NAME_MAP[grade] || grade || '中四'
  const overallLevel = calculateFeasibilityLevel(baseScore)

  return {
    overallAssessment: {
      feasibilityScore: baseScore,
      feasibilityLevel: overallLevel,
      levelDescription: FEASIBILITY_LEVEL_CONFIG[overallLevel].description,
      summary: `该学生目前就读${gradeName}，计划于${studentInfo.enrollmentDate || '近期'}插班。根据提供的成绩信息，整体学术表现中等偏上。建议重点加强薄弱科目的学习，为目标学校的录取做好准备。`,
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
      ruleAnalysis: ruleAnalysisBySubject.get(s.subject) || {
        current: analyzeSubjectGrade({
          subject: s.subject as SubjectGrade['subject'],
          value: s.currentScore,
        }),
        target: analyzeSubjectGrade({
          subject: s.subject as SubjectGrade['subject'],
          value: s.targetScore,
        }),
      },
    })),
    schoolAssessments: studentInfo.targetSchools.map((school, i) => {
      // 根据学校排序计算可行性等级
      const schoolScore = Math.max(35, baseScore - i * 15)
      const level = calculateFeasibilityLevel(schoolScore)
      return {
        schoolName: school,
        feasibilityLevel: level,
        levelLabel: FEASIBILITY_LEVEL_CONFIG[level].label,
        levelColor: FEASIBILITY_LEVEL_CONFIG[level].color,
        requirements: ['优异的DSE成绩', '良好的品行记录', '面试表现优秀'],
        gaps: ['部分科目成绩需提升', '需准备面试'],
        recommendations: ['重点提升薄弱科目', '准备自我介绍', '了解学校文化'],
      }
    }),
    studyPlan: {
      weeklySchedule: ['周一至周五：每天2小时自习', '周六：难题训练', '周日：综合复习'],
      monthlyGoals: ['第1个月：夯实基础', '第2个月：针对性提升', '第3个月：模拟训练'],
      resources: ['DSE历年真题集', '各科知识点总结', '在线模拟平台'],
    },
    additionalAdvice: ['保持规律作息', '定期与老师沟通', '适当体育锻炼', '保持积极心态'],
  }
}

// =====================
// 大学申请分析相关
// =====================

interface UniversityApplicationInput {
  dseResults: { subject: string; grade: string }[]
  targetUniversities: string[]
  targetMajors: string[]
  extracurriculars?: string
  careerInterests?: string[]
}

interface UniversityAnalysisResult {
  admissionAnalysis: {
    overallScore: number
    summary: string
    targetProgramAnalyses: {
      university: string
      program: string
      admissionChance: 'high' | 'medium' | 'low'
      minScore: number
      yourScore: number
      analysis: string
      recommendations: string[]
    }[]
  }
  alternativeRecommendations: {
    program: string
    university: string
    matchScore: number
    reason: string
  }[]
  careerAnalysis: {
    industryTrends: string[]
    highDemandFields: string[]
    salaryOutlook: string
    aiImpact: string
  }
  applicationStrategy: {
    bandAStrategy: string[]
    interviewTips: string[]
    personalStatementAdvice: string[]
  }
  backupPlans: string[]
  subjectAnalyses: {
    subject: string
    grade: string
    ruleAnalysis: ReturnType<typeof analyzeSubjectGrade>
  }[]
}

// 大学申请分析
async function analyzeUniversityApplication(
  input: UniversityApplicationInput, 
  bestFive: number,
  apiKey: string
): Promise<UniversityAnalysisResult> {
  if (!apiKey) {
    return generateMockUniversityResult(input, bestFive)
  }

  try {
    const prompt = buildUniversityAnalysisPrompt(input, bestFive)
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一位专业的香港大学申请顾问和职业规划专家。请用JSON格式回复。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status)
      return generateMockUniversityResult(input, bestFive)
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return generateMockUniversityResult(input, bestFive)
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return generateMockUniversityResult(input, bestFive)
    }

    const parsed = JSON.parse(jsonMatch[0]) as UniversityAnalysisResult
    return {
      ...parsed,
      subjectAnalyses: input.dseResults.map((result) => ({
        subject: result.subject,
        grade: result.grade,
        ruleAnalysis: analyzeSubjectGrade({
          subject: result.subject as SubjectGrade['subject'],
          value: result.grade,
        }),
      })),
    }
  } catch (error) {
    console.error('DeepSeek error:', error)
    return generateMockUniversityResult(input, bestFive)
  }
}

// 构建大学申请分析提示词
function buildUniversityAnalysisPrompt(input: UniversityApplicationInput, bestFive: number): string {
  const dseText = input.dseResults.map(r => `${r.subject}: ${r.grade}`).join(', ')
  
  return `你是一位专业的香港大学申请顾问。请根据以下学生信息提供详细的升学分析。

学生DSE成绩：${dseText}
最佳5科总分：${bestFive}分

目标大学：${input.targetUniversities.join('、')}
目标专业：${input.targetMajors.join('、')}
课外活动：${input.extracurriculars || '未填写'}
职业兴趣：${input.careerInterests?.join('、') || '未填写'}

请严格按照以下JSON格式返回分析结果：

{
  "admissionAnalysis": {
    "overallScore": <0-100的整数，综合评分>,
    "summary": "<整体分析摘要，200字以内>",
    "targetProgramAnalyses": [
      {
        "university": "<大学名称>",
        "program": "<专业名称>",
        "admissionChance": "<'high'或'medium'或'low'>",
        "minScore": <该专业最低录取分数>,
        "yourScore": ${bestFive},
        "analysis": "<录取分析>",
        "recommendations": ["建议1", "建议2"]
      }
    ]
  },
  "alternativeRecommendations": [
    {
      "program": "<备选专业>",
      "university": "<大学>",
      "matchScore": <匹配分数0-100>,
      "reason": "<推荐理由>"
    }
  ],
  "careerAnalysis": {
    "industryTrends": ["趋势1", "趋势2"],
    "highDemandFields": ["领域1", "领域2"],
    "salaryOutlook": "<薪资前景分析>",
    "aiImpact": "<AI对这些专业的影响分析>"
  },
  "applicationStrategy": {
    "bandAStrategy": ["策略1", "策略2"],
    "interviewTips": ["技巧1", "技巧2"],
    "personalStatementAdvice": ["建议1", "建议2"]
  },
  "backupPlans": ["备选方案1", "备选方案2"]
}

注意：只返回JSON，不要有其他文字。`
}

// 生成模拟大学申请分析结果
function generateMockUniversityResult(input: UniversityApplicationInput, bestFive: number): UniversityAnalysisResult {
  const chanceLevel = bestFive >= 30 ? 'high' : bestFive >= 24 ? 'medium' : 'low'
  
  return {
    admissionAnalysis: {
      overallScore: Math.min(95, bestFive * 3),
      summary: `根据您的DSE成绩（最佳5科：${bestFive}分），您在JUPAS申请中具有${chanceLevel === 'high' ? '较强' : chanceLevel === 'medium' ? '一定' : '有限'}的竞争力。建议合理选择目标专业，同时准备备选方案。`,
      targetProgramAnalyses: input.targetMajors.map((major, i) => ({
        university: input.targetUniversities[i % input.targetUniversities.length] || '香港大学',
        program: major,
        admissionChance: chanceLevel,
        minScore: 25,
        yourScore: bestFive,
        analysis: `该专业竞争${chanceLevel === 'high' ? '较为激烈' : '适中'}，您的成绩${bestFive >= 28 ? '具有竞争力' : '需要认真准备'}。`,
        recommendations: ['准备好面试', '突出个人特色', '展示相关经历'],
      })),
    },
    alternativeRecommendations: [
      { program: '工商管理', university: '香港理工大学', matchScore: 75, reason: '入学门槛适中，就业前景良好' },
      { program: '社会科学', university: '香港城市大学', matchScore: 70, reason: '课程多元，符合您的兴趣方向' },
    ],
    careerAnalysis: {
      industryTrends: ['金融科技持续增长', 'AI/数据科学人才需求旺盛', '医疗健康行业稳定发展'],
      highDemandFields: ['软件工程', '数据分析', '数字营销', '医疗护理'],
      salaryOutlook: '大学毕业生平均起薪约$18,000-25,000港元/月，热门专业可达$30,000以上',
      aiImpact: 'AI技术将改变多个行业的工作模式，建议培养AI相关技能以提升竞争力',
    },
    applicationStrategy: {
      bandAStrategy: ['第一选择放心仪专业', '第二选择放稳妥专业', '第三选择作为保底'],
      interviewTips: ['了解专业课程内容', '准备个人经历分享', '展示学习热情'],
      personalStatementAdvice: ['突出个人特色', '结合实际经历', '展示对专业的理解'],
    },
    backupPlans: ['考虑副学士课程', '海外升学选项', '重读提升成绩'],
    subjectAnalyses: input.dseResults.map((result) => ({
      subject: result.subject,
      grade: result.grade,
      ruleAnalysis: analyzeSubjectGrade({
        subject: result.subject as SubjectGrade['subject'],
        value: result.grade,
      }),
    })),
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

        // 详细的字段验证
        if (!name || name.trim().length === 0) {
          return errorResponse('请输入用户名', 400, origin)
        }
        if (name.trim().length < 2) {
          return errorResponse('用户名至少需要2个字符', 400, origin)
        }
        if (name.trim().length > 50) {
          return errorResponse('用户名不能超过50个字符', 400, origin)
        }

        if (!email || email.trim().length === 0) {
          return errorResponse('请输入邮箱地址', 400, origin)
        }
        // 简单的邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return errorResponse('请输入有效的邮箱地址', 400, origin)
        }

        if (!password) {
          return errorResponse('请输入密码', 400, origin)
        }
        if (password.length < 6) {
          return errorResponse('密码至少需要6个字符', 400, origin)
        }
        if (password.length > 100) {
          return errorResponse('密码不能超过100个字符', 400, origin)
        }

        // 检查邮箱是否已存在
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first()
        if (existing) {
          return errorResponse('该邮箱已被注册，请使用其他邮箱或直接登录', 400, origin)
        }

        const userId = crypto.randomUUID()
        const passwordHash = await hashPassword(password)
        const now = new Date().toISOString()

        await env.DB.prepare(
          'INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(userId, name.trim(), email.toLowerCase().trim(), passwordHash, now, now).run()

        const token = await generateToken({ userId, email: email.toLowerCase().trim() }, env.JWT_SECRET)

        return jsonResponse({
          message: '注册成功',
          user: { id: userId, name: name.trim(), email: email.toLowerCase().trim(), createdAt: now },
          token,
        }, 201, origin)
      }

      // 用户登录
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json() as { email: string; password: string }
        const { email, password } = body

        // 验证输入
        if (!email || email.trim().length === 0) {
          return errorResponse('请输入邮箱地址', 400, origin)
        }
        if (!password) {
          return errorResponse('请输入密码', 400, origin)
        }

        const user = await env.DB.prepare(
          'SELECT id, name, email, password_hash, avatar, created_at FROM users WHERE email = ?'
        ).bind(email.toLowerCase().trim()).first() as { id: string; name: string; email: string; password_hash: string; avatar?: string; created_at: string } | null

        if (!user) {
          return errorResponse('该邮箱尚未注册，请先注册账号', 401, origin)
        }

        const valid = await verifyPassword(password, user.password_hash)
        if (!valid) {
          return errorResponse('密码错误，请重新输入', 401, origin)
        }

        const token = await generateToken({ userId: user.id, email: user.email }, env.JWT_SECRET)

        return jsonResponse({
          message: '登录成功',
          user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, createdAt: user.created_at },
          token,
        }, 200, origin)
      }

      // 获取当前用户信息
      if (path === '/api/auth/me' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const user = await env.DB.prepare(
          'SELECT id, name, email, avatar, created_at FROM users WHERE id = ?'
        ).bind(tokenData.userId).first() as { id: string; name: string; email: string; avatar: string | null; created_at: string } | null

        if (!user) {
          return errorResponse('用户不存在', 404, origin)
        }

        return jsonResponse({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.created_at,
          },
        }, 200, origin)
      }

      // =====================
      // 配置数据 API
      // =====================

      // 获取支持的科目列表
      if (path === '/api/analysis/subjects' && request.method === 'GET') {
        const subjects = SUBJECTS.map((subject, index) => ({
          id: subject,
          name: subject,
          nameEn: subject,
          category: index < 4 ? 'core' : 'elective',
        }))
        return jsonResponse({ subjects }, 200, origin)
      }

      // 获取成绩等级列表
      if (path === '/api/analysis/grades' && request.method === 'GET') {
        const grades = [
          { id: 'S1', name: '中一', description: '中一相对容易插班' },
          { id: 'S2', name: '中二', description: '中二为基准难度' },
          { id: 'S3', name: '中三', description: '中三难度略增' },
          { id: 'S4', name: '中四', description: 'DSE选科后难度增加' },
          { id: 'S5', name: '中五', description: '名额稀缺，竞争激烈' },
          { id: 'S6', name: '中六', description: '几乎不接受插班' },
        ]
        return jsonResponse({ grades }, 200, origin)
      }

      // 获取学校列表
      if (path === '/api/analysis/schools' && request.method === 'GET') {
        const url = new URL(request.url)
        const district = url.searchParams.get('district')
        const band = url.searchParams.get('band')

        let schools = Object.entries(SCHOOLS_BY_DISTRICT).flatMap(([dist, schoolList]) =>
          schoolList.map(school => ({
            ...school,
            district: dist,
          }))
        )

        // 按地区筛选
        if (district) {
          schools = schools.filter(s => s.district === district)
        }

        // 按 Band 筛选
        if (band) {
          const bandLevel = parseInt(band, 10)
          schools = schools.filter(s => s.band === bandLevel)
        }

        return jsonResponse({ 
          schools: schools.map(s => ({
            id: s.name, // 使用学校名作为 ID
            name: s.name,
            nameEn: s.nameEn || s.name,
            district: s.district,
            bandLevel: s.band,
            gender: s.gender || 'coed',
            type: s.type || 'aided',
          })),
          total: schools.length,
        }, 200, origin)
      }

      // =====================
      // 规则评分 API（不调用 AI）
      // =====================

      // 纯规则评分
      if (path === '/api/placement/score' && request.method === 'POST') {
        const body = await request.json() as {
          student: {
            age?: number
            gender?: 'male' | 'female'
            currentGrade: string
            scores: Record<string, number>
            currentSchool?: string
            strengths?: string[]
            extracurriculars?: string[]
          }
          targetSchool: {
            schoolId?: string
            schoolName: string
            bandLevel: 1 | 2 | 3
            district: string
            gender?: 'boys' | 'girls' | 'coed'
            type?: 'government' | 'aided' | 'dss' | 'private'
          }
        }

        const { student, targetSchool } = body

        // Band等级对应的基准分数要求
        const BAND_THRESHOLDS: Record<number, { chinese: number; english: number; math: number; minAverage: number }> = {
          1: { chinese: 70, english: 75, math: 70, minAverage: 72 },
          2: { chinese: 55, english: 60, math: 55, minAverage: 58 },
          3: { chinese: 40, english: 45, math: 40, minAverage: 42 },
        }

        // 区域竞争强度系数
        const DISTRICT_FACTORS: Record<string, number> = {
          '中西區': 1.15, '灣仔區': 1.12, '東區': 1.05, '南區': 1.02,
          '九龍城區': 1.18, '油尖旺區': 1.10, '深水埗區': 1.05, '黃大仙區': 1.00, '觀塘區': 1.02,
          '沙田區': 1.12, '大埔區': 1.05, '北區': 0.98, '西貢區': 1.08,
          '葵青區': 1.00, '荃灣區': 1.02, '屯門區': 1.00, '元朗區': 0.98, '離島區': 0.95,
        }

        // 年级难度系数
        const GRADE_FACTORS: Record<string, number> = {
          'S1': 0.90, 'S2': 0.95, 'S3': 1.00, 'S4': 1.15, 'S5': 1.25, 'S6': 1.40,
        }

        const thresholds = BAND_THRESHOLDS[targetSchool.bandLevel]
        const districtFactor = DISTRICT_FACTORS[targetSchool.district] || 1.0
        const gradeFactor = GRADE_FACTORS[student.currentGrade] || 1.0

        // 计算平均分
        const scores = student.scores
        const allScores = Object.values(scores)
        const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

        // 计算调整后的要求
        const adjustedMinAverage = thresholds.minAverage * districtFactor * gradeFactor
        const scoreDiff = averageScore - adjustedMinAverage

        // 评估风险因素
        const reasons: string[] = []
        const positiveReasons: string[] = []
        let baseScore = 70 // 基础分

        // 成绩评估
        if (scoreDiff >= 10) {
          baseScore += 15
          positiveReasons.push('整体成绩优于该校常见要求')
        } else if (scoreDiff >= 0) {
          baseScore += 5
          positiveReasons.push('整体成绩达到基本要求')
        } else if (scoreDiff >= -10) {
          baseScore -= 10
          reasons.push('整体成绩略低于该校一般要求')
        } else {
          baseScore -= 25
          reasons.push('整体成绩与该校常见插班要求有较大差距')
        }

        // 核心科目评估
        const coreSubjects = ['chinese', 'english', 'math']
        for (const subject of coreSubjects) {
          const score = scores[subject]
          if (score !== undefined) {
            const threshold = thresholds[subject as keyof typeof thresholds] as number
            if (score < threshold - 15) {
              baseScore -= 10
              reasons.push(`${subject === 'chinese' ? '中文' : subject === 'english' ? '英文' : '数学'}成绩偏低`)
            } else if (score >= threshold + 10) {
              baseScore += 5
              positiveReasons.push(`${subject === 'chinese' ? '中文' : subject === 'english' ? '英文' : '数学'}成绩优秀`)
            }
          }
        }

        // 年级难度调整
        if (['S4', 'S5', 'S6'].includes(student.currentGrade)) {
          baseScore -= 10
          reasons.push('高年级插班名额稀缺，竞争激烈')
        }

        // Band 跨级评估
        if (targetSchool.bandLevel === 1 && averageScore < 65) {
          baseScore -= 15
          reasons.push('目标为 Band 1 学校，需要更高的学术表现')
        }

        // 加分项
        if (student.strengths && student.strengths.length > 0) {
          baseScore += Math.min(student.strengths.length * 2, 10)
          positiveReasons.push('具备个人特长优势')
        }
        if (student.extracurriculars && student.extracurriculars.length > 0) {
          baseScore += Math.min(student.extracurriculars.length * 2, 10)
          positiveReasons.push('课外活动丰富')
        }

        // 限制分数范围
        const finalScore = Math.max(0, Math.min(100, baseScore))

        // 等级映射
        let level: string
        let levelDescription: string
        if (finalScore >= 80) {
          level = 'A'
          levelDescription = '可行性高 - 具备较强竞争力'
        } else if (finalScore >= 60) {
          level = 'B'
          levelDescription = '可行性中等 - 有一定机会，建议针对性提升'
        } else if (finalScore >= 45) {
          level = 'C'
          levelDescription = '可行性偏低 - 需要系统性提升后再尝试'
        } else if (finalScore >= 30) {
          level = 'D'
          levelDescription = '可行性较低 - 不建议现阶段尝试'
        } else {
          level = 'E'
          levelDescription = '可行性极低 - 建议先巩固基础，调整目标后再考虑插班'
        }

        // 免责声明
        const disclaimer = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。'

        return jsonResponse({
          score: finalScore,
          level,
          levelDescription,
          reasons,
          positiveReasons,
          breakdown: {
            baseScore: 70,
            scoreAdjustment: baseScore - 70,
            districtFactor,
            gradeFactor,
            finalScore,
          },
          disclaimer,
        }, 200, origin)
      }

      // 提交分析
      if (path === '/api/analysis/submit' && request.method === 'POST') {
        const body = await request.json() as StudentInfo

        const grades: SubjectGrade[] = body.subjects.flatMap((item) => ([
          { subject: item.subject as SubjectGrade['subject'], value: item.currentScore },
          { subject: item.subject as SubjectGrade['subject'], value: item.targetScore },
        ]))
        validateSubjectGrades(grades)

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

        // 免责声明
        const disclaimer = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。'

        return jsonResponse({
          message: '分析完成',
          result: {
            id: recordId,
            createdAt: now,
            studentInfo: body,
            ...analysisResult,
            disclaimer,
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

        // 免责声明
        const disclaimer = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。'

        return jsonResponse({
          result: {
            id: record.id,
            createdAt: record.created_at,
            studentInfo: JSON.parse(record.student_info),
            ...JSON.parse(record.result),
            disclaimer,
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

      // 删除历史记录
      if (path.startsWith('/api/analysis/history/') && request.method === 'DELETE') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const recordId = path.split('/').pop()
        if (!recordId) {
          return errorResponse('无效的记录ID', 400, origin)
        }

        // 验证记录是否属于当前用户
        const record = await env.DB.prepare(
          'SELECT id FROM analysis_records WHERE id = ? AND user_id = ?'
        ).bind(recordId, tokenData.userId).first()

        if (!record) {
          return errorResponse('记录不存在或无权删除', 404, origin)
        }

        // 删除记录
        await env.DB.prepare('DELETE FROM analysis_records WHERE id = ?').bind(recordId).run()

        return jsonResponse({ message: '删除成功' }, 200, origin)
      }

      // =====================
      // 用户反馈 API
      // =====================

      // 提交分析反馈
      if (path === '/api/analysis/feedback' && request.method === 'POST') {
        const body = await request.json() as {
          analysisId: string
          userOutcome: 'success' | 'failure' | 'not_tried' | 'pending'
          targetSchool?: string
          updatedScores?: Record<string, string>
          isEnrolled?: boolean
          enrolledCourse?: string
          feedbackText?: string
          difficultyRating?: number
          accuracyRating?: number
          usefulnessRating?: number
        }

        // 验证必填字段
        if (!body.analysisId) {
          return errorResponse('缺少分析ID', 400, origin)
        }
        if (!body.userOutcome || !['success', 'failure', 'not_tried', 'pending'].includes(body.userOutcome)) {
          return errorResponse('无效的结果类型', 400, origin)
        }

        // 验证分析记录是否存在
        const analysisRecord = await env.DB.prepare(
          'SELECT id FROM analysis_records WHERE id = ?'
        ).bind(body.analysisId).first()

        if (!analysisRecord) {
          return errorResponse('分析记录不存在', 404, origin)
        }

        // 获取用户ID（如果已登录）
        let userId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          const tokenData = await verifyToken(token, env)
          if (tokenData) {
            userId = tokenData.userId
          }
        }

        // 检查是否已有反馈
        const existingFeedback = await env.DB.prepare(
          'SELECT id FROM analysis_feedback WHERE analysis_id = ?'
        ).bind(body.analysisId).first()

        const now = new Date().toISOString()

        if (existingFeedback) {
          // 更新现有反馈
          await env.DB.prepare(`
            UPDATE analysis_feedback SET
              user_outcome = ?,
              target_school = ?,
              updated_scores = ?,
              is_enrolled = ?,
              enrolled_course = ?,
              feedback_text = ?,
              difficulty_rating = ?,
              accuracy_rating = ?,
              usefulness_rating = ?,
              updated_at = ?
            WHERE analysis_id = ?
          `).bind(
            body.userOutcome,
            body.targetSchool || null,
            body.updatedScores ? JSON.stringify(body.updatedScores) : null,
            body.isEnrolled ? 1 : 0,
            body.enrolledCourse || null,
            body.feedbackText || null,
            body.difficultyRating || null,
            body.accuracyRating || null,
            body.usefulnessRating || null,
            now,
            body.analysisId
          ).run()

          return jsonResponse({
            message: '反馈已更新',
            feedbackId: (existingFeedback as { id: string }).id,
          }, 200, origin)
        } else {
          // 创建新反馈
          const feedbackId = crypto.randomUUID()

          await env.DB.prepare(`
            INSERT INTO analysis_feedback (
              id, analysis_id, user_id, user_outcome, target_school,
              updated_scores, is_enrolled, enrolled_course, feedback_text,
              difficulty_rating, accuracy_rating, usefulness_rating,
              feedback_source, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            feedbackId,
            body.analysisId,
            userId,
            body.userOutcome,
            body.targetSchool || null,
            body.updatedScores ? JSON.stringify(body.updatedScores) : null,
            body.isEnrolled ? 1 : 0,
            body.enrolledCourse || null,
            body.feedbackText || null,
            body.difficultyRating || null,
            body.accuracyRating || null,
            body.usefulnessRating || null,
            'web',
            now,
            now
          ).run()

          return jsonResponse({
            message: '感谢您的反馈',
            feedbackId,
          }, 201, origin)
        }
      }

      // 获取分析的反馈状态
      if (path.startsWith('/api/analysis/feedback/') && request.method === 'GET') {
        const analysisId = path.split('/').pop()

        const feedback = await env.DB.prepare(
          'SELECT * FROM analysis_feedback WHERE analysis_id = ?'
        ).bind(analysisId).first()

        if (!feedback) {
          return jsonResponse({ hasFeedback: false }, 200, origin)
        }

        return jsonResponse({
          hasFeedback: true,
          feedback: {
            id: (feedback as Record<string, unknown>).id,
            userOutcome: (feedback as Record<string, unknown>).user_outcome,
            targetSchool: (feedback as Record<string, unknown>).target_school,
            isEnrolled: (feedback as Record<string, unknown>).is_enrolled === 1,
            accuracyRating: (feedback as Record<string, unknown>).accuracy_rating,
            usefulnessRating: (feedback as Record<string, unknown>).usefulness_rating,
            createdAt: (feedback as Record<string, unknown>).created_at,
          },
        }, 200, origin)
      }

      // =====================
      // 咨询预约 API
      // =====================

      // 预约咨询
      if (path === '/api/consultation/book' && request.method === 'POST') {
        const body = await request.json() as {
          analysisId?: string
          contactName: string
          contactPhone: string
          contactEmail?: string
          contactWechat?: string
          preferredTime?: string
          preferredTimeSlot?: 'morning' | 'afternoon' | 'evening' | 'weekend'
          consultationType: string
          studentGrade?: string
          targetSchools?: string[]
          notes?: string
          sourceLevel?: string
          sourceAction?: string
        }

        // 验证必填字段
        if (!body.contactName?.trim()) {
          return errorResponse('请填写联系人姓名', 400, origin)
        }
        if (!body.contactPhone?.trim()) {
          return errorResponse('请填写联系电话', 400, origin)
        }
        if (!body.consultationType?.trim()) {
          return errorResponse('请选择咨询类型', 400, origin)
        }

        // 验证电话格式（香港手机号）
        const phoneRegex = /^[0-9]{8}$/
        if (!phoneRegex.test(body.contactPhone.replace(/\s/g, ''))) {
          return errorResponse('请输入有效的香港手机号码（8位数字）', 400, origin)
        }

        // 获取用户ID（如果已登录）
        let userId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          const tokenData = await verifyToken(token, env)
          if (tokenData) {
            userId = tokenData.userId
          }
        }

        const bookingId = crypto.randomUUID()
        const now = new Date().toISOString()

        // 验证 analysisId 是否存在（如果提供）
        if (body.analysisId) {
          const analysisRecord = await env.DB.prepare(
            'SELECT id FROM analysis_records WHERE id = ?'
          ).bind(body.analysisId).first()
          
          if (!analysisRecord) {
            // 分析记录不存在，清空关联
            body.analysisId = undefined
          }
        }

        // 创建预约记录
        await env.DB.prepare(`
          INSERT INTO consultation_bookings (
            id, analysis_id, user_id,
            contact_name, contact_phone, contact_email, contact_wechat,
            preferred_time, preferred_time_slot, consultation_type,
            source_level, source_action, student_grade, target_schools,
            notes, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          bookingId,
          body.analysisId || null,
          userId,
          body.contactName.trim(),
          body.contactPhone.trim(),
          body.contactEmail?.trim() || null,
          body.contactWechat?.trim() || null,
          body.preferredTime || null,
          body.preferredTimeSlot || null,
          body.consultationType,
          body.sourceLevel || null,
          body.sourceAction || null,
          body.studentGrade || null,
          body.targetSchools ? JSON.stringify(body.targetSchools) : null,
          body.notes?.trim() || null,
          'pending',
          now,
          now
        ).run()

        return jsonResponse({
          message: '预约成功，我们会尽快与您联系',
          bookingId,
          estimatedContactTime: '24小时内',
        }, 201, origin)
      }

      // 获取推荐行动
      if (path === '/api/consultation/actions' && request.method === 'GET') {
        const level = new URL(request.url).searchParams.get('level') as 'A' | 'B' | 'C' | 'D' | 'E' | null
        
        // 推荐行动配置
        const RECOMMENDED_ACTIONS: Record<string, { title: string; actions: { type: string; title: string; description: string; ctaText: string }[] }> = {
          'A': {
            title: '可行性较高 - 建议把握机会',
            actions: [
              { type: 'consultation', title: '插班冲刺咨询', description: '您的孩子具备较好条件，建议预约专业顾问制定冲刺计划', ctaText: '预约免费咨询' },
              { type: 'course', title: '插班强化课程', description: '针对目标学校的强化训练，提升面试和笔试竞争力', ctaText: '了解课程详情' },
            ]
          },
          'B': {
            title: '可行性中等 - 建议重点提升',
            actions: [
              { type: 'consultation', title: '插班规划咨询', description: '具备插班机会，建议咨询顾问制定提升策略', ctaText: '预约免费咨询' },
              { type: 'course', title: '核心科目提升班', description: '重点提升英文/数学，增强竞争优势', ctaText: '了解提升方案' },
            ]
          },
          'C': {
            title: '可行性一般 - 建议先提升再尝试',
            actions: [
              { type: 'consultation', title: '能力提升咨询', description: '建议先进行系统评估，制定3-6个月提升计划', ctaText: '预约免费咨询' },
              { type: 'course', title: '基础强化课程', description: '夯实基础，逐步提升各科成绩', ctaText: '了解课程详情' },
            ]
          },
          'D': {
            title: '可行性较低 - 建议调整目标',
            actions: [
              { type: 'consultation', title: '升学策略咨询', description: '建议重新评估目标，制定切实可行的升学方案', ctaText: '预约策略咨询' },
              { type: 'course', title: '基础重建方案', description: '从基础开始，系统性提升学习能力', ctaText: '了解重建方案' },
            ]
          },
          'E': {
            title: '可行性极低 - 建议从基础开始',
            actions: [
              { type: 'consultation', title: '学习规划咨询', description: '建议进行全面评估，制定长期学习计划', ctaText: '预约规划咨询' },
              { type: 'course', title: '基础能力培养班', description: '重建学习基础，培养良好学习习惯', ctaText: '了解培养方案' },
            ]
          }
        }

        if (level && RECOMMENDED_ACTIONS[level]) {
          return jsonResponse({
            level,
            recommendation: RECOMMENDED_ACTIONS[level],
          }, 200, origin)
        }

        // 返回所有推荐行动
        return jsonResponse({
          recommendations: RECOMMENDED_ACTIONS,
        }, 200, origin)
      }

      // 查询预约状态（用户查看自己的预约）
      if (path === '/api/consultation/my-bookings' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const token = authHeader.substring(7)
        const tokenData = await verifyToken(token, env)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const bookings = await env.DB.prepare(`
          SELECT id, analysis_id, consultation_type, preferred_time, status, created_at
          FROM consultation_bookings
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 20
        `).bind(tokenData.userId).all()

        return jsonResponse({
          bookings: (bookings.results || []).map((b: Record<string, unknown>) => ({
            id: b.id,
            analysisId: b.analysis_id,
            consultationType: b.consultation_type,
            preferredTime: b.preferred_time,
            status: b.status,
            createdAt: b.created_at,
          })),
        }, 200, origin)
      }

      // =====================
      // 插班可行性评估 API
      // =====================

      // 可行性评估
      if (path === '/api/analysis/feasibility' && request.method === 'POST') {
        const body = await request.json() as {
          student: {
            age: number
            gender: 'male' | 'female'
            currentGrade: string
            scores: Record<string, number>
            currentSchool?: string
            currentBand?: number
            strengths?: string[]
            extracurriculars?: string[]
          }
          targetSchool: {
            schoolId?: string
            schoolName: string
            bandLevel: 1 | 2 | 3
            district: string
            gender?: 'boys' | 'girls' | 'coed'
            type?: 'government' | 'aided' | 'dss' | 'private'
            englishRequirement?: 'high' | 'medium' | 'low'
          }
        }

        // Band等级对应的基准分数要求
        const BAND_SCORE_THRESHOLDS: Record<number, { chinese: number; english: number; math: number; minAverage: number }> = {
          1: { chinese: 70, english: 75, math: 70, minAverage: 72 },
          2: { chinese: 55, english: 60, math: 55, minAverage: 58 },
          3: { chinese: 40, english: 45, math: 40, minAverage: 42 },
        }

        // 区域竞争强度系数
        const DISTRICT_COMPETITION: Record<string, number> = {
          '中西區': 1.15, '灣仔區': 1.12, '東區': 1.05, '南區': 1.02,
          '九龍城區': 1.18, '油尖旺區': 1.10, '深水埗區': 1.05, '黃大仙區': 1.00, '觀塘區': 1.02,
          '沙田區': 1.12, '大埔區': 1.05, '北區': 0.98, '西貢區': 1.08,
          '葵青區': 1.00, '荃灣區': 1.02, '屯門區': 1.00, '元朗區': 0.98, '離島區': 0.95,
        }

        // 年级插班难度系数
        const GRADE_DIFFICULTY: Record<string, number> = {
          'S1': 0.90, 'S2': 0.95, 'S3': 1.00, 'S4': 1.15, 'S5': 1.25, 'S6': 1.40,
        }

        // 科目名称映射
        const SUBJECT_NAMES: Record<string, string> = {
          'chinese': '中文', 'english': '英文', 'math': '数学', 'science': '科学/常识',
          'liberal': '公民与社会发展', 'physics': '物理', 'chemistry': '化学', 'biology': '生物',
          'economics': '经济', 'geography': '地理', 'history': '历史',
        }

        const { student, targetSchool } = body
        const thresholds = BAND_SCORE_THRESHOLDS[targetSchool.bandLevel]
        const districtFactor = DISTRICT_COMPETITION[targetSchool.district] || 1.0
        const gradeFactor = GRADE_DIFFICULTY[student.currentGrade] || 1.0

        // 分析学生能力
        const coreSubjects = ['chinese', 'english', 'math']
        const scores = student.scores
        const allScores = Object.values(scores)
        const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

        const weakSubjects: string[] = []
        const strongSubjects: string[] = []
        for (const [subject, score] of Object.entries(scores)) {
          if (score < 50) weakSubjects.push(SUBJECT_NAMES[subject] || subject)
          else if (score >= 75) strongSubjects.push(SUBJECT_NAMES[subject] || subject)
        }

        const hasSignificantWeakness = coreSubjects.some(s => scores[s] !== undefined && scores[s] < 50)

        // 计算调整后的要求分数
        const adjustedMinAverage = thresholds.minAverage * districtFactor * gradeFactor
        const scoreDiff = averageScore - adjustedMinAverage

        // 评估风险因素
        const riskFactors: string[] = []
        const positiveFactors: string[] = []
        let riskScore = 0

        if (scoreDiff < -15) { riskScore += 3; riskFactors.push('整体成绩与该校常见插班要求有较大差距') }
        else if (scoreDiff < -5) { riskScore += 2; riskFactors.push('整体成绩略低于该校一般要求') }
        else if (scoreDiff >= 5) { positiveFactors.push('整体成绩达到该校期望水平') }

        const englishScore = scores['english'] || 0
        if (targetSchool.bandLevel === 1 && englishScore < thresholds.english) {
          riskScore += 2; riskFactors.push('英文成绩可能未达Band 1学校的较高要求')
        } else if (englishScore >= 80) {
          positiveFactors.push('英文成绩优秀，符合该层次学校期望')
        }

        if (hasSignificantWeakness) { riskScore += 2; riskFactors.push('存在核心科目明显短板，需重点加强') }
        if (['S5', 'S6'].includes(student.currentGrade)) { riskScore += 1; riskFactors.push('高年级插班名额通常较少，竞争较激烈') }
        if (student.currentBand && student.currentBand > targetSchool.bandLevel) {
          const bandGap = student.currentBand - targetSchool.bandLevel
          if (bandGap >= 2) { riskScore += 3; riskFactors.push(`从Band ${student.currentBand}跨越至Band ${targetSchool.bandLevel}难度较大`) }
          else { riskScore += 1; riskFactors.push('跨Band插班需要更充分的准备') }
        }
        if (districtFactor >= 1.1) { riskFactors.push(`${targetSchool.district}属于竞争较激烈区域`) }
        if (strongSubjects.length >= 2) { positiveFactors.push(`多个科目表现突出（${strongSubjects.join('、')}）`) }

        // 确定可行性等级
        type FeasibilityLevel = 'A' | 'B' | 'C' | 'D'
        let feasibilityLevel: FeasibilityLevel
        if (riskScore <= 1 && scoreDiff >= 0) feasibilityLevel = 'A'
        else if (riskScore <= 3 && scoreDiff >= -10) feasibilityLevel = 'B'
        else if (riskScore <= 5) feasibilityLevel = 'C'
        else feasibilityLevel = 'D'

        const LEVEL_DESCRIPTIONS: Record<FeasibilityLevel, string> = {
          'A': '可行性较高 - 学生条件与目标学校要求匹配度良好，通过适当准备有较大机会',
          'B': '可行性中等 - 需要在部分方面加强，建议重点提升短板科目',
          'C': '可行性一般 - 存在较明显差距，需要较长时间准备和显著提升',
          'D': '可行性较低 - 差距较大，建议重新评估目标或制定长期计划',
        }

        // 生成科目分析
        const subjectAnalysis = Object.entries(scores).map(([subject, score]) => {
          const subjectName = SUBJECT_NAMES[subject] || subject
          let threshold = thresholds.minAverage
          if (subject === 'english') threshold = thresholds.english
          if (subject === 'chinese') threshold = thresholds.chinese
          if (subject === 'math') threshold = thresholds.math

          let status: 'strong' | 'adequate' | 'weak' | 'critical'
          let statusDescription: string
          let recommendation: string

          if (score >= threshold + 15) {
            status = 'strong'; statusDescription = '表现优秀，是明显优势科目'; recommendation = '保持现有水平，可作为加分项展示'
          } else if (score >= threshold) {
            status = 'adequate'; statusDescription = '达到基本要求'; recommendation = '继续巩固，争取进一步提升'
          } else if (score >= threshold - 15) {
            status = 'weak'; statusDescription = '略低于期望水平，需要加强'; recommendation = `建议每天额外投入30-45分钟进行${subjectName}专项训练`
          } else {
            status = 'critical'; statusDescription = '与期望水平有较大差距，是主要短板'; recommendation = `${subjectName}是目前最需要突破的科目，建议寻求专业辅导`
          }

          return { subject: subjectName, score, status, statusDescription, recommendation }
        }).sort((a, b) => {
          const statusOrder: Record<string, number> = { critical: 0, weak: 1, adequate: 2, strong: 3 }
          return statusOrder[a.status] - statusOrder[b.status]
        })

        // 生成综合评估描述
        const gradeMap: Record<string, string> = { 'S1': '中一', 'S2': '中二', 'S3': '中三', 'S4': '中四', 'S5': '中五', 'S6': '中六' }
        const gradeName = gradeMap[student.currentGrade] || student.currentGrade
        const genderText = student.gender === 'female' ? '女' : '男'
        
        let overallAssessment = `该${gradeName}${genderText}生，${student.age}岁，目前各科平均分约${Math.round(averageScore)}分。`
        if (feasibilityLevel === 'A') {
          overallAssessment += `整体学术表现良好，与目标Band ${targetSchool.bandLevel}学校（${targetSchool.schoolName}）的期望水平较为匹配。通过适当的准备和保持现有水平，有较大机会获得面试机会。`
        } else if (feasibilityLevel === 'B') {
          overallAssessment += `学术表现中等偏上，基本符合Band ${targetSchool.bandLevel}学校的要求，但仍有提升空间。建议在接下来的准备期间，重点加强薄弱环节，同时保持优势科目的水平。`
        } else if (feasibilityLevel === 'C') {
          overallAssessment += `与目标学校（Band ${targetSchool.bandLevel}）的期望水平存在一定差距。需要在多个方面进行较大幅度的提升，建议制定3-6个月的系统性准备计划。`
        } else {
          overallAssessment += `目前条件与目标学校差距较大，建议考虑调整目标学校层次，或制定更长期的提升计划。也可以先从相对容易达到的学校开始，逐步实现升学目标。`
        }

        // 生成建议
        const recommendations: string[] = []
        const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical')
        const weakSubjs = subjectAnalysis.filter(s => s.status === 'weak')
        if (criticalSubjects.length > 0) recommendations.push(`优先提升${criticalSubjects.map(s => s.subject).join('和')}，这是目前最需要突破的领域`)
        if (weakSubjs.length > 0) recommendations.push(`加强${weakSubjs.map(s => s.subject).join('、')}的训练，确保达到目标学校期望水平`)
        if (targetSchool.bandLevel === 1) {
          recommendations.push('提升英语综合能力，包括阅读理解和写作表达')
          recommendations.push('培养批判性思维，准备可能的面试环节')
        }
        recommendations.push('定期进行模拟测试，检验学习成效')
        recommendations.push('了解目标学校的办学理念和特色，准备个人陈述')
        recommendations.push('保持良好作息和学习习惯，确保稳定发挥')

        // 生成准备计划
        const preparationPlan = {
          priorityActions: [
            criticalSubjects.length > 0 ? `立即开始${criticalSubjects.map(s => s.subject).join('、')}的强化训练` : '保持各科目稳定表现',
            '收集目标学校的插班信息和要求',
            '准备个人简历和过往成绩单',
          ].filter(Boolean),
          shortTermGoals: [
            ...criticalSubjects.map(s => `${s.subject}成绩提升至及格线以上`),
            '完成各科知识点梳理，建立知识框架',
            '每周进行一次模拟测试，检验学习效果',
          ],
          mediumTermGoals: [
            ...weakSubjs.map(s => `${s.subject}达到目标学校期望水平`),
            '全面提升综合能力，准备面试',
            '培养良好学习习惯，适应更高强度学习',
          ],
          resources: ['历年插班试题（如有）', '各科精编练习册', '在线学习平台', '专业补习班或私人导师', '学校开放日和咨询活动'],
        }

        // 免责声明（统一使用简短版本）
        const DISCLAIMER = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。'

        // 获取用户ID
        let userId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
          userId = tokenData?.userId || null
        }

        const recordId = crypto.randomUUID()
        const now = new Date().toISOString()

        // 保存到数据库
        await env.DB.prepare(
          `INSERT INTO analysis_records (id, user_id, analysis_type, student_info, result, created_at) 
           VALUES (?, ?, 'feasibility', ?, ?, ?)`
        ).bind(recordId, userId, JSON.stringify(body), JSON.stringify({
          feasibilityLevel,
          levelDescription: LEVEL_DESCRIPTIONS[feasibilityLevel],
          overallAssessment,
          mainRisks: riskFactors,
          keyStrengths: positiveFactors,
          recommendations: recommendations.slice(0, 6),
          subjectAnalysis,
          preparationPlan,
          disclaimer: DISCLAIMER,
        }), now).run()

        return jsonResponse({
          success: true,
          result: {
            id: recordId,
            createdAt: now,
            feasibilityLevel,
            levelDescription: LEVEL_DESCRIPTIONS[feasibilityLevel],
            overallAssessment,
            mainRisks: riskFactors,
            keyStrengths: positiveFactors,
            recommendations: recommendations.slice(0, 6),
            subjectAnalysis,
            preparationPlan,
            disclaimer: DISCLAIMER,
          },
        }, 200, origin)
      }

      // 获取可行性评估结果
      if (path.startsWith('/api/analysis/feasibility/') && request.method === 'GET') {
        const id = path.split('/').pop()
        
        const record = await env.DB.prepare(
          'SELECT id, student_info, result, created_at FROM analysis_records WHERE id = ?'
        ).bind(id).first() as { id: string; student_info: string; result: string; created_at: string } | null
        
        if (!record) {
          return errorResponse('评估记录不存在', 404, origin)
        }

        const studentInfo = JSON.parse(record.student_info)
        const result = JSON.parse(record.result)

        return jsonResponse({
          success: true,
          result: {
            id: record.id,
            createdAt: record.created_at,
            request: studentInfo,
            ...result,
          },
        }, 200, origin)
      }

      // =====================
      // 学生信息相关 API
      // =====================

      // 保存/更新居住信息
      if (path === '/api/student/residence' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }
        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const body = await request.json() as {
          district: string
          address?: string
          maxCommuteTime?: number
          transportPreference?: string
          crossDistrict?: boolean
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        // 先删除旧记录再插入新记录
        await env.DB.prepare('DELETE FROM student_residence WHERE user_id = ?').bind(tokenData.userId).run()
        await env.DB.prepare(
          `INSERT INTO student_residence (id, user_id, district, address, max_commute_time, transport_preference, cross_district, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id, tokenData.userId, body.district, body.address || null,
          body.maxCommuteTime || 60, body.transportPreference || 'public',
          body.crossDistrict ? 1 : 0, now, now
        ).run()

        return jsonResponse({ message: '居住信息已保存', id }, 200, origin)
      }

      // 获取居住信息
      if (path === '/api/student/residence' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }
        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const residence = await env.DB.prepare(
          'SELECT * FROM student_residence WHERE user_id = ?'
        ).bind(tokenData.userId).first()

        return jsonResponse({ residence: residence || null }, 200, origin)
      }

      // 保存学校偏好
      if (path === '/api/student/preferences' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }
        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const body = await request.json() as {
          schoolType?: string
          religionPreference?: string
          extracurricularImportance?: number
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await env.DB.prepare('DELETE FROM school_preferences WHERE user_id = ?').bind(tokenData.userId).run()
        await env.DB.prepare(
          `INSERT INTO school_preferences (id, user_id, school_type, religion_preference, extracurricular_importance, created_at) 
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          id, tokenData.userId, body.schoolType || 'coed',
          body.religionPreference || null, body.extracurricularImportance || 3, now
        ).run()

        return jsonResponse({ message: '学校偏好已保存', id }, 200, origin)
      }

      // =====================
      // 学校推荐 API
      // =====================

      // 获取学校推荐
      if (path === '/api/schools/recommend' && request.method === 'POST') {
        const body = await request.json() as {
          district?: string
          grade: string
          subjects: { subject: string; currentScore: string; targetScore: string }[]
          schoolType?: string
          maxCommuteTime?: number
        }

        // 从数据库获取学校列表
        let query = 'SELECT * FROM hk_schools WHERE 1=1'
        const params: string[] = []

        if (body.district) {
          query += ' AND district = ?'
          params.push(body.district)
        }
        if (body.schoolType && body.schoolType !== 'any') {
          query += ' AND school_type = ?'
          params.push(body.schoolType)
        }

        query += ' ORDER BY banding ASC LIMIT 20'

        const schools = await env.DB.prepare(query).bind(...params).all()

        // 计算匹配分数
        const recommendations = (schools.results || []).map((school: Record<string, unknown>) => {
          const avgScore = body.subjects.reduce((sum, s) => sum + parseInt(s.currentScore), 0) / body.subjects.length
          const bandingMatch = school.banding === 1 ? (avgScore >= 4 ? 90 : 60) :
                              school.banding === 2 ? (avgScore >= 3 ? 85 : 70) : 80
          
          return {
            school: {
              id: school.id,
              name: school.name_zh,
              nameEn: school.name_en,
              district: school.district,
              type: school.school_type,
              religion: school.religion,
              banding: school.banding,
              address: school.address,
            },
            matchScore: bandingMatch,
            admissionChance: Math.min(95, bandingMatch + Math.random() * 10),
            reasons: [
              `位于${school.district}，交通便利`,
              school.banding === 1 ? '属于第一组别学校，学术表现优异' : '学术氛围良好',
              '符合您的学校类型偏好',
            ],
          }
        })

        // 按匹配分数排序
        recommendations.sort((a: any, b: any) => b.matchScore - a.matchScore)

        return jsonResponse({ recommendations: recommendations.slice(0, 10) }, 200, origin)
      }

      // 获取香港18区列表（按区域分类）
      if (path === '/api/districts' && request.method === 'GET') {
        const districts = {
          regions: [
            {
              name: '香港島',
              name_en: 'Hong Kong Island',
              districts: ['中西區', '灣仔區', '東區', '南區']
            },
            {
              name: '九龍',
              name_en: 'Kowloon',
              districts: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區']
            },
            {
              name: '新界',
              name_en: 'New Territories',
              districts: ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區']
            }
          ],
          list: [
            { code: 'central_western', name: '中西區', region: '香港島' },
            { code: 'wan_chai', name: '灣仔區', region: '香港島' },
            { code: 'eastern', name: '東區', region: '香港島' },
            { code: 'southern', name: '南區', region: '香港島' },
            { code: 'yau_tsim_mong', name: '油尖旺區', region: '九龍' },
            { code: 'sham_shui_po', name: '深水埗區', region: '九龍' },
            { code: 'kowloon_city', name: '九龍城區', region: '九龍' },
            { code: 'wong_tai_sin', name: '黃大仙區', region: '九龍' },
            { code: 'kwun_tong', name: '觀塘區', region: '九龍' },
            { code: 'kwai_tsing', name: '葵青區', region: '新界' },
            { code: 'tsuen_wan', name: '荃灣區', region: '新界' },
            { code: 'tuen_mun', name: '屯門區', region: '新界' },
            { code: 'yuen_long', name: '元朗區', region: '新界' },
            { code: 'north', name: '北區', region: '新界' },
            { code: 'tai_po', name: '大埔區', region: '新界' },
            { code: 'sha_tin', name: '沙田區', region: '新界' },
            { code: 'sai_kung', name: '西貢區', region: '新界' },
            { code: 'islands', name: '離島區', region: '新界' },
          ]
        }
        return jsonResponse({ districts }, 200, origin)
      }

      // 获取指定区的学校列表
      if (path === '/api/schools/by-district' && request.method === 'GET') {
        const url = new URL(request.url)
        const district = url.searchParams.get('district')
        
        // 使用从 schoolsData.ts 导入的学校数据（441所学校）
        if (district && SCHOOLS_BY_DISTRICT[district]) {
          return jsonResponse({ 
            success: true, 
            district,
            schools: SCHOOLS_BY_DISTRICT[district] 
          }, 200, origin)
        }
        
        // 如果没有指定区，返回所有学校
        return jsonResponse({ 
          success: true,
          districts: SCHOOLS_BY_DISTRICT 
        }, 200, origin)
      }

      // =====================
      // 大学申请分析 API
      // =====================

      // 提交大学申请分析
      if (path === '/api/analysis/university' && request.method === 'POST') {
        const body = await request.json() as {
          grades?: SubjectGrade[]
          dseResults: { subject: string; grade: string }[]
          targetUniversities: string[]
          targetMajors: string[]
          extracurriculars?: string
          careerInterests?: string[]
        }

        const grades: SubjectGrade[] = body.grades ?? body.dseResults.map((result) => ({
          subject: result.subject as SubjectGrade['subject'],
          value: result.grade,
        }))
        validateSubjectGrades(grades)

        /**
         * 计算最佳5科/6科分数
         * 
         * @deprecated 此处使用固定换算 (5**=7)，不支持课程特定加权。
         * 
         * TODO: 禁止在大学分析 (JUPAS) 中依赖此值进行匹配度判断。
         * 应改用 RAG Worker 返回的 weighted_score（基于课程计分规则）。
         * 此处计算的 bestFive/bestSix 仅作为参考值传递。
         */
        // @deprecated - 固定换算，不同课程有不同规则（如城大2025: 5**=8.5）
        const gradeToScore: Record<string, number> = {
          '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0
        }
        const scores = body.dseResults.map(r => gradeToScore[r.grade] || 0).sort((a, b) => b - a)
        const bestFive = scores.slice(0, 5).reduce((a, b) => a + b, 0)
        const bestSix = scores.slice(0, 6).reduce((a, b) => a + b, 0)

        // 调用 DeepSeek 进行分析
        const universityAnalysisResult = await analyzeUniversityApplication(body, bestFive, env.DEEPSEEK_API_KEY)

        // 获取用户ID（如果有token）
        let userId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
          userId = tokenData?.userId || null
        }

        const recordId = crypto.randomUUID()
        const now = new Date().toISOString()

        // 保存到数据库
        await env.DB.prepare(
          `INSERT INTO analysis_records (id, user_id, analysis_type, student_info, result, created_at) 
           VALUES (?, ?, 'university', ?, ?, ?)`
        ).bind(recordId, userId, JSON.stringify({ ...body, bestFive, bestSix }), JSON.stringify(universityAnalysisResult), now).run()

        // 免责声明
        const disclaimer = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。'

        return jsonResponse({
          message: '大学申请分析完成',
          result: {
            id: recordId,
            createdAt: now,
            bestFive,
            bestSix,
            ...universityAnalysisResult,
            disclaimer,
          },
        }, 200, origin)
      }

      // 获取大学专业列表
      if (path === '/api/universities/programs' && request.method === 'GET') {
        const url = new URL(request.url)
        const category = url.searchParams.get('category')
        const university = url.searchParams.get('university')

        let query = 'SELECT * FROM university_programs WHERE 1=1'
        const params: string[] = []

        if (category) {
          query += ' AND category = ?'
          params.push(category)
        }
        if (university) {
          query += ' AND university_code = ?'
          params.push(university)
        }

        query += ' ORDER BY min_score_2024 DESC'

        const programs = await env.DB.prepare(query).bind(...params).all()

        return jsonResponse({ programs: programs.results || [] }, 200, origin)
      }

      // =====================
      // 就业趋势 API
      // =====================

      // 获取就业趋势
      if (path === '/api/trends/employment' && request.method === 'GET') {
        const trends = await env.DB.prepare(
          'SELECT * FROM employment_trends ORDER BY growth_rate DESC'
        ).all()

        return jsonResponse({ trends: trends.results || [] }, 200, origin)
      }

      // =====================
      // 客户咨询 API
      // =====================

      // 提交客户咨询
      if (path === '/api/inquiry/submit' && request.method === 'POST') {
        const body = await request.json() as {
          name: string
          phone?: string
          email?: string
          message: string
        }

        if (!body.name || !body.message) {
          return errorResponse('姓名和咨询内容不能为空', 400, origin)
        }

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await env.DB.prepare(
          'INSERT INTO customer_inquiries (id, name, phone, email, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, body.name, body.phone || null, body.email || null, body.message, now).run()

        return jsonResponse({ message: '咨询提交成功，我们会尽快与您联系！', id }, 200, origin)
      }

      // 获取所有客户咨询（管理员专用）
      if (path === '/api/admin/inquiries' && request.method === 'GET') {
        // 简单的管理员密码验证
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        const inquiries = await env.DB.prepare(
          'SELECT * FROM customer_inquiries ORDER BY created_at DESC'
        ).all()

        return jsonResponse({ inquiries: inquiries.results || [] }, 200, origin)
      }

      // 更新咨询状态（管理员专用）
      if (path.startsWith('/api/admin/inquiry/') && request.method === 'PUT') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        const inquiryId = path.split('/').pop()
        const body = await request.json() as {
          status?: string
          notes?: string
        }

        const now = new Date().toISOString()
        await env.DB.prepare(
          'UPDATE customer_inquiries SET status = ?, notes = ?, updated_at = ? WHERE id = ?'
        ).bind(body.status || 'pending', body.notes || null, now, inquiryId).run()

        return jsonResponse({ message: '更新成功' }, 200, origin)
      }

      // 删除咨询记录（管理员专用）
      if (path.startsWith('/api/admin/inquiry/') && request.method === 'DELETE') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        const inquiryId = path.split('/').pop()
        if (!inquiryId) {
          return errorResponse('无效的记录ID', 400, origin)
        }

        await env.DB.prepare('DELETE FROM customer_inquiries WHERE id = ?').bind(inquiryId).run()

        return jsonResponse({ message: '删除成功' }, 200, origin)
      }

      // 获取系统统计数据（管理员专用）
      if (path === '/api/admin/stats' && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        // 获取用户总数
        const usersCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM users'
        ).first() as { count: number } | null

        // 获取今日新注册用户数
        const today = new Date().toISOString().split('T')[0]
        const todayUsersCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?'
        ).bind(today).first() as { count: number } | null

        // 获取分析记录总数
        const analysisCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM analysis_records'
        ).first() as { count: number } | null

        // 获取今日分析数
        const todayAnalysisCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM analysis_records WHERE DATE(created_at) = ?'
        ).bind(today).first() as { count: number } | null

        // 获取最近注册的用户列表（最近10个）
        const recentUsers = await env.DB.prepare(
          'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 10'
        ).all()

        return jsonResponse({
          stats: {
            totalUsers: usersCount?.count || 0,
            todayUsers: todayUsersCount?.count || 0,
            totalAnalysis: analysisCount?.count || 0,
            todayAnalysis: todayAnalysisCount?.count || 0,
          },
          recentUsers: recentUsers.results || [],
        }, 200, origin)
      }

      // =====================
      // 公开 - 用户信息 API（用于好友系统）
      // =====================

      // 批量获取用户基本信息（用于显示好友头像等）
      if (path === '/api/users/batch' && request.method === 'POST') {
        try {
          const body = await request.json() as { user_ids: string[] }
          const userIds = body.user_ids || []
          
          if (userIds.length === 0) {
            return jsonResponse({ success: true, data: [] }, 200, origin)
          }

          // 限制最多查询 50 个用户
          const limitedIds = userIds.slice(0, 50)
          const placeholders = limitedIds.map(() => '?').join(',')
          
          const users = await env.DB.prepare(`
            SELECT id, name, avatar FROM users WHERE id IN (${placeholders})
          `).bind(...limitedIds).all()

          return jsonResponse({ 
            success: true, 
            data: users.results || []
          }, 200, origin)
        } catch (error) {
          console.error('批量获取用户信息失败:', error)
          return jsonResponse({ success: false, error: '获取用户信息失败' }, 500, origin)
        }
      }

      // 搜索用户（按名称或邮箱）
      if (path === '/api/users/search' && request.method === 'GET') {
        try {
          const url = new URL(request.url)
          const query = url.searchParams.get('q') || ''
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20)
          const excludeUserId = url.searchParams.get('exclude') || ''

          if (!query || query.length < 2) {
            return jsonResponse({ 
              success: true, 
              data: [],
              message: '请输入至少2个字符进行搜索'
            }, 200, origin)
          }

          const searchPattern = `%${query}%`
          
          // 搜索用户（按名称或邮箱），排除当前用户
          let users
          if (excludeUserId) {
            users = await env.DB.prepare(`
              SELECT id, name, email, avatar, created_at
              FROM users
              WHERE (name LIKE ? OR email LIKE ?)
                AND id != ?
              ORDER BY name ASC
              LIMIT ?
            `).bind(searchPattern, searchPattern, excludeUserId, limit).all()
          } else {
            users = await env.DB.prepare(`
              SELECT id, name, email, avatar, created_at
              FROM users
              WHERE name LIKE ? OR email LIKE ?
              ORDER BY name ASC
              LIMIT ?
            `).bind(searchPattern, searchPattern, limit).all()
          }

          // 隐藏邮箱中间部分保护隐私
          const maskedUsers = (users.results || []).map((user: Record<string, unknown>) => {
            const email = user.email as string
            const [localPart, domain] = email.split('@')
            const maskedLocal = localPart.length > 2 
              ? localPart[0] + '***' + localPart[localPart.length - 1]
              : localPart[0] + '***'
            return {
              ...user,
              email: `${maskedLocal}@${domain}`
            }
          })

          return jsonResponse({ 
            success: true, 
            data: maskedUsers
          }, 200, origin)
        } catch (error) {
          console.error('搜索用户失败:', error)
          return jsonResponse({ success: false, error: '搜索用户失败' }, 500, origin)
        }
      }

      // =====================
      // 管理员 - 用户管理 API
      // =====================

      // 获取所有用户列表（管理员专用）
      if (path === '/api/admin/users' && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const url = new URL(request.url)
          const page = parseInt(url.searchParams.get('page') || '1')
          const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
          const search = url.searchParams.get('search') || ''
          const offset = (page - 1) * pageSize

          // 构建查询条件
          let whereClause = ''
          const params: string[] = []
          
          if (search) {
            whereClause = 'WHERE name LIKE ? OR email LIKE ? OR id LIKE ?'
            const searchPattern = `%${search}%`
            params.push(searchPattern, searchPattern, searchPattern)
          }

          // 获取总数
          const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`
          const countResult = search 
            ? await env.DB.prepare(countQuery).bind(...params).first() as { count: number } | null
            : await env.DB.prepare(countQuery).first() as { count: number } | null
          
          const total = countResult?.count || 0

          // 获取用户列表 - 先获取基本用户信息
          const listQuery = `
            SELECT 
              u.id, 
              u.name, 
              u.email, 
              u.phone,
              u.avatar,
              u.created_at
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
          `
          
          const usersResult = search
            ? await env.DB.prepare(listQuery).bind(...params, pageSize, offset).all()
            : await env.DB.prepare(listQuery).bind(pageSize, offset).all()

          // 为每个用户补充统计信息（如果表存在的话）
          const users = await Promise.all((usersResult.results || []).map(async (user: Record<string, unknown>) => {
            let points = 0
            let analysis_count = 0
            let test_count = 0
            let post_count = 0

            try {
              // 尝试获取积分
              const pointsResult = await env.DB.prepare(
                'SELECT COALESCE(balance, 0) as balance FROM user_points_account WHERE user_id = ?'
              ).bind(user.id).first() as { balance: number } | null
              points = pointsResult?.balance || 0
            } catch { /* 表可能不存在 */ }

            try {
              // 尝试获取分析次数
              const analysisResult = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM analysis_records WHERE user_id = ?'
              ).bind(user.id).first() as { count: number } | null
              analysis_count = analysisResult?.count || 0
            } catch { /* 表可能不存在 */ }

            try {
              // 尝试获取测试次数
              const testResult = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM level_tests WHERE user_id = ?'
              ).bind(user.id).first() as { count: number } | null
              test_count = testResult?.count || 0
            } catch { /* 表可能不存在 */ }

            try {
              // 尝试获取发帖数
              const postResult = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0'
              ).bind(user.id).first() as { count: number } | null
              post_count = postResult?.count || 0
            } catch { /* 表可能不存在 */ }

            return {
              ...user,
              points,
              analysis_count,
              test_count,
              post_count
            }
          }))

          return jsonResponse({
            users: users,
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize)
            }
          }, 200, origin)
        } catch (error) {
          console.error('获取用户列表失败:', error)
          return errorResponse('获取用户列表失败: ' + (error instanceof Error ? error.message : '未知错误'), 500, origin)
        }
      }

      // 删除用户（管理员专用）
      if (path.startsWith('/api/admin/users/') && request.method === 'DELETE') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        const userId = path.split('/').pop()
        if (!userId) {
          return errorResponse('用户ID不能为空', 400, origin)
        }

        try {
          // 检查用户是否存在
          const user = await env.DB.prepare(
            'SELECT id, name, email FROM users WHERE id = ?'
          ).bind(userId).first()

          if (!user) {
            return errorResponse('用户不存在', 404, origin)
          }

          // 删除用户相关数据（级联删除，忽略表不存在的错误）
          const safeDelete = async (query: string, ...params: unknown[]) => {
            try {
              await env.DB.prepare(query).bind(...params).run()
            } catch (e) {
              // 忽略表不存在的错误
              console.log(`Safe delete skipped: ${(e as Error).message}`)
            }
          }

          // 1. 删除用户的帖子和评论
          await safeDelete('UPDATE posts SET is_deleted = 1 WHERE user_id = ?', userId)
          await safeDelete('UPDATE comments SET is_deleted = 1 WHERE user_id = ?', userId)
          
          // 2. 删除用户的好友关系
          await safeDelete('DELETE FROM friends WHERE requester_id = ? OR receiver_id = ?', userId, userId)
          
          // 3. 删除用户的通知和消息
          await safeDelete('DELETE FROM notifications WHERE user_id = ? OR sender_id = ?', userId, userId)
          await safeDelete('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', userId, userId)
          
          // 4. 删除用户的积分账户和交易记录
          await safeDelete('DELETE FROM points_ledger WHERE user_id = ?', userId)
          await safeDelete('DELETE FROM user_points_account WHERE user_id = ?', userId)
          
          // 5. 删除用户的分析记录
          await safeDelete('DELETE FROM analysis_records WHERE user_id = ?', userId)
          
          // 6. 删除用户的测试记录
          await safeDelete('DELETE FROM level_tests WHERE user_id = ?', userId)
          
          // 7. 删除用户刷题历史
          await safeDelete('DELETE FROM user_question_history WHERE user_id = ?', userId)
          
          // 8. 最后删除用户本身
          await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()

          return jsonResponse({ 
            message: '用户删除成功',
            deletedUser: {
              id: (user as { id: string }).id,
              name: (user as { name: string }).name,
              email: (user as { email: string }).email
            }
          }, 200, origin)
        } catch (error) {
          console.error('删除用户失败:', error)
          return errorResponse('删除用户失败: ' + (error instanceof Error ? error.message : '未知错误'), 500, origin)
        }
      }

      // =====================
      // 管理员 - 水平测试管理 API
      // =====================

      // 获取水平测试统计数据
      if (path === '/api/admin/level-test/stats' && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          // 测试总数
          const totalTests = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM level_tests'
          ).first() as { count: number } | null

          // 已完成测试数
          const completedTests = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM level_tests WHERE status = ?'
          ).bind('graded').first() as { count: number } | null

          // 今日测试数
          const today = new Date().toISOString().split('T')[0]
          const todayTests = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM level_tests WHERE DATE(created_at) = ?'
          ).bind(today).first() as { count: number } | null

          // 平均分数
          const avgScore = await env.DB.prepare(
            'SELECT AVG(score) as avg FROM level_tests WHERE score IS NOT NULL'
          ).first() as { avg: number | null } | null

          // 各科目测试分布
          const subjectDistribution = await env.DB.prepare(
            `SELECT subject, COUNT(*) as count, AVG(score) as avg_score 
             FROM level_tests 
             GROUP BY subject 
             ORDER BY count DESC`
          ).all()

          // 各年级测试分布
          const gradeDistribution = await env.DB.prepare(
            `SELECT grade, COUNT(*) as count, AVG(score) as avg_score 
             FROM level_tests 
             GROUP BY grade`
          ).all()

          // 等级分布
          const levelDistribution = await env.DB.prepare(
            `SELECT overall_level, COUNT(*) as count 
             FROM level_tests 
             WHERE overall_level IS NOT NULL 
             GROUP BY overall_level`
          ).all()

          // 缓存题目统计
          const cachedQuestions = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM question_cache'
          ).first() as { count: number } | null

          // 待审核题目数
          const pendingReviews = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM question_review_queue WHERE status = ?'
          ).bind('pending').first() as { count: number } | null

          return jsonResponse({
            totalTests: totalTests?.count || 0,
            completedTests: completedTests?.count || 0,
            todayTests: todayTests?.count || 0,
            averageScore: avgScore?.avg ? Math.round(avgScore.avg * 10) / 10 : 0,
            subjectDistribution: subjectDistribution.results || [],
            gradeDistribution: gradeDistribution.results || [],
            levelDistribution: levelDistribution.results || [],
            cachedQuestions: cachedQuestions?.count || 0,
            pendingReviews: pendingReviews?.count || 0,
          }, 200, origin)
        } catch (e) {
          console.error('Level test stats error:', e)
          return errorResponse('获取统计数据失败', 500, origin)
        }
      }

      // 获取待审核题目队列
      if (path === '/api/admin/level-test/review-queue' && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const url = new URL(request.url)
          const status = url.searchParams.get('status') || 'pending'
          const limit = parseInt(url.searchParams.get('limit') || '20')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const reviews = await env.DB.prepare(
            `SELECT qr.*, qc.question_data, qc.grade, qc.subject, qc.difficulty, qc.question_type
             FROM question_review_queue qr
             LEFT JOIN question_cache qc ON qr.question_id = qc.id
             WHERE qr.status = ?
             ORDER BY qr.created_at DESC
             LIMIT ? OFFSET ?`
          ).bind(status, limit, offset).all()

          const total = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM question_review_queue WHERE status = ?'
          ).bind(status).first() as { count: number } | null

          return jsonResponse({
            reviews: reviews.results || [],
            total: total?.count || 0,
          }, 200, origin)
        } catch (e) {
          console.error('Review queue error:', e)
          return errorResponse('获取审核队列失败', 500, origin)
        }
      }

      // 审核题目
      if (path.startsWith('/api/admin/level-test/question/') && path.endsWith('/review') && request.method === 'PUT') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const pathParts = path.split('/')
          const questionId = pathParts[pathParts.length - 2]
          
          const body = await request.json() as {
            status: 'approved' | 'rejected' | 'modified'
            comments?: string
            modifiedData?: string
          }

          const now = new Date().toISOString()

          // 更新审核状态
          await env.DB.prepare(
            `UPDATE question_review_queue 
             SET status = ?, review_comments = ?, reviewed_at = ?, updated_at = ?
             WHERE question_id = ?`
          ).bind(body.status, body.comments || '', now, now, questionId).run()

          // 如果题目被修改，更新缓存中的题目数据
          if (body.status === 'modified' && body.modifiedData) {
            await env.DB.prepare(
              `UPDATE question_cache SET question_data = ?, updated_at = ? WHERE id = ?`
            ).bind(body.modifiedData, now, questionId).run()
          }

          // 如果题目被拒绝，从缓存中删除
          if (body.status === 'rejected') {
            await env.DB.prepare(
              'DELETE FROM question_cache WHERE id = ?'
            ).bind(questionId).run()
          }

          return jsonResponse({ success: true, message: '审核完成' }, 200, origin)
        } catch (e) {
          console.error('Review question error:', e)
          return errorResponse('审核失败', 500, origin)
        }
      }

      // 获取所有水平测试记录
      if (path === '/api/admin/level-test/tests' && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const url = new URL(request.url)
          const limit = parseInt(url.searchParams.get('limit') || '20')
          const offset = parseInt(url.searchParams.get('offset') || '0')
          const status = url.searchParams.get('status')
          const subject = url.searchParams.get('subject')
          const grade = url.searchParams.get('grade')

          let query = `
            SELECT lt.*, u.name as user_name, u.email as user_email,
                   (SELECT COUNT(*) FROM test_questions WHERE test_id = lt.id) as question_count
            FROM level_tests lt
            LEFT JOIN users u ON lt.user_id = u.id
            WHERE 1=1
          `
          const params: (string | number)[] = []

          if (status) {
            query += ' AND lt.status = ?'
            params.push(status)
          }
          if (subject) {
            query += ' AND lt.subject = ?'
            params.push(subject)
          }
          if (grade) {
            query += ' AND lt.grade = ?'
            params.push(grade)
          }

          query += ' ORDER BY lt.created_at DESC LIMIT ? OFFSET ?'
          params.push(limit, offset)

          const tests = await env.DB.prepare(query).bind(...params).all()

          // 获取总数
          let countQuery = 'SELECT COUNT(*) as count FROM level_tests WHERE 1=1'
          const countParams: string[] = []
          if (status) {
            countQuery += ' AND status = ?'
            countParams.push(status)
          }
          if (subject) {
            countQuery += ' AND subject = ?'
            countParams.push(subject)
          }
          if (grade) {
            countQuery += ' AND grade = ?'
            countParams.push(grade)
          }

          const total = await env.DB.prepare(countQuery).bind(...countParams).first() as { count: number } | null

          return jsonResponse({
            tests: tests.results || [],
            total: total?.count || 0,
          }, 200, origin)
        } catch (e) {
          console.error('Get tests error:', e)
          return errorResponse('获取测试记录失败', 500, origin)
        }
      }

      // 获取测试详情（管理员）
      if (path.match(/^\/api\/admin\/level-test\/\w+$/) && request.method === 'GET') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const testId = path.split('/').pop()

          const test = await env.DB.prepare(
            `SELECT lt.*, u.name as user_name, u.email as user_email
             FROM level_tests lt
             LEFT JOIN users u ON lt.user_id = u.id
             WHERE lt.id = ?`
          ).bind(testId).first()

          if (!test) {
            return errorResponse('测试不存在', 404, origin)
          }

          const questions = await env.DB.prepare(
            'SELECT * FROM test_questions WHERE test_id = ? ORDER BY id'
          ).bind(testId).all()

          const report = await env.DB.prepare(
            'SELECT * FROM test_reports WHERE test_id = ?'
          ).bind(testId).first()

          return jsonResponse({
            test,
            questions: questions.results || [],
            report,
          }, 200, origin)
        } catch (e) {
          console.error('Get test detail error:', e)
          return errorResponse('获取测试详情失败', 500, origin)
        }
      }

      // 批量添加题目到缓存（管理员手动添加）
      if (path === '/api/admin/level-test/cache/add' && request.method === 'POST') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const body = await request.json() as {
            questions: Array<{
              grade: string
              subject: string
              question_type: string
              difficulty: string
              question_data: string
            }>
          }

          const now = new Date().toISOString()
          let addedCount = 0

          for (const q of body.questions) {
            try {
              const id = crypto.randomUUID()
              await env.DB.prepare(
                `INSERT INTO question_cache (id, grade, subject, question_type, difficulty, question_data, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              ).bind(id, q.grade, q.subject, q.question_type, q.difficulty, q.question_data, now, now).run()
              addedCount++
            } catch (e) {
              console.error('Add question to cache error:', e)
            }
          }

          return jsonResponse({ 
            success: true, 
            addedCount,
            message: `成功添加 ${addedCount} 道题目到缓存`
          }, 200, origin)
        } catch (e) {
          console.error('Batch add questions error:', e)
          return errorResponse('添加题目失败', 500, origin)
        }
      }

      // 清理低质量题目
      if (path === '/api/admin/level-test/cache/cleanup' && request.method === 'POST') {
        const adminKey = request.headers.get('X-Admin-Key')
        if (adminKey !== 'zhixin2024admin') {
          return errorResponse('无权访问', 403, origin)
        }

        try {
          const body = await request.json() as {
            minScoreRate?: number // 最低正确率阈值
            minUsageCount?: number // 最低使用次数阈值
          }

          const minScoreRate = body.minScoreRate || 0.3
          const minUsageCount = body.minUsageCount || 5

          // 删除使用次数足够但正确率过低的题目
          const result = await env.DB.prepare(
            `DELETE FROM question_cache 
             WHERE usage_count >= ? AND avg_score_rate < ?`
          ).bind(minUsageCount, minScoreRate).run()

          return jsonResponse({
            success: true,
            deletedCount: result.meta.changes,
            message: `已清理 ${result.meta.changes} 道低质量题目`
          }, 200, origin)
        } catch (e) {
          console.error('Cleanup cache error:', e)
          return errorResponse('清理失败', 500, origin)
        }
      }

      // =====================
      // 智能刷题 API
      // =====================

      // 开始刷题 - 生成题目
      if (path === '/api/quiz/start' && request.method === 'POST') {
        const body = await request.json() as {
          grade: string
          subject: string
          difficulty: string
          questionCount: number
        }

        // 生成题目
        const questions = await generateQuizQuestions(body, env.DEEPSEEK_API_KEY)

        const sessionId = crypto.randomUUID()

        // 保存到数据库（如果用户已登录）
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
          if (tokenData) {
            try {
              await env.DB.prepare(
                `INSERT INTO quiz_sessions (id, user_id, config, status, questions, start_time) 
                 VALUES (?, ?, ?, 'active', ?, ?)`
              ).bind(sessionId, tokenData.userId, JSON.stringify(body), JSON.stringify(questions), new Date().toISOString()).run()
            } catch (e) {
              console.error('Save quiz session error:', e)
            }
          }
        }

        // 返回前端期望的格式
        return jsonResponse({
          sessionId,
          questions,
        }, 200, origin)
      }

      // 评分答案 - 使用智能答案匹配
      if (path === '/api/quiz/grade' && request.method === 'POST') {
        const body = await request.json() as {
          question: string
          questionType: string
          correctAnswer: string | number
          studentAnswer: string | number
          options?: string[]
        }

        const userAnswer = String(body.studentAnswer)
        const expectedAnswer = String(body.correctAnswer)
        const questionType = body.questionType || 'short_answer'
        const questionText = body.question || ''

        // 智能答案匹配（传入题目文本以便识别题目类型）
        const matchResult = intelligentAnswerMatch(userAnswer, expectedAnswer, questionType, body.options, questionText)

        return jsonResponse({
          isCorrect: matchResult.isCorrect,
          feedback: matchResult.feedback,
          score: matchResult.isCorrect ? 100 : 0,
          totalScore: 100,
          matchType: matchResult.matchType,
          confidence: matchResult.confidence,
        }, 200, origin)
      }

      // 保存刷题记录（刷题完成时调用）
      if (path === '/api/quiz/save' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        let body: {
          sessionId: string
          config: {
            grade: string
            subject: string
            difficulty: string
            questionCount: number
          }
          questions: Array<{
            id: string
            question: string
            correctAnswer: string | number
            userAnswer?: string | number
            isCorrect?: boolean
          }>
          score: number
          accuracy: number
          timeSpent: number
        }
        
        try {
          body = await request.json() as typeof body
        } catch (parseError) {
          return errorResponse('请求数据格式错误', 400, origin)
        }

        // 验证必要字段
        if (!body.sessionId || !body.config || !body.questions) {
          return errorResponse('缺少必要字段', 400, origin)
        }

        try {
          const now = new Date().toISOString()
          
          // 检查是否已存在该session
          const existingSession = await env.DB.prepare(
            'SELECT id FROM quiz_sessions WHERE id = ?'
          ).bind(body.sessionId).first()

          let operation = 'insert'
          
          if (existingSession) {
            // 更新现有记录
            operation = 'update'
            await env.DB.prepare(`
              UPDATE quiz_sessions 
              SET status = 'completed', 
                  end_time = ?, 
                  score = ?, 
                  accuracy = ?, 
                  total_time = ?,
                  questions = ?
              WHERE id = ?
            `).bind(
              now,
              body.score,
              body.accuracy / 100,
              body.timeSpent,
              JSON.stringify(body.questions),
              body.sessionId
            ).run()
          } else {
            // 插入新记录
            await env.DB.prepare(`
              INSERT INTO quiz_sessions (id, user_id, config, status, questions, start_time, end_time, score, accuracy, total_time, created_at)
              VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              body.sessionId,
              tokenData.userId,
              JSON.stringify(body.config),
              JSON.stringify(body.questions),
              now,
              now,
              body.score,
              body.accuracy / 100,
              body.timeSpent,
              now
            ).run()
          }
          
          console.log(`Quiz session saved: ${body.sessionId}, operation: ${operation}, user: ${tokenData.userId}`)

          // 同时更新排行榜统计
          const existingStats = await env.DB.prepare(
            'SELECT * FROM user_ranking_stats WHERE user_id = ?'
          ).bind(tokenData.userId).first()

          if (existingStats) {
            const totalSessions = ((existingStats.total_sessions as number) || 0) + 1
            const totalQuestions = ((existingStats.total_questions as number) || 0) + body.config.questionCount
            const correctAnswers = ((existingStats.correct_answers as number) || 0) + body.score
            
            await env.DB.prepare(`
              UPDATE user_ranking_stats 
              SET total_sessions = ?, 
                  total_questions = ?, 
                  correct_answers = ?,
                  average_accuracy = ?,
                  last_activity_at = ?,
                  updated_at = ?
              WHERE user_id = ?
            `).bind(
              totalSessions,
              totalQuestions,
              correctAnswers,
              correctAnswers / totalQuestions,
              now,
              now,
              tokenData.userId
            ).run()
          } else {
            const id = crypto.randomUUID()
            await env.DB.prepare(`
              INSERT INTO user_ranking_stats 
              (id, user_id, total_sessions, total_questions, correct_answers, average_accuracy, last_activity_at, created_at, updated_at)
              VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
            `).bind(
              id,
              tokenData.userId,
              body.config.questionCount,
              body.score,
              body.accuracy / 100,
              now,
              now,
              now
            ).run()
          }

          return jsonResponse({ 
            success: true, 
            message: '刷题记录已保存',
            sessionId: body.sessionId
          }, 200, origin)
        } catch (dbError) {
          console.error('Save quiz session error:', dbError)
          return errorResponse('保存刷题记录失败', 500, origin)
        }
      }

      // 获取刷题历史记录
      if (path === '/api/quiz/history' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return jsonResponse({ history: [], debug: 'no auth header' }, 200, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return jsonResponse({ history: [], debug: 'invalid token' }, 200, origin)
        }

        try {
          const query = `
            SELECT 
              id,
              config,
              questions,
              status,
              score,
              accuracy,
              total_time as timeSpent,
              created_at as completedAt
            FROM quiz_sessions
            WHERE user_id = ? AND status = 'completed'
            ORDER BY created_at DESC
            LIMIT 50
          `
          
          const results = await env.DB.prepare(query).bind(tokenData.userId).all()

          const history = (results.results || []).map((row: Record<string, unknown>) => {
            let config = { subject: 'math', grade: 'f5', difficulty: 'standard', questionCount: 10 }
            let questionsArray: unknown[] = []
            
            try {
              config = JSON.parse(row.config as string || '{}')
            } catch {}
            
            try {
              questionsArray = JSON.parse(row.questions as string || '[]')
            } catch {}

            // totalQuestions 优先从题目数组长度获取，其次从config获取
            const totalQuestions = questionsArray.length || config.questionCount || 10

            return {
              id: row.id,
              subject: config.subject || 'math',
              grade: config.grade || 'f5',
              difficulty: config.difficulty || 'standard',
              score: row.score || 0,
              totalQuestions,
              accuracy: Math.round((row.accuracy as number || 0) * 100),
              timeSpent: row.timeSpent || 0,
              completedAt: row.completedAt,
              questions: questionsArray // 添加题目数组
            }
          })

          return jsonResponse({ history, count: history.length }, 200, origin)
        } catch (dbError) {
          console.error('Load quiz history error:', dbError)
          return jsonResponse({ history: [], error: String(dbError) }, 200, origin)
        }
      }

      // 获取错题列表
      if (path === '/api/quiz/wrong-questions' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return jsonResponse({ questions: [] }, 200, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return jsonResponse({ questions: [] }, 200, origin)
        }

        try {
          const records = await env.DB.prepare(
            `SELECT 
              id,
              question_id as questionId,
              question_text as questionText,
              question_type as questionType,
              subject,
              topic,
              user_answer as userAnswer,
              correct_answer as correctAnswer,
              explanation,
              wrong_count as wrongCount,
              status,
              first_attempt_date as firstAttemptDate,
              last_attempt_date as lastAttemptDate,
              created_at as createdAt
            FROM wrong_questions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 100`
          ).bind(tokenData.userId).all()

          return jsonResponse({ questions: records.results || [] }, 200, origin)
        } catch (error) {
          console.error('获取错题列表失败:', error)
          return jsonResponse({ questions: [] }, 200, origin)
        }
      }

      // 添加错题
      if (path === '/api/quiz/wrong-questions' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const body = await request.json() as {
          questionId: string
          questionText: string
          questionType: string
          subject: string
          topic?: string
          userAnswer: string
          correctAnswer: string
          explanation: string
        }

        const now = new Date().toISOString()

        // 检查是否已存在该错题（基于 question_id 和 user_id）
        const existing = await env.DB.prepare(
          'SELECT id, wrong_count FROM wrong_questions WHERE question_id = ? AND user_id = ?'
        ).bind(body.questionId, tokenData.userId).first() as { id: string; wrong_count: number } | null

        if (existing) {
          // 如果已存在，更新错误次数，重置状态为待复习，更新用户答案
          await env.DB.prepare(
            `UPDATE wrong_questions 
             SET wrong_count = wrong_count + 1, 
                 status = 'unreviewed', 
                 user_answer = ?,
                 last_attempt_date = ?,
                 updated_at = ? 
             WHERE id = ?`
          ).bind(body.userAnswer, now, now, existing.id).run()
          
          return jsonResponse({ message: '错题已更新', id: existing.id, wrongCount: existing.wrong_count + 1 }, 200, origin)
        }

        // 如果不存在，创建新记录
        const id = crypto.randomUUID()
        await env.DB.prepare(
          `INSERT INTO wrong_questions (id, user_id, question_id, question_text, question_type, subject, topic, user_answer, correct_answer, explanation, wrong_count, status, first_attempt_date, last_attempt_date, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'unreviewed', ?, ?, ?, ?)`
        ).bind(
          id, tokenData.userId, body.questionId, body.questionText, body.questionType,
          body.subject, body.topic || '综合', body.userAnswer, body.correctAnswer, body.explanation, 
          now, now, now, now
        ).run()

        return jsonResponse({ message: '错题已添加', id }, 200, origin)
      }

      // 更新错题状态
      if (path.match(/^\/api\/quiz\/wrong-questions\/[^/]+\/status$/) && request.method === 'PATCH') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const pathParts = path.split('/')
        const questionId = pathParts[pathParts.length - 2]
        const body = await request.json() as { status: string }

        await env.DB.prepare(
          'UPDATE wrong_questions SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        ).bind(body.status, new Date().toISOString(), questionId, tokenData.userId).run()

        return jsonResponse({ message: '状态已更新' }, 200, origin)
      }

      // 删除错题
      if (path.match(/^\/api\/quiz\/wrong-questions\/[^/]+$/) && request.method === 'DELETE') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const questionId = path.split('/').pop()
        await env.DB.prepare(
          'DELETE FROM wrong_questions WHERE id = ? AND user_id = ?'
        ).bind(questionId, tokenData.userId).run()

        return jsonResponse({ message: '删除成功' }, 200, origin)
      }

      // 获取学习档案
      if (path === '/api/quiz/learning-profile' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const userId = tokenData.userId
        const today = new Date().toISOString().split('T')[0]

        try {
          // 1. 获取所有完成的刷题记录
          const allSessions = await env.DB.prepare(`
            SELECT 
              config,
              questions,
              score,
              accuracy,
              total_time
            FROM quiz_sessions
            WHERE user_id = ? AND status = 'completed'
          `).bind(userId).all()

          // 计算总体统计
          let totalQuizzes = 0
          let totalQuestions = 0
          let correctAnswers = 0
          let totalTimeSpent = 0

          for (const row of (allSessions.results || [])) {
            totalQuizzes++
            
            // 从 questions JSON 获取题目数量
            let questionsCount = 0
            try {
              const questionsArr = JSON.parse(row.questions as string || '[]')
              questionsCount = Array.isArray(questionsArr) ? questionsArr.length : 0
            } catch {
              // 尝试从 config 获取
              try {
                const config = JSON.parse(row.config as string || '{}')
                questionsCount = config.questionCount || 5
              } catch {}
            }
            
            totalQuestions += questionsCount
            correctAnswers += Number(row.score) || 0
            totalTimeSpent += Number(row.total_time) || 0
          }

          const overallStats = {
            totalQuizzes,
            totalQuestions,
            correctAnswers,
            totalTimeSpent,
          }

          // 2. 获取连续学习天数
          const studyDays = await env.DB.prepare(`
            SELECT DISTINCT DATE(created_at) as study_date
            FROM quiz_sessions
            WHERE user_id = ? AND status = 'completed'
            ORDER BY study_date DESC
          `).bind(userId).all()

          // 计算连续天数
          let currentStreak = 0
          let longestStreak = 0
          let tempStreak = 0
          let lastDate: Date | null = null
          let lastStudyDate = today

          if (studyDays.results && studyDays.results.length > 0) {
            lastStudyDate = studyDays.results[0].study_date as string

            for (const row of studyDays.results) {
              const dateStr = row.study_date as string
              const currentDate = new Date(dateStr)
              
              if (lastDate === null) {
                tempStreak = 1
                // 检查是否是今天或昨天
                const todayDate = new Date(today)
                const diffDays = Math.floor((todayDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays <= 1) {
                  currentStreak = 1
                }
              } else {
                const diffDays = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays === 1) {
                  tempStreak++
                  if (currentStreak > 0) {
                    currentStreak = tempStreak
                  }
                } else {
                  tempStreak = 1
                }
              }
              
              longestStreak = Math.max(longestStreak, tempStreak)
              lastDate = currentDate
            }
          }

          // 3. 获取各科目统计（从已获取的数据计算）
          const subjectNameMap: Record<string, string> = {
            math: '数学',
            physics: '物理',
            chemistry: '化学',
            biology: '生物',
            english: '英国语文',
            chinese: '中国语文',
            liberal: '公民与社会发展',
            economics: '经济',
            bafs: '企业、会计与财务概论',
            geography: '地理',
            history: '历史',
            ict: '资讯及通讯科技',
          }

          // 按科目聚合统计
          const subjectStatsMap: Record<string, {
            totalQuestions: number
            correctAnswers: number
            lastPracticed: string
          }> = {}

          for (const row of (allSessions.results || [])) {
            let subjectId = 'math'
            let questionsCount = 0
            
            try {
              const config = JSON.parse(row.config as string || '{}')
              subjectId = config.subject || 'math'
            } catch {}
            
            try {
              const questionsArr = JSON.parse(row.questions as string || '[]')
              questionsCount = Array.isArray(questionsArr) ? questionsArr.length : 0
            } catch {}

            if (!subjectStatsMap[subjectId]) {
              subjectStatsMap[subjectId] = {
                totalQuestions: 0,
                correctAnswers: 0,
                lastPracticed: today,
              }
            }

            subjectStatsMap[subjectId].totalQuestions += questionsCount
            subjectStatsMap[subjectId].correctAnswers += Number(row.score) || 0
          }

          const subjectMastery = Object.entries(subjectStatsMap).map(([subjectId, stats]) => {
            const accuracy = stats.totalQuestions > 0 
              ? (stats.correctAnswers / stats.totalQuestions) * 100 
              : 0
            
            return {
              subjectId,
              subjectName: subjectNameMap[subjectId] || subjectId,
              totalQuestions: stats.totalQuestions,
              correctAnswers: stats.correctAnswers,
              accuracy: Math.round(accuracy * 10) / 10,
              recentTrend: 'stable' as const,
              lastPracticed: stats.lastPracticed,
            }
          }).sort((a, b) => b.totalQuestions - a.totalQuestions)

          // 4. 获取最近活动（从已获取的数据计算最近7天）
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          
          const recentActivitySessions = await env.DB.prepare(`
            SELECT 
              DATE(created_at) as date,
              config,
              questions,
              score
            FROM quiz_sessions
            WHERE user_id = ? AND status = 'completed'
              AND created_at >= ?
            ORDER BY created_at DESC
          `).bind(userId, sevenDaysAgo.toISOString()).all()

          // 按日期聚合
          const activityByDate: Record<string, {
            quizCount: number
            questionsAnswered: number
            correctCount: number
          }> = {}

          for (const row of (recentActivitySessions.results || [])) {
            const date = row.date as string
            let questionsCount = 0
            
            try {
              const questionsArr = JSON.parse(row.questions as string || '[]')
              questionsCount = Array.isArray(questionsArr) ? questionsArr.length : 0
            } catch {}

            if (!activityByDate[date]) {
              activityByDate[date] = { quizCount: 0, questionsAnswered: 0, correctCount: 0 }
            }

            activityByDate[date].quizCount++
            activityByDate[date].questionsAnswered += questionsCount
            activityByDate[date].correctCount += Number(row.score) || 0
          }

          const recentActivity = {
            results: Object.entries(activityByDate).map(([date, stats]) => ({
              date,
              quizCount: stats.quizCount,
              questionsAnswered: stats.questionsAnswered,
              accuracy: stats.questionsAnswered > 0 
                ? Math.round((stats.correctCount / stats.questionsAnswered) * 1000) / 10
                : 0,
            })).sort((a, b) => b.date.localeCompare(a.date))
          }

          // 5. 计算成就
          const achievements = []

          // 初露锋芒 - 完成第一次刷题
          achievements.push({
            id: '1',
            name: '初露锋芒',
            description: '完成第一次刷题',
            icon: '🌟',
            unlockedAt: overallStats.totalQuizzes >= 1 ? lastStudyDate : null,
            progress: overallStats.totalQuizzes >= 1 ? 100 : 0,
          })

          // 勤学不倦 - 连续学习7天
          achievements.push({
            id: '2',
            name: '勤学不倦',
            description: '连续学习7天',
            icon: '🔥',
            unlockedAt: longestStreak >= 7 ? lastStudyDate : null,
            progress: Math.min(100, Math.round((longestStreak / 7) * 100)),
          })

          // 百题斩 - 完成100道题目
          achievements.push({
            id: '3',
            name: '百题斩',
            description: '完成100道题目',
            icon: '💯',
            unlockedAt: overallStats.totalQuestions >= 100 ? lastStudyDate : null,
            progress: Math.min(100, Math.round((overallStats.totalQuestions / 100) * 100)),
          })

          // 千题王 - 完成1000道题目
          achievements.push({
            id: '4',
            name: '千题王',
            description: '完成1000道题目',
            icon: '👑',
            unlockedAt: overallStats.totalQuestions >= 1000 ? lastStudyDate : null,
            progress: Math.min(100, Math.round((overallStats.totalQuestions / 1000) * 100)),
          })

          // 6. 计算学习目标（从已获取的数据计算）
          void new Date(today).toISOString() // todayStart - reserved for future use
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - 7)
          const monthStart = new Date()
          monthStart.setDate(monthStart.getDate() - 30)

          // 获取各时间段的题目数
          const goalSessions = await env.DB.prepare(`
            SELECT questions, created_at
            FROM quiz_sessions
            WHERE user_id = ? AND status = 'completed' 
              AND created_at >= ?
          `).bind(userId, monthStart.toISOString()).all()

          let todayCount = 0
          let weekCount = 0
          let monthCount = 0

          for (const row of (goalSessions.results || [])) {
            let questionsCount = 0
            try {
              const questionsArr = JSON.parse(row.questions as string || '[]')
              questionsCount = Array.isArray(questionsArr) ? questionsArr.length : 0
            } catch {}

            const createdAt = new Date(row.created_at as string)
            
            monthCount += questionsCount
            
            if (createdAt >= weekStart) {
              weekCount += questionsCount
            }
            
            if ((row.created_at as string).startsWith(today)) {
              todayCount += questionsCount
            }
          }

          const goals = [
            { id: '1', title: '每日刷题', target: 20, current: todayCount, deadline: today, type: 'daily' },
            { id: '2', title: '本周目标', target: 100, current: weekCount, deadline: today, type: 'weekly' },
            { id: '3', title: '月度挑战', target: 500, current: monthCount, deadline: today, type: 'monthly' },
          ]

          return jsonResponse({
            totalQuizzes: overallStats?.totalQuizzes || 0,
            totalQuestions: overallStats?.totalQuestions || 0,
            correctAnswers: overallStats?.correctAnswers || 0,
            totalTimeSpent: Math.round((overallStats?.totalTimeSpent || 0) / 60), // 秒转分钟
            currentStreak,
            longestStreak,
            lastStudyDate,
            subjectMastery,
            topicMastery: [],
            achievements,
            goals,
            recentActivity: (recentActivity.results || []).map((row: Record<string, unknown>) => ({
              date: row.date as string,
              quizCount: Number(row.quizCount) || 0,
              questionsAnswered: Number(row.questionsAnswered) || 0,
              accuracy: Number(row.accuracy) || 0,
            })),
          }, 200, origin)

        } catch (error) {
          console.error('获取学习档案失败:', error)
          // 返回空数据而不是模拟数据
          return jsonResponse({
            totalQuizzes: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            totalTimeSpent: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: today,
            subjectMastery: [],
            topicMastery: [],
            achievements: [],
            goals: [],
            recentActivity: [],
          }, 200, origin)
        }
      }

      // 生成学习报告
      if (path === '/api/quiz/generate-report' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        // 返回模拟学习报告
        return jsonResponse({
          generatedAt: new Date().toISOString(),
          period: '本周',
          summary: {
            totalStudyTime: 320,
            totalQuestions: 156,
            averageAccuracy: 74.5,
            improvement: 8.3,
            strongSubjects: ['数学', '物理'],
            weakSubjects: ['中国语文'],
          },
          subjectAnalysis: [],
          topicInsights: [],
          recommendations: ['保持每日练习', '复习错题'],
          nextSteps: ['完成今日练习'],
        }, 200, origin)
      }

      // 刷题健康检查
      if (path === '/api/quiz/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok', service: 'quiz' }, 200, origin)
      }

      // =====================
      // 排行榜 API
      // =====================

      // 获取排行榜
      if (path === '/api/leaderboard' && request.method === 'GET') {
        const url = new URL(request.url)
        const type = url.searchParams.get('type') || 'weekly'
        const criteria = url.searchParams.get('criteria') || 'composite'
        const subject = url.searchParams.get('subject')
        const grade = url.searchParams.get('grade')
        const difficulty = url.searchParams.get('difficulty')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')

        // 获取当前用户（如果已登录）
        let currentUserId: string | null = null
        const authHeader = request.headers.get('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
          const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
          currentUserId = tokenData?.userId || null
        }

        // 构建查询条件
        const now = new Date()
        let periodStart: Date

        switch (type) {
          case 'daily':
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'weekly':
            const dayOfWeek = now.getDay()
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
            break
          case 'monthly':
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          default:
            periodStart = new Date(0) // all_time
        }

        try {
          // 根据criteria选择不同的排序方式
          let orderClause = 'avg_accuracy DESC, avg_time ASC' // 默认综合排序
          
          switch (criteria) {
            case 'accuracy':
              orderClause = 'avg_accuracy DESC, total_sessions DESC'
              break
            case 'speed':
              orderClause = 'avg_time ASC, avg_accuracy DESC'
              break
            case 'subject':
              // 科目榜按正确率和题目数排序
              orderClause = 'avg_accuracy DESC, total_questions DESC'
              break
            case 'composite':
            default:
              // 综合榜：正确率优先，速度次之
              orderClause = 'avg_accuracy DESC, avg_time ASC'
              break
          }

          // 构建筛选条件
          let whereConditions = [
            "qs.status = 'completed'",
            "qs.user_id IS NOT NULL",
            "qs.created_at >= ?"
          ]
          const bindParams: (string | number)[] = [periodStart.toISOString()]

          // 科目筛选
          if (subject && subject !== 'all') {
            whereConditions.push("json_extract(qs.config, '$.subject') = ?")
            bindParams.push(subject)
          }

          // 年级筛选
          if (grade && grade !== 'all') {
            whereConditions.push("json_extract(qs.config, '$.grade') = ?")
            bindParams.push(grade)
          }

          // 难度筛选
          if (difficulty && difficulty !== 'all') {
            whereConditions.push("json_extract(qs.config, '$.difficulty') = ?")
            bindParams.push(difficulty)
          }

          // 添加分页参数
          bindParams.push(limit, (page - 1) * limit)

          // 构建查询 - 从quiz_sessions获取排名数据
          const query = `
            SELECT 
              qs.user_id,
              u.name as display_name,
              COUNT(*) as total_sessions,
              SUM(json_array_length(qs.questions)) as total_questions,
              AVG(COALESCE(qs.accuracy, 0)) as avg_accuracy,
              AVG(COALESCE(qs.total_time, 60)) as avg_time,
              AVG(COALESCE(qs.total_time * 1.0 / NULLIF(json_array_length(qs.questions), 0), 30)) as avg_time_per_question,
              json_extract(qs.config, '$.subject') as session_subject,
              json_extract(qs.config, '$.grade') as session_grade,
              json_extract(qs.config, '$.difficulty') as session_difficulty
            FROM quiz_sessions qs
            LEFT JOIN users u ON qs.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY qs.user_id
            ORDER BY ${orderClause}
            LIMIT ? OFFSET ?
          `
          
          const results = await env.DB.prepare(query)
            .bind(...bindParams)
            .all()

          // 计算综合得分并生成排名
          const rankings = (results.results || []).map((row: Record<string, unknown>, index: number) => {
            const accuracy = (row.avg_accuracy as number) || 0
            const avgTime = (row.avg_time as number) || 60
            const avgTimePerQuestion = (row.avg_time_per_question as number) || 30
            const sessions = (row.total_sessions as number) || 0
            const totalQuestions = (row.total_questions as number) || 0
            
            // 计算各项得分
            const accuracyScore = Math.min(accuracy * 40, 40)
            const speedScore = avgTimePerQuestion <= 15 ? 20 : avgTimePerQuestion <= 30 ? 15 : avgTimePerQuestion <= 45 ? 10 : 5
            const difficultyBonus = difficulty === 'exam' ? 20 : difficulty === 'challenging' ? 10 : difficulty === 'standard' ? 5 : 0
            const activityBonus = sessions >= 20 ? 10 : sessions >= 10 ? 5 : sessions >= 5 ? 2 : 0
            
            // 根据criteria计算不同的总分
            let totalScore = 0
            switch (criteria) {
              case 'accuracy':
                // 准确率榜：准确率占80%
                totalScore = accuracyScore * 2 + activityBonus
                break
              case 'speed':
                // 速度榜：速度占80%
                totalScore = speedScore * 4 + accuracyScore * 0.5
                break
              case 'subject':
                // 科目榜：准确率和题目数量
                totalScore = accuracyScore + Math.min(totalQuestions / 10, 20) + activityBonus
                break
              case 'composite':
              default:
                // 综合榜：平衡各项
                totalScore = accuracyScore + speedScore + difficultyBonus + activityBonus
                break
            }

            return {
              rank: (page - 1) * limit + index + 1,
              userId: row.user_id,
              displayName: row.display_name || '匿名用户',
              avatar: null,
              grade: row.session_grade || (grade !== 'all' ? grade : null),
              subject: row.session_subject || (subject !== 'all' ? subject : null),
              difficulty: row.session_difficulty || (difficulty !== 'all' ? difficulty : null),
              totalScore: Math.round(totalScore * 10) / 10,
              accuracyScore: Math.round(accuracyScore * 10) / 10,
              speedScore,
              activityBonus,
              totalQuestions,
              difficultyBonus,
              consistencyBonus: 0,
              accuracy: Math.round((accuracy * 100) * 10) / 10,
              avgTimePerQuestion: Math.round(avgTime * 10) / 10,
              totalSessions: sessions,
              isCurrentUser: row.user_id === currentUserId
            }
          })

          // 获取总参与人数（使用相同的筛选条件）
          const countWhereConditions = [...whereConditions]
          const countBindParams = bindParams.slice(0, -2) // 移除分页参数
          
          const countQuery = `
            SELECT COUNT(DISTINCT user_id) as count
            FROM quiz_sessions qs
            WHERE ${countWhereConditions.join(' AND ')}
          `
          const countResult = await env.DB.prepare(countQuery).bind(...countBindParams).first() as { count: number } | null
          const totalParticipants = countResult?.count || 0

          // 获取当前用户排名
          let userRank = null
          let userPosition = null
          if (currentUserId) {
            const userEntry = rankings.find((r: any) => r.isCurrentUser)
            if (userEntry) {
              userRank = userEntry
              userPosition = userEntry.rank
            }
          }

          // 计算统计信息
          const scores = rankings.map((r: any) => r.totalScore)
          const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

          const leaderboard = {
            id: `lb_${type}_${criteria}_${Date.now()}`,
            type,
            name: type === 'daily' ? '今日排行榜' : type === 'weekly' ? '本周排行榜' : type === 'monthly' ? '本月排行榜' : '总排行榜',
            description: `基于${criteria === 'composite' ? '综合评分' : criteria === 'accuracy' ? '正确率' : criteria === 'speed' ? '速度' : '科目'}的排名`,
            icon: type === 'daily' ? '☀️' : type === 'weekly' ? '📅' : type === 'monthly' ? '🗓️' : '🏆',
            filters: { subject, grade, difficulty },
            rankings,
            totalParticipants,
            userPosition,
            statistics: {
              averageScore: Math.round(avgScore * 10) / 10,
              medianScore: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0,
              top10Average: scores.slice(0, 10).length > 0 ? scores.slice(0, 10).reduce((a: number, b: number) => a + b, 0) / scores.slice(0, 10).length : 0,
              scoreDistribution: []
            },
            lastUpdated: new Date().toISOString(),
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(totalParticipants / limit) || 1,
              pageSize: limit,
              totalItems: totalParticipants
            }
          }

          return jsonResponse({ leaderboard, userRank }, 200, origin)
        } catch (dbError) {
          console.error('Leaderboard query error:', dbError)
          // 返回空排行榜而不是错误
          return jsonResponse({
            leaderboard: {
              id: `lb_${type}_${criteria}_${Date.now()}`,
              type,
              name: type === 'daily' ? '今日排行榜' : type === 'weekly' ? '本周排行榜' : type === 'monthly' ? '本月排行榜' : '总排行榜',
              description: '暂无数据',
              icon: '🏆',
              filters: { subject, grade, difficulty },
              rankings: [],
              totalParticipants: 0,
              userPosition: null,
              statistics: { averageScore: 0, medianScore: 0, top10Average: 0, scoreDistribution: [] },
              lastUpdated: new Date().toISOString(),
              pagination: { currentPage: 1, totalPages: 1, pageSize: limit, totalItems: 0 }
            },
            userRank: null
          }, 200, origin)
        }
      }

      // 获取当前用户排名详情
      if (path === '/api/leaderboard/me' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        // 获取用户统计数据
        const statsQuery = `
          SELECT 
            COUNT(*) as total_sessions,
            SUM(json_array_length(questions)) as total_questions,
            SUM(CASE WHEN accuracy >= 1.0 THEN 1 ELSE 0 END) as perfect_sessions,
            AVG(accuracy) as avg_accuracy,
            AVG(total_time * 1.0 / json_array_length(questions)) as avg_time
          FROM quiz_sessions
          WHERE user_id = ? AND status = 'completed'
        `
        const stats = await env.DB.prepare(statsQuery).bind(tokenData.userId).first() as Record<string, unknown> | null

        if (!stats || !stats.total_sessions) {
          return jsonResponse({
            userRank: null,
            userStats: {
              totalSessions: 0,
              totalQuestions: 0,
              correctAnswers: 0,
              totalTimeSpent: 0,
              averageAccuracy: 0,
              averageTimePerQuestion: 0,
              currentStreak: 0,
              longestStreak: 0,
              perfectSessions: 0,
              activityLevel: 'low',
              recentScores: []
            }
          }, 200, origin)
        }

        // 计算活跃度
        const last7DaysQuery = `
          SELECT COUNT(*) as count FROM quiz_sessions
          WHERE user_id = ? AND status = 'completed'
          AND datetime(created_at) >= datetime('now', '-7 days')
        `
        const last7Days = await env.DB.prepare(last7DaysQuery).bind(tokenData.userId).first() as { count: number } | null
        
        let activityLevel: 'low' | 'medium' | 'high' | 'excellent' = 'low'
        const sessionCount = last7Days?.count || 0
        if (sessionCount >= 20) activityLevel = 'excellent'
        else if (sessionCount >= 10) activityLevel = 'high'
        else if (sessionCount >= 5) activityLevel = 'medium'

        // 获取最近成绩
        const recentQuery = `
          SELECT accuracy FROM quiz_sessions
          WHERE user_id = ? AND status = 'completed'
          ORDER BY created_at DESC LIMIT 5
        `
        const recentResults = await env.DB.prepare(recentQuery).bind(tokenData.userId).all()
        const recentScores = (recentResults.results || []).map((r: Record<string, unknown>) => 
          Math.round(((r.accuracy as number) || 0) * 100)
        )

        const userStats = {
          totalSessions: stats.total_sessions as number,
          totalQuestions: (stats.total_questions as number) || 0,
          correctAnswers: Math.round(((stats.avg_accuracy as number) || 0) * ((stats.total_questions as number) || 0)),
          totalTimeSpent: 0,
          averageAccuracy: Math.round(((stats.avg_accuracy as number) || 0) * 100),
          averageTimePerQuestion: Math.round(((stats.avg_time as number) || 0) * 10) / 10,
          currentStreak: 0,
          longestStreak: 0,
          perfectSessions: (stats.perfect_sessions as number) || 0,
          activityLevel,
          recentScores
        }

        // 计算用户综合得分
        const accuracyScore = Math.min(userStats.averageAccuracy * 0.4, 40)
        const speedScore = userStats.averageTimePerQuestion <= 30 ? 20 : userStats.averageTimePerQuestion <= 45 ? 15 : 10
        const activityBonus = activityLevel === 'excellent' ? 10 : activityLevel === 'high' ? 6 : activityLevel === 'medium' ? 3 : 0
        const totalScore = accuracyScore + speedScore + activityBonus

        const userRank = {
          rank: 0, // 需要单独计算
          userId: tokenData.userId,
          displayName: '',
          totalScore: Math.round(totalScore * 10) / 10,
          accuracyScore: Math.round(accuracyScore * 10) / 10,
          speedScore,
          difficultyBonus: 0,
          consistencyBonus: 0,
          activityBonus,
          accuracy: userStats.averageAccuracy,
          avgTimePerQuestion: userStats.averageTimePerQuestion,
          totalSessions: userStats.totalSessions,
          totalQuestions: userStats.totalQuestions,
          isCurrentUser: true
        }

        return jsonResponse({ userRank, userStats }, 200, origin)
      }

      // 提交刷题结果更新排行榜（刷题完成时调用）
      if (path === '/api/leaderboard/submit' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        const body = await request.json() as {
          sessionId: string
          accuracy: number
          totalTime: number
          questionCount: number
          difficulty: string
        }

        // 更新或创建用户排名统计
        const existingStats = await env.DB.prepare(
          'SELECT * FROM user_ranking_stats WHERE user_id = ?'
        ).bind(tokenData.userId).first()

        const now = new Date().toISOString()

        if (existingStats) {
          // 更新现有统计
          const totalSessions = ((existingStats.total_sessions as number) || 0) + 1
          const totalQuestions = ((existingStats.total_questions as number) || 0) + body.questionCount
          const correctAnswers = ((existingStats.correct_answers as number) || 0) + Math.round(body.accuracy * body.questionCount)
          
          await env.DB.prepare(`
            UPDATE user_ranking_stats 
            SET total_sessions = ?, 
                total_questions = ?, 
                correct_answers = ?,
                average_accuracy = ?,
                last_activity_at = ?,
                updated_at = ?
            WHERE user_id = ?
          `).bind(
            totalSessions,
            totalQuestions,
            correctAnswers,
            correctAnswers / totalQuestions,
            now,
            now,
            tokenData.userId
          ).run()
        } else {
          // 创建新统计
          const id = crypto.randomUUID()
          await env.DB.prepare(`
            INSERT INTO user_ranking_stats 
            (id, user_id, total_sessions, total_questions, correct_answers, average_accuracy, last_activity_at, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            tokenData.userId,
            body.questionCount,
            Math.round(body.accuracy * body.questionCount),
            body.accuracy,
            now,
            now,
            now
          ).run()
        }

        return jsonResponse({ message: '排名已更新' }, 200, origin)
      }

      // =====================
      // API 文档端点
      // =====================

      // 获取 OpenAPI/Swagger 规范
      if (path === '/api/docs' || path === '/api/openapi.json') {
        const openApiSpec = {
          openapi: '3.0.3',
          info: {
            title: 'DSE 插班智能评估 API',
            description: '基于规则评分引擎 + DeepSeek AI 的香港 DSE 插班可行性分析系统。所有结果为参考建议，不构成录取保证。',
            version: '2.1.0',
          },
          servers: [
            { url: 'https://dse-analysis-api.jordanyungchotan.workers.dev', description: '生产环境' },
            { url: 'http://localhost:5000', description: '本地开发' },
          ],
          paths: {
            '/api/auth/register': { post: { summary: '用户注册', tags: ['认证'] } },
            '/api/auth/login': { post: { summary: '用户登录', tags: ['认证'] } },
            '/api/auth/me': { get: { summary: '获取当前用户信息', tags: ['认证'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/submit': { post: { summary: '提交插班分析', tags: ['插班分析'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/result/{id}': { get: { summary: '获取分析结果', tags: ['插班分析'] } },
            '/api/analysis/history': { get: { summary: '获取分析历史', tags: ['插班分析'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/history/{id}': { delete: { summary: '删除分析记录', tags: ['插班分析'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/subjects': { get: { summary: '获取科目列表', tags: ['配置数据'] } },
            '/api/analysis/grades': { get: { summary: '获取年级列表', tags: ['配置数据'] } },
            '/api/analysis/schools': { get: { summary: '获取学校列表', tags: ['配置数据'] } },
            '/api/placement/score': { post: { summary: '规则评分（不调用AI）', tags: ['规则评分'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/feedback': { post: { summary: '提交分析反馈', tags: ['用户反馈'], security: [{ bearerAuth: [] }] } },
            '/api/analysis/feedback/{analysisId}': { get: { summary: '获取反馈状态', tags: ['用户反馈'] } },
            '/api/consultation/book': { post: { summary: '预约升学咨询', tags: ['咨询预约'], security: [{ bearerAuth: [] }] } },
            '/api/consultation/actions': { get: { summary: '获取推荐行动', tags: ['咨询预约'] } },
          },
          components: {
            securitySchemes: {
              bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
          },
        }
        return jsonResponse(openApiSpec, 200, origin)
      }

      // Swagger UI HTML 页面
      if (path === '/api-docs' || path === '/swagger') {
        const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
  <title>DSE API 文档</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout'
    });
  </script>
</body>
</html>`
        return new Response(swaggerHtml, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders(origin),
          },
        })
      }

      // 根路径 - 显示 API 状态
      if (path === '/' || path === '') {
        return jsonResponse({
          name: 'DSE Analysis API',
          version: '2.1.0',
          documentation: '/api-docs',
          status: 'running',
          endpoints: [
            'GET /api/health',
            'GET /api-docs (Swagger UI)',
            'GET /api/docs (OpenAPI JSON)',
            // 认证 API
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/auth/me',
            // 插班分析 API
            'POST /api/analysis/submit',
            'POST /api/analysis/university',
            'POST /api/analysis/feedback',
            'GET /api/analysis/feedback/:analysisId',
            'GET /api/analysis/result/:id',
            'GET /api/analysis/history',
            'DELETE /api/analysis/history/:id',
            // 配置数据 API
            'GET /api/analysis/subjects',
            'GET /api/analysis/grades',
            'GET /api/analysis/schools',
            // 规则评分 API
            'POST /api/placement/score',
            // 咨询预约 API
            'POST /api/consultation/book',
            'GET /api/consultation/actions',
            'GET /api/consultation/my-bookings',
            'POST /api/student/residence',
            'GET /api/student/residence',
            'POST /api/student/preferences',
            'POST /api/schools/recommend',
            'GET /api/districts',
            'GET /api/universities/programs',
            'GET /api/trends/employment',
            'POST /api/quiz/start',
            'POST /api/quiz/grade',
            'POST /api/quiz/save',
            'GET /api/quiz/history',
            'GET /api/quiz/wrong-questions',
            'POST /api/quiz/wrong-questions',
            'GET /api/quiz/learning-profile',
            'POST /api/quiz/generate-report',
            'GET /api/leaderboard',
            'GET /api/leaderboard/me',
            'POST /api/leaderboard/submit',
            'PUT /api/user/profile',
            'POST /api/user/avatar',
            'PUT /api/user/password',
            // 水平测试 API
            'POST /api/level-test/generate',
            'GET /api/level-test/:id/questions',
            'POST /api/level-test/:id/autosave',
            'POST /api/level-test/:id/submit',
            'GET /api/level-test/:id/report',
            'GET /api/level-test/history',
          ],
        }, 200, origin)
      }

      // ========== 用户设置 API ==========

      // 更新用户资料
      if (path === '/api/user/profile' && request.method === 'PUT') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as { name?: string }
          
          if (body.name) {
            await env.DB.prepare(
              'UPDATE users SET name = ?, updated_at = ? WHERE id = ?'
            ).bind(body.name, new Date().toISOString(), tokenData.userId).run()
          }

          return jsonResponse({ success: true, message: '资料已更新' }, 200, origin)
        } catch (error) {
          console.error('Update profile error:', error)
          return errorResponse('更新失败', 500, origin)
        }
      }

      // 上传头像
      if (path === '/api/user/avatar' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as { avatar: string }
          
          // 保存头像到数据库（base64格式）
          await env.DB.prepare(
            'UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?'
          ).bind(body.avatar, new Date().toISOString(), tokenData.userId).run()

          return jsonResponse({ success: true, message: '头像已更新' }, 200, origin)
        } catch (error) {
          console.error('Upload avatar error:', error)
          return errorResponse('上传失败', 500, origin)
        }
      }

      // 修改密码
      if (path === '/api/user/password' && request.method === 'PUT') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as { currentPassword: string; newPassword: string }
          
          // 获取用户当前密码
          const user = await env.DB.prepare(
            'SELECT password_hash FROM users WHERE id = ?'
          ).bind(tokenData.userId).first() as { password_hash: string } | null

          if (!user) {
            return errorResponse('用户不存在', 404, origin)
          }

          // 验证当前密码（简单字符串比较，实际应使用bcrypt）
          if (user.password_hash !== body.currentPassword) {
            return errorResponse('当前密码错误', 400, origin)
          }

          // 更新密码
          await env.DB.prepare(
            'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
          ).bind(body.newPassword, new Date().toISOString(), tokenData.userId).run()

          return jsonResponse({ success: true, message: '密码已修改' }, 200, origin)
        } catch (error) {
          console.error('Change password error:', error)
          return errorResponse('修改失败', 500, origin)
        }
      }

      // ========== 水平测试 API ==========

      // 生成水平测试
      if (path === '/api/level-test/generate' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as {
            grade: '中四' | '中五' | '中六'
            subject: string
            testType: 'quick' | 'full'
          }

          // 验证参数
          if (!body.grade || !body.subject || !body.testType) {
            return errorResponse('缺少必要参数', 400, origin)
          }

          const validGrades = ['中四', '中五', '中六']
          if (!validGrades.includes(body.grade)) {
            return errorResponse('无效的年级', 400, origin)
          }

          const validTestTypes = ['quick', 'full']
          if (!validTestTypes.includes(body.testType)) {
            return errorResponse('无效的测试类型', 400, origin)
          }

          // 测试配置
          const testConfig = {
            quick: {
              questionCount: 18,
              timeLimit: 30 * 60, // 30分钟
              distribution: { choice: 9, short: 7, long: 2 }
            },
            full: {
              questionCount: 28,
              timeLimit: 60 * 60, // 60分钟
              distribution: { choice: 11, short: 11, long: 6 }
            }
          }

          const config = testConfig[body.testType]
          const testId = crypto.randomUUID()
          const now = new Date().toISOString()

          // 生成题目（优先使用缓存，不足时调用AI）
          const questions = await generateLevelTestQuestionsWithCache(
            env.DB,
            body.subject,
            body.grade,
            config.distribution,
            env.DEEPSEEK_API_KEY
          )

          // 保存测试到数据库
          await env.DB.prepare(`
            INSERT INTO level_tests (
              id, user_id, grade, subject, test_type, status,
              time_limit, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
          `).bind(
            testId,
            tokenData.userId,
            body.grade,
            body.subject,
            body.testType,
            config.timeLimit,
            now,
            now
          ).run()

          // 保存题目到数据库
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i]
            await env.DB.prepare(`
              INSERT INTO test_questions (
                id, test_id, question_index, question_text, question_type,
                options, correct_answer, scoring_points, max_score,
                difficulty, difficulty_weight, estimated_time,
                knowledge_points, topic, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              q.id,
              testId,
              i,
              q.questionText,
              q.questionType,
              q.options ? JSON.stringify(q.options) : null,
              q.correctAnswer,
              q.scoringPoints ? JSON.stringify(q.scoringPoints) : null,
              q.maxScore,
              q.difficulty,
              q.difficultyWeight,
              q.estimatedTime,
              JSON.stringify(q.knowledgePoints),
              q.topic || null,
              now
            ).run()
          }

          return jsonResponse({
            success: true,
            testId,
            questionCount: questions.length,
            timeLimit: config.timeLimit,
            testType: body.testType
          }, 200, origin)

        } catch (error) {
          console.error('Generate level test error:', error)
          return errorResponse('生成测试失败，请稍后重试', 500, origin)
        }
      }

      // 获取测试题目
      if (path.startsWith('/api/level-test/') && path.endsWith('/questions') && request.method === 'GET') {
        const testId = path.replace('/api/level-test/', '').replace('/questions', '')
        
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          // 获取测试信息
          const test = await env.DB.prepare(
            'SELECT * FROM level_tests WHERE id = ? AND user_id = ?'
          ).bind(testId, tokenData.userId).first()

          if (!test) {
            return errorResponse('测试不存在', 404, origin)
          }

          // 获取题目（不返回正确答案）
          const questionsResult = await env.DB.prepare(`
            SELECT id, question_index, question_text, question_type,
                   options, difficulty, estimated_time, max_score,
                   knowledge_points, topic, is_marked, user_answer
            FROM test_questions 
            WHERE test_id = ?
            ORDER BY question_index
          `).bind(testId).all()

          const questions = questionsResult.results.map((q: Record<string, unknown>) => ({
            id: q.id,
            questionIndex: q.question_index,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options ? JSON.parse(q.options as string) : null,
            difficulty: q.difficulty,
            estimatedTime: q.estimated_time,
            maxScore: q.max_score,
            knowledgePoints: q.knowledge_points ? JSON.parse(q.knowledge_points as string) : [],
            topic: q.topic,
            isMarked: q.is_marked === 1,
            userAnswer: q.user_answer
          }))

          // 如果测试是pending状态，更新为in_progress
          if (test.status === 'pending') {
            await env.DB.prepare(
              'UPDATE level_tests SET status = ?, started_at = ?, updated_at = ? WHERE id = ?'
            ).bind('in_progress', new Date().toISOString(), new Date().toISOString(), testId).run()
          }

          return jsonResponse({
            testId,
            grade: test.grade,
            subject: test.subject,
            testType: test.test_type,
            status: test.status === 'pending' ? 'in_progress' : test.status,
            timeLimit: test.time_limit,
            startedAt: test.started_at || new Date().toISOString(),
            questions
          }, 200, origin)

        } catch (error) {
          console.error('Get test questions error:', error)
          return errorResponse('获取题目失败', 500, origin)
        }
      }

      // 自动保存答案
      if (path.startsWith('/api/level-test/') && path.endsWith('/autosave') && request.method === 'POST') {
        const testId = path.replace('/api/level-test/', '').replace('/autosave', '')
        
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as {
            answers: Array<{ questionId: string; answer: string; timeSpent?: number }>
            currentIndex: number
            timeRemaining: number
            markedQuestions: number[]
          }

          const now = new Date().toISOString()

          // 更新每个答案
          for (const ans of body.answers) {
            await env.DB.prepare(`
              UPDATE test_questions 
              SET user_answer = ?, actual_time = ?, answered_at = ?
              WHERE id = ? AND test_id = ?
            `).bind(
              ans.answer,
              ans.timeSpent || null,
              now,
              ans.questionId,
              testId
            ).run()
          }

          // 更新标记状态
          if (body.markedQuestions && body.markedQuestions.length > 0) {
            // 先清除所有标记
            await env.DB.prepare(
              'UPDATE test_questions SET is_marked = 0 WHERE test_id = ?'
            ).bind(testId).run()
            
            // 设置新标记
            for (const idx of body.markedQuestions) {
              await env.DB.prepare(
                'UPDATE test_questions SET is_marked = 1 WHERE test_id = ? AND question_index = ?'
              ).bind(testId, idx).run()
            }
          }

          // 保存自动保存记录
          const autosaveId = crypto.randomUUID()
          await env.DB.prepare(`
            INSERT OR REPLACE INTO test_autosave (
              id, test_id, user_id, answers_snapshot, current_index,
              time_remaining, marked_questions, saved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            autosaveId,
            testId,
            tokenData.userId,
            JSON.stringify(body.answers),
            body.currentIndex,
            body.timeRemaining,
            JSON.stringify(body.markedQuestions || []),
            now
          ).run()

          // 更新测试进度
          await env.DB.prepare(`
            UPDATE level_tests 
            SET current_question_index = ?, answered_count = ?, updated_at = ?
            WHERE id = ?
          `).bind(body.currentIndex, body.answers.length, now, testId).run()

          return jsonResponse({ success: true, savedAt: now }, 200, origin)

        } catch (error) {
          console.error('Autosave error:', error)
          return errorResponse('保存失败', 500, origin)
        }
      }

      // 提交测试答案
      if (path.startsWith('/api/level-test/') && path.endsWith('/submit') && request.method === 'POST') {
        const testId = path.replace('/api/level-test/', '').replace('/submit', '')
        
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const body = await request.json() as {
            answers: Array<{ questionId: string; answer: string; timeSpent?: number }>
            totalTimeSpent: number
          }

          const now = new Date().toISOString()

          // 获取测试信息
          const test = await env.DB.prepare(
            'SELECT * FROM level_tests WHERE id = ? AND user_id = ?'
          ).bind(testId, tokenData.userId).first()

          if (!test) {
            return errorResponse('测试不存在', 404, origin)
          }

          if (test.status === 'completed' || test.status === 'graded') {
            return errorResponse('测试已提交', 400, origin)
          }

          // 获取所有题目
          const questionsResult = await env.DB.prepare(
            'SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_index'
          ).bind(testId).all()

          const questions = questionsResult.results as Record<string, unknown>[]

          // 评分
          let totalScore = 0
          let totalMaxScore = 0
          const gradingResults: Array<{
            questionId: string
            isCorrect: boolean
            score: number
            maxScore: number
            feedback: string
          }> = []

          for (const q of questions) {
            const userAnswer = body.answers.find(a => a.questionId === q.id)?.answer || ''
            const correctAnswer = q.correct_answer as string
            const maxScore = q.max_score as number
            const questionType = q.question_type as string

            let score = 0
            let isCorrect = false
            let feedback = ''

            if (questionType === 'choice') {
              // 选择题直接比较
              isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase()
              score = isCorrect ? maxScore : 0
              feedback = isCorrect ? '回答正确' : `正确答案是 ${correctAnswer}`
            } else {
              // 短答题和论述题使用AI评分或关键词匹配
              const result = await gradeSubjectiveAnswer(
                q.question_text as string,
                correctAnswer,
                userAnswer,
                q.scoring_points ? JSON.parse(q.scoring_points as string) : [],
                maxScore,
                env.DEEPSEEK_API_KEY
              )
              score = result.score
              isCorrect = score >= maxScore * 0.6
              feedback = result.feedback
            }

            totalScore += score
            totalMaxScore += maxScore

            // 更新题目得分
            await env.DB.prepare(`
              UPDATE test_questions 
              SET user_answer = ?, user_score = ?, auto_graded = 1,
                  grading_feedback = ?, answered_at = ?
              WHERE id = ?
            `).bind(userAnswer, score, feedback, now, q.id).run()

            gradingResults.push({
              questionId: q.id as string,
              isCorrect,
              score,
              maxScore,
              feedback
            })
          }

          // 计算最终得分和等级
          const finalScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0
          const level = scoreToLevel(finalScore)

          // 更新测试状态
          await env.DB.prepare(`
            UPDATE level_tests 
            SET status = 'graded', raw_score = ?, final_score = ?,
                level = ?, time_spent = ?, completed_at = ?,
                graded_at = ?, updated_at = ?
            WHERE id = ?
          `).bind(
            totalScore,
            finalScore,
            level,
            body.totalTimeSpent,
            now,
            now,
            now,
            testId
          ).run()

          // 生成报告
          const reportId = crypto.randomUUID()
          const strengthPoints: string[] = []
          const weaknessPoints: string[] = []

          // 分析知识点
          const knowledgeStats: Record<string, { correct: number; total: number }> = {}
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i]
            const result = gradingResults[i]
            const kps = q.knowledge_points ? JSON.parse(q.knowledge_points as string) : []
            for (const kp of kps) {
              if (!knowledgeStats[kp]) {
                knowledgeStats[kp] = { correct: 0, total: 0 }
              }
              knowledgeStats[kp].total++
              if (result.isCorrect) {
                knowledgeStats[kp].correct++
              }
            }
          }

          for (const [kp, stats] of Object.entries(knowledgeStats)) {
            const accuracy = stats.correct / stats.total
            if (accuracy >= 0.8) {
              strengthPoints.push(kp)
            } else if (accuracy < 0.5) {
              weaknessPoints.push(kp)
            }
          }

          // 计算能力雷达图（更精确的计算）
          const abilityRadar = calculateDetailedAbilityRadar(questions, gradingResults)

          // 生成AI个性化报告（异步但等待结果）
          const aiReport = await generateAIPersonalizedReport(
            env.DEEPSEEK_API_KEY,
            {
              subject: test.subject as string,
              grade: test.grade as string,
              score: finalScore,
              level,
              abilityRadar,
              strengthPoints,
              weaknessPoints,
              totalQuestions: questions.length,
              correctCount: gradingResults.filter(r => r.isCorrect).length,
              timeSpent: body.totalTimeSpent
            }
          )

          await env.DB.prepare(`
            INSERT INTO test_reports (
              id, test_id, user_id, overall_level, overall_score,
              grade_equivalent, ability_radar, strength_points,
              weakness_points, recommendations, error_patterns,
              study_plan, expected_progress, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            reportId,
            testId,
            tokenData.userId,
            level,
            finalScore,
            calculateGradeEquivalent(finalScore, test.grade as string),
            JSON.stringify(abilityRadar),
            JSON.stringify(strengthPoints),
            JSON.stringify(weaknessPoints),
            JSON.stringify(aiReport.recommendations),
            JSON.stringify({ summary: aiReport.summary, analysis: aiReport.detailedAnalysis }),
            JSON.stringify(aiReport.progressTimeline),
            JSON.stringify({ encouragement: aiReport.encouragement }),
            now
          ).run()

          return jsonResponse({
            success: true,
            testId,
            reportId,
            finalScore,
            level,
            levelDescription: levelToDescription(level),
            totalQuestions: questions.length,
            correctCount: gradingResults.filter(r => r.isCorrect).length,
            abilityRadar,
            strengthPoints,
            weaknessPoints
          }, 200, origin)

        } catch (error) {
          console.error('Submit test error:', error)
          return errorResponse('提交失败', 500, origin)
        }
      }

      // 获取测试报告
      if (path.startsWith('/api/level-test/') && path.endsWith('/report') && request.method === 'GET') {
        const testId = path.replace('/api/level-test/', '').replace('/report', '')
        
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          // 获取测试信息
          const test = await env.DB.prepare(
            'SELECT * FROM level_tests WHERE id = ? AND user_id = ?'
          ).bind(testId, tokenData.userId).first()

          if (!test) {
            return errorResponse('测试不存在', 404, origin)
          }

          if (test.status !== 'graded') {
            return errorResponse('测试尚未完成评分', 400, origin)
          }

          // 获取报告
          const report = await env.DB.prepare(
            'SELECT * FROM test_reports WHERE test_id = ?'
          ).bind(testId).first()

          if (!report) {
            return errorResponse('报告不存在', 404, origin)
          }

          // 获取题目详情
          const questionsResult = await env.DB.prepare(`
            SELECT id, question_index, question_text, question_type,
                   options, correct_answer, user_answer, user_score,
                   max_score, grading_feedback, difficulty, knowledge_points
            FROM test_questions 
            WHERE test_id = ?
            ORDER BY question_index
          `).bind(testId).all()

          const questions = questionsResult.results.map((q: Record<string, unknown>) => ({
            id: q.id,
            questionIndex: q.question_index,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options ? JSON.parse(q.options as string) : null,
            correctAnswer: q.correct_answer,
            userAnswer: q.user_answer,
            score: q.user_score,
            maxScore: q.max_score,
            feedback: q.grading_feedback,
            difficulty: q.difficulty,
            knowledgePoints: q.knowledge_points ? JSON.parse(q.knowledge_points as string) : []
          }))

          return jsonResponse({
            testId,
            grade: test.grade,
            subject: test.subject,
            testType: test.test_type,
            completedAt: test.completed_at,
            timeSpent: test.time_spent,
            overallLevel: report.overall_level,
            overallScore: report.overall_score,
            gradeEquivalent: report.grade_equivalent,
            abilityRadar: JSON.parse(report.ability_radar as string),
            strengthPoints: JSON.parse(report.strength_points as string),
            weaknessPoints: JSON.parse(report.weakness_points as string),
            recommendations: JSON.parse(report.recommendations as string),
            questions
          }, 200, origin)

        } catch (error) {
          console.error('Get report error:', error)
          return errorResponse('获取报告失败', 500, origin)
        }
      }

      // 获取测试历史
      if (path === '/api/level-test/history' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return errorResponse('请先登录', 401, origin)
        }

        const tokenData = await verifyToken(authHeader.slice(7), env.JWT_SECRET)
        if (!tokenData) {
          return errorResponse('登录已过期', 401, origin)
        }

        try {
          const url = new URL(request.url)
          const subject = url.searchParams.get('subject')
          const grade = url.searchParams.get('grade')
          const limit = parseInt(url.searchParams.get('limit') || '20')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          let query = `
            SELECT id, grade, subject, test_type, status, final_score, level,
                   time_spent, created_at, completed_at
            FROM level_tests 
            WHERE user_id = ? AND status = 'graded'
          `
          const params: (string | number)[] = [tokenData.userId]

          if (subject) {
            query += ' AND subject = ?'
            params.push(subject)
          }
          if (grade) {
            query += ' AND grade = ?'
            params.push(grade)
          }

          query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
          params.push(limit, offset)

          const result = await env.DB.prepare(query).bind(...params).all()

          const tests = result.results.map((t: Record<string, unknown>) => ({
            id: t.id,
            grade: t.grade,
            subject: t.subject,
            testType: t.test_type,
            status: t.status,
            finalScore: t.final_score,
            level: t.level,
            levelDescription: levelToDescription(t.level as string),
            timeSpent: t.time_spent,
            createdAt: t.created_at,
            completedAt: t.completed_at
          }))

          // 获取总数
          let countQuery = `
            SELECT COUNT(*) as count FROM level_tests 
            WHERE user_id = ? AND status = 'graded'
          `
          const countParams: string[] = [tokenData.userId]
          if (subject) {
            countQuery += ' AND subject = ?'
            countParams.push(subject)
          }
          if (grade) {
            countQuery += ' AND grade = ?'
            countParams.push(grade)
          }

          const countResult = await env.DB.prepare(countQuery).bind(...countParams).first() as { count: number }

          return jsonResponse({
            tests,
            total: countResult?.count || 0,
            limit,
            offset
          }, 200, origin)

        } catch (error) {
          console.error('Get test history error:', error)
          return errorResponse('获取历史失败', 500, origin)
        }
      }

      // 404
      return errorResponse('接口不存在', 404, origin)

    } catch (error) {
      console.error('Error:', error)
      if (error instanceof AnalysisInputError) {
        return errorResponse(error.message, error.status, origin)
      }
      return errorResponse('服务器错误', 500, origin)
    }
  },
}

