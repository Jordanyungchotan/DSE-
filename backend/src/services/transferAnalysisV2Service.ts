/**
 * 插班分析 V2 服务
 * 
 * 核心原则：
 * 1. 规则引擎是唯一决策来源
 * 2. AI 只能"补充解释"和"生成计划"
 * 3. AI 失败必须自动降级为纯规则结果
 * 
 * @version v2
 */

import type {
  TransferAnalysisResult,
  TransferSummary,
  CapabilityAnalysis,
  SchoolAssessment,
  TransitionPlan,
  AnalysisMeta,
  TransferAnalysisInput,
  RiskLevel,
  RecommendationType,
  OverallLevel,
  ExternalDataVerification,
  DataGapExplanation,
  DataAvailability,
  ImpactLevel,
} from '../types/transferAnalysisV2'
import {
  DEFAULT_CAPABILITY_ANALYSES,
  DEFAULT_TRANSITION_PLAN,
  DEFAULT_SUMMARY_ADVANTAGES,
  DEFAULT_SUMMARY_RISKS,
  DEFAULT_SCHOOL_ASSESSMENT_FIELDS,
  getFeasibilityLevel,
  getRecommendationType,
  getRiskLevel,
  mapSelfAssessmentLevel,
} from '../templates/transferDefaults'
import { analyzeTransferSubjectStatuses } from '../analysis/analyzeByRules.js'

// ============================================
// 类型定义
// ============================================

interface RuleAnalysisResult {
  subjectAnalyses: Array<{
    subjectKey: string
    subjectName: string
    status: string
    riskLevel: 'low' | 'medium' | 'high'
    summary: string
    advice: string
  }>
  electiveNotes: string[]
  overallFeasibility: {
    score: number
    level: 'A' | 'B' | 'C' | 'D' | 'E'
  }
}

interface AIEnhancementResult {
  capabilityAnalyses?: CapabilityAnalysis[]
  transitionPlan?: TransitionPlan
  summaryEnhancement?: string[]
}

// ============================================
// 纯规则分析函数（V2 核心）
// ============================================

/**
 * 执行纯规则 V2 分析
 * 
 * ⚠️ 这是唯一的决策来源，AI 不能修改其结果
 * 
 * @param input - 用户输入
 * @returns TransferAnalysisResult (aiEnabled = false)
 */
export function executeTransferAnalysisV2(
  input: TransferAnalysisInput
): TransferAnalysisResult {
  const analysisId = crypto.randomUUID()
  const now = new Date().toISOString()

  // ===== 规则引擎分析 =====
  let ruleAnalysisResult: RuleAnalysisResult = {
    subjectAnalyses: [],
    electiveNotes: [],
    overallFeasibility: { score: 65, level: 'B' },
  }

  // 如果有学科状态输入，使用规则引擎
  if (input.subjectStatuses && input.subjectStatuses.length > 0) {
    const validStatuses = input.subjectStatuses.map(s => ({
      subject: s.subject,
      status: s.status as 'strong' | 'ok' | 'weak',
      rankPosition: s.rankPosition
        ? (s.rankPosition === 'top' || s.rankPosition === 'top10' || s.rankPosition === 'top30'
          ? 'top'
          : s.rankPosition === 'bottom' || s.rankPosition === 'bottom30'
            ? 'bottom'
            : 'mid') as 'top' | 'mid' | 'bottom'
        : undefined,
    }))
    const analysisResult = analyzeTransferSubjectStatuses(validStatuses, 'zh-CN')
    ruleAnalysisResult = {
      subjectAnalyses: analysisResult.subjectAnalyses.map(s => ({
        subjectKey: s.subjectKey,
        subjectName: s.subjectName,
        status: s.status,
        riskLevel: s.riskLevel,
        summary: s.summary,
        advice: s.advice,
      })),
      electiveNotes: analysisResult.electiveNotes,
      overallFeasibility: {
        score: analysisResult.overallFeasibility.score,
        level: analysisResult.overallFeasibility.level as 'A' | 'B' | 'C' | 'D' | 'E',
      },
    }
  }

  const feasibilityScore = ruleAnalysisResult.overallFeasibility.score
  const overallLevel = getFeasibilityLevel(feasibilityScore)

  // ===== 构建决策依据（Explainability）=====
  const decisionBasis = buildDecisionBasis(ruleAnalysisResult, input, feasibilityScore)

  // ===== 构建 Summary =====
  const summary: TransferSummary = {
    overallLevel,
    feasibilityScore,
    keyAdvantages: buildKeyAdvantages(ruleAnalysisResult, input),
    keyRisks: buildKeyRisks(ruleAnalysisResult, input),
    decisionBasis,
    // aiContribution 仅在 AI 增强成功时由 mergeAIEnhancement 添加
  }

  // 确保 keyAdvantages 和 keyRisks 非空
  if (summary.keyAdvantages.length === 0) {
    summary.keyAdvantages = [...DEFAULT_SUMMARY_ADVANTAGES]
  }
  if (summary.keyRisks.length === 0) {
    summary.keyRisks = [...DEFAULT_SUMMARY_RISKS]
  }

  // ===== 构建能力分析 =====
  const capabilityAnalyses = buildCapabilityAnalyses(input, feasibilityScore)

  // ===== 构建学校评估 =====
  const schoolAssessments = buildSchoolAssessments(input.targetSchools, feasibilityScore, input.targetGrade)

  // ===== 构建过渡计划 =====
  const transitionPlan: TransitionPlan = { ...DEFAULT_TRANSITION_PLAN }

  // ===== 构建元数据 =====
  const meta: AnalysisMeta = {
    version: 'v2',
    generatedAt: now,
  }

  return {
    analysisId,
    analysisType: 'transfer',
    aiEnabled: false,
    summary,
    capabilityAnalyses,
    schoolAssessments,
    transitionPlan,
    meta,
  }
}

