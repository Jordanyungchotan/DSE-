/**
 * 插班分析 V2 数据结构定义（前端）
 * 
 * ⚠️ 与后端 TransferAnalysisResultV2 完全一致
 * 字段名、层级、枚举值必须一一对应
 * 
 * @version v2
 */

// ============================================
// 能力维度类型
// ============================================

export type CapabilityDimension = 
  | 'English' 
  | 'Math' 
  | 'AcademicFoundation' 
  | 'LearningAdaptability' 
  | 'DisciplineFit'

export type CapabilityLevel = '强' | '中' | '弱'

export interface CapabilityAnalysis {
  dimension: CapabilityDimension
  level: CapabilityLevel
  description: string
  impact: string
  suggestion: string
}

// ============================================
// 学校评估类型
// ============================================

export type RiskLevel = '低' | '中' | '高'

export type RecommendationType = '保底' | '目标' | '冲刺'

export interface SchoolAssessment {
  schoolName: string
  programme: string
  matchScore: number
  riskLevel: RiskLevel
  recommendation: RecommendationType
  requirements: string[]
  gaps: string[]
  notes: string[]
}

// ============================================
// 过渡计划类型
// ============================================

export interface TransitionPlan {
  shortTerm: string[]
  midTerm: string[]
  riskWarnings: string[]
}

// ============================================
// 分析摘要类型
// ============================================

export type OverallLevel = '稳妥' | '可尝试' | '高风险'

export interface TransferSummary {
  overallLevel: OverallLevel
  feasibilityScore: number
  keyAdvantages: string[]
  keyRisks: string[]
  /** 决策依据（规则引擎解释，至少 3 条） */
  decisionBasis: string[]
  /** AI 实际参与内容（仅 AI 增强成功时存在） */
  aiContribution?: string[]
}

// ============================================
// 元数据类型
// ============================================

export interface AnalysisMeta {
  generatedAt: string
  version: 'v2'
}

// ============================================
// 完整分析结果类型
// ============================================

export interface TransferAnalysisResultV2 {
  analysisId: string
  analysisType: 'transfer'
  aiEnabled: boolean
  summary: TransferSummary
  capabilityAnalyses: CapabilityAnalysis[]
  schoolAssessments: SchoolAssessment[]
  transitionPlan: TransitionPlan
  meta: AnalysisMeta
}

// ============================================
// API 请求/响应类型
// ============================================

export interface SubjectStatusInput {
  subject: string
  status: 'strong' | 'ok' | 'weak'
  rankPosition?: 'top' | 'top10' | 'top30' | 'mid' | 'middle' | 'bottom' | 'bottom30'
}

export interface TransferAnalysisInputV2 {
  targetSchools: string[]
  targetGrade?: string
  languagePreference?: 'EMI' | 'CMI'
  enableAI?: boolean
  subjectStatuses?: SubjectStatusInput[]
  selfAssessment?: {
    englishLevel?: 'strong' | 'medium' | 'weak'
    mathLevel?: 'strong' | 'medium' | 'weak'
    academicLevel?: 'strong' | 'medium' | 'weak'
    adaptability?: 'strong' | 'medium' | 'weak'
  }
}

export interface TransferAnalysisResponseV2 {
  success: boolean
  data?: {
    analysis_id: string
    result: TransferAnalysisResultV2
  }
  error?: string
}
