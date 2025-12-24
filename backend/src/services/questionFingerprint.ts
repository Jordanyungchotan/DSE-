/**
 * DSE智能刷题系统 - 题目指纹系统
 * 
 * 功能：
 * 1. 生成题目多维度指纹（语义哈希、结构特征、数值模式、概念签名）
 * 2. 检测题目相似度
 * 3. 过滤重复题目
 */

import crypto from 'crypto'

// ===== 类型定义 =====

export interface QuestionFingerprint {
  questionId: string
  // 语义哈希 - 基于文本内容
  semanticHash: string
  // 结构特征 - 题目结构分析
  structuralFeatures: StructuralFeatures
  // 数值模式 - 数字和单位
  numericalPattern: NumericalPattern
  // 概念签名 - 知识点标识
  conceptualSignature: ConceptualSignature
  // 答案模式
  answerPattern: AnswerPattern
  // 创建时间
  createdAt: string
}

export interface StructuralFeatures {
  questionType: string  // 题型：multiple_choice, short_answer, calculation, proof
  sentenceCount: number // 句子数量
  hasFormula: boolean   // 是否包含公式
  hasGraph: boolean     // 是否包含图表
  hasTable: boolean     // 是否包含表格
  wordCount: number     // 字数
  complexity: number    // 复杂度评分 0-10
  questionPattern: string // 问题模式：what, how, why, calculate, prove, explain
}

export interface NumericalPattern {
  numbers: number[]           // 出现的数字
  numberCount: number         // 数字数量
  hasDecimals: boolean        // 是否有小数
  hasFractions: boolean       // 是否有分数
  hasNegatives: boolean       // 是否有负数
  magnitudeRange: string      // 数量级范围：small, medium, large
  units: string[]             // 使用的单位
  numericHash: string         // 数值组合哈希
}

export interface ConceptualSignature {
  subject: string             // 科目
  topics: string[]            // 知识点列表
  skills: string[]            // 所需技能
  difficulty: string          // 难度
  cognitiveLevel: string      // 认知层次：remember, understand, apply, analyze, evaluate, create
  conceptHash: string         // 概念组合哈希
}

export interface AnswerPattern {
  answerType: string          // 答案类型：numeric, text, multiple_choice, expression
  answerLength: string        // 答案长度：short, medium, long
  stepsRequired: number       // 所需步骤数
  answerHash: string          // 答案模式哈希
}

export interface SimilarityResult {
  isDuplicate: boolean
  isVariant: boolean
  similarities: {
    semantic: number
    structural: number
    numerical: number
    conceptual: number
    overall: number
  }
  duplicateConfidence: number
  duplicateReason: string | null
}

export interface SimilarityThresholds {
  semantic: number      // 语义相似度阈值
  structural: number    // 结构相似度阈值
  numerical: number     // 数值相似度阈值
  conceptual: number    // 概念相似度阈值
  duplicate: number     // 判定为重复的综合阈值
  variant: number       // 判定为变体的综合阈值
}

// 默认阈值
const DEFAULT_THRESHOLDS: SimilarityThresholds = {
  semantic: 0.90,
  structural: 0.85,
  numerical: 0.80,
  conceptual: 0.70,
  duplicate: 0.85,
  variant: 0.60
}

// ===== 题目指纹生成器 =====

export class QuestionFingerprintGenerator {
  private thresholds: SimilarityThresholds

  constructor(thresholds: Partial<SimilarityThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
  }

  /**
   * 生成题目指纹
   */
  async generateFingerprint(question: {
    id: string
    question: string
    questionType: string
    correctAnswer: string | number
    explanation?: string
    topicTags?: string[]
    subject?: string
    difficulty?: string
    options?: string[]
  }): Promise<QuestionFingerprint> {
    const questionText = question.question
    const answerText = String(question.correctAnswer)

    return {
      questionId: question.id,
      semanticHash: this.generateSemanticHash(questionText),
      structuralFeatures: this.extractStructuralFeatures(questionText, question.questionType),
      numericalPattern: this.extractNumericalPattern(questionText + ' ' + answerText),
      conceptualSignature: this.extractConceptualSignature(question),
      answerPattern: this.extractAnswerPattern(question),
      createdAt: new Date().toISOString()
    }
  }

