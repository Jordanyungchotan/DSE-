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