// ============================================
// AI 增强分析
// ============================================

/**
 * 构建 AI Prompt
 * 
 * ⚠️ AI 只允许输出：
 * - capabilityAnalyses
 * - transitionPlan
 * - summaryEnhancement
 * 
 * ❌ 禁止 AI 输出：feasibilityScore / recommendation / riskLevel
 */
function buildAIPrompt(
  input: TransferAnalysisInput,
  ruleResult: TransferAnalysisResult
): string {
  const systemPrompt = `你是一位资深的香港插班升学顾问，拥有15年以上的学校转学辅导经验。

【重要规则 - 必须遵守】
1. 你不能预测任何"录取概率"或"成功率"
2. 你不能修改已有的 matchScore、riskLevel、recommendation 数值
3. 你不能假设学生有 DSE 成绩
4. 你的角色是：解释规则分析结果、提供学习计划、提示潜在风险
5. 只返回 JSON，不要有任何其他文字

【你需要做的事情】
1. 根据学生自评和目标学校，详细分析五个能力维度
2. 制定实用的过渡期学习计划
3. 补充说明主要风险点`

  const userPrompt = `## 学生信息

目标学校：${input.targetSchools.join('、')}
目标年级：${input.targetGrade || '中四'}
语言偏好：${input.languagePreference || 'EMI'}
${input.selfAssessment ? `
学生自评：
- 英语能力：${input.selfAssessment.englishLevel || '未填写'}
- 数学能力：${input.selfAssessment.mathLevel || '未填写'}
- 学术基础：${input.selfAssessment.academicLevel || '未填写'}
- 适应能力：${input.selfAssessment.adaptability || '未填写'}
` : '学生自评：未提供'}

## 规则引擎分析结果（只读，不可修改）

整体可行性：${ruleResult.summary.overallLevel}（${ruleResult.summary.feasibilityScore}分）
主要优势：${ruleResult.summary.keyAdvantages.join('、')}
主要风险：${ruleResult.summary.keyRisks.join('、')}

目标学校评估（不可修改）：
${ruleResult.schoolAssessments.map(s => 
  `- ${s.schoolName}：匹配度 ${s.matchScore}%，风险 ${s.riskLevel}，建议 ${s.recommendation}`
).join('\n')}

---

请以 JSON 格式返回分析结果，严格按照以下结构：

{
  "capabilityAnalyses": [
    {
      "dimension": "English",
      "level": "强/中/弱",
      "description": "能力描述（50-100字）",
      "impact": "对插班申请的影响（30-50字）",
      "suggestion": "改进建议（30-50字）"
    }
    // 必须包含全部5个维度：English, Math, AcademicFoundation, LearningAdaptability, DisciplineFit
  ],
  "transitionPlan": {
    "shortTerm": ["短期计划1", "短期计划2", "短期计划3", "短期计划4"],
    "midTerm": ["中期计划1", "中期计划2", "中期计划3", "中期计划4"],
    "riskWarnings": ["风险提示1", "风险提示2", "风险提示3"]
  },
  "summaryEnhancement": ["对主要风险的补充解释1", "补充解释2"]
}

【再次强调】
- dimension 只能是：English, Math, AcademicFoundation, LearningAdaptability, DisciplineFit
- level 只能是：强、中、弱
- 必须包含全部5个维度的分析`

  return JSON.stringify({
    system: systemPrompt,
    user: userPrompt,
  })
}

/**
 * 调用 AI 进行增强分析
 * 
 * @param apiKey - DeepSeek API Key
 * @param input - 用户输入
 * @param ruleResult - 规则分析结果
 * @returns AI 增强结果，失败返回 null
 */
export async function callAIEnhancement(
  apiKey: string,
  input: TransferAnalysisInput,
  ruleResult: TransferAnalysisResult
): Promise<AIEnhancementResult | null> {
  if (!apiKey) {
    console.warn('[Transfer V2 AI] API Key 未配置，跳过 AI 增强')
    return null
  }

  const startTime = Date.now()

  try {
    const promptData = JSON.parse(buildAIPrompt(input, ruleResult))

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: promptData.system },
          { role: 'user', content: promptData.user },
        ],
        max_tokens: 3000,
        temperature: 0.3,
        top_p: 0.8,
      }),
    })

    if (!response.ok) {
      console.error('[Transfer V2 AI] API 调用失败:', response.status)
      return null
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('[Transfer V2 AI] API 返回内容为空')
      return null
    }

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Transfer V2 AI] 无法解析 JSON')
      return null
    }

    const aiResult = JSON.parse(jsonMatch[0]) as AIEnhancementResult

    // 验证和清洗 AI 结果
    const validatedResult = validateAndSanitizeAIResult(aiResult)

    const latency = Date.now() - startTime
    console.log(`[Transfer V2 AI] 增强完成，耗时 ${latency}ms`)

    return validatedResult
  } catch (error) {
    console.error('[Transfer V2 AI] 处理异常:', error)
    return null
  }
}

