/**
 * JUPAS 课程信息 API 服务
 * 
 * 提供课程搜索、详情查询、匹配度分析等功能
 */

import { ragFetchJson, apiFetch } from '../config/api'

// ============================================================
// 类型定义
// ============================================================

/** 课程基本信息 */
export interface JUPASProgramme {
  id: number
  programme_code: string
  university_code: string
  university_name_zh: string
  university_name_en: string
  title_zh: string
  title_en: string
  faculty?: string
  department?: string
  duration?: string
  degree_awarded?: string
  url?: string
  description?: string
  career_prospects?: string
}

/** 入学要求科目 */
export interface RequirementSubject {
  subject_code: string
  subject_name_zh: string
  subject_name_en: string
  required_level: string
  required_value: number
  is_alternative: boolean
  alternative_group?: string
  notes?: string
}

/** 入学要求 */
export interface AdmissionRequirements {
  core_subjects: RequirementSubject[]
  elective_subjects: RequirementSubject[]
  preferred_subjects: RequirementSubject[]
}

/** 收生成绩（按年份） */
export interface AdmissionScores {
  [year: number]: {
    mean?: number
    median?: number
    lower_quartile?: number
    upper_quartile?: number
    min?: number
    max?: number
  }
}

/** 计分公式 */
export interface ScoringFormula {
  year: number
  scoring_base: string
  include_english: boolean
  include_math: boolean
  include_specific: string[]
  subject_weights: { [subject: string]: number }
  sixth_subject_bonus: number
  highest_attainable: number | null
  median: number | null
  lower_quartile: number | null
  upper_quartile: number | null
  formula_description: string
  is_simulated: boolean
}

/** 课程详情（含入学要求和收生成绩） */
export interface JUPASProgrammeDetail extends JUPASProgramme {
  admission_requirements: AdmissionRequirements
  admission_scores: AdmissionScores
  scoring_formulas?: ScoringFormula[]
  latest_formula?: ScoringFormula | null
}

/** 院校信息 */
export interface JUPASUniversity {
  id: number
  code: string
  name_zh: string
  name_en: string
  short_name: string
  website: string
  programme_count: number
}

/** 学生成绩 */
export interface StudentScores {
  chinese?: number
  english?: number
  mathematics?: number
  citizenship?: number
  // 选修科目
  physics?: number
  chemistry?: number
  biology?: number
  economics?: number
  geography?: number
  history?: number
  chinese_history?: number
  ict?: number
  m1?: number
  m2?: number
  bafs?: number
  [subject: string]: number | undefined
}

/** 匹配分析结果 */
export interface MatchAnalysis {
  programme: {
    code: string
    title: string
    university: string
  }
  student_scores: {
    weighted_score: number
    best_5: number
    best_6: number
  }
  scoring_formula?: {
    formula_used: string
    breakdown: string[]
    year: number
    highest_attainable: number | null
    median: number | null
    lower_quartile: number | null
    is_simulated: boolean
  } | null
  analysis: {
    meets_minimum: boolean
    unmet_requirements: string[]
    match_level: 'high' | 'medium' | 'low' | 'not_eligible' | 'unknown'
    description: string
  }
  historical_scores: {
    mean?: number
    median?: number
    lower_quartile?: number
    upper_quartile?: number
  }
  disclaimer: string
}

/** 推荐课程 */
export interface RecommendedProgramme {
  programme_code: string
  title: string
  university: string
  match_level: 'high' | 'medium' | 'low' | 'unknown'
  median_score?: number
  your_best5: number
}

// ============================================================
// API 函数
// ============================================================

/**
 * 获取课程列表
 */
