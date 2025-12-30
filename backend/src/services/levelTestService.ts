/**
 * DSE水平测试服务
 * 
 * 提供水平测试的核心业务逻辑
 */

// ===== 类型定义 =====

export interface TestConfig {
  grade: '中四' | '中五' | '中六'
  subject: string
  testType: 'quick' | 'full'
}

export interface GeneratedQuestion {
  id: string
  questionIndex: number
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  correctAnswer: string
  scoringPoints?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  difficultyWeight: number
  estimatedTime: number
  knowledgePoints: string[]
  dseReference?: string
  topic?: string
  maxScore: number
}

export interface LevelTest {
  id: string
  userId: string
  grade: string
  subject: string
  testType: string
  status: string
  timeLimit: number
  questions: GeneratedQuestion[]
  createdAt: string
}

export interface TestSubmission {
  answers: Array<{
    questionId: string
    answer: string
    timeSpent?: number
  }>
  totalTimeSpent: number
}

export interface GradingResult {
  questionId: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  score: number
  maxScore: number
  feedback: string
  autoGraded: boolean
}

export interface TestReport {
  testId: string
  overallLevel: string
  overallScore: number
  gradeEquivalent: string
  abilityRadar: {
    knowledge: number
    application: number
    analysis: number
    synthesis: number
    evaluation: number
  }
  strengthPoints: string[]
  weaknessPoints: string[]
  errorPatterns: Array<{
    type: string
    count: number
    examples: string[]
  }>
  recommendations: Array<{
    priority: number
    topic: string
    suggestion: string
    resources: string[]
  }>
  peerComparison: {
    sameGradePercentile: number
    sameSubjectPercentile: number
  }
}

// ===== DSE等级映射 =====

export function scoreToLevel(score: number): string {
  if (score >= 90) return '5**'
  if (score >= 85) return '5*'
  if (score >= 80) return '5'
  if (score >= 70) return '4'
  if (score >= 60) return '3'
  if (score >= 40) return '2'
  if (score >= 20) return '1'
  return 'U'
}

export function levelToDescription(level: string): string {
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

// ===== 测试配置 =====

export const TEST_CONFIG = {
  quick: {
    questionCount: { min: 15, max: 20 },
    timeLimit: 30 * 60, // 30分钟
    distribution: {
      choice: 0.5,  // 50% 选择题
      short: 0.35,  // 35% 短答题
      long: 0.15    // 15% 论述题
    },
    difficultyDistribution: {
      easy: 0.35,
      medium: 0.50,
      hard: 0.15
    }
  },
  full: {
    questionCount: { min: 25, max: 30 },
    timeLimit: 60 * 60, // 60分钟
    distribution: {
      choice: 0.40,  // 40% 选择题
      short: 0.40,   // 40% 短答题
      long: 0.20     // 20% 论述题
    },
    difficultyDistribution: {
      easy: 0.30,
      medium: 0.50,
      hard: 0.20
    }
  }
}

// ===== 科目配置 =====

export const SUBJECTS = {
  core: ['中文', '英文', '数学', '通识教育'],
  elective: ['物理', '化学', '生物', '经济', '地理', '历史', '中国历史', '信息及通讯科技']
}

export const SUBJECT_TOPICS: Record<string, Record<string, string[]>> = {
  '数学': {
    '中四': ['二次方程', '函数及图像', '直线方程', '多项式', '指数与对数', '三角比'],
    '中五': ['等差及等比数列', '变分', '概率', '统计', '三角函数', '直线的方程'],
    '中六': ['微分', '积分', '向量', '矩阵', '线性规划', '概率分布']
  },
  '物理': {
    '中四': ['热学', '力学基础', '光学', '电学入门'],
    '中五': ['力与运动', '能量', '波动', '电路'],
    '中六': ['电磁学', '原子物理', '量子概念', '核物理']
  },
  '化学': {
    '中四': ['微观世界', '金属', '酸碱盐', '氧化还原'],
    '中五': ['化学反应速率', '化学平衡', '有机化学基础'],
    '中六': ['电化学', '分析化学', '工业化学']
  },
  '生物': {
    '中四': ['细胞与生命', '遗传学基础', '生态系统'],
    '中五': ['人体生理', '植物生理', '微生物'],
    '中六': ['分子生物学', '生物技术', '进化论']
  },
  '经济': {
    '中四': ['基本经济概念', '需求与供给', '市场结构'],
    '中五': ['宏观经济', '货币与银行', '国际贸易'],
    '中六': ['经济增长', '政府政策', '全球化']
  },
  '中文': {
    '中四': ['阅读理解', '写作技巧', '古文阅读', '语文知识'],
    '中五': ['文言文', '文学赏析', '议论文', '实用文'],
    '中六': ['综合能力', '文学创作', '批判思维']
  },
  '英文': {
    '中四': ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Writing Basics'],
    '中五': ['Essay Writing', 'Listening', 'Speaking', 'Data Handling'],
    '中六': ['Advanced Writing', 'Critical Reading', 'Integrated Skills']
  },
  '通识教育': {
    '中四': ['个人成长', '今日香港', '现代中国'],
    '中五': ['全球化', '公共卫生', '能源与环境'],
    '中六': ['综合议题', '独立专题研究']
  },
  '地理': {
    '中四': ['地图阅读', '气候与天气', '河流与海岸'],
    '中五': ['农业', '工业', '城市发展'],
    '中六': ['全球环境问题', '区域研究']
  },
  '历史': {
    '中四': ['二十世纪初的世界', '第一次世界大战'],
    '中五': ['两次大战之间', '第二次世界大战'],
    '中六': ['冷战时期', '现代世界格局']
  },
  '中国历史': {
    '中四': ['夏商周', '秦汉', '魏晋南北朝'],
    '中五': ['隋唐', '宋元', '明清'],
    '中六': ['近代中国', '中华人民共和国']
  },
  '信息及通讯科技': {
    '中四': ['电脑基础', '程序设计入门', '数据处理'],
    '中五': ['数据库', '网络基础', '多媒体'],
    '中六': ['系统开发', '信息安全', '社会议题']
  }
}

// ===== 难度权重 =====

export const DIFFICULTY_WEIGHTS = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.3
}