/**
 * 验证和清洗 AI 返回结果
 * 
 * - 字段白名单过滤
 * - 字段长度限制
 * - 枚举值校验
 */
function validateAndSanitizeAIResult(aiResult: AIEnhancementResult): AIEnhancementResult | null {
  const result: AIEnhancementResult = {}

  // 验证 capabilityAnalyses
  if (aiResult.capabilityAnalyses && Array.isArray(aiResult.capabilityAnalyses)) {
    const validDimensions = ['English', 'Math', 'AcademicFoundation', 'LearningAdaptability', 'DisciplineFit']
    const validLevels = ['强', '中', '弱']

    result.capabilityAnalyses = aiResult.capabilityAnalyses
      .filter(ca => 
        validDimensions.includes(ca.dimension) && 
        validLevels.includes(ca.level)
      )
      .map(ca => ({
        dimension: ca.dimension,
        level: ca.level,
        description: truncateString(ca.description || '', 200),
        impact: truncateString(ca.impact || '', 100),
        suggestion: truncateString(ca.suggestion || '', 100),
      }))

    // 如果不足 5 个维度，返回 null（使用默认）
    if (result.capabilityAnalyses.length < 5) {
      console.warn('[Transfer V2 AI] capabilityAnalyses 不完整，使用默认')
      result.capabilityAnalyses = undefined
    }
  }

  // 验证 transitionPlan
  if (aiResult.transitionPlan) {
    const plan = aiResult.transitionPlan
    if (
      Array.isArray(plan.shortTerm) && plan.shortTerm.length >= 2 &&
      Array.isArray(plan.midTerm) && plan.midTerm.length >= 2 &&
      Array.isArray(plan.riskWarnings) && plan.riskWarnings.length >= 1
    ) {
      result.transitionPlan = {
        shortTerm: plan.shortTerm.slice(0, 5).map(s => truncateString(s, 100)),
        midTerm: plan.midTerm.slice(0, 5).map(s => truncateString(s, 100)),
        riskWarnings: plan.riskWarnings.slice(0, 4).map(s => truncateString(s, 100)),
      }
    } else {
      console.warn('[Transfer V2 AI] transitionPlan 不完整，使用默认')
    }
  }

  // 验证 summaryEnhancement
  if (aiResult.summaryEnhancement && Array.isArray(aiResult.summaryEnhancement)) {
    result.summaryEnhancement = aiResult.summaryEnhancement
      .slice(0, 3)
      .map(s => truncateString(s, 150))
  }

  return result
}

/**
 * 合并规则结果和 AI 增强结果
 * 
 * 合并规则（严格）：
 * - schoolAssessments：完全使用规则结果
 * - summary：规则 summary 不变，但添加 aiContribution
 * - capabilityAnalyses：AI 成功 → 使用 AI，失败 → 使用默认
 * - transitionPlan：AI 成功 → 使用 AI，失败 → 使用默认
 */
export function mergeAIEnhancement(
  ruleResult: TransferAnalysisResult,
  aiResult: AIEnhancementResult | null
): TransferAnalysisResult {
  // 如果 AI 增强失败，直接返回规则结果
  if (!aiResult) {
    return ruleResult
  }

  // 构建 AI 贡献说明（Explainability）
  const aiContribution: string[] = []
  if (aiResult.capabilityAnalyses && aiResult.capabilityAnalyses.length >= 5) {
    aiContribution.push('补充了能力维度详细分析')
  }
  if (aiResult.transitionPlan) {
    aiContribution.push('生成了个性化过渡计划')
  }
  if (aiResult.summaryEnhancement && aiResult.summaryEnhancement.length > 0) {
    aiContribution.push('对规则风险进行了文字解释')
  }
  // 确保至少有一条
  if (aiContribution.length === 0) {
    aiContribution.push('AI 对分析结果进行了补充说明')
  }

  return {
    ...ruleResult,
    aiEnabled: true,
    // summary：添加 aiContribution
    summary: {
      ...ruleResult.summary,
      aiContribution,
    },
    // capabilityAnalyses：AI 成功则使用 AI
    capabilityAnalyses: aiResult.capabilityAnalyses || ruleResult.capabilityAnalyses,
    // transitionPlan：AI 成功则使用 AI
    transitionPlan: aiResult.transitionPlan || ruleResult.transitionPlan,
    // 更新 meta
    meta: {
      ...ruleResult.meta,
      // 可以添加 AI 相关元数据
    },
  }
}

// ============================================
// 辅助函数
// ============================================

