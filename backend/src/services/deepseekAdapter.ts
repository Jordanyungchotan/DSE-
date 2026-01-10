/**
 * DeepSeek AI 适配器 v2.0
 * 
 * 专门用于处理规则评分后的 AI 解释生成
 * 
 * 设计原则：
 * - 接收规则评分结果 (score, level, reasons)
 * - 构造标准化 Prompt
 * - 调用 DeepSeek API
 * - 返回标准化 JSON 结构
 * - 如果输出包含成功率/百分比，自动重试
 */

import { type FeasibilityLevel } from './placementScore.js'
import { LEVEL_DESCRIPTIONS, getLevelScoreRange } from '../config/index.js'

// ============================================================
// 类型定义
// ============================================================

/** 规则评分输入 */
export interface RuleScoreInput {
  score: number
  level: FeasibilityLevel
  reasons: string[]
  positiveReasons?: string[]
}

/** 学生基本信息 */
export interface StudentInfo {
  age: number
  grade: string
  currentSchool?: string
  enrollmentDate?: string
  subjects: Array<{
    subject: string
    score: number
  }>
}

/** 目标学校信息 */
export interface TargetSchoolInfo {
  name: string
  band: 1 | 2 | 3
  district: string
}

/** AI 标准化输出（必须符合此格式） */
export interface AIAnalysisOutput {
  feasibilityLevel: FeasibilityLevel
  summary: string
  mainRisks: string[]
  improvementPlan: string[]
}

/** DeepSeek API 响应 */
interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

// ============================================================
// 禁止词检测
// ============================================================

/** 禁止词列表（AI 输出中不应包含） */
const FORBIDDEN_PATTERNS = [
  /\d+\.?\d*\s*%/,           // 任何百分比
  /成功率/,
  /录取率/,
  /概率/,
  /机会率/,
  /可能性\s*[为是]\s*\d+/,
  /\d+\s*成/,                // "几成"
  /十分之/,
  /百分之/,
]

/**
 * 检查文本是否包含禁止词
 */
function containsForbiddenContent(text: string): boolean {
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(text))
}

// ============================================================
// Prompt 构建
// ============================================================

/**
 * 构建系统 Prompt
 */
function buildSystemPrompt(): string {
  return `你是一位资深的香港 DSE 教育专家，拥有超过15年的升学辅导经验。

## 你的角色
- 根据系统已计算的规则评分，用自然语言解释分析结果
- 提供具体、可执行的改进建议
- 帮助家长理解孩子的升学可行性

## 严格规则
1. **绝对禁止**输出任何成功率、百分比、概率或类似表述
2. **绝对禁止**使用"50%"、"80%成功率"、"十分之八"等表述
3. 只能使用等级描述：A（可行性高）、B（中等）、C（偏低）、D（较低）、E（极低）
4. 所有建议必须具体可执行，避免空泛表述
5. 必须强调这是参考建议，不构成录取保证

## 输出格式（严格 JSON）
{
  "feasibilityLevel": "B",
  "summary": "100-150字的整体评价，包含学生基本情况和核心结论",
  "mainRisks": ["风险1", "风险2", "风险3"],
  "improvementPlan": ["建议1", "建议2", "建议3", "建议4"]
}

## 输出要求
- feasibilityLevel: 必须与系统提供的等级一致
- summary: 100-150字，客观专业
- mainRisks: 2-5个主要风险点
- improvementPlan: 3-6个可执行的改进建议

只输出 JSON，不要任何其他文字。`
}

/**
 * 构建用户 Prompt
 */
function buildUserPrompt(
  ruleScore: RuleScoreInput,
  student: StudentInfo,
  targetSchool: TargetSchoolInfo
): string {
  const subjectList = student.subjects
    .map(s => `${s.subject}: ${s.score}分`)
    .join('、')
  
  const reasonsList = ruleScore.reasons.length > 0
    ? ruleScore.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : '暂无明显扣分因素'
  
  const positiveList = ruleScore.positiveReasons && ruleScore.positiveReasons.length > 0
    ? ruleScore.positiveReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : '暂无明显加分因素'

  return `## 规则评分结果
- 综合评分：${ruleScore.score}分（满分100）
- 可行性等级：${ruleScore.level}（${LEVEL_DESCRIPTIONS[ruleScore.level]}）
- 分数区间：${getLevelScoreRange(ruleScore.level)}

## 学生信息
- 年龄：${student.age}岁
- 当前年级：${student.grade}
- 当前学校：${student.currentSchool || '未提供'}
- 目标入学时间：${student.enrollmentDate || '未提供'}
- 各科成绩：${subjectList}

## 目标学校
- 学校名称：${targetSchool.name}
- 学校等级：Band ${targetSchool.band}
- 所在地区：${targetSchool.district}

## 扣分原因
${reasonsList}

## 加分因素
${positiveList}

请根据以上信息，用专业的语言生成分析报告。
注意：
1. feasibilityLevel 必须是 "${ruleScore.level}"
2. 不要输出任何百分比或成功率
3. 只输出 JSON 格式`
}

// ============================================================
// API 调用
// ============================================================

/**
 * 调用 DeepSeek API
 */
async function callDeepSeekAPI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  endpoint: string = 'https://api.deepseek.com/v1/chat/completions',
  model: string = 'deepseek-chat'
): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as DeepSeekResponse
  return data.choices[0]?.message?.content || ''
}

/**
 * 解析并验证 AI 输出
 */
