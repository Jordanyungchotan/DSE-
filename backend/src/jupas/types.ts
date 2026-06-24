/**
 * JUPAS 大学专业匹配分析 - 类型定义
 */

/** 课程计分分类 */
export enum ProgrammeScoringType {
  /** A类: 有结构化加权 (subject_weights 已解析) - 可精确计算 */
  WEIGHTED_STRUCTURED = 'WEIGHTED_STRUCTURED',
  /** B类: 描述中有加权信息但未结构化 - 仅基础分 */
  WEIGHTED_DESCRIBED = 'WEIGHTED_DESCRIBED',
  /** C类: 有科目约束但无加权 - 按约束计算基础分 */
  SUBJECT_CONSTRAINED = 'SUBJECT_CONSTRAINED',
  /** D类: 无加权无约束 - 简单 Best5/6 */
  SIMPLE = 'SIMPLE',
}

/** DSE 等级 → 分数映射 (传统换算) */
export const GRADE_TO_SCORE: Record<string, number> = {
  '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0,
}

/** 城大2025新换算 */
export const CITYU_2025_GRADE_TO_SCORE: Record<string, number> = {
  '5**': 8.5, '5*': 7, '5': 5.5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0,
}

/** 科目中英文名映射 */
export const SUBJECT_MAP: Record<string, string> = {
  // 核心科
  'chinese': '中國語文',
  'english': '英國語文',
  'math': '數學',
  'mathematics': '數學',
  'liberal_studies': '通識教育',
  'citizenship': '公民與社會發展',
  // 选修科
  'physics': '物理',
  'chemistry': '化學',
  'biology': '生物',
  'economics': '經濟',
  'geography': '地理',
  'history': '歷史',
  'chinese_history': '中國歷史',
  'ict': '資訊及通訊科技',
  'bafs': '企業、會計與財務概論',
  'visual_arts': '視覺藝術',
  'music': '音樂',
  'm1_m2': '數學延伸M1/M2',
  'm1': '數學延伸M1',
  'm2': '數學延伸M2',
  'other_elective': '其他選修科',
}

/** D1 数据库中课程记录 */
export interface ScoringFormulaRow {
  id: number
  programme_code: string
  programme_name: string | null
  university: string
  year: number
  scoring_base: string
  include_english: number
  include_math: number
  include_specific: string
  subject_weights: string
  sixth_subject_bonus: number
  highest_attainable: number | null
  median: number | null
  lower_quartile: number | null
  upper_quartile: number | null
  formula_description: string | null
  scoring_type: string
}

/** 用户输入的各科成绩 */
export interface UserGrades {
  [subject: string]: string  // subject key → grade string (e.g. '5**')
}

/** 加权计算详情 */
export interface WeightDetail {
  subject: string
  subjectLabel: string
  grade: string
  baseScore: number
  weight: number
  weightedScore: number
}

/** 单个课程的计算结果 */
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

/** 分析请求输入 */
export interface AnalysisInput {
  grades: UserGrades
  interests?: string[]
  strengths?: string[]
  target_universities?: string[]
  target_fields?: string[]
  career_aspirations?: string
  extracurriculars?: string
  limit?: number
}

/** 分析结果 */
export interface AnalysisResult {
  student_profile: {
    best5: number
    best6: number
    subjectScores: Record<string, number>
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