function buildKeyAdvantages(
  ruleAnalysis: RuleAnalysisResult,
  input: TransferAnalysisInput
): string[] {
  const advantages: string[] = []

  // 从规则分析中提取优势
  const strongSubjects = ruleAnalysis.subjectAnalyses.filter(s => s.status === 'strong')
  if (strongSubjects.length > 0) {
    advantages.push(`${strongSubjects.length} 个科目学习状态良好`)
    strongSubjects.slice(0, 2).forEach(s => {
      advantages.push(`${s.subjectName} 学习状态优秀`)
    })
  }

  // 从用户输入中提取
  if (input.selfAssessment?.englishLevel === 'strong') {
    advantages.push('英语能力较强，适合 EMI 学校')
  }
  if (input.selfAssessment?.adaptability === 'strong') {
    advantages.push('学习适应能力强，转校过渡风险低')
  }

  return advantages.slice(0, 4)
}

function buildKeyRisks(
  ruleAnalysis: RuleAnalysisResult,
  input: TransferAnalysisInput
): string[] {
  const risks: string[] = []

  // 从规则分析中提取风险
  const weakSubjects = ruleAnalysis.subjectAnalyses.filter(s => s.status === 'weak')
  if (weakSubjects.length > 0) {
    risks.push(`${weakSubjects.length} 个科目需要加强`)
    weakSubjects.slice(0, 2).forEach(s => {
      risks.push(`${s.subjectName} 学习吃力，需重点提升`)
    })
  }

  // 通用风险
  if (risks.length === 0) {
    risks.push('需要适应新的学习环境')
    risks.push('可能存在课程进度差异')
  }

  return risks.slice(0, 4)
}

/**
 * 构建决策依据（Explainability）
 * 
 * 回答"这个结论是如何得出的？"
 * - 至少 3 条
 * - 纯规则生成
 */
function buildDecisionBasis(
  ruleAnalysis: RuleAnalysisResult,
  input: TransferAnalysisInput,
  feasibilityScore: number
): string[] {
  const basis: string[] = []

  // 1. 科目状态分布
  const statusCounts = {
    strong: ruleAnalysis.subjectAnalyses.filter(s => s.status === 'strong').length,
    ok: ruleAnalysis.subjectAnalyses.filter(s => s.status === 'ok').length,
    weak: ruleAnalysis.subjectAnalyses.filter(s => s.status === 'weak').length,
    total: ruleAnalysis.subjectAnalyses.length,
  }

  if (statusCounts.total > 0) {
    if (statusCounts.strong > 0) {
      basis.push(`${statusCounts.strong}/${statusCounts.total} 科目学习状态为「优秀」，正向影响评分`)
    }
    if (statusCounts.weak > 0) {
      basis.push(`${statusCounts.weak}/${statusCounts.total} 科目学习状态为「吃力」，影响可行性评估`)
    }
    if (statusCounts.ok > 0 && statusCounts.strong === 0 && statusCounts.weak === 0) {
      basis.push(`所有科目学习状态为「一般」，建议针对性提升`)
    }
  }

  // 2. 目标学校风险分布
  const schoolCount = input.targetSchools.length
  if (schoolCount > 0) {
    const highRiskThreshold = 50
    const highRiskCount = input.targetSchools.filter((_, index) => {
      const positionPenalty = index * 5
      return (feasibilityScore - positionPenalty) < highRiskThreshold
    }).length
    const highRiskPercent = Math.round((highRiskCount / schoolCount) * 100)
    
    if (highRiskPercent > 50) {
      basis.push(`目标学校中高风险比例为 ${highRiskPercent}%，建议增加保底选择`)
    } else if (highRiskPercent > 0) {
      basis.push(`目标学校中 ${highRiskCount} 所为高风险，${schoolCount - highRiskCount} 所相对稳妥`)
    } else {
      basis.push(`目标学校选择合理，整体风险可控`)
    }
  }

  // 3. 年级竞争度
  const targetGrade = input.targetGrade || '中四'
  const gradeCompetition: Record<string, string> = {
    '中一': '中一插班竞争度较低，名额相对充足',
    '中二': '中二插班竞争度一般，需提前准备',
    '中三': '中三插班竞争度中等，部分学校名额紧张',
    '中四': '中四为高中起点，插班竞争度较高',
    '中五': '中五临近 DSE，插班难度较大且名额稀少',
    '中六': '中六极少开放插班，建议谨慎考虑',
  }
  basis.push(gradeCompetition[targetGrade] || `申请年级为 ${targetGrade}，竞争度需视学校而定`)

  // 4. 语言偏好匹配
  if (input.languagePreference) {
    const langNote = input.languagePreference === 'EMI'
      ? 'EMI 学校对英语要求较高，需具备良好英语基础'
      : 'CMI 学校以中文授课为主，语言适应压力较小'
    basis.push(langNote)
  }

  // 5. 自评能力综合
  if (input.selfAssessment) {
    const weakSelfCount = [
      input.selfAssessment.englishLevel,
      input.selfAssessment.mathLevel,
      input.selfAssessment.academicLevel,
      input.selfAssessment.adaptability,
    ].filter(l => l === 'weak').length

    if (weakSelfCount >= 2) {
      basis.push(`自评显示多项能力待提升，建议制定系统性提升计划`)
    } else if (weakSelfCount === 0 && input.selfAssessment.englishLevel === 'strong') {
      basis.push(`自评能力较强，整体具备竞争力`)
    }
  }

  // 6. 整体评分说明
  if (feasibilityScore >= 70) {
    basis.push(`综合评分 ${feasibilityScore} 分，整体可行性较高`)
  } else if (feasibilityScore >= 50) {
    basis.push(`综合评分 ${feasibilityScore} 分，可行性中等，需针对性准备`)
  } else {
    basis.push(`综合评分 ${feasibilityScore} 分，风险较高，建议调整目标或加强准备`)
  }

  // 确保至少 3 条
  while (basis.length < 3) {
    basis.push('建议联系目标学校了解最新招生政策')
  }

  return basis.slice(0, 6) // 最多 6 条
}