  /**
   * 生成语义哈希
   * 使用标准化文本内容生成哈希
   */
  private generateSemanticHash(text: string): string {
    // 标准化文本：去除空白、标点、转小写
    const normalized = this.normalizeText(text)
    
    // 提取关键词并排序
    const keywords = this.extractKeywords(normalized)
    const keywordString = keywords.sort().join('|')
    
    // 生成SHA256哈希
    return crypto.createHash('sha256').update(keywordString).digest('hex').substring(0, 32)
  }

  /**
   * 标准化文本
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[，。、；：""''！？（）【】《》]/g, ' ')
      .replace(/[,.;:!?()[\]{}]/g, ' ')
      .trim()
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 中英文分词（简化版）
    const words = text.split(/\s+/)
    
    // 过滤停用词
    const stopWords = new Set([
      '的', '是', '在', '有', '和', '与', '或', '了', '着', '过',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from',
      '请', '求', '计算', '设', '若', '如果', '那么', '则'
    ])
    
    return words.filter(w => w.length > 1 && !stopWords.has(w))
  }

  /**
   * 提取结构特征
   */
  private extractStructuralFeatures(text: string, questionType: string): StructuralFeatures {
    // 句子数量（按句号、问号分割）
    const sentences = text.split(/[。？！.?!]/).filter(s => s.trim())
    
    // 检测公式（简化检测）
    const hasFormula = /[=×÷+\-*/^√∑∫]|\d+\s*[×x]\s*\d+|\d+\s*[+\-]\s*\d+/.test(text)
    
    // 检测图表关键词
    const hasGraph = /图|表|坐标|曲线|graph|table|chart|figure/i.test(text)
    const hasTable = /表格|table/i.test(text) || text.includes('|')
    
    // 问题模式检测
    const questionPattern = this.detectQuestionPattern(text)
    
    // 复杂度评估
    const complexity = this.calculateComplexity(text, hasFormula, sentences.length)

    return {
      questionType,
      sentenceCount: sentences.length,
      hasFormula,
      hasGraph,
      hasTable,
      wordCount: text.length,
      complexity,
      questionPattern
    }
  }

  /**
   * 检测问题模式
   */
  private detectQuestionPattern(text: string): string {
    const patterns = [
      { pattern: /求|计算|算出|find|calculate/i, type: 'calculate' },
      { pattern: /证明|prove|show that/i, type: 'prove' },
      { pattern: /解释|说明|explain|describe/i, type: 'explain' },
      { pattern: /为什么|why/i, type: 'why' },
      { pattern: /如何|怎样|how/i, type: 'how' },
      { pattern: /什么|哪个|是|what|which/i, type: 'what' },
      { pattern: /比较|compare/i, type: 'compare' },
      { pattern: /分析|analyze|analyse/i, type: 'analyze' }
    ]

    for (const { pattern, type } of patterns) {
      if (pattern.test(text)) {
        return type
      }
    }
    return 'general'
  }

  /**
   * 计算复杂度
   */
  private calculateComplexity(text: string, hasFormula: boolean, sentenceCount: number): number {
    let score = 0
    
    // 基于长度
    if (text.length > 200) score += 2
    else if (text.length > 100) score += 1
    
    // 基于句子数
    if (sentenceCount > 3) score += 2
    else if (sentenceCount > 1) score += 1
    
    // 基于公式
    if (hasFormula) score += 2
    
    // 基于数学符号密度
    const mathSymbols = (text.match(/[=×÷+\-*/^√∑∫≤≥≠]/g) || []).length
    if (mathSymbols > 5) score += 2
    else if (mathSymbols > 2) score += 1
    
    // 基于专业术语
    const technicalTerms = /积分|微分|导数|极限|概率|向量|矩阵|函数|方程|不等式/g
    const termCount = (text.match(technicalTerms) || []).length
    score += Math.min(termCount, 2)
    
    return Math.min(score, 10)
  }