function parseAndValidateOutput(
  content: string,
  expectedLevel: FeasibilityLevel
): AIAnalysisOutput | null {
  try {
    // 清理可能的 markdown 包装
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7)
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3)
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3)
    }
    cleanContent = cleanContent.trim()

    // 解析 JSON
    const parsed = JSON.parse(cleanContent) as AIAnalysisOutput

    // 验证必要字段
    if (!parsed.feasibilityLevel || !parsed.summary || !parsed.mainRisks || !parsed.improvementPlan) {
      console.error('AI 输出缺少必要字段')
      return null
    }

    // 验证等级一致性
    if (parsed.feasibilityLevel !== expectedLevel) {
      console.warn(`AI 等级 ${parsed.feasibilityLevel} 与规则等级 ${expectedLevel} 不一致，强制修正`)
      parsed.feasibilityLevel = expectedLevel
    }

    // 验证禁止词
    const fullText = parsed.summary + parsed.mainRisks.join(' ') + parsed.improvementPlan.join(' ')
    if (containsForbiddenContent(fullText)) {
      console.error('AI 输出包含禁止内容（百分比或成功率）')
      return null
    }

    // 验证数组长度
    if (parsed.mainRisks.length < 2 || parsed.mainRisks.length > 5) {
      parsed.mainRisks = parsed.mainRisks.slice(0, 5)
      if (parsed.mainRisks.length < 2) {
        parsed.mainRisks.push('需要进一步评估具体情况')
      }
    }

    if (parsed.improvementPlan.length < 3 || parsed.improvementPlan.length > 6) {
      parsed.improvementPlan = parsed.improvementPlan.slice(0, 6)
      if (parsed.improvementPlan.length < 3) {
        parsed.improvementPlan.push('持续关注目标学校的招生信息')
      }
    }

    return parsed
  } catch (error) {
    console.error('解析 AI 输出失败:', error)
    return null
  }
}

// ============================================================
// 主函数
// ============================================================

/**
 * 生成 AI 分析解释
 * 
 * @param ruleScore 规则评分结果
 * @param student 学生信息
 * @param targetSchool 目标学校信息
 * @param apiKey DeepSeek API Key
 * @param maxRetries 最大重试次数
 * @returns AI 分析输出
 */
export async function generateAIExplanation(
  ruleScore: RuleScoreInput,
  student: StudentInfo,
  targetSchool: TargetSchoolInfo,
  apiKey: string,
  maxRetries: number = 2
): Promise<AIAnalysisOutput> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(ruleScore, student, targetSchool)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const content = await callDeepSeekAPI(systemPrompt, userPrompt, apiKey)
      const parsed = parseAndValidateOutput(content, ruleScore.level)
      
      if (parsed) {
        return parsed
      }
      
      console.warn(`AI 输出验证失败，重试 ${attempt + 1}/${maxRetries + 1}`)
    } catch (error) {
      lastError = error as Error
      console.error(`DeepSeek API 调用失败:`, error)
    }
  }

  // 所有重试失败，返回本地生成的结果
  console.warn('所有 AI 调用失败，使用本地生成')
  return generateFallbackOutput(ruleScore)
}

/**
 * 生成本地备用输出（当 AI 调用失败时）
 */
function generateFallbackOutput(ruleScore: RuleScoreInput): AIAnalysisOutput {
  const levelDescriptions: Record<FeasibilityLevel, string> = {
    'A': '根据评估，您的孩子目前具备较强的插班竞争力。建议把握时机，积极准备申请材料和面试。',
    'B': '根据评估，您的孩子具备一定的插班机会。核心科目仍有提升空间，建议通过系统训练增强竞争力。',
    'C': '根据评估，以目前条件直接插班风险较高。建议先进行3-6个月的能力提升，再考虑申请。',
    'D': '根据评估，不建议现阶段直接尝试该校插班。建议先进行基础能力重建，或调整目标学校。',
    'E': '根据评估，当前条件与目标差距较大。建议从更实际的目标开始，逐步实现升学规划。',
  }

  const defaultRisks: Record<FeasibilityLevel, string[]> = {
    'A': ['竞争激烈，需保持现有水平', '面试表现是关键因素'],
    'B': ['核心科目需进一步提升', '需要针对性准备面试'],
    'C': ['学术成绩存在明显差距', '高年级插班名额有限', '需要系统性提升'],
    'D': ['与目标学校要求差距较大', '建议调整目标或延后申请', '需要基础能力重建'],
    'E': ['需要重新评估升学目标', '建议从基础开始提升', '可考虑更合适的学校'],
  }

  const defaultPlans: Record<FeasibilityLevel, string[]> = {
    'A': ['准备完整的申请材料', '进行模拟面试训练', '了解目标学校的招生偏好', '保持各科优秀成绩'],
    'B': ['重点提升英文和数学成绩', '参加专项补习课程', '积累课外活动经验', '定期进行模拟测试'],
    'C': ['制定3-6个月提升计划', '重点攻克薄弱科目', '考虑报名专业辅导班', '可适当调整目标学校'],
    'D': ['进行全面学业评估', '制定长期提升方案', '考虑更现实的目标学校', '重建学习基础和习惯'],
    'E': ['咨询专业升学顾问', '制定长期学业规划', '从基础科目开始提升', '重新设定合理目标'],
  }

  return {
    feasibilityLevel: ruleScore.level,
    summary: levelDescriptions[ruleScore.level] + 
      (ruleScore.reasons.length > 0 ? ` 主要考量因素包括：${ruleScore.reasons.slice(0, 2).join('、')}。` : ''),
    mainRisks: defaultRisks[ruleScore.level],
    improvementPlan: defaultPlans[ruleScore.level],
  }
}

// ============================================================
// 导出
// ============================================================

export {
  buildSystemPrompt,
  buildUserPrompt,
  containsForbiddenContent,
  generateFallbackOutput,
}