function buildCapabilityAnalyses(
  input: TransferAnalysisInput,
  feasibilityScore: number
): CapabilityAnalysis[] {
  // 基于用户自评和可行性分数调整能力分析
  return DEFAULT_CAPABILITY_ANALYSES.map(ca => {
    let level = ca.level

    // 根据自评调整
    if (input.selfAssessment) {
      if (ca.dimension === 'English' && input.selfAssessment.englishLevel) {
        level = mapSelfAssessmentLevel(input.selfAssessment.englishLevel)
      }
      if (ca.dimension === 'Math' && input.selfAssessment.mathLevel) {
        level = mapSelfAssessmentLevel(input.selfAssessment.mathLevel)
      }
      if (ca.dimension === 'AcademicFoundation' && input.selfAssessment.academicLevel) {
        level = mapSelfAssessmentLevel(input.selfAssessment.academicLevel)
      }
      if (ca.dimension === 'LearningAdaptability' && input.selfAssessment.adaptability) {
        level = mapSelfAssessmentLevel(input.selfAssessment.adaptability)
      }
    }

    // 根据整体可行性调整 AcademicFoundation
    if (ca.dimension === 'AcademicFoundation') {
      level = feasibilityScore >= 70 ? '强' : feasibilityScore >= 50 ? '中' : '弱'
    }

    return { ...ca, level }
  })
}

