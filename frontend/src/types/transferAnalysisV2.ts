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

/**
 * 数据缺口结构化解释
 * 
 * 用于替代"暂无数据"的三段式输出
 */
export interface DataGapExplanation {
  /** 缺失数据类型（如 "插班名额"、"历史录取数据"） */
  gapType: string
  /** 为什么缺失（现实原因 + AI 网络判断） */
  whyMissing: string
  /** 是否影响当前判断（定性说明） */
  impactStatement: string
  /** 用户可以做什么（可执行建议） */
  userActions: string[]
}

export interface SchoolAssessment {
  schoolName: string
  programme: string
  matchScore: number
  riskLevel: RiskLevel
  recommendation: RecommendationType
  requirements: string[]
  gaps: string[]
  notes: string[]
  /** 该学校的数据缺口解释（V2 新增） */
  dataGapExplanations?: DataGapExplanation[]
  /** 融合结论（V2 新增）：系统规则 + AI 现实对照 + 行动建议 */
  integratedConclusion?: string
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
  /** 整体数据缺口解释（V2 新增） */
  dataGapExplanations?: DataGapExplanation[]
  /** 综合现实结论（V2 新增）：系统规则 + AI 现实对照 + 行动建议 */
  integratedRealityConclusion?: string
}

// ============================================
// 外部数据核验类型（V2 新增）
// ============================================

export type DataAvailability = '充分' | '有限' | '极少' | '几乎没有'
export type ImpactLevel = '不影响' | '轻微影响' | '明显影响'

/**
 * AI 外部数据核验结果
 * 
 * 当系统检测到数据缺失时，触发 AI 进行网络公开信息核验
 */
export interface ExternalDataVerification {
  /** 是否触发了核验 */
  triggered: boolean
  /** 触发核验的原因 */
  triggerReasons?: string[]
  /** 数据可用性评估 */
  dataAvailability?: DataAvailability
  /** 公开信息发现（AI 对公开经验的总结） */
  publicFindings?: string[]
  /** 现实推断结论 */
  realityInference?: string
  /** 对当前评估的影响 */
  impactOnAssessment?: ImpactLevel
  /** 建议的行动 */
  recommendedActions?: string[]
}

// ============================================
// 元数据类型
// ============================================

export interface AnalysisMeta {
  generatedAt: string
  version: 'v2'
  aiModel?: string
  aiLatency?: number
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
  /** AI 外部数据核验结果（V2 新增） */
  externalDataVerification?: ExternalDataVerification
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