  /**
   * 提取数值模式
   */
  private extractNumericalPattern(text: string): NumericalPattern {
    // 提取所有数字
    const numberMatches = text.match(/[-+]?\d+(?:\.\d+)?(?:\/\d+)?/g) || []
    const numbers = numberMatches.map(n => {
      if (n.includes('/')) {
        const [num, den] = n.split('/')
        return parseFloat(num) / parseFloat(den)
      }
      return parseFloat(n)
    }).filter(n => !isNaN(n))

    // 检测特殊数值类型
    const hasDecimals = numberMatches.some(n => n.includes('.'))
    const hasFractions = numberMatches.some(n => n.includes('/'))
    const hasNegatives = numbers.some(n => n < 0)

    // 数量级范围
    const maxMagnitude = numbers.length > 0 ? Math.max(...numbers.map(Math.abs)) : 0
    let magnitudeRange = 'small'
    if (maxMagnitude > 10000) magnitudeRange = 'large'
    else if (maxMagnitude > 100) magnitudeRange = 'medium'

    // 提取单位
    const units = this.extractUnits(text)

    // 生成数值哈希
    const sortedNumbers = [...numbers].sort((a, b) => a - b)
    const numericHash = crypto.createHash('md5')
      .update(sortedNumbers.map(n => n.toFixed(2)).join(','))
      .digest('hex').substring(0, 16)

    return {
      numbers,
      numberCount: numbers.length,
      hasDecimals,
      hasFractions,
      hasNegatives,
      magnitudeRange,
      units,
      numericHash
    }
  }

  /**
   * 提取单位
   */
  private extractUnits(text: string): string[] {
    const unitPatterns = [
      // 长度
      /\d+\s*(cm|mm|m|km|米|厘米|毫米|公里)/gi,
      // 质量
      /\d+\s*(g|kg|克|公斤|千克)/gi,
      // 时间
      /\d+\s*(s|min|h|秒|分|分钟|小时|时)/gi,
      // 面积/体积
      /\d+\s*(cm²|m²|cm³|m³|平方米|立方米)/gi,
      // 速度
      /\d+\s*(m\/s|km\/h|米\/秒)/gi,
      // 角度
      /\d+\s*(°|度|rad|弧度)/gi,
      // 货币
      /\$\d+|\d+\s*(元|港元|HKD)/gi
    ]

    const units: Set<string> = new Set()
    for (const pattern of unitPatterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(m => {
          const unit = m.replace(/[\d\s.]+/g, '').toLowerCase()
          if (unit) units.add(unit)
        })
      }
    }