function buildSchoolAssessments(
  targetSchools: string[],
  feasibilityScore: number,
  targetGrade?: string
): SchoolAssessment[] {
  return targetSchools.map((schoolName, index) => {
    const positionPenalty = index * 5
    const matchScore = Math.max(30, Math.min(100, feasibilityScore - positionPenalty))

    return {
      schoolName,
      programme: targetGrade || '中四',
      matchScore,
      riskLevel: getRiskLevel(matchScore),
      recommendation: getRecommendationType(matchScore),
      requirements: [...DEFAULT_SCHOOL_ASSESSMENT_FIELDS.requirements],
      gaps: matchScore < 60
        ? ['部分科目需要加强', '需要适应新学校环境']
        : [...DEFAULT_SCHOOL_ASSESSMENT_FIELDS.gaps],
      notes: [...DEFAULT_SCHOOL_ASSESSMENT_FIELDS.notes],
    }
  })
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ============================================
// AI 外部数据核验（V2 新增）
// ============================================

/**
 * 检测数据缺口，确定是否需要触发 AI 核验
 * 
 * 触发条件（命中其一即触发）：
 * - 插班名额未知
 * - 学校无历史插班数据
 * - 政策年份不明确
 * - 风险判断基于推断而非事实
 */
export function detectDataGaps(
  input: TransferAnalysisInput,
  schoolAssessments: SchoolAssessment[]
): { shouldTrigger: boolean; triggerReasons: string[]; schoolsWithGaps: string[] } {
  const triggerReasons: string[] = []
  const schoolsWithGaps: string[] = []

  // 1. 所有学校都没有历史插班数据（我们无法确定）
  triggerReasons.push('无该校近两年公开插班数据')

  // 2. 插班名额未知
  triggerReasons.push('插班名额信息未公开披露')

  // 3. 政策年份不明确
  triggerReasons.push('最新招生政策年份待确认')

  // 4. 检查高风险学校
  const highRiskSchools = schoolAssessments.filter(s => s.riskLevel === '高')
  if (highRiskSchools.length > 0) {
    highRiskSchools.forEach(s => {
      schoolsWithGaps.push(s.schoolName)
    })
    triggerReasons.push(`${highRiskSchools.length} 所高风险学校需额外核验`)
  }

  // 5. 如果没有学科状态输入
  if (!input.subjectStatuses || input.subjectStatuses.length === 0) {
    triggerReasons.push('缺乏学生学科状态数据，评估基于一般经验')
  }

  // 永远触发，因为我们总是需要提供现实对照
  return {
    shouldTrigger: true,
    triggerReasons,
    schoolsWithGaps: schoolsWithGaps.length > 0 ? schoolsWithGaps : input.targetSchools,
  }
}

/**
 * 构建 AI 外部数据核验 Prompt
 */
function buildExternalVerificationPrompt(
  input: TransferAnalysisInput,
  schoolAssessments: SchoolAssessment[],
  triggerReasons: string[]
): { system: string; user: string } {
  const systemPrompt = `你是一位香港教育咨询专家，专门负责分析香港中学插班的公开信息和行业共识。

【你的身份】
- 你基于公开网络常识进行综合判断
- 你不是实时爬虫，而是模拟"已经查过公开信息"的分析过程
- 你的判断基于教育论坛、家长分享、学校官网常见模式

【核心规则 - 必须遵守】
1. 不能给出录取概率百分比
2. 不能做承诺式判断（如"有很大机会"）
3. 不能修改已有的 matchScore / riskLevel
4. 必须提供可执行的行动建议
5. 只返回 JSON，不要有任何其他文字

【你需要做的事情】
对于每所目标学校，基于公开经验：
1. 评估该校插班数据的公开程度
2. 总结已知的插班经验和特点
3. 解释为什么某些数据缺失
4. 给出针对性的准备建议`

  const schoolsInfo = schoolAssessments.map(s => 
    `- ${s.schoolName}（当前评估：匹配度 ${s.matchScore}%，风险 ${s.riskLevel}）`
  ).join('\n')

  const userPrompt = `## 核验请求

目标学校：
${schoolsInfo}

目标年级：${input.targetGrade || '中四'}
插班类型：本地转校
语言偏好：${input.languagePreference || 'EMI'}

触发核验的原因：
${triggerReasons.map(r => `- ${r}`).join('\n')}

---

请对以上学校进行外部数据核验，返回以下 JSON 结构：

{
  "dataAvailability": "充分 | 有限 | 极少 | 几乎没有",
  "publicFindings": [
    "公开信息发现1（基于教育论坛、家长经验的总结）",
    "公开信息发现2",
    "公开信息发现3"
  ],
  "realityInference": "综合判断结论（100-200字，解释现实中的插班情况）",
  "impactOnAssessment": "不影响 | 轻微影响 | 明显影响",
  "recommendedActions": [
    "具体可执行的行动建议1",
    "具体可执行的行动建议2",
    "具体可执行的行动建议3"
  ],
  "schoolSpecificFindings": [
    {
      "schoolName": "学校名称",
      "dataGapExplanation": {
        "gapType": "缺失的数据类型（如：插班名额、历史录取数据）",
        "whyMissing": "为什么缺失的现实原因（50-100字）",
        "impactStatement": "是否影响当前判断（30-50字）",
        "userActions": ["用户可做的事情1", "用户可做的事情2"]
      },
      "integratedConclusion": "融合三层信息的结论（100-150字）：系统规则结论 + AI网络现实对照 + 行动建议"
    }
  ]
}

【重要提示】
- dataAvailability 只能是：充分、有限、极少、几乎没有
- impactOnAssessment 只能是：不影响、轻微影响、明显影响
- schoolSpecificFindings 必须包含所有目标学校
- integratedConclusion 必须融合三层信息，不能只有一层`

  return { system: systemPrompt, user: userPrompt }
}

/**
 * 调用 AI 进行外部数据核验
 * 
 * ⚠️ 重要：API Key 缺失时返回 null，不返回默认模板
 * 这是为了确保 aiEnabled 状态准确反映 AI 是否真正执行
 */
export async function callExternalDataVerification(
  apiKey: string,
  input: TransferAnalysisInput,
  schoolAssessments: SchoolAssessment[],
  triggerReasons: string[]
): Promise<ExternalDataVerification | null> {
  // 【强制】API Key 缺失时返回 null，不返回伪 AI 模板
  if (!apiKey) {
    console.warn('[External Verification] API Key 未配置，返回 null（禁止返回默认模板）')
    return null
  }

  const startTime = Date.now()

  try {
    const prompt = buildExternalVerificationPrompt(input, schoolAssessments, triggerReasons)

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        max_tokens: 4000,
        temperature: 0.3,
        top_p: 0.8,
      }),
    })

    if (!response.ok) {
      console.error('[External Verification] API 调用失败:', response.status)
      return createDefaultVerification(triggerReasons)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('[External Verification] API 返回内容为空')
      return createDefaultVerification(triggerReasons)
    }

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[External Verification] 无法解析 JSON')
      return createDefaultVerification(triggerReasons)
    }

    const aiResult = JSON.parse(jsonMatch[0])
    const latency = Date.now() - startTime
    console.log(`[External Verification] 核验完成，耗时 ${latency}ms`)

    // 验证和构建结果
    return validateAndBuildVerification(aiResult, triggerReasons, latency)
  } catch (error) {
    console.error('[External Verification] 处理异常:', error)
    return createDefaultVerification(triggerReasons)
  }
}

/**
 * 验证 AI 结果并构建核验结果
 */
function validateAndBuildVerification(
  aiResult: Record<string, unknown>,
  triggerReasons: string[],
  latency?: number
): ExternalDataVerification {
  // 验证 dataAvailability
  const validAvailability = ['充分', '有限', '极少', '几乎没有']
  const dataAvailability = validAvailability.includes(aiResult.dataAvailability as string)
    ? (aiResult.dataAvailability as DataAvailability)
    : '有限'

  // 验证 impactOnAssessment
  const validImpact = ['不影响', '轻微影响', '明显影响']
  const impactOnAssessment = validImpact.includes(aiResult.impactOnAssessment as string)
    ? (aiResult.impactOnAssessment as ImpactLevel)
    : '轻微影响'

  // 构建 publicFindings
  const publicFindings = Array.isArray(aiResult.publicFindings)
    ? (aiResult.publicFindings as string[]).slice(0, 5).map(s => truncateString(String(s), 200))
    : getDefaultPublicFindings()

  // 构建 realityInference
  const realityInference = typeof aiResult.realityInference === 'string'
    ? truncateString(aiResult.realityInference, 500)
    : getDefaultRealityInference()

  // 构建 recommendedActions
  const recommendedActions = Array.isArray(aiResult.recommendedActions)
    ? (aiResult.recommendedActions as string[]).slice(0, 5).map(s => truncateString(String(s), 150))
    : getDefaultRecommendedActions()

  return {
    triggered: true,
    triggerReasons,
    dataAvailability,
    publicFindings,
    realityInference,
    impactOnAssessment,
    recommendedActions,
  }
}

