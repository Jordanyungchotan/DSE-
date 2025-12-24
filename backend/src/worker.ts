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
    '阅读理解段落', '语法填空练习', '词汇选择题', '句子改错练习',
    '完形填空训练', '短文写作指导', '同义词辨析', '时态语态运用',
    '从句结构分析', '口语表达情景', '书信写作格式', '文章主旨理解'
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
  english: `【英国语文题目要求】
- 语法题：时态、语态、从句、介词、冠词等
- 词汇题：同义词、反义词、词性转换、短语搭配
- 阅读理解：段落大意、细节理解、推断题
- 句子改错：语法错误识别与纠正
⚠️ 禁止出数学计算题！只出英语语言相关题目！`,
  
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
      
      // 简化提示词以加快响应
      const systemPrompt = `你是DSE ${subjectName}考试专家。你必须生成${subjectName}科目的题目，不能生成其他科目的题目！用简体中文生成题目，严格按JSON格式输出。`

      const userPrompt = `【重要】生成${config.questionCount}道${gradeName}【${subjectName}】${difficultyName}题目。

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
      explanation: '主语是第三人称单数 "She"，一般现在时态下动词需要加 s/es，所以用 "goes"。',
      topicTags: ['语法', '时态', '主谓一致'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_2',
      question: 'Which word is a synonym for "happy"?',
      questionType: 'multiple_choice',
      options: ['joyful', 'sad', 'angry', 'tired'],
      correctAnswer: 'A',
      explanation: '"Joyful" 意为充满快乐的，是 "happy"（快乐的）的同义词。',
      topicTags: ['词汇', '同义词'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_3',
      question: 'Choose the correct preposition: The book is _____ the table.',
      questionType: 'multiple_choice',
      options: ['on', 'in', 'at', 'by'],
      correctAnswer: 'A',
      explanation: '书在桌子"上面"用介词 "on"。"in" 表示在...里面，"at" 表示在某点，"by" 表示在...旁边。',
      topicTags: ['语法', '介词'],
      difficultyScore: 1,
    },
    {
      id: 'fb_eng_4',
      question: 'Find the error in this sentence: "He don\'t like apples."',
      questionType: 'multiple_choice',
      options: ['"don\'t" should be "doesn\'t"', '"like" should be "likes"', '"He" should be "Him"', 'No error'],
      correctAnswer: 'A',
      explanation: '主语 "He" 是第三人称单数，助动词应该用 "doesn\'t" 而不是 "don\'t"。正确句子是 "He doesn\'t like apples."',
      topicTags: ['语法', '主谓一致', '句子改错'],
      difficultyScore: 2,
    },
    {
      id: 'fb_eng_5',
      question: 'Choose the correct tense: By next year, I _____ from university.',
      questionType: 'multiple_choice',
      options: ['will have graduated', 'graduated', 'am graduating', 'have graduated'],
      correctAnswer: 'A',
      explanation: '"By next year" 表示到明年为止，需要用将来完成时 "will have + 过去分词"。',
      topicTags: ['语法', '时态', '将来完成时'],
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

  const subjectNames = studentInfo.subjects.map(s => SUBJECT_NAME_MAP[s.subject] || s.subject)

  return `你是一位资深的香港DSE教育专家。请根据以下【已完整提供】的学生信息，提供专业的插班分析和建议。

【学生基本信息】（以下信息已全部提供，请直接使用这些信息进行分析，不要说信息缺失）：
- 插班日期：${studentInfo.enrollmentDate}
- 当前年级：${GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade}
- 学生年龄：${studentInfo.age}岁
- 原就读学校：${studentInfo.currentSchool || '未填写'}

【各科目成绩详情】：
${subjectsText}

【目标学校】：${studentInfo.targetSchools.join('、')}

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
      "admissionProbability": <0-100的整数，录取概率>,
      "requirements": ["录取要求1", "录取要求2"],
      "gaps": ["差距1", "差距2"],
      "recommendations": ["建议1", "建议2"]
    }
  ],
  "studyPlan": {
    "weeklySchedule": ["周一安排", "周二安排", "..."],
    "monthlyGoals": ["第1个月目标", "第2个月目标", "..."],
    "resources": ["推荐资源1", "推荐资源2", "..."]
  },
  "additionalAdvice": ["建议1", "建议2", "建议3", "建议4"]
}