    return Array.from(units)
  }

  /**
   * 提取概念签名
   */
  private extractConceptualSignature(question: {
    question: string
    topicTags?: string[]
    subject?: string
    difficulty?: string
  }): ConceptualSignature {
    const text = question.question

    // 检测认知层次
    const cognitiveLevel = this.detectCognitiveLevel(text)

    // 提取技能
    const skills = this.extractSkills(text)

    // 生成概念哈希
    const topics = question.topicTags || []
    const conceptHash = crypto.createHash('md5')
      .update([question.subject, ...topics, question.difficulty].filter(Boolean).join('|'))
      .digest('hex').substring(0, 16)

    return {
      subject: question.subject || 'unknown',
      topics,
      skills,
      difficulty: question.difficulty || 'standard',
      cognitiveLevel,
      conceptHash
    }
  }

  /**
   * 检测认知层次（布鲁姆分类法）
   */
  private detectCognitiveLevel(text: string): string {
    const levels = [
      { level: 'create', keywords: /设计|创造|发明|开发|制定|design|create|invent/i },
      { level: 'evaluate', keywords: /评价|判断|评估|比较优劣|evaluate|judge|assess/i },
      { level: 'analyze', keywords: /分析|比较|区分|分类|analyze|compare|classify/i },
      { level: 'apply', keywords: /应用|计算|求|解|使用|apply|calculate|solve/i },
      { level: 'understand', keywords: /解释|描述|说明|理解|explain|describe/i },
      { level: 'remember', keywords: /列出|定义|识别|list|define|identify/i }
    ]

    for (const { level, keywords } of levels) {
      if (keywords.test(text)) {
        return level
      }
    }
    return 'apply' // 默认应用层次
  }

  /**
   * 提取所需技能
   */
  private extractSkills(text: string): string[] {
    const skillPatterns = [
      { skill: 'calculation', pattern: /计算|算|求值|calculate/i },
      { skill: 'proof', pattern: /证明|证|prove|show/i },
      { skill: 'reasoning', pattern: /推理|推导|deduce|derive/i },
      { skill: 'graphing', pattern: /画图|作图|绘制|graph|plot|draw/i },
      { skill: 'interpretation', pattern: /解释|说明|理解|interpret|explain/i },
      { skill: 'modeling', pattern: /建模|模型|model/i },
      { skill: 'estimation', pattern: /估算|估计|estimate/i },
      { skill: 'comparison', pattern: /比较|对比|compare/i }
    ]

    const skills: string[] = []
    for (const { skill, pattern } of skillPatterns) {
      if (pattern.test(text)) {
        skills.push(skill)
      }
    }

    return skills.length > 0 ? skills : ['general']
  }

  /**
   * 提取答案模式
   */
  private extractAnswerPattern(question: {
    correctAnswer: string | number
    questionType: string
    explanation?: string
  }): AnswerPattern {
    const answer = String(question.correctAnswer)
    
    // 答案类型
    let answerType = 'text'
    if (question.questionType === 'multiple_choice') {
      answerType = 'multiple_choice'
    } else if (/^[-+]?\d+(\.\d+)?$/.test(answer.trim())) {
      answerType = 'numeric'
    } else if (/[=×÷+\-*/^]/.test(answer)) {
      answerType = 'expression'
    }

    // 答案长度
    let answerLength = 'short'
    if (answer.length > 100) answerLength = 'long'
    else if (answer.length > 30) answerLength = 'medium'

    // 估算步骤数（基于解释）
    const explanation = question.explanation || ''
    const stepsRequired = this.estimateSteps(explanation)

    // 答案哈希
    const answerHash = crypto.createHash('md5')
      .update(`${answerType}|${answerLength}|${stepsRequired}`)
      .digest('hex').substring(0, 16)

    return {
      answerType,
      answerLength,
      stepsRequired,
      answerHash
    }
  }

  /**
   * 估算解题步骤数
   */
  private estimateSteps(explanation: string): number {
    if (!explanation) return 1
    
    // 基于步骤标记
    const stepMarkers = explanation.match(/步骤|step|第.步|[①②③④⑤⑥⑦⑧⑨⑩]|\d+\./gi)
    if (stepMarkers) {
      return Math.max(stepMarkers.length, 1)
    }

    // 基于等号数量（计算题）
    const equalsCount = (explanation.match(/=/g) || []).length
    if (equalsCount > 1) {
      return Math.min(equalsCount, 10)
    }

    // 基于长度估算
    if (explanation.length > 500) return 5
    if (explanation.length > 200) return 3
    return 1
  }

  /**
   * 计算两个题目的相似度
   */
  calculateSimilarity(fp1: QuestionFingerprint, fp2: QuestionFingerprint): SimilarityResult {
    // 语义相似度
    const semanticSim = this.calculateSemanticSimilarity(fp1.semanticHash, fp2.semanticHash)
    
    // 结构相似度
    const structuralSim = this.calculateStructuralSimilarity(fp1.structuralFeatures, fp2.structuralFeatures)
    
    // 数值相似度
    const numericalSim = this.calculateNumericalSimilarity(fp1.numericalPattern, fp2.numericalPattern)
    
    // 概念相似度
    const conceptualSim = this.calculateConceptualSimilarity(fp1.conceptualSignature, fp2.conceptualSignature)
    
    // 综合相似度（加权平均）
    const weights = { semantic: 0.35, structural: 0.25, numerical: 0.20, conceptual: 0.20 }
    const overallSim = 
      semanticSim * weights.semantic +
      structuralSim * weights.structural +
      numericalSim * weights.numerical +
      conceptualSim * weights.conceptual

    // 判断是否重复
    const isDuplicate = overallSim >= this.thresholds.duplicate ||
      (semanticSim >= this.thresholds.semantic && conceptualSim >= this.thresholds.conceptual)
    
    // 判断是否为变体
    const isVariant = !isDuplicate && overallSim >= this.thresholds.variant

    // 确定重复原因
    let duplicateReason = null
    if (isDuplicate) {
      if (semanticSim >= this.thresholds.semantic) {
        duplicateReason = '语义高度相似'
      } else if (structuralSim >= this.thresholds.structural && numericalSim >= this.thresholds.numerical) {
        duplicateReason = '结构和数值相似'
      } else {
        duplicateReason = '综合相似度过高'
      }
    }

    return {
      isDuplicate,
      isVariant,
      similarities: {
        semantic: semanticSim,
        structural: structuralSim,
        numerical: numericalSim,
        conceptual: conceptualSim,
        overall: overallSim
      },
      duplicateConfidence: overallSim,
      duplicateReason
    }
  }

  /**
   * 计算语义相似度
   */
  private calculateSemanticSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0
    
    // 计算哈希的汉明距离
    let diff = 0
    const minLen = Math.min(hash1.length, hash2.length)
    for (let i = 0; i < minLen; i++) {
      if (hash1[i] !== hash2[i]) diff++
    }
    
    return 1 - (diff / minLen)
  }

  /**
   * 计算结构相似度
   */
  private calculateStructuralSimilarity(sf1: StructuralFeatures, sf2: StructuralFeatures): number {
    let score = 0
    let total = 0

    // 题型匹配
    if (sf1.questionType === sf2.questionType) score += 2
    total += 2

    // 句子数量接近度
    const sentenceDiff = Math.abs(sf1.sentenceCount - sf2.sentenceCount)
    score += Math.max(0, 1 - sentenceDiff * 0.2)
    total += 1

    // 特征匹配
    if (sf1.hasFormula === sf2.hasFormula) score += 1
    if (sf1.hasGraph === sf2.hasGraph) score += 0.5
    if (sf1.hasTable === sf2.hasTable) score += 0.5
    total += 2

    // 问题模式匹配
    if (sf1.questionPattern === sf2.questionPattern) score += 1.5
    total += 1.5

    // 复杂度接近度
    const complexityDiff = Math.abs(sf1.complexity - sf2.complexity)
    score += Math.max(0, 1 - complexityDiff * 0.1)
    total += 1

    return score / total
  }

  /**
   * 计算数值相似度
   */
  private calculateNumericalSimilarity(np1: NumericalPattern, np2: NumericalPattern): number {
    // 如果数值哈希完全相同
    if (np1.numericHash === np2.numericHash) return 1.0

    let score = 0
    let total = 0

    // 数字数量相似
    const countDiff = Math.abs(np1.numberCount - np2.numberCount)
    score += Math.max(0, 1 - countDiff * 0.15)
    total += 1

    // 特征匹配
    if (np1.hasDecimals === np2.hasDecimals) score += 0.5
    if (np1.hasFractions === np2.hasFractions) score += 0.5
    if (np1.hasNegatives === np2.hasNegatives) score += 0.5
    total += 1.5

    // 数量级范围匹配
    if (np1.magnitudeRange === np2.magnitudeRange) score += 1
    total += 1

    // 单位重叠度
    const unitOverlap = this.calculateArrayOverlap(np1.units, np2.units)
    score += unitOverlap
    total += 1

    // 具体数字重叠度
    const numberOverlap = this.calculateNumberOverlap(np1.numbers, np2.numbers)
    score += numberOverlap * 1.5
    total += 1.5

    return score / total
  }

  /**
   * 计算数组重叠度
   */
  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1
    if (arr1.length === 0 || arr2.length === 0) return 0

    const set1 = new Set(arr1)
    const set2 = new Set(arr2)
    const intersection = arr1.filter(x => set2.has(x))
    const union = new Set([...arr1, ...arr2])

    return intersection.length / union.size
  }

  /**
   * 计算数字重叠度
   */
  private calculateNumberOverlap(nums1: number[], nums2: number[]): number {
    if (nums1.length === 0 && nums2.length === 0) return 1
    if (nums1.length === 0 || nums2.length === 0) return 0

    // 考虑数值接近（允许小误差）
    let matches = 0
    const tolerance = 0.01

    for (const n1 of nums1) {
      for (const n2 of nums2) {
        if (Math.abs(n1 - n2) / Math.max(Math.abs(n1), Math.abs(n2), 1) < tolerance) {
          matches++
          break
        }
      }
    }

    return matches / Math.max(nums1.length, nums2.length)
  }

  /**
   * 计算概念相似度
   */
  private calculateConceptualSimilarity(cs1: ConceptualSignature, cs2: ConceptualSignature): number {
    let score = 0
    let total = 0

    // 科目匹配
    if (cs1.subject === cs2.subject) score += 2
    total += 2

    // 知识点重叠
    const topicOverlap = this.calculateArrayOverlap(cs1.topics, cs2.topics)
    score += topicOverlap * 2
    total += 2

    // 技能重叠
    const skillOverlap = this.calculateArrayOverlap(cs1.skills, cs2.skills)
    score += skillOverlap
    total += 1

    // 难度匹配
    if (cs1.difficulty === cs2.difficulty) score += 1
    total += 1

    // 认知层次匹配
    if (cs1.cognitiveLevel === cs2.cognitiveLevel) score += 1
    total += 1

    return score / total
  }
}