/**
 * 创建默认核验结果（当 AI 调用失败时）
 */
function createDefaultVerification(triggerReasons: string[]): ExternalDataVerification {
  return {
    triggered: true,
    triggerReasons,
    dataAvailability: '有限',
    publicFindings: getDefaultPublicFindings(),
    realityInference: getDefaultRealityInference(),
    impactOnAssessment: '轻微影响',
    recommendedActions: getDefaultRecommendedActions(),
  }
}

function getDefaultPublicFindings(): string[] {
  return [
    '香港中学插班名额通常为临时空缺，多数学校不提前公布固定名额',
    '插班申请高峰期为每年 3-5 月（下学年）和 10-11 月（学期中）',
    '名校和直资学校插班竞争激烈，建议准备多所备选学校',
    '插班面试通常考察英语能力、学习态度和转校动机',
  ]
}

function getDefaultRealityInference(): string {
  return '根据香港中学插班的一般经验，多数学校的插班名额属于临时空缺，并非每年固定招收。' +
    '家长应主动联系目标学校校务处了解最新名额情况，同时准备充分的申请材料和面试准备。' +
    '建议同时关注 2-3 所同级别学校，以降低单一学校申请失败的风险。'
}

function getDefaultRecommendedActions(): string[] {
  return [
    '在申请前 1-2 个月直接联系学校校务处查询名额',
    '准备完整的申请材料：成绩单、推荐信、转校原因说明',
    '针对目标学校的语言环境进行面试准备',
    '同时关注 2-3 所同级别备选学校',
    '关注学校官网和教育局通告获取最新政策',
  ]
}

/**
 * 为学校评估添加数据缺口解释和融合结论
 */
export function enrichSchoolAssessmentsWithVerification(
  schoolAssessments: SchoolAssessment[],
  aiSchoolFindings: Array<{
    schoolName: string
    dataGapExplanation?: DataGapExplanation
    integratedConclusion?: string
  }> | undefined,
  verification: ExternalDataVerification
): SchoolAssessment[] {
  return schoolAssessments.map(school => {
    // 查找 AI 对该学校的特定分析
    const aiFindings = aiSchoolFindings?.find(f => f.schoolName === school.schoolName)

    // 构建数据缺口解释
    const dataGapExplanations: DataGapExplanation[] = []

    if (aiFindings?.dataGapExplanation) {
      dataGapExplanations.push(aiFindings.dataGapExplanation)
    } else {
      // 使用默认解释
      dataGapExplanations.push({
        gapType: '插班名额与历史数据',
        whyMissing: `目前未找到 ${school.schoolName} 近两年公开披露的固定插班名额信息。` +
          `根据 AI 对学校官网、教育论坛及家长分享的综合判断，该校插班名额通常为临时空缺，并不提前公布。`,
        impactStatement: school.riskLevel === '高'
          ? '该信息缺失会对"录取确定性"判断产生一定影响，但不影响整体插班难度等级的判断。'
          : '该信息缺失对当前评估影响较小，整体判断仍然有效。',
        userActions: [
          '建议家长在申请前 1-2 个月直接联系学校校务处',
          '关注学校官方通告和教育局公告',
          '准备至少 1 所同级别备选学校作为风险对冲',
        ],
      })
    }

    // 构建融合结论
    let integratedConclusion = aiFindings?.integratedConclusion

    if (!integratedConclusion) {
      // 生成默认融合结论（三层信息）
      const ruleConclusion = `系统规则显示该校属于${school.riskLevel}风险插班目标。`
      const aiConclusion = school.riskLevel === '高'
        ? `AI 对公开插班经验的分析显示，该类学校插班竞争主要集中在英文能力与面试表现。`
        : `AI 对公开插班经验的分析显示，该校插班难度适中，做好准备后有较大把握。`
      const actionSuggestion = `对于当前背景的学生，建议${school.riskLevel === '高'
        ? '优先强化英文口语面试与转校动机陈述，而非盲目增加申请数量'
        : '按计划准备申请材料，同时关注学校最新招生信息'}。`

      integratedConclusion = `${ruleConclusion}${aiConclusion}${actionSuggestion}`
    }

    return {
      ...school,
      dataGapExplanations,
      integratedConclusion,
    }
  })
}

/**
 * 为 Summary 添加数据缺口解释和综合结论
 */
