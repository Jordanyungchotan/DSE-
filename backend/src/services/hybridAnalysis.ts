/**
 * 混合分析引擎 v2.0
 * 
 * 结合规则评分引擎 + AI 自然语言解释
 * 
 * 设计原则：
 * - 规则引擎负责评分和等级判定
 * - AI 只负责自然语言解释和建议生成
 * - 禁止 AI 输出任何成功率或百分比
 * - 强制校验 AI 输出结构，失败则重试
 */

import {
  calculatePlacementScore,
  type StudentProfile,
  type TargetSchool,
  type PlacementScoreResult,
  type FeasibilityLevel,
} from './placementScore.js'

import {
  LEVEL_DESCRIPTIONS,
  CONVERSION_COPIES,
  DISCLAIMER,
  getLevelScoreRange,
  RECOMMENDED_ACTIONS,
  getRecommendedActions,
  type RecommendedAction,
  type LevelRecommendation,
} from '../config/index.js'

// ============================================================
// 类型定义
// ============================================================

/** 规则引擎结果（核心评分数据） */
export interface RuleResult {
  /** 评分 (0-100) */
  score: number
  /** 可行性等级 (A-E) */
  level: FeasibilityLevel
  /** 扣分原因 */
  reasons: string[]
  /** 加分原因 */
  positiveReasons: string[]
  /** 科目分析 */
  subjectAnalysis: PlacementScoreResult['subjectAnalysis']
  /** 风险雷达 */
  riskRadar: PlacementScoreResult['riskRadar']
  /** 评分明细 */
  breakdown: PlacementScoreResult['breakdown']
}

/** 
 * AI 标准化输出结构（强制格式）
 * 
 * 这是 AI 必须输出的格式，后端会进行严格校验
 */
export interface AIStandardOutput {
  /** 可行性等级 (A-E)，必须与规则引擎一致 */
  feasibilityLevel: FeasibilityLevel
  /** 整体评价摘要 */
  summary: string
  /** 主要风险点 (2-5个) */
  mainRisks: string[]
  /** 3-6个月可执行改进建议 (3-6个) */
  improvementPlan: string[]
}

/** 混合分析完整结果 */
export interface HybridAnalysisResult {
  /** 规则引擎结果（客观评分） */
  ruleResult: RuleResult
  /** AI 解释结果（标准化输出） */
  aiExplanation: AIStandardOutput
  /** 转化话术 */
  conversionCopy: typeof CONVERSION_COPIES['A']
  /** 推荐行动（基于等级） */
  recommendedActions: LevelRecommendation
  /** 免责声明 */
  disclaimer: string
  /** 分析时间戳 */
  analyzedAt: string
}

/** 学生输入信息（前端传入） */
export interface StudentInput {
  enrollmentDate: string
  semester: string
  grade: string
  age: number
  currentSchool?: string
  currentBand?: 1 | 2 | 3
  subjects: Array<{
    subject: string
    currentScore: string
    targetScore?: string
  }>
  targetSchools: Array<{
    name: string
    bandLevel: 1 | 2 | 3
    district: string
  }>
  notes?: string
  hobbies?: string[]
  strengths?: string[]
  extracurriculars?: string[]
  achievements?: string
}

// ============================================================
// 辅助函数
// ============================================================

/** 科目名称映射 */
const SUBJECT_NAME_MAP: Record<string, string> = {
  chinese: '中国语文', english: '英国语文', math: '数学',
  liberal: '公民与社会发展', physics: '物理', chemistry: '化学',
  biology: '生物', economics: '经济', bafs: '企业会计与财务概论',
  geography: '地理', history: '历史', ict: '资讯及通讯科技',
  m1: '数学延伸部分(M1)', m2: '数学延伸部分(M2)',
}

/** 年级名称映射 */
const GRADE_NAME_MAP: Record<string, string> = {
  S1: '中一', S2: '中二', S3: '中三',
  S4: '中四', S5: '中五', S6: '中六',
  form1: '中一', form2: '中二', form3: '中三',
  form4: '中四', form5: '中五', form6: '中六',
}

/**
 * DSE 等级转分数（用于插班分析的百分制换算）
 * 
 * 注意：此函数用于中学插班分析，将等级转换为百分制分数 (0-100)。
 * 这与 JUPAS 大学分析使用的 7 分制不同，是有意为之。
 * 
 * 插班分析使用百分制是因为需要与学校的百分制成绩进行比较。
 * 
 * TODO: 确认此函数仅用于插班分析，不用于大学 (JUPAS) 分析。
 */