// ===== 题目去重过滤器 =====

export class QuestionDeduplicator {
  private generator: QuestionFingerprintGenerator
  private fingerprintCache: Map<string, QuestionFingerprint>

  constructor(thresholds?: Partial<SimilarityThresholds>) {
    this.generator = new QuestionFingerprintGenerator(thresholds)
    this.fingerprintCache = new Map()
  }

  /**
   * 过滤重复题目
   */
  async filterDuplicates(
    newQuestions: Array<{
      id: string
      question: string
      questionType: string
      correctAnswer: string | number
      explanation?: string
      topicTags?: string[]
      subject?: string
      difficulty?: string
    }>,
    existingFingerprints: QuestionFingerprint[]
  ): Promise<{
    unique: typeof newQuestions
    duplicates: Array<{ question: typeof newQuestions[0], reason: string, similarTo: string }>
    variants: Array<{ question: typeof newQuestions[0], similarTo: string }>
  }> {
    const unique: typeof newQuestions = []
    const duplicates: Array<{ question: typeof newQuestions[0], reason: string, similarTo: string }> = []
    const variants: Array<{ question: typeof newQuestions[0], similarTo: string }> = []

    // 生成新题目的指纹
    const newFingerprints: QuestionFingerprint[] = []
    for (const question of newQuestions) {
      const fp = await this.generator.generateFingerprint(question)
      newFingerprints.push(fp)
    }

    // 检查每个新题目
    for (let i = 0; i < newQuestions.length; i++) {
      const question = newQuestions[i]
      const fp = newFingerprints[i]
      
      let isDup = false
      let isVar = false
      let similarToId = ''
      let dupReason = ''

      // 与已有题目比较
      for (const existingFp of existingFingerprints) {
        const result = this.generator.calculateSimilarity(fp, existingFp)
        
        if (result.isDuplicate) {
          isDup = true
          similarToId = existingFp.questionId
          dupReason = result.duplicateReason || '高度相似'
          break
        }
        
        if (result.isVariant && !isVar) {
          isVar = true
          similarToId = existingFp.questionId
        }
      }

      // 与本批次已通过的题目比较
      if (!isDup) {
        for (let j = 0; j < i; j++) {
          const result = this.generator.calculateSimilarity(fp, newFingerprints[j])
          
          if (result.isDuplicate) {
            isDup = true
            similarToId = newQuestions[j].id
            dupReason = result.duplicateReason || '批次内重复'
            break
          }
        }
      }

      if (isDup) {
        duplicates.push({ question, reason: dupReason, similarTo: similarToId })
      } else if (isVar) {
        variants.push({ question, similarTo: similarToId })
        unique.push(question) // 变体仍然保留
      } else {
        unique.push(question)
      }
    }

    return { unique, duplicates, variants }
  }