// ===== 题目分值配置 =====

export const SCORE_CONFIG = {
  choice: { easy: 1, medium: 1, hard: 2 },
  short: { easy: 2, medium: 3, hard: 4 },
  long: { easy: 4, medium: 6, hard: 8 }
}

// ===== 估计答题时间（秒）=====

export const ESTIMATED_TIME = {
  choice: { easy: 30, medium: 60, hard: 90 },
  short: { easy: 120, medium: 180, hard: 240 },
  long: { easy: 300, medium: 420, hard: 600 }
}

// ===== 辅助函数 =====

/**
 * 生成UUID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * 计算测试所需题目数量
 */
export function calculateQuestionDistribution(testType: 'quick' | 'full'): {
  choice: { easy: number; medium: number; hard: number }
  short: { easy: number; medium: number; hard: number }
  long: { easy: number; medium: number; hard: number }
} {
  const config = TEST_CONFIG[testType]
  const totalCount = Math.floor((config.questionCount.min + config.questionCount.max) / 2)
  
  // 按题型分配
  const choiceCount = Math.round(totalCount * config.distribution.choice)
  const shortCount = Math.round(totalCount * config.distribution.short)
  const longCount = totalCount - choiceCount - shortCount
  
  // 按难度分配每种题型
  const distributeByDifficulty = (count: number) => ({
    easy: Math.round(count * config.difficultyDistribution.easy),
    medium: Math.round(count * config.difficultyDistribution.medium),
    hard: count - Math.round(count * config.difficultyDistribution.easy) - Math.round(count * config.difficultyDistribution.medium)
  })
  
  return {
    choice: distributeByDifficulty(choiceCount),
    short: distributeByDifficulty(shortCount),
    long: distributeByDifficulty(longCount)
  }
}

/**
 * 计算加权得分
 */
export function calculateWeightedScore(
  results: GradingResult[],
  questions: GeneratedQuestion[]
): { rawScore: number; weightedScore: number; finalScore: number } {
  let totalRawScore = 0
  let totalMaxScore = 0
  let totalWeightedScore = 0
  let totalMaxWeightedScore = 0
  
  for (const result of results) {
    const question = questions.find(q => q.id === result.questionId)
    if (!question) continue
    
    totalRawScore += result.score
    totalMaxScore += result.maxScore
    
    const weight = question.difficultyWeight
    totalWeightedScore += result.score * weight
    totalMaxWeightedScore += result.maxScore * weight
  }
  
  const rawScore = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0
  const weightedScore = totalMaxWeightedScore > 0 ? (totalWeightedScore / totalMaxWeightedScore) * 100 : 0
  
  // 最终得分取加权得分
  const finalScore = Math.round(weightedScore * 10) / 10
  
  return { rawScore, weightedScore, finalScore }
}

/**
 * 分析能力维度
 */