function dseGradeToScore(grade: string): number {
  // 百分制换算（用于插班分析，非 JUPAS）
  const mapping: Record<string, number> = {
    '5**': 95, '5*': 85, '5': 75, '4': 65, '3': 55, '2': 45, '1': 35, 'U': 20,
  }
  return mapping[grade] || 50
}

/** 转换学生输入为评分引擎格式 */
function convertToStudentProfile(input: StudentInput): StudentProfile {
  const scores: Record<string, number> = {}
  
  for (const subject of input.subjects) {
    const subjectName = SUBJECT_NAME_MAP[subject.subject] || subject.subject
    scores[subjectName] = dseGradeToScore(subject.currentScore)
  }

  return {
    age: input.age,
    currentGrade: input.grade,
    scores,
    currentSchool: input.currentSchool,
    currentBand: input.currentBand,
    strengths: input.strengths,
    extracurriculars: input.extracurriculars,
  }
}

// ============================================================
// AI 输出校验
// ============================================================

/**
 * 校验 AI 输出是否符合标准结构
 * 
 * 必须包含：
 * - feasibilityLevel: 字符串，A-E 之一
 * - summary: 非空字符串
 * - mainRisks: 字符串数组，至少 1 项
 * - improvementPlan: 字符串数组，至少 1 项
 */
function validateAIOutput(data: unknown): data is AIStandardOutput {
  if (!data || typeof data !== 'object') {
    console.error('AI output validation failed: not an object')
    return false
  }

  const obj = data as Record<string, unknown>

  // 检查 feasibilityLevel
  if (typeof obj.feasibilityLevel !== 'string' || 
      !['A', 'B', 'C', 'D', 'E'].includes(obj.feasibilityLevel)) {
    console.error('AI output validation failed: invalid feasibilityLevel')
    return false
  }

  // 检查 summary
  if (typeof obj.summary !== 'string' || obj.summary.trim().length === 0) {
    console.error('AI output validation failed: invalid summary')
    return false
  }

  // 检查 mainRisks
  if (!Array.isArray(obj.mainRisks) || obj.mainRisks.length === 0) {
    console.error('AI output validation failed: invalid mainRisks')
    return false
  }
  for (const risk of obj.mainRisks) {
    if (typeof risk !== 'string') {
      console.error('AI output validation failed: mainRisks contains non-string')
      return false
    }
  }

  // 检查 improvementPlan
  if (!Array.isArray(obj.improvementPlan) || obj.improvementPlan.length === 0) {
    console.error('AI output validation failed: invalid improvementPlan')
    return false
  }
  for (const plan of obj.improvementPlan) {
    if (typeof plan !== 'string') {
      console.error('AI output validation failed: improvementPlan contains non-string')
      return false
    }
  }

  return true
}

/**
 * 解析 AI 响应中的 JSON
 */
function parseAIResponse(content: string): unknown | null {
  try {
    // 尝试匹配 JSON 块
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  } catch (error) {
    console.error('Failed to parse AI JSON response:', error)
    return null
  }
}

// ============================================================
// AI Prompt 构建（简化结构）
// ============================================================

/**
 * 构建 AI 解释 Prompt
 * 
 * 强制输出简化的 JSON 结构
 */