  /**
   * 计算题目集合的多样性分数
   */
  async calculateDiversityScore(questions: Array<{
    id: string
    question: string
    questionType: string
    correctAnswer: string | number
    topicTags?: string[]
    subject?: string
    difficulty?: string
  }>): Promise<{
    overallScore: number
    dimensions: {
      structuralDiversity: number
      numericalDiversity: number
      conceptualDiversity: number
      topicCoverage: number
    }
  }> {
    if (questions.length < 2) {
      return {
        overallScore: 1,
        dimensions: {
          structuralDiversity: 1,
          numericalDiversity: 1,
          conceptualDiversity: 1,
          topicCoverage: 1
        }
      }
    }

    // 生成所有指纹
    const fingerprints: QuestionFingerprint[] = []
    for (const q of questions) {
      fingerprints.push(await this.generator.generateFingerprint(q))
    }

    // 计算各维度多样性
    const structuralDiversity = this.calculateStructuralDiversity(fingerprints)
    const numericalDiversity = this.calculateNumericalDiversity(fingerprints)
    const conceptualDiversity = this.calculateConceptualDiversity(fingerprints)
    const topicCoverage = this.calculateTopicCoverage(fingerprints)

    const overallScore = (
      structuralDiversity * 0.25 +
      numericalDiversity * 0.25 +
      conceptualDiversity * 0.25 +
      topicCoverage * 0.25
    )

    return {
      overallScore,
      dimensions: {
        structuralDiversity,
        numericalDiversity,
        conceptualDiversity,
        topicCoverage
      }
    }
  }