export function analyzeAbilityDimensions(
  results: GradingResult[],
  questions: GeneratedQuestion[]
): { knowledge: number; application: number; analysis: number; synthesis: number; evaluation: number } {
  // 根据题目类型和难度映射到能力维度
  const dimensions = {
    knowledge: { score: 0, max: 0 },      // 知识理解 - 主要来自选择题
    application: { score: 0, max: 0 },    // 应用能力 - 主要来自短答题
    analysis: { score: 0, max: 0 },       // 分析能力 - 来自中等难度题
    synthesis: { score: 0, max: 0 },      // 综合能力 - 来自论述题
    evaluation: { score: 0, max: 0 }      // 评价能力 - 来自高难度题
  }
  
  for (const result of results) {
    const question = questions.find(q => q.id === result.questionId)
    if (!question) continue
    
    // 根据题目类型分配权重
    if (question.questionType === 'choice') {
      dimensions.knowledge.score += result.score * 0.8
      dimensions.knowledge.max += result.maxScore * 0.8
      dimensions.application.score += result.score * 0.2
      dimensions.application.max += result.maxScore * 0.2
    } else if (question.questionType === 'short') {
      dimensions.application.score += result.score * 0.5
      dimensions.application.max += result.maxScore * 0.5
      dimensions.analysis.score += result.score * 0.5
      dimensions.analysis.max += result.maxScore * 0.5
    } else if (question.questionType === 'long') {
      dimensions.synthesis.score += result.score * 0.4
      dimensions.synthesis.max += result.maxScore * 0.4
      dimensions.evaluation.score += result.score * 0.4
      dimensions.evaluation.max += result.maxScore * 0.4
      dimensions.analysis.score += result.score * 0.2
      dimensions.analysis.max += result.maxScore * 0.2
    }
    
    // 高难度题额外贡献评价维度
    if (question.difficulty === 'hard') {
      dimensions.evaluation.score += result.score * 0.3
      dimensions.evaluation.max += result.maxScore * 0.3
    }
  }
  
  // 计算百分比得分
  const calculatePercent = (dim: { score: number; max: number }) => 
    dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0
  
  return {
    knowledge: calculatePercent(dimensions.knowledge),
    application: calculatePercent(dimensions.application),
    analysis: calculatePercent(dimensions.analysis),
    synthesis: calculatePercent(dimensions.synthesis),
    evaluation: calculatePercent(dimensions.evaluation)
  }
}

/**
 * 识别优势和薄弱知识点
 */
export function analyzeKnowledgePoints(
  results: GradingResult[],
  questions: GeneratedQuestion[]
): { strengthPoints: string[]; weaknessPoints: string[] } {
  const knowledgeStats: Record<string, { correct: number; total: number }> = {}
  
  for (const result of results) {
    const question = questions.find(q => q.id === result.questionId)
    if (!question) continue
    
    for (const kp of question.knowledgePoints) {
      if (!knowledgeStats[kp]) {
        knowledgeStats[kp] = { correct: 0, total: 0 }
      }
      knowledgeStats[kp].total++
      if (result.isCorrect) {
        knowledgeStats[kp].correct++
      }
    }
  }
  
  const strengthPoints: string[] = []
  const weaknessPoints: string[] = []
  
  for (const [kp, stats] of Object.entries(knowledgeStats)) {
    const accuracy = stats.correct / stats.total
    if (accuracy >= 0.8) {
      strengthPoints.push(kp)
    } else if (accuracy < 0.5) {
      weaknessPoints.push(kp)
    }
  }
  
  return { strengthPoints, weaknessPoints }
}

/**
 * 计算等价年级水平
 */
export function calculateGradeEquivalent(
  score: number,
  targetGrade: string
): string {
  const gradeOrder = ['中四上学期', '中四下学期', '中五上学期', '中五下学期', '中六上学期', '中六下学期']
  
  let baseIndex: number
  switch (targetGrade) {
    case '中四': baseIndex = 1; break
    case '中五': baseIndex = 3; break
    case '中六': baseIndex = 5; break
    default: baseIndex = 1
  }
  
  // 根据分数调整
  let adjustment = 0
  if (score >= 90) adjustment = 1       // 超越目标年级
  else if (score >= 70) adjustment = 0  // 符合目标年级
  else if (score >= 50) adjustment = -1 // 低一级
  else if (score >= 30) adjustment = -2 // 低两级
  else adjustment = -3                   // 远低于
  
  const finalIndex = Math.max(0, Math.min(gradeOrder.length - 1, baseIndex + adjustment))
  return gradeOrder[finalIndex]
}

/**
 * 生成学习建议
 */
export function generateRecommendations(
  weaknessPoints: string[],
  subject: string,
  grade: string
): Array<{ priority: number; topic: string; suggestion: string; resources: string[] }> {
  return weaknessPoints.slice(0, 5).map((point, index) => ({
    priority: index + 1,
    topic: point,
    suggestion: `建议系统复习${point}相关知识，从基础概念开始，逐步提升难度。`,
    resources: [
      `${subject} ${grade} ${point} 讲解视频`,
      `${subject} ${point} 练习题`,
      `DSE ${subject} ${point} 历年真题`
    ]
  }))
}