function buildAIPrompt(
  input: StudentInput,
  ruleResult: RuleResult
): { system: string; user: string } {
  const gradeName = GRADE_NAME_MAP[input.grade] || input.grade || '中四'
  const targetSchoolNames = input.targetSchools.map(s => s.name).join('、')
  
  // 格式化科目信息
  const subjectsText = input.subjects
    .map(s => `${SUBJECT_NAME_MAP[s.subject] || s.subject}: ${s.currentScore}`)
    .join('、')

  // 格式化风险点
  const risksText = ruleResult.reasons.length > 0
    ? ruleResult.reasons.map(r => `- ${r}`).join('\n')
    : '- 暂无明显风险点'

  const systemPrompt = `你是一位资深的香港DSE教育顾问。你的任务是根据系统已确定的评估结果，用专业、温和的语言进行解释和建议。

## ⚠️ 严格规则

1. **绝对禁止**输出任何"成功率"、"录取概率"、"百分比"、"XX%"等数字化表述
2. **必须使用**系统给出的可行性等级（${ruleResult.level}级），不能自行修改
3. **必须严格**按照指定的 JSON 格式输出，不能有任何额外内容

## 输出格式要求

你必须输出以下 JSON 结构，不能有任何其他内容：

{
  "feasibilityLevel": "${ruleResult.level}",
  "summary": "<100-150字的整体评价>",
  "mainRisks": ["<风险1>", "<风险2>", "<风险3>"],
  "improvementPlan": ["<建议1>", "<建议2>", "<建议3>", "<建议4>"]
}

## 内容要求

- summary: 简洁概括学生情况和插班建议，语气专业但温和
- mainRisks: 列出 2-4 个主要风险点或需要注意的地方
- improvementPlan: 列出 3-6 个具体可执行的改进建议（针对 3-6 个月）`

  const userPrompt = `## 已确定的评估结果

**可行性等级：${ruleResult.level} 级**
**等级含义：${LEVEL_DESCRIPTIONS[ruleResult.level]}**
**分数区间：${getLevelScoreRange(ruleResult.level)}**

## 学生情况

- 年级：${gradeName}
- 年龄：${input.age}岁
- 目标学校：${targetSchoolNames}
- 各科成绩：${subjectsText}

## 系统识别的风险点

${risksText}

---

请根据以上信息，严格按照 JSON 格式输出分析结果。记住：
1. feasibilityLevel 必须是 "${ruleResult.level}"
2. 不能输出任何百分比或成功率
3. 只输出 JSON，不要有其他内容`

  return { system: systemPrompt, user: userPrompt }
}

// ============================================================
// AI 调用（带重试）
// ============================================================

/**
 * 调用 AI 获取解释（带重试机制）
 * 
 * @param input 学生输入
 * @param ruleResult 规则引擎结果
 * @param apiKey DeepSeek API Key
 * @param maxRetries 最大重试次数（默认 1）
 */