  private calculateStructuralDiversity(fps: QuestionFingerprint[]): number {
    // 统计不同题型的数量
    const types = new Set(fps.map(fp => fp.structuralFeatures.questionType))
    const patterns = new Set(fps.map(fp => fp.structuralFeatures.questionPattern))
    
    const typeScore = Math.min(types.size / 4, 1) // 假设最多4种题型
    const patternScore = Math.min(patterns.size / 6, 1) // 假设最多6种模式
    
    return (typeScore + patternScore) / 2
  }

  private calculateNumericalDiversity(fps: QuestionFingerprint[]): number {
    // 检查数值模式的多样性
    const hashes = new Set(fps.map(fp => fp.numericalPattern.numericHash))
    const magnitudes = new Set(fps.map(fp => fp.numericalPattern.magnitudeRange))
    
    const hashDiversity = hashes.size / fps.length
    const magnitudeDiversity = magnitudes.size / 3 // 3个级别
    
    return (hashDiversity * 0.7 + magnitudeDiversity * 0.3)
  }

  private calculateConceptualDiversity(fps: QuestionFingerprint[]): number {
    // 检查概念的多样性
    const allTopics = new Set<string>()
    const allSkills = new Set<string>()
    const cogLevels = new Set<string>()
    
    for (const fp of fps) {
      fp.conceptualSignature.topics.forEach(t => allTopics.add(t))
      fp.conceptualSignature.skills.forEach(s => allSkills.add(s))
      cogLevels.add(fp.conceptualSignature.cognitiveLevel)
    }
    
    const topicScore = Math.min(allTopics.size / (fps.length * 2), 1)
    const skillScore = Math.min(allSkills.size / (fps.length * 1.5), 1)
    const cogScore = cogLevels.size / 6 // 6个认知层次
    
    return (topicScore * 0.4 + skillScore * 0.3 + cogScore * 0.3)
  }

  private calculateTopicCoverage(fps: QuestionFingerprint[]): number {
    // 统计知识点覆盖
    const topicCounts = new Map<string, number>()
    
    for (const fp of fps) {
      for (const topic of fp.conceptualSignature.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      }
    }
    
    if (topicCounts.size === 0) return 0.5
    
    // 计算分布均匀度（使用变异系数的反向）
    const counts = Array.from(topicCounts.values())
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length
    const cv = variance > 0 ? Math.sqrt(variance) / mean : 0
    
    // CV越小分布越均匀，多样性越高
    return Math.max(0, 1 - cv * 0.5)
  }
}

export default {
  QuestionFingerprintGenerator,
  QuestionDeduplicator
}