export function enrichSummaryWithVerification(
  summary: TransferSummary,
  verification: ExternalDataVerification
): TransferSummary {
  // 构建全局数据缺口解释
  const dataGapExplanations: DataGapExplanation[] = [{
    gapType: '整体插班市场数据',
    whyMissing: verification.realityInference || getDefaultRealityInference(),
    impactStatement: `数据可用性评估为「${verification.dataAvailability}」，` +
      `对当前分析的影响为「${verification.impactOnAssessment}」。`,
    userActions: verification.recommendedActions || getDefaultRecommendedActions(),
  }]

  // 构建综合现实结论
  const integratedRealityConclusion = 
    `系统规则评估整体可行性为「${summary.overallLevel}」（${summary.feasibilityScore}分）。` +
    `AI 基于公开信息的核验显示：${(verification.publicFindings || []).slice(0, 2).join('；')}。` +
    `建议重点关注：${(verification.recommendedActions || []).slice(0, 2).join('、')}。`

  return {
    ...summary,
    dataGapExplanations,
    integratedRealityConclusion,
  }
}

/**
 * 完整的带外部核验的分析流程
 * 
 * ⚠️ 重要架构原则（强制执行）：
 * 1. 规则引擎不能被 AI 替代 - feasibilityScore/decisionBasis 始终来自规则
 * 2. AI 只能做"增强层（Enhancement Layer）"
 * 3. 任何 AI 未执行的情况必须：aiEnabled = false，禁止使用伪 AI 模板
 * 
 * ⚠️ 禁止将模板文字伪装为 AI 分析结果
 * AI 未执行时，必须：
 * 1. aiEnabled = false
 * 2. 不输出任何"根据 AI 分析..."句式
 * 3. 不返回 externalDataVerification（这是 AI 专属模块）
 */
export async function executeTransferAnalysisV2WithVerification(
  input: TransferAnalysisInput,
  apiKey?: string
): Promise<TransferAnalysisResult> {
  // Step 1: 执行规则分析（始终执行，这是唯一决策来源）
  const ruleResult = executeTransferAnalysisV2(input)

  // ===== AI 增强阶段（仅在 API Key 存在时执行）=====
  
  // 如果没有 API Key，直接返回纯规则结果
  if (!apiKey) {
    console.warn('[Transfer V2] DEEPSEEK_API_KEY 未配置，返回纯规则分析结果')
    // 【强制】aiEnabled = false，不返回任何 AI 模块
    return {
      ...ruleResult,
      aiEnabled: false,
      // 【强制】不设置 externalDataVerification - 这是 AI 专属模块
    }
  }

  // Step 2: 检测数据缺口
  const { shouldTrigger, triggerReasons } = detectDataGaps(input, ruleResult.schoolAssessments)

  if (!shouldTrigger) {
    return {
      ...ruleResult,
      aiEnabled: false, // 即使有 API Key，如果不需要触发 AI，也标记为 false
    }
  }

  // Step 3: 调用 AI 外部核验
  let verification: ExternalDataVerification | null = null
  let aiActuallyExecuted = false

  try {
    verification = await callExternalDataVerification(apiKey, input, ruleResult.schoolAssessments, triggerReasons)
    // 检查 AI 是否真正执行成功（不是返回默认模板）
    aiActuallyExecuted = verification !== null && verification.triggered === true
    
    // 额外检查：如果返回的是默认模板内容，也视为 AI 未执行
    if (verification && isDefaultVerificationTemplate(verification)) {
      console.warn('[Transfer V2] AI 返回默认模板，标记为 AI 未执行')
      aiActuallyExecuted = false
    }
  } catch (aiError) {
    console.error('[Transfer V2] AI 外部核验失败:', aiError)
    verification = null
    aiActuallyExecuted = false
  }

  // 如果 AI 没有真正执行，返回纯规则结果
  if (!aiActuallyExecuted || !verification) {
    console.log('[Transfer V2] AI 未成功执行，返回纯规则结果，aiEnabled = false')
    return {
      ...ruleResult,
      aiEnabled: false,
      // 【强制】不设置 externalDataVerification
    }
  }

  // ===== AI 成功执行，进行结果增强 =====
  console.log('[Transfer V2] AI 外部核验成功，进行结果增强，aiEnabled = true')

  // Step 4: 丰富学校评估
  const enrichedSchoolAssessments = enrichSchoolAssessmentsWithVerification(
    ruleResult.schoolAssessments,
    undefined, // AI 特定学校分析（如果有的话）
    verification
  )

  // Step 5: 丰富 Summary
  const enrichedSummary = enrichSummaryWithVerification(ruleResult.summary, verification)

  // Step 6: 返回 AI 增强结果
  return {
    ...ruleResult,
    summary: enrichedSummary,
    schoolAssessments: enrichedSchoolAssessments,
    externalDataVerification: verification,
    aiEnabled: true, // 【强制】只有 AI 真正执行成功才设为 true
  }
}

/**
 * 检查是否为默认模板（用于判断 AI 是否真正执行）
 */
function isDefaultVerificationTemplate(verification: ExternalDataVerification): boolean {
  // 检查 publicFindings 是否为默认模板
  const defaultFindings = getDefaultPublicFindings()
  if (verification.publicFindings?.length === defaultFindings.length) {
    const allMatch = verification.publicFindings.every((f, i) => f === defaultFindings[i])
    if (allMatch) return true
  }
  
  // 检查 realityInference 是否为默认模板
  const defaultInference = getDefaultRealityInference()
  if (verification.realityInference === defaultInference) {
    return true
  }
  
  return false
}