async function callAIWithRetry(
  input: StudentInput,
  ruleResult: RuleResult,
  apiKey: string,
  maxRetries: number = 1
): Promise<AIStandardOutput | null> {
  const prompts = buildAIPrompt(input, ruleResult)
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI call attempt ${attempt + 1}/${maxRetries + 1}`)
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
          max_tokens: 1500,
          temperature: 0.5, // 降低温度以获得更稳定的输出
        }),
      })

      if (!response.ok) {
        console.error(`DeepSeek API error: ${response.status}`)
        continue
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error('AI returned empty content')
        continue
      }

      // 解析 JSON
      const parsed = parseAIResponse(content)
      
      // 校验结构
      if (validateAIOutput(parsed)) {
        // 强制使用规则引擎的等级（以防 AI 修改）
        parsed.feasibilityLevel = ruleResult.level
        console.log('AI output validated successfully')
        return parsed
      }

      console.error(`AI output validation failed on attempt ${attempt + 1}`)
      
      // 如果还有重试机会，稍等一下再重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
    } catch (error) {
      console.error(`AI call error on attempt ${attempt + 1}:`, error)
    }
  }

  return null
}

// ============================================================
// 备用解释生成
// ============================================================

/**
 * 生成备用解释（AI 不可用或校验失败时）
 */
function generateFallbackOutput(ruleResult: RuleResult): AIStandardOutput {
  const level = ruleResult.level
  
  const summaries: Record<FeasibilityLevel, string> = {
    'A': '根据评估，学生目前具备较好的插班条件，各项指标与目标学校要求匹配度较高。建议抓紧时间进行针对性提升，把握插班机会。',
    'B': '根据评估，学生具备一定的插班机会，但部分科目与目标学校要求仍有差距。通过系统的准备和提升，可以显著提高竞争力。',
    'C': '根据评估，以目前条件直接插班存在一定风险。建议先进行3-6个月的针对性提升，改善薄弱环节后再尝试。',
    'D': '根据评估，目前条件与目标学校要求差距较大。建议调整策略，考虑更适合当前水平的学校，或制定长期提升计划。',
    'E': '根据评估，当前条件与目标差距较大。建议从基础开始，制定切实可行的长期提升计划，逐步向目标迈进。',
  }

  // 使用规则引擎的风险原因
  const mainRisks = ruleResult.reasons.length > 0 
    ? ruleResult.reasons.slice(0, 4)
    : ['建议进一步了解目标学校的具体要求', '需要制定详细的学习计划']

  // 根据等级生成不同的建议
  const plans: Record<FeasibilityLevel, string[]> = {
    'A': [
      '保持现有优势科目的学习节奏',
      '针对薄弱环节进行专项突破',
      '提前了解目标学校面试要求',
      '准备个人陈述和申请材料',
    ],
    'B': [
      '重点提升英文和数学两门核心科目',
      '每周安排固定时间进行系统复习',
      '参加模拟测试，检验学习效果',
      '了解目标学校的招生政策和要求',
    ],
    'C': [
      '全面评估各科基础，找出最薄弱环节',
      '制定3-6个月的分阶段提升计划',
      '考虑参加专业辅导课程',
      '适当调整目标学校期望',
      '保持良好的学习习惯和心态',
    ],
    'D': [
      '重新评估目标学校选择',
      '从基础开始，夯实核心科目',
      '制定6-12个月的长期提升计划',
      '考虑阶梯式目标，分步实现',
      '寻求专业教育顾问的建议',
    ],
    'E': [
      '调整插班目标，选择更现实的学校',
      '制定长期学习计划，从基础补起',
      '重点攻克核心科目的基础知识',
      '建立良好的学习习惯和自信心',
      '考虑寻求专业教育机构的帮助',
      '保持积极心态，相信持续努力会有回报',
    ],
  }

  return {
    feasibilityLevel: level,
    summary: summaries[level],
    mainRisks,
    improvementPlan: plans[level],
  }
}

// ============================================================
// 核心分析函数
// ============================================================

/**
 * 执行混合分析
 * 
 * 流程：
 * 1. 调用规则评分引擎 → 获得 ruleResult
 * 2. 调用 AI（带校验和重试） → 获得 aiExplanation
 * 3. 如果 AI 失败，使用备用生成
 * 4. 合并返回完整结果
 */
export async function analyzeWithHybridEngine(
  input: StudentInput,
  apiKey: string
): Promise<HybridAnalysisResult> {
  // ============================================================
  // Step 1: 规则引擎评分
  // ============================================================
  const studentProfile = convertToStudentProfile(input)
  
  const primarySchool: TargetSchool = input.targetSchools[0] 
    ? {
        schoolName: input.targetSchools[0].name,
        bandLevel: input.targetSchools[0].bandLevel,
        district: input.targetSchools[0].district,
      }
    : {
        schoolName: '目标学校',
        bandLevel: 2,
        district: '沙田區',
      }

  const scoreResult = calculatePlacementScore(studentProfile, primarySchool)

  const ruleResult: RuleResult = {
    score: scoreResult.score,
    level: scoreResult.level,
    reasons: scoreResult.reasons,
    positiveReasons: scoreResult.positiveReasons,
    subjectAnalysis: scoreResult.subjectAnalysis,
    riskRadar: scoreResult.riskRadar,
    breakdown: scoreResult.breakdown,
  }

  // ============================================================
  // Step 2: AI 解释生成（带校验和重试）
  // ============================================================
  let aiExplanation: AIStandardOutput

  if (apiKey) {
    const aiResult = await callAIWithRetry(input, ruleResult, apiKey, 1) // 最多重试 1 次
    
    if (aiResult) {
      aiExplanation = aiResult
    } else {
      console.log('AI failed after retries, using fallback')
      aiExplanation = generateFallbackOutput(ruleResult)
    }
  } else {
    // 无 API Key，使用本地生成
    aiExplanation = generateFallbackOutput(ruleResult)
  }

  // ============================================================
  // Step 3: 合并结果
  // ============================================================
  return {
    ruleResult,
    aiExplanation,
    conversionCopy: CONVERSION_COPIES[ruleResult.level],
    recommendedActions: getRecommendedActions(ruleResult.level),
    disclaimer: DISCLAIMER,
    analyzedAt: new Date().toISOString(),
  }
}

// ============================================================
// 多学校评估
// ============================================================

/**
 * 评估多个目标学校
 */
export async function analyzeMultipleSchools(
  input: StudentInput,
  apiKey: string
): Promise<Array<HybridAnalysisResult & { schoolName: string }>> {
  const results: Array<HybridAnalysisResult & { schoolName: string }> = []

  for (const school of input.targetSchools) {
    const singleInput: StudentInput = {
      ...input,
      targetSchools: [school],
    }
    
    const result = await analyzeWithHybridEngine(singleInput, apiKey)
    results.push({
      schoolName: school.name,
      ...result,
    })
  }

  // 按分数排序（高分在前）
  results.sort((a, b) => b.ruleResult.score - a.ruleResult.score)

  return results
}

// ============================================================
// 导出
// ============================================================

export { validateAIOutput }

export default {
  analyzeWithHybridEngine,
  analyzeMultipleSchools,
  validateAIOutput,
}