export async function getProgrammes(options: {
  university?: string
  keyword?: string
  page?: number
  limit?: number
} = {}): Promise<{
  success: boolean
  data?: {
    programmes: JUPASProgramme[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}> {
  const params = new URLSearchParams()
  if (options.university) params.set('university', options.university)
  if (options.keyword) params.set('keyword', options.keyword)
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  
  return ragFetchJson(`/api/jupas/programmes?${params.toString()}`)
}

/**
 * 获取课程详情
 */
export async function getProgrammeDetail(code: string): Promise<{
  success: boolean
  data?: JUPASProgrammeDetail
  error?: string
}> {
  return ragFetchJson(`/api/jupas/programmes/${code}`)
}

/**
 * 获取课程计分公式
 */
export async function getScoringFormula(code: string, year?: number): Promise<{
  success: boolean
  data?: ScoringFormula | null
  message?: string
  error?: string
}> {
  const params = year ? `?year=${year}` : ''
  return ragFetchJson(`/api/jupas/scoring-formula/${code}${params}`)
}

/**
 * 格式化计分公式为可读文本
 */
export function formatScoringFormula(formula: ScoringFormula | null | undefined): string {
  if (!formula) return 'Best 5 subjects'
  
  const parts: string[] = []
  const weights = formula.subject_weights || {}
  
  // 检查是否有加权
  if (Object.keys(weights).length > 0) {
    for (const [subject, weight] of Object.entries(weights)) {
      if (weight !== 1) {
        parts.push(`${subject} x${weight}`)
      }
    }
  }
  
  // 基础计分方式
  if (formula.scoring_base.includes('3core_2elec')) {
    parts.push('3 Core + 2 Elective')
  } else if (formula.scoring_base.includes('best_6')) {
    parts.push('Best 6 subjects')
  } else if (formula.scoring_base.includes('eng_x2_math_x2')) {
    if (!parts.some(p => p.includes('English'))) {
      parts.push('English x2 + Math x2 + 3 subjects')
    }
  } else {
    parts.push('Best 5 subjects')
  }
  
  // 加分
  if (formula.sixth_subject_bonus > 0) {
    parts.push(`6th subject +${formula.sixth_subject_bonus * 100}%`)
  }
  
  return parts.join(' + ') || formula.scoring_base
}

/**
 * 搜索课程
 */
export async function searchProgrammes(keyword: string, limit: number = 20): Promise<{
  success: boolean
  data?: JUPASProgramme[]
  error?: string
}> {
  if (!keyword || keyword.length < 2) {
    return { success: false, error: '搜索关键词至少需要2个字符' }
  }
  return ragFetchJson(`/api/jupas/search?q=${encodeURIComponent(keyword)}&limit=${limit}`)
}

/**
 * 获取院校列表
 */
export async function getUniversities(): Promise<{
  success: boolean
  data?: JUPASUniversity[]
  error?: string
}> {
  return ragFetchJson('/api/jupas/universities')
}

/**
 * 分析匹配度
 */
export async function analyzeMatch(
  programmeCode: string,
  studentScores: StudentScores
): Promise<{
  success: boolean
  data?: MatchAnalysis
  error?: string
}> {
  // 过滤掉 undefined 值
  const scores: { [key: string]: number } = {}
  for (const [key, value] of Object.entries(studentScores)) {
    if (value !== undefined && value > 0) {
      scores[key] = value
    }
  }
  
  return ragFetchJson('/api/jupas/analyze', {
    method: 'POST',
    body: JSON.stringify({
      programme_code: programmeCode,
      student_scores: scores
    })
  })
}

/**
 * 获取课程推荐
 */
export async function getRecommendations(
  studentScores: StudentScores,
  options: {
    university?: string
    limit?: number
  } = {}
): Promise<{
  success: boolean
  data?: {
    student_best5: number
    recommendations: RecommendedProgramme[]
  }
  error?: string
}> {
  // 过滤掉 undefined 值
  const scores: { [key: string]: number } = {}
  for (const [key, value] of Object.entries(studentScores)) {
    if (value !== undefined && value > 0) {
      scores[key] = value
    }
  }
  
  return ragFetchJson('/api/jupas/recommend', {
    method: 'POST',
    body: JSON.stringify({
      student_scores: scores,
      university: options.university,
      limit: options.limit || 10
    })
  })
}

/**
 * 获取 JUPAS 数据统计
 */
export async function getJUPASStats(): Promise<{
  success: boolean
  data?: {
    total_programmes: number
    total_universities: number
    total_requirements: number
    total_scores: number
    by_university: Array<{
      code: string
      name_zh: string
      count: number
    }>
  }
  error?: string
}> {
  return ragFetchJson('/api/jupas/stats')
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 计算 Best 5 分数
 */
export function calculateBest5(scores: StudentScores): number {
  const values = Object.values(scores)
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => b - a)
  
  return values.slice(0, 5).reduce((sum, v) => sum + v, 0)
}

/**
 * 计算 Best 6 分数
 */
export function calculateBest6(scores: StudentScores): number {
  const values = Object.values(scores)
    .filter((v): v is number => typeof v === 'number' && v > 0)
    .sort((a, b) => b - a)
  
  return values.slice(0, 6).reduce((sum, v) => sum + v, 0)
}

/**
 * 获取匹配等级对应的颜色
 */
export function getMatchLevelColor(level: string): string {
  switch (level) {
    case 'high':
      return '#52c41a'  // 绿色
    case 'medium':
      return '#faad14'  // 橙色
    case 'low':
      return '#ff4d4f'  // 红色
    case 'not_eligible':
      return '#8c8c8c'  // 灰色
    default:
      return '#1890ff'  // 蓝色
  }
}

/**
 * 获取匹配等级的中文描述
 */
export function getMatchLevelText(level: string, locale: string = 'zh-CN'): string {
  const isEnglish = locale === 'en'
  
  switch (level) {
    case 'high':
      return isEnglish ? 'High Chance' : '机会较高'
    case 'medium':
      return isEnglish ? 'Fair Chance' : '有一定机会'
    case 'low':
      return isEnglish ? 'Low Chance' : '机会较低'
    case 'not_eligible':
      return isEnglish ? 'Not Eligible' : '不符合要求'
    default:
      return isEnglish ? 'Unknown' : '未知'
  }
}

/**
 * 格式化 DSE 等级显示
 */
export function formatDSELevel(level: string | number): string {
  if (level === 'Attained' || level === 1) {
    return 'Attained'
  }
  return String(level)
}

/** 院校中文名称映射 */
export const UNIVERSITY_NAMES: { [code: string]: { zh: string; en: string } } = {
  hku: { zh: '香港大學', en: 'HKU' },
  cuhk: { zh: '香港中文大學', en: 'CUHK' },
  ust: { zh: '香港科技大學', en: 'HKUST' },
  polyu: { zh: '香港理工大學', en: 'PolyU' },
  cityu: { zh: '香港城市大學', en: 'CityU' },
  bu: { zh: '香港浸會大學', en: 'HKBU' },
  ln: { zh: '嶺南大學', en: 'LU' },
  eduhk: { zh: '香港教育大學', en: 'EdUHK' },
  hkmu: { zh: '香港都會大學', en: 'HKMU' },
  hsu: { zh: '香港恆生大學', en: 'HSU' },
}

// ============================================================
// 专业领域相关类型和 API
// ============================================================

/** 专业领域信息 */
export interface ProgrammeField {
  id: string
  name_zh: string
  name_en: string
  color: string
  count: number
  sample_programmes?: string[]
}

/** 综合分析输入 */
export interface ComprehensiveAnalysisInput {
  grades: { [subject: string]: string | number }
  interests: string[]
  strengths: string[]
  target_universities: string[]
  target_fields?: string[]
  career_aspirations?: string
  extracurriculars?: string
  limit?: number
}

/** 匹配结果详情 */
export interface MatchResult {
  totalScore: number
  academicScore: number
  personalScore: number
  academicLevel: string
  recommendation: 'safe' | 'match' | 'reach' | 'risk'
  details: {
    academicDescription: string
    matchedAspects: string[]
  }
}

/** 分析结果中的课程推荐 */
export interface AnalysedProgramme {
  programme_code: string
  title_zh: string
  title_en: string
  university_code: string
  university_name: string
  field_id: string
  field_name: string
  field_color: string
  match: MatchResult
  historical_scores: {
    median?: number
    lower_quartile?: number
    upper_quartile?: number
  }
}

/** 综合分析响应 */
export interface ComprehensiveAnalysisResponse {
  student_profile: {
    best5: number
    best6: number
    interests: string[]
    strengths: string[]
    target_universities: string[]
  }
  summary: {
    total_analysed: number
    best_match_fields: string[]
    score_position: string
  }
  recommendations: {
    safe: AnalysedProgramme[]
    match: AnalysedProgramme[]
    reach: AnalysedProgramme[]
  }
  all_results: AnalysedProgramme[]
  disclaimer: string
}

/** 课程计分分类 */
export type ProgrammeScoringType =
  | 'WEIGHTED_STRUCTURED'   // A类: 有结构化加权 - 可精确计算
  | 'WEIGHTED_DESCRIBED'    // B类: 描述中有加权但未结构化 - 仅基础分
  | 'SUBJECT_CONSTRAINED'   // C类: 有科目约束无加权
  | 'SIMPLE'                // D类: 无加权无约束

/** 加权计算详情 */
export interface WeightDetail {
  subject: string
  subjectLabel: string
  grade: string
  baseScore: number
  weight: number
  weightedScore: number
}

/** 匹配课程结果 */
export interface ProgrammeMatchResult {
  programmeCode: string
  programmeName: string
  university: string
  scoringType: ProgrammeScoringType
  scoringBase: string
  /** 加权分数 (仅 A 类有值) */
  weightedScore: number | null
  /** 基础分数 (所有类型都有) */
  baseScore: number
  /** 中位数收生分 */
  medianScore: number | null
  /** 是否达到中位数 */
  meetsMedian: boolean | null
  /** 与中位数的差距 */
  medianGap: number | null
  /** 加权计算详情 (仅 A 类) */
  weightDetails: WeightDetail[] | null
  /** 科目约束 */
  constraints: {
    requireEnglish: boolean
    requireMath: boolean
    requireSpecific: string[]
  }
  /** 是否满足科目约束 */
  meetsConstraints: boolean
  /** 提示/声明 */
  disclaimer: string | null
}

/** AI 分析响应 */
export interface AIAnalysisResponse {
  student_profile: {
    best5: number
    best6: number
    subjectScores?: Record<string, number>
  }
  matched_programmes: ProgrammeMatchResult[]
  scoring_summary: {
    total_matched: number
    weighted_calculated: number
    base_only: number
    meets_median_count: number
  }
  ai_report: string
  generated_at: string
  disclaimer: string
}

/**
 * 获取院校的专业领域分布
 */
export async function getUniversityFields(university?: string): Promise<{
  success: boolean
  data?: {
    university: string
    fields: ProgrammeField[]
    total_programmes: number
  }
  error?: string
}> {
  const params = new URLSearchParams()
  if (university) params.set('university', university)
  
  return ragFetchJson(`/api/jupas/fields?${params.toString()}`)
}

/**
 * 根据院校和专业领域获取课程列表
 */
export async function getProgrammesByField(options: {
  university?: string
  field?: string
  page?: number
  limit?: number
}): Promise<{
  success: boolean
  data?: {
    programmes: (JUPASProgramme & {
      field_id: string
      field_name_zh: string
      field_name_en: string
      field_color: string
    })[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}> {
  const params = new URLSearchParams()
  if (options.university) params.set('university', options.university)
  if (options.field) params.set('field', options.field)
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  
  return ragFetchJson(`/api/jupas/programmes/by-field?${params.toString()}`)
}

/**
 * 综合分析 - 基于成绩和特质匹配课程
 */
export async function analyzeComprehensive(
  input: ComprehensiveAnalysisInput
): Promise<{
  success: boolean
  data?: ComprehensiveAnalysisResponse
  error?: string
}> {
  return ragFetchJson('/api/jupas/analyze/comprehensive', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

/**
 * AI 增强分析 - 生成详细升学规划报告
 * 
 * ⚠️ 需要登录才能使用，后端从 JWT 获取 userId
 */
export async function analyzeWithAI(
  input: ComprehensiveAnalysisInput
): Promise<{
  success: boolean
  code?: number
  data?: AIAnalysisResponse
  error?: string
  message?: string
}> {
  const response = await apiFetch('/api/jupas/analyze/ai', {
    method: 'POST',
    body: JSON.stringify(input)
  })
  
  // 处理 401 未授权
  if (response.status === 401) {
    return {
      success: false,
      code: -1,
      error: '请先登录后再使用 AI 分析',
      message: 'AUTH_REQUIRED'
    }
  }
  
  return response.json()
}

/** 专业领域颜色映射 */
export const FIELD_COLORS: { [id: string]: string } = {
  medicine: '#ff4d4f',
  law: '#722ed1',
  business: '#fa8c16',
  engineering: '#1890ff',
  science: '#52c41a',
  arts: '#eb2f96',
  social_science: '#13c2c2',
  education: '#faad14',
  architecture: '#8c8c8c',
  other: '#bfbfbf'
}

/** 专业领域名称 */
export const FIELD_NAMES: { [id: string]: { zh: string; en: string } } = {
  medicine: { zh: '医学与健康科学', en: 'Medicine & Health Sciences' },
  law: { zh: '法律', en: 'Law' },
  business: { zh: '商科与管理', en: 'Business & Management' },
  engineering: { zh: '工程与技术', en: 'Engineering & Technology' },
  science: { zh: '理科', en: 'Science' },
  arts: { zh: '文科与人文', en: 'Arts & Humanities' },
  social_science: { zh: '社会科学', en: 'Social Sciences' },
  education: { zh: '教育', en: 'Education' },
  architecture: { zh: '建筑与规划', en: 'Architecture & Planning' },
  other: { zh: '其他', en: 'Other' }
}

/** 获取推荐类型的显示信息 */
export function getRecommendationInfo(recommendation: string, locale: string = 'zh-CN'): {
  text: string
  color: string
  icon: string
} {
  const isEnglish = locale === 'en'
  
  switch (recommendation) {
    case 'safe':
      return {
        text: isEnglish ? 'Safe Choice' : '保底选择',
        color: '#52c41a',
        icon: '🟢'
      }
    case 'match':
      return {
        text: isEnglish ? 'Core Target' : '核心目标',
        color: '#faad14',
        icon: '🟡'
      }
    case 'reach':
      return {
        text: isEnglish ? 'Reach/Stretch' : '冲刺尝试',
        color: '#ff4d4f',
        icon: '🔴'
      }
    case 'risk':
      return {
        text: isEnglish ? 'High Risk' : '风险较高',
        color: '#8c8c8c',
        icon: '⚪'
      }
    default:
      return {
        text: isEnglish ? 'Unknown' : '未知',
        color: '#bfbfbf',
        icon: '❓'
      }
  }
}

// ============================================================
// V2 API 类型定义 - 使用课程特定计分规则
// ============================================================

/** 分数明细项 */
export interface ScoreBreakdownItem {
  subject: string
  rawGrade: string
  mappedScore: number
  weight: number
  weightedScore: number
  type: 'required' | 'best' | 'bonus'
}

/** 匹配等级 */
export type MatchLevel = 'excellent' | 'good' | 'moderate' | 'challenging' | 'difficult' | 'unknown'

/** 推荐等级 */
export type RecommendationLevel = 'high' | 'medium' | 'low'

/** 相对位置 */
export type RelativePosition = 
  | 'far_above_median'
  | 'above_median'
  | 'around_median'
  | 'below_median'
  | 'around_lower_quartile'
  | 'below_lower_quartile'
  | 'far_below_lower_quartile'
  | 'unknown'

/** 关键风险因素类型 */
export type RiskFactorType = 'subject_gap' | 'competition' | 'subject_weight' | 'missing_subject' | 'trend'

/** 影响级别 */
export type ImpactLevel = 'low' | 'medium' | 'high'

/** 关键风险因素 */
export interface KeyRiskFactor {
  type: RiskFactorType
  description: string
  impactLevel: ImpactLevel
}

/** 提升杠杆 */
export interface ImprovementLeverage {
  subject: string
  expectedImpact: ImpactLevel
  note: string
}

/** 解释引擎输出 */
export interface ExplanationEngine {
  strengthSubjects: string[]
  weakSubjects: string[]
  keyRiskFactors: KeyRiskFactor[]
  scorePositionReason: string
  improvementLeverage: ImprovementLeverage[]
}

/** 位置类型 */
export type PositionType = 'above_median' | 'around_median' | 'below_median'

/** 位置标签 */
export type PositionLabel = '稳阵' | '适中' | '冲刺'

/** 位置元数据 */
export interface PositionMeta {
  userScore: number
  fiveYearMedian: number | null
  fiveYearRange: { min: number; max: number } | null
  position: PositionType
  positionLabel: PositionLabel
}

/** 策略类型 */
export type StrategyType = 'safe' | 'balanced' | 'aggressive'

/** 目标位置转换类型 */
export type TargetShift = 'below_to_around' | 'around_to_above' | 'already_above' | 'no_data'

/** 需要提升的科目 */
export interface RequiredImprovement {
  subject: string
  gradeFrom: string
  gradeTo: string
  priority: 'high' | 'medium' | 'low'
}

/** 提升路径 */
export interface ImprovementPath {
  targetShift: TargetShift
  targetShiftLabel: string
  requiredImprovement: RequiredImprovement[]
  estimatedScoreGain: number
}

/** 计分规则元数据 */
export interface ScoringMeta {
  scoringMethod: string
  gradeMapping: Record<string, number>
  mappingConfidence: 'official' | 'estimated' | 'low' | 'standard'
  confidenceNote: string
  formulaDescription: string
}

/** V2 分析结果 - 单个专业 */
export interface ProgrammeAnalysisResultV2 {
  programme_code: string
  programme_name_zh: string
  programme_name_en: string
  university_code: string
  university_name_zh: string
  
  // 分数计算结果
  score: {
    weighted_score: number
    raw_best5: number
    raw_best6: number
    grade_mapping_used: string
    mapping_confidence: 'official' | 'estimated' | 'low' | 'standard'
    formula_description: string
    breakdown: ScoreBreakdownItem[]
    warnings: string[]
  }
  
  // 匹配等级
  match: {
    level: MatchLevel
    level_label_zh: string
    level_label_en: string
    level_color: string
    description: string
  }
  
  // 相对位置评估
  relative_position: {
    position: RelativePosition
    simple_position: 'above_median' | 'around_median' | 'below_lower_quartile' | 'unknown'
    explanation: string
    details: {
      userScore: number
      latestMedian: number | null
      latestLowerQuartile: number | null
      latestUpperQuartile: number | null
      differenceFromMedian: number | null
      differenceFromLowerQuartile: number | null
      trend: 'rising' | 'falling' | 'stable' | 'unknown'
      medianRange: { min: number; max: number } | null
    }
    historical_summary: string
  }
  
  // 5年历史数据
  historical: Array<{
    year: number
    median: number | null
    lower_quartile: number | null
    upper_quartile: number | null
  }>
  
  // 对比参考
  comparison: {
    your_score: number
    median: number
    lower_quartile: number | null
    upper_quartile: number | null
    difference_from_median: number | null
    difference_from_lower_quartile: number | null
    trend: 'rising' | 'falling' | 'stable' | 'unknown'
    median_range: { min: number; max: number } | null
  } | null
  
  // 推荐信息
  recommendation: {
    level: RecommendationLevel
    rank: number
    total: number
    reason: string
  }
  
  // 计分规则元数据
  scoring_meta?: ScoringMeta
  
  // 解释引擎输出（结构化，由系统逻辑生成）
  explanation_engine?: ExplanationEngine
  
  // 位置元数据（简化的位置判断，稳阵/冲刺判断来源）
  position_meta?: PositionMeta
  
  // 该专业所属策略方案
  strategy?: StrategyType
  
  // 提升路径
  improvement_path?: ImprovementPath
  
  // AI 解释 (预留字段，默认为空，不在大学分析阶段调用 DeepSeek)
  ai_explanation: string | null
}

/** V2 分析响应 */
export interface AnalysisResponseV2 {
  success: boolean
  data?: {
    analysis_results: ProgrammeAnalysisResultV2[]
    by_recommendation: {
      high: ProgrammeAnalysisResultV2[]
      medium: ProgrammeAnalysisResultV2[]
      low: ProgrammeAnalysisResultV2[]
    }
    summary: {
      total_analysed: number
      recommendation_high: number
      recommendation_medium: number
      recommendation_low: number
      excellent_match: number
      good_match: number
      moderate_match: number
      challenging: number
      difficult: number
    }
    disclaimer: string
  }
  error?: string
}

/**
 * V2 大学分析 - 使用课程特定计分规则
 */
export async function analyzeUniversityV2(
  grades: { [subject: string]: string | number },
  programmeCodes: string[],
  includeHistorical: boolean = true
): Promise<AnalysisResponseV2> {
  return ragFetchJson('/api/jupas/analyze/v2', {
    method: 'POST',
    body: JSON.stringify({
      grades,
      programme_codes: programmeCodes,
      include_historical: includeHistorical
    })
  })
}

/** 获取匹配等级配置 */
export function getMatchLevelConfig(level: MatchLevel, isEnglish: boolean = false): {
  label: string
  color: string
  description: string
} {
  const configs: Record<MatchLevel, { label_zh: string; label_en: string; color: string; desc_zh: string; desc_en: string }> = {
    excellent: { label_zh: '极具竞争力', label_en: 'Excellent Match', color: '#52c41a', desc_zh: '成绩显著高于历年录取中位数', desc_en: 'Score significantly above median' },
    good: { label_zh: '竞争力较强', label_en: 'Good Match', color: '#73d13d', desc_zh: '成绩高于历年录取中位数', desc_en: 'Score above median' },
    moderate: { label_zh: '有一定机会', label_en: 'Moderate Match', color: '#faad14', desc_zh: '成绩在录取范围内', desc_en: 'Score within admission range' },
    challenging: { label_zh: '需要努力', label_en: 'Challenging', color: '#ff7a45', desc_zh: '成绩略低于历年录取下四分位', desc_en: 'Score below lower quartile' },
    difficult: { label_zh: '难度较大', label_en: 'Difficult', color: '#ff4d4f', desc_zh: '成绩与录取要求有明显差距', desc_en: 'Significant gap from requirements' },
    unknown: { label_zh: '暂无数据', label_en: 'Unknown', color: '#bfbfbf', desc_zh: '该课程暂无历年收生数据', desc_en: 'No historical data available' }
  }
  const config = configs[level] || configs.unknown
  return {
    label: isEnglish ? config.label_en : config.label_zh,
    color: config.color,
    description: isEnglish ? config.desc_en : config.desc_zh
  }
}

/** 获取推荐等级配置 */
export function getRecommendationLevelConfig(level: RecommendationLevel, isEnglish: boolean = false): {
  label: string
  color: string
  icon: string
} {
  const configs: Record<RecommendationLevel, { label_zh: string; label_en: string; color: string; icon: string }> = {
    high: { label_zh: '强烈推荐', label_en: 'Highly Recommended', color: '#52c41a', icon: '🌟' },
    medium: { label_zh: '值得考虑', label_en: 'Worth Considering', color: '#faad14', icon: '✨' },
    low: { label_zh: '需要冲刺', label_en: 'Reach Choice', color: '#ff7a45', icon: '🎯' }
  }
  const config = configs[level] || configs.medium
  return {
    label: isEnglish ? config.label_en : config.label_zh,
    color: config.color,
    icon: config.icon
  }
}

/** 获取相对位置标签 */
export function getRelativePositionLabel(position: RelativePosition, isEnglish: boolean = false): {
  label: string
  color: string
  icon: string
} {
  const configs: Record<RelativePosition, { label_zh: string; label_en: string; color: string; icon: string }> = {
    far_above_median: { label_zh: '远高于中位数', label_en: 'Far Above Median', color: '#52c41a', icon: '📈' },
    above_median: { label_zh: '高于中位数', label_en: 'Above Median', color: '#73d13d', icon: '↗️' },
    around_median: { label_zh: '接近中位数', label_en: 'Around Median', color: '#faad14', icon: '➡️' },
    below_median: { label_zh: '低于中位数', label_en: 'Below Median', color: '#ff7a45', icon: '↘️' },
    around_lower_quartile: { label_zh: '接近下四分位', label_en: 'Around Lower Quartile', color: '#ff4d4f', icon: '⬇️' },
    below_lower_quartile: { label_zh: '低于下四分位', label_en: 'Below Lower Quartile', color: '#f5222d', icon: '📉' },
    far_below_lower_quartile: { label_zh: '远低于下四分位', label_en: 'Far Below Lower Quartile', color: '#a8071a', icon: '⚠️' },
    unknown: { label_zh: '暂无数据', label_en: 'Unknown', color: '#bfbfbf', icon: '❓' }
  }
  const config = configs[position] || configs.unknown
  return {
    label: isEnglish ? config.label_en : config.label_zh,
    color: config.color,
    icon: config.icon
  }
}

/** 获取等级换算可信度说明 */
export function getMappingConfidenceInfo(confidence: string, isEnglish: boolean = false): {
  label: string
  color: string
  description: string
} {
  const configs: Record<string, { label_zh: string; label_en: string; color: string; desc_zh: string; desc_en: string }> = {
    official: { 
      label_zh: '官方数据', 
      label_en: 'Official', 
      color: '#52c41a', 
      desc_zh: '计分规则来源于官方公布的招生简章',
      desc_en: 'Scoring rules from official admission documents'
    },
    estimated: { 
      label_zh: '推算数据', 
      label_en: 'Estimated', 
      color: '#faad14', 
      desc_zh: '基于历年数据和相似课程推算，仅供参考',
      desc_en: 'Estimated based on historical data, for reference only'
    },
    low: { 
      label_zh: '参考数据', 
      label_en: 'Reference', 
      color: '#ff7a45', 
      desc_zh: '数据可信度较低，建议联系院校确认',
      desc_en: 'Low confidence, please verify with the institution'
    },
    standard: { 
      label_zh: '标准换算', 
      label_en: 'Standard', 
      color: '#1890ff', 
      desc_zh: '使用传统的7分制换算 (5**=7)',
      desc_en: 'Using standard 7-point scale (5**=7)'
    }
  }
  const config = configs[confidence] || configs.standard
  return {
    label: isEnglish ? config.label_en : config.label_zh,
    color: config.color,
    description: isEnglish ? config.desc_en : config.desc_zh
  }
}
