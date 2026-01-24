/**
 * 插班分析 V2 默认模板
 * 
 * 用于无 AI 增强时的默认值，确保所有数组字段非空
 * 
 * @version v2
 */

import type { 
  CapabilityAnalysis, 
  TransitionPlan, 
  RiskLevel, 
  RecommendationType,
  OverallLevel,
} from '../types/transferAnalysisV2'

// ============================================
// 默认能力分析（至少 5 条）
// ============================================

export const DEFAULT_CAPABILITY_ANALYSES: CapabilityAnalysis[] = [
  {
    dimension: 'English',
    level: '中',
    description: '英语能力处于一般水平，需要根据目标学校要求进行针对性提升',
    impact: 'EMI 学校对英语要求较高，直接影响课堂理解和学业表现',
    suggestion: '建议增加英语阅读量，提升听说读写综合能力',
  },
  {
    dimension: 'Math',
    level: '中',
    description: '数学能力处于一般水平，基础知识掌握较为稳固',
    impact: '数学是核心科目，影响理科学习和逻辑思维发展',
    suggestion: '建议多做练习题，特别是应用题和综合题',
  },
  {
    dimension: 'AcademicFoundation',
    level: '中',
    description: '学术基础处于一般水平，具备一定的学习能力',
    impact: '学术基础直接影响插班后的课程适应和学业进度',
    suggestion: '建议巩固各科基础知识，查漏补缺',
  },
  {
    dimension: 'LearningAdaptability',
    level: '中',
    description: '学习适应能力一般，需要时间适应新环境',
    impact: '插班后需要快速适应新的教学风格和同学关系',
    suggestion: '建议提前了解目标学校的教学特点，做好心理准备',
  },
  {
    dimension: 'DisciplineFit',
    level: '中',
    description: '与目标学校校风的契合度需要进一步评估',
    impact: '校风契合度影响学生的融入感和长期发展',
    suggestion: '建议参观学校开放日，了解校园文化',
  },
]

// ============================================
// 默认过渡计划
// ============================================

export const DEFAULT_TRANSITION_PLAN: TransitionPlan = {
  shortTerm: [
    '准备申请材料（成绩单、推荐信、个人陈述）',
    '联系目标学校了解插班申请流程',
    '针对薄弱科目制定强化计划',
    '准备面试，练习自我介绍',
  ],
  midTerm: [
    '入学后尽快熟悉新课程进度',
    '主动与新同学建立良好关系',
    '与各科老师沟通，了解学习要求',
    '制定学期学习目标并定期检视',
  ],
  riskWarnings: [
    '插班初期可能面临课程进度差异，需要额外努力追赶',
    '新环境适应需要时间，保持耐心和积极心态',
    '不同学校的教学风格可能有差异，需要灵活调整学习方法',
  ],
}

// ============================================
// 默认摘要文案
// ============================================

export const DEFAULT_SUMMARY_ADVANTAGES = [
  '有明确的升学目标和规划意识',
  '愿意为目标付出努力',
  '具备基本的学习能力',
]

export const DEFAULT_SUMMARY_RISKS = [
  '需要适应新的学习环境',
  '可能存在课程进度差异',
  '面临新的同学关系建立',
]

// ============================================
// 默认学校评估字段
// ============================================

export const DEFAULT_SCHOOL_ASSESSMENT_FIELDS = {
  requirements: [
    '良好的学业成绩',
    '积极的学习态度',
    '适应能力和自律性',
  ],
  gaps: [
    '需要进一步了解学校具体要求',
    '建议提前准备面试',
  ],
  notes: [
    '建议联系学校获取最新招生信息',
    '可参加学校开放日深入了解',
  ],
}

// ============================================
// 辅助函数
// ============================================

/**
 * 根据可行性分数获取整体等级
 */
export function getFeasibilityLevel(score: number): OverallLevel {
  if (score >= 71) return '稳妥'
  if (score >= 51) return '可尝试'
  return '高风险'
}

/**
 * 根据匹配分数获取申请策略建议
 */
export function getRecommendationType(matchScore: number): RecommendationType {
  if (matchScore >= 70) return '保底'
  if (matchScore >= 50) return '目标'
  return '冲刺'
}

/**
 * 根据匹配分数获取风险等级
 */
export function getRiskLevel(matchScore: number): RiskLevel {
  if (matchScore >= 70) return '低'
  if (matchScore >= 50) return '中'
  return '高'
}

/**
 * 根据自评等级获取能力等级
 */
export function mapSelfAssessmentLevel(level: 'strong' | 'medium' | 'weak' | undefined): '强' | '中' | '弱' {
  if (level === 'strong') return '强'
  if (level === 'weak') return '弱'
  return '中'
}