重要注意事项：
1. subjectAnalyses 必须包含以下科目的分析：${subjectNames.join('、')}
2. schoolAssessments 必须包含以下学校的评估：${studentInfo.targetSchools.join('、')}
3. 所有数组字段不能为空
4. 只返回JSON，不要有其他文字说明
5. 【特别重要】上述学生信息已完整提供，请在分析中充分利用年级（${GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade}）、年龄（${studentInfo.age}岁）等信息。绝对不要在keyWeaknesses或任何地方说"信息缺失"、"资料缺失"或类似表述
6. 请根据学生当前年级评估其与目标学校课程进度的匹配度`
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

    return JSON.parse(jsonMatch[0]) as UniversityAnalysisResult
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
          'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?'
        ).bind(email.toLowerCase().trim()).first() as { id: string; name: string; email: string; password_hash: string; created_at: string } | null

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
        recommendations.sort((a, b) => b.matchScore - a.matchScore)

        return jsonResponse({ recommendations: recommendations.slice(0, 10) }, 200, origin)
      }

      // 获取香港18区列表
      if (path === '/api/districts' && request.method === 'GET') {
        const districts = [
          { code: 'central_western', name: '中西区' },
          { code: 'wan_chai', name: '湾仔区' },
          { code: 'eastern', name: '东区' },
          { code: 'southern', name: '南区' },
          { code: 'yau_tsim_mong', name: '油尖旺区' },
          { code: 'sham_shui_po', name: '深水埗区' },
          { code: 'kowloon_city', name: '九龙城区' },
          { code: 'wong_tai_sin', name: '黄大仙区' },
          { code: 'kwun_tong', name: '观塘区' },
          { code: 'tsuen_wan', name: '荃湾区' },
          { code: 'tuen_mun', name: '屯门区' },
          { code: 'yuen_long', name: '元朗区' },
          { code: 'north', name: '北区' },
          { code: 'tai_po', name: '大埔区' },
          { code: 'sha_tin', name: '沙田区' },
          { code: 'sai_kung', name: '西贡区' },
          { code: 'kwai_tsing', name: '葵青区' },
          { code: 'islands', name: '离岛区' },
        ]
        return jsonResponse({ districts }, 200, origin)
      }

      // =====================
      // 大学申请分析 API
      // =====================

      // 提交大学申请分析
      if (path === '/api/analysis/university' && request.method === 'POST') {
        const body = await request.json() as {
          dseResults: { subject: string; grade: string }[]
          targetUniversities: string[]
          targetMajors: string[]
          extracurriculars?: string
          careerInterests?: string[]
        }

        // 计算最佳5科/6科分数
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

        return jsonResponse({
          message: '大学申请分析完成',
          result: {
            id: recordId,
            createdAt: now,
            bestFive,
            bestSix,
            ...universityAnalysisResult,
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
          body = await request.json()
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

        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await env.DB.prepare(
          `INSERT INTO wrong_questions (id, user_id, question_id, question_text, question_type, subject, topic, user_answer, correct_answer, explanation, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed', ?)`
        ).bind(
          id, tokenData.userId, body.questionId, body.questionText, body.questionType,
          body.subject, body.topic || '综合', body.userAnswer, body.correctAnswer, body.explanation, now
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

        // 返回模拟学习档案数据
        const today = new Date().toISOString().split('T')[0]
        return jsonResponse({
          totalQuizzes: 10,
          totalQuestions: 100,
          correctAnswers: 75,
          totalTimeSpent: 300,
          currentStreak: 3,
          longestStreak: 7,
          lastStudyDate: today,
          subjectMastery: [
            { subjectId: 'math', subjectName: '数学', totalQuestions: 50, correctAnswers: 40, accuracy: 80, recentTrend: 'up', lastPracticed: today },
            { subjectId: 'english', subjectName: '英国语文', totalQuestions: 30, correctAnswers: 22, accuracy: 73.3, recentTrend: 'stable', lastPracticed: today },
          ],
          topicMastery: [],
          achievements: [
            { id: '1', name: '初露锋芒', description: '完成第一次刷题', icon: '🌟', unlockedAt: today, progress: 100 },
          ],
          goals: [],
          recentActivity: [],
        }, 200, origin)
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
              activityBonus: 0,
              accuracy: Math.round((accuracy * 100) * 10) / 10,
              avgTimePerQuestion: Math.round(avgTime * 10) / 10,
              totalSessions: sessions,
              totalQuestions: sessions * 10, // 估算
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
            const userEntry = rankings.find(r => r.isCurrentUser)
            if (userEntry) {
              userRank = userEntry
              userPosition = userEntry.rank
            }
          }

          // 计算统计信息
          const scores = rankings.map(r => r.totalScore)
          const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

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
              top10Average: scores.slice(0, 10).length > 0 ? scores.slice(0, 10).reduce((a, b) => a + b, 0) / scores.slice(0, 10).length : 0,
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

      // 根路径 - 显示 API 状态
      if (path === '/' || path === '') {
        return jsonResponse({
          name: 'DSE Analysis API',
          version: '2.0.0',
          status: 'running',
          endpoints: [
            'GET /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'POST /api/analysis/submit',
            'POST /api/analysis/university',
            'GET /api/analysis/result/:id',
            'GET /api/analysis/history',
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

      // 404
      return errorResponse('接口不存在', 404, origin)

    } catch (error) {
      console.error('Error:', error)
      return errorResponse('服务器错误', 500, origin)
    }
  },
}

