/**
 * 插班可行性评估引擎
 * 
 * 基于规则系统 + AI推理，提供可行性等级评估
 * 设计原则：
 * - 无真实插班数据，使用经验规则 + 相对匹配度
 * - 禁止输出具体成功百分比
 * - 强调"建议性、非保证"
 */

// ApiError imported for future use in error handling

// ============================================================
// 类型定义
// ============================================================

/** 学生信息输入 */
export interface StudentProfile {
  age: number
  gender: 'male' | 'female'
  currentGrade: string // S1-S6
  scores: Record<string, number> // 科目 -> 分数(0-100)
  currentSchool?: string
  currentBand?: number // 当前学校Band等级
  strengths?: string[] // 个人优势
  extracurriculars?: string[] // 课外活动
}

/** 目标学校信息 */
export interface TargetSchool {
  schoolId?: string
  schoolName: string
  bandLevel: 1 | 2 | 3
  district: string
  gender?: 'boys' | 'girls' | 'coed'
  type?: 'government' | 'aided' | 'dss' | 'private'
  englishRequirement?: 'high' | 'medium' | 'low'
}

/** 可行性评估请求 */
export interface FeasibilityRequest {
  student: StudentProfile
  targetSchool: TargetSchool
}

/** 可行性等级 */
export type FeasibilityLevel = 'A' | 'B' | 'C' | 'D'

/** 可行性评估结果 */
export interface FeasibilityResult {
  feasibilityLevel: FeasibilityLevel
  levelDescription: string
  overallAssessment: string
  mainRisks: string[]
  keyStrengths: string[]
  recommendations: string[]
  subjectAnalysis: SubjectAnalysisResult[]
  preparationPlan: PreparationPlan
  disclaimer: string
}

/** 科目分析结果 */
interface SubjectAnalysisResult {
  subject: string
  score: number
  status: 'strong' | 'adequate' | 'weak' | 'critical'
  statusDescription: string
  recommendation: string
}

/** 准备计划 */
interface PreparationPlan {
  priorityActions: string[]
  shortTermGoals: string[] // 1-2个月
  mediumTermGoals: string[] // 3-4个月
  resources: string[]
}

// ============================================================
// 学校规则画像（School Heuristic Profile）
// ============================================================

/** Band等级对应的基准分数要求 */
const BAND_SCORE_THRESHOLDS = {
  1: { chinese: 70, english: 75, math: 70, minAverage: 72 },
  2: { chinese: 55, english: 60, math: 55, minAverage: 58 },
  3: { chinese: 40, english: 45, math: 40, minAverage: 42 },
}

/** 区域竞争强度系数 */
const DISTRICT_COMPETITION: Record<string, number> = {
  '中西區': 1.15,
  '灣仔區': 1.12,
  '東區': 1.05,
  '南區': 1.02,
  '九龍城區': 1.18,
  '油尖旺區': 1.10,
  '深水埗區': 1.05,
  '黃大仙區': 1.00,
  '觀塘區': 1.02,
  '沙田區': 1.12,
  '大埔區': 1.05,
  '北區': 0.98,
  '西貢區': 1.08,
  '葵青區': 1.00,
  '荃灣區': 1.02,
  '屯門區': 1.00,
  '元朗區': 0.98,
  '離島區': 0.95,
}

/** 年级插班难度系数 */
const GRADE_DIFFICULTY: Record<string, number> = {
  'S1': 0.90,  // 中一相对容易
  'S2': 0.95,
  'S3': 1.00,
  'S4': 1.15,  // 中四开始DSE课程，难度增加
  'S5': 1.25,  // 中五更难
  'S6': 1.40,  // 中六最难插班
}

/** 科目名称映射 */
const SUBJECT_NAMES: Record<string, string> = {
  'chinese': '中文',
  'english': '英文',
  'math': '数学',
  'science': '科学/常识',
  'liberal': '公民与社会发展',
  'physics': '物理',
  'chemistry': '化学',
  'biology': '生物',
  'economics': '经济',
  'geography': '地理',
  'history': '历史',
}

// ============================================================
// 规则引擎核心逻辑
// ============================================================

/**
 * 分析学生能力档案
 */
function analyzeStudentAbility(student: StudentProfile): {
  coreSubjectsStatus: 'strong' | 'adequate' | 'weak'
  weakSubjects: string[]
  strongSubjects: string[]
  averageScore: number
  hasSignificantWeakness: boolean
} {
  const coreSubjects = ['chinese', 'english', 'math']
  const scores = student.scores
  
  // 计算平均分
  const allScores = Object.values(scores)
  const averageScore = allScores.length > 0 
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
    : 0

  // 分析各科目
  const weakSubjects: string[] = []
  const strongSubjects: string[] = []
  
  for (const [subject, score] of Object.entries(scores)) {
    if (score < 50) {
      weakSubjects.push(subject)
    } else if (score >= 75) {
      strongSubjects.push(subject)
    }
  }

  // 核心科目状态
  const coreScores = coreSubjects
    .filter(s => scores[s] !== undefined)
    .map(s => scores[s])
  
  const coreAverage = coreScores.length > 0 
    ? coreScores.reduce((a, b) => a + b, 0) / coreScores.length 
    : 0

  let coreSubjectsStatus: 'strong' | 'adequate' | 'weak'
  if (coreAverage >= 75) {
    coreSubjectsStatus = 'strong'
  } else if (coreAverage >= 55) {
    coreSubjectsStatus = 'adequate'
  } else {
    coreSubjectsStatus = 'weak'
  }

  // 是否存在明显短板（任一核心科目低于50分）
  const hasSignificantWeakness = coreSubjects.some(s => 
    scores[s] !== undefined && scores[s] < 50
  )

  return {
    coreSubjectsStatus,
    weakSubjects,
    strongSubjects,
    averageScore,
    hasSignificantWeakness,
  }
}

/**
 * 计算匹配度和风险评分
 */
function calculateMatchingScore(
  student: StudentProfile,
  targetSchool: TargetSchool
): {
  matchLevel: FeasibilityLevel
  riskFactors: string[]
  positiveFactors: string[]
} {
  const ability = analyzeStudentAbility(student)
  const thresholds = BAND_SCORE_THRESHOLDS[targetSchool.bandLevel]
  const districtFactor = DISTRICT_COMPETITION[targetSchool.district] || 1.0
  const gradeFactor = GRADE_DIFFICULTY[student.currentGrade] || 1.0
  
  const riskFactors: string[] = []
  const positiveFactors: string[] = []
  
  // 计算调整后的要求分数
  const adjustedMinAverage = thresholds.minAverage * districtFactor * gradeFactor
  
  // 评估各项因素
  let riskScore = 0

  // 1. 平均分与要求对比
  const scoreDiff = ability.averageScore - adjustedMinAverage
  if (scoreDiff < -15) {
    riskScore += 3
    riskFactors.push(`整体成绩与该校常见插班要求有较大差距`)
  } else if (scoreDiff < -5) {
    riskScore += 2
    riskFactors.push(`整体成绩略低于该校一般要求`)
  } else if (scoreDiff >= 5) {
    positiveFactors.push(`整体成绩达到该校期望水平`)
  }

  // 2. 英文科目（Band 1学校特别重视）
  const englishScore = student.scores['english'] || 0
  if (targetSchool.bandLevel === 1) {
    if (englishScore < thresholds.english) {
      riskScore += 2
      riskFactors.push(`英文成绩可能未达Band 1学校的较高要求`)
    } else if (englishScore >= 80) {
      positiveFactors.push(`英文成绩优秀，符合该层次学校期望`)
    }
  }

  // 3. 核心科目短板
  if (ability.hasSignificantWeakness) {
    riskScore += 2
    riskFactors.push(`存在核心科目明显短板，需重点加强`)
  }

  // 4. 年级因素
  if (['S5', 'S6'].includes(student.currentGrade)) {
    riskScore += 1
    riskFactors.push(`高年级插班名额通常较少，竞争较激烈`)
  }

  // 5. Band跨越
  if (student.currentBand && student.currentBand > targetSchool.bandLevel) {
    const bandGap = student.currentBand - targetSchool.bandLevel
    if (bandGap >= 2) {
      riskScore += 3
      riskFactors.push(`从Band ${student.currentBand}跨越至Band ${targetSchool.bandLevel}难度较大`)
    } else {
      riskScore += 1
      riskFactors.push(`跨Band插班需要更充分的准备`)
    }
  }

  // 6. 区域竞争
  if (districtFactor >= 1.1) {
    riskFactors.push(`${targetSchool.district}属于竞争较激烈区域`)
  }

  // 添加正面因素
  if (ability.strongSubjects.length >= 2) {
    positiveFactors.push(`多个科目表现突出（${ability.strongSubjects.map(s => SUBJECT_NAMES[s] || s).join('、')}）`)
  }
  if (student.extracurriculars && student.extracurriculars.length > 0) {
    positiveFactors.push(`有丰富的课外活动经历`)
  }

  // 确定可行性等级
  let matchLevel: FeasibilityLevel
  if (riskScore <= 1 && scoreDiff >= 0) {
    matchLevel = 'A'
  } else if (riskScore <= 3 && scoreDiff >= -10) {
    matchLevel = 'B'
  } else if (riskScore <= 5) {
    matchLevel = 'C'
  } else {
    matchLevel = 'D'
  }

  return { matchLevel, riskFactors, positiveFactors }
}

/**
 * 生成科目分析
 */
function generateSubjectAnalysis(
  student: StudentProfile,
  targetSchool: TargetSchool
): SubjectAnalysisResult[] {
  const thresholds = BAND_SCORE_THRESHOLDS[targetSchool.bandLevel]
  const results: SubjectAnalysisResult[] = []

  for (const [subject, score] of Object.entries(student.scores)) {
    const subjectName = SUBJECT_NAMES[subject] || subject
    let threshold = thresholds.minAverage
    
    // 特定科目有特定要求
    if (subject === 'english') threshold = thresholds.english
    if (subject === 'chinese') threshold = thresholds.chinese
    if (subject === 'math') threshold = thresholds.math

    let status: 'strong' | 'adequate' | 'weak' | 'critical'
    let statusDescription: string
    let recommendation: string

    if (score >= threshold + 15) {
      status = 'strong'
      statusDescription = '表现优秀，是明显优势科目'
      recommendation = '保持现有水平，可作为加分项展示'
    } else if (score >= threshold) {
      status = 'adequate'
      statusDescription = '达到基本要求'
      recommendation = '继续巩固，争取进一步提升'
    } else if (score >= threshold - 15) {
      status = 'weak'
      statusDescription = '略低于期望水平，需要加强'
      recommendation = `建议每天额外投入30-45分钟进行${subjectName}专项训练`
    } else {
      status = 'critical'
      statusDescription = '与期望水平有较大差距，是主要短板'
      recommendation = `${subjectName}是目前最需要突破的科目，建议寻求专业辅导`
    }

    results.push({
      subject: subjectName,
      score,
      status,
      statusDescription,
      recommendation,
    })
  }

  // 按状态排序（critical在前）
  const statusOrder = { critical: 0, weak: 1, adequate: 2, strong: 3 }
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return results
}

/**
 * 生成准备计划
 */
function generatePreparationPlan(
  _student: StudentProfile,
  subjectAnalysis: SubjectAnalysisResult[]
): PreparationPlan {
  const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical')
  const weakSubjects = subjectAnalysis.filter(s => s.status === 'weak')
  
  const priorityActions: string[] = []
  const shortTermGoals: string[] = []
  const mediumTermGoals: string[] = []
  const resources: string[] = []

  // 优先行动
  if (criticalSubjects.length > 0) {
    priorityActions.push(`立即开始${criticalSubjects.map(s => s.subject).join('、')}的强化训练`)
  }
  if (weakSubjects.length > 0) {
    priorityActions.push(`制定${weakSubjects.map(s => s.subject).join('、')}的提升计划`)
  }
  priorityActions.push('收集目标学校的插班信息和要求')
  priorityActions.push('准备个人简历和过往成绩单')

  // 短期目标（1-2个月）
  criticalSubjects.forEach(s => {
    shortTermGoals.push(`${s.subject}成绩提升至及格线以上`)
  })
  shortTermGoals.push('完成各科知识点梳理，建立知识框架')
  shortTermGoals.push('每周进行一次模拟测试，检验学习效果')

  // 中期目标（3-4个月）
  weakSubjects.forEach(s => {
    mediumTermGoals.push(`${s.subject}达到目标学校期望水平`)
  })
  mediumTermGoals.push('全面提升综合能力，准备面试')
  mediumTermGoals.push('培养良好学习习惯，适应更高强度学习')

  // 推荐资源
  resources.push('历年插班试题（如有）')
  resources.push('各科精编练习册')
  resources.push('在线学习平台（如学科视频课程）')
  resources.push('专业补习班或私人导师')
  resources.push('学校开放日和咨询活动')

  return {
    priorityActions,
    shortTermGoals,
    mediumTermGoals,
    resources,
  }
}

/**
 * 可行性等级描述
 */
const LEVEL_DESCRIPTIONS: Record<FeasibilityLevel, string> = {
  'A': '可行性较高 - 学生条件与目标学校要求匹配度良好，通过适当准备有较大机会',
  'B': '可行性中等 - 需要在部分方面加强，建议重点提升短板科目',
  'C': '可行性一般 - 存在较明显差距，需要较长时间准备和显著提升',
  'D': '可行性较低 - 差距较大，建议重新评估目标或制定长期计划',
}

/**
 * 免责声明
 */
const DISCLAIMER = `⚠️ 免责声明：本系统基于公开教育资料与经验模型进行分析，仅作为升学参考，不构成任何录取保证。实际录取结果受多种因素影响，包括但不限于学校当年招生名额、面试表现、其他申请者情况等。建议结合学校官方信息和专业教育顾问意见做出决策。`

// ============================================================
// 主评估函数
// ============================================================

/**
 * 执行可行性评估（规则引擎版）
 */
export function evaluateFeasibility(request: FeasibilityRequest): FeasibilityResult {
  const { student, targetSchool } = request
  
  // 计算匹配度
  const matching = calculateMatchingScore(student, targetSchool)
  
  // 生成科目分析
  const subjectAnalysis = generateSubjectAnalysis(student, targetSchool)
  
  // 生成准备计划
  const preparationPlan = generatePreparationPlan(student, subjectAnalysis)
  
  // 生成综合评估描述
  const ability = analyzeStudentAbility(student)
  const overallAssessment = generateOverallAssessment(
    student, 
    targetSchool, 
    matching.matchLevel,
    ability
  )

  // 生成建议
  const recommendations = generateRecommendations(
    subjectAnalysis,
    matching.riskFactors,
    targetSchool
  )

  return {
    feasibilityLevel: matching.matchLevel,
    levelDescription: LEVEL_DESCRIPTIONS[matching.matchLevel],
    overallAssessment,
    mainRisks: matching.riskFactors,
    keyStrengths: matching.positiveFactors,
    recommendations,
    subjectAnalysis,
    preparationPlan,
    disclaimer: DISCLAIMER,
  }
}

/**
 * 生成综合评估描述
 */
function generateOverallAssessment(
  student: StudentProfile,
  targetSchool: TargetSchool,
  level: FeasibilityLevel,
  ability: ReturnType<typeof analyzeStudentAbility>
): string {
  const gradeMap: Record<string, string> = {
    'S1': '中一', 'S2': '中二', 'S3': '中三',
    'S4': '中四', 'S5': '中五', 'S6': '中六',
  }
  const gradeName = gradeMap[student.currentGrade] || student.currentGrade
  const genderText = student.gender === 'female' ? '女' : '男'
  
  let assessment = `该${gradeName}${genderText}生，${student.age}岁，`
  assessment += `目前各科平均分约${Math.round(ability.averageScore)}分。`
  
  if (level === 'A') {
    assessment += `整体学术表现良好，与目标Band ${targetSchool.bandLevel}学校（${targetSchool.schoolName}）的期望水平较为匹配。`
    assessment += `核心科目表现${ability.coreSubjectsStatus === 'strong' ? '突出' : '稳定'}，`
    assessment += `通过适当的准备和保持现有水平，有较大机会获得面试机会。`
  } else if (level === 'B') {
    assessment += `学术表现中等偏上，基本符合Band ${targetSchool.bandLevel}学校的要求，`
    assessment += `但仍有提升空间。建议在接下来的准备期间，`
    assessment += `重点加强薄弱环节，同时保持优势科目的水平。`
  } else if (level === 'C') {
    assessment += `与目标学校（Band ${targetSchool.bandLevel}）的期望水平存在一定差距。`
    assessment += `需要在多个方面进行较大幅度的提升，`
    assessment += `建议制定3-6个月的系统性准备计划。`
  } else {
    assessment += `目前条件与目标学校差距较大，`
    assessment += `建议考虑调整目标学校层次，或制定更长期的提升计划。`
    assessment += `也可以先从相对容易达到的学校开始，逐步实现升学目标。`
  }

  return assessment
}

/**
 * 生成建议列表
 */
function generateRecommendations(
  subjectAnalysis: SubjectAnalysisResult[],
  _riskFactors: string[],
  targetSchool: TargetSchool
): string[] {
  const recommendations: string[] = []
  
  // 针对薄弱科目的建议
  const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical')
  const weakSubjects = subjectAnalysis.filter(s => s.status === 'weak')
  
  if (criticalSubjects.length > 0) {
    recommendations.push(
      `优先提升${criticalSubjects.map(s => s.subject).join('和')}，这是目前最需要突破的领域`
    )
  }
  
  if (weakSubjects.length > 0) {
    recommendations.push(
      `加强${weakSubjects.map(s => s.subject).join('、')}的训练，确保达到目标学校期望水平`
    )
  }

  // Band 1学校特别建议
  if (targetSchool.bandLevel === 1) {
    recommendations.push('提升英语综合能力，包括阅读理解和写作表达')
    recommendations.push('培养批判性思维，准备可能的面试环节')
  }

  // 通用建议
  recommendations.push('定期进行模拟测试，检验学习成效')
  recommendations.push('了解目标学校的办学理念和特色，准备个人陈述')
  recommendations.push('保持良好作息和学习习惯，确保稳定发挥')

  return recommendations.slice(0, 6) // 最多返回6条建议
}

// ============================================================
// AI增强评估（可选）
// ============================================================

/**
 * AI增强评估Prompt
 */
export function buildAIPrompt(request: FeasibilityRequest, ruleResult: FeasibilityResult): string {
  const { student, targetSchool } = request
  
  return `你是一位资深的香港教育顾问，请基于以下信息提供专业的插班可行性分析。

## ⚠️ 重要原则

1. **无真实插班数据**：本系统没有真实的插班录取数据，分析基于经验规则和相对匹配度
2. **禁止输出百分比**：绝对不要给出具体的成功率百分比（如"成功率70%"）
3. **建议性而非保证**：所有建议仅供参考，不构成任何录取承诺
4. **使用等级评估**：使用A/B/C/D等级表示可行性，而非具体数字

---

## 学生基本信息

| 项目 | 信息 |
|------|------|
| 年龄 | ${student.age}岁 |
| 性别 | ${student.gender === 'female' ? '女' : '男'} |
| 当前年级 | ${student.currentGrade} |
| 当前学校 | ${student.currentSchool || '未提供'} |

### 各科成绩
${Object.entries(student.scores).map(([s, score]) => `- ${SUBJECT_NAMES[s] || s}: ${score}分`).join('\n')}

## 目标学校

| 项目 | 信息 |
|------|------|
| 学校名称 | ${targetSchool.schoolName} |
| Band等级 | Band ${targetSchool.bandLevel} |
| 所在区域 | ${targetSchool.district} |

## 规则引擎初步评估

- 可行性等级: ${ruleResult.feasibilityLevel}
- ${ruleResult.levelDescription}

---

请以JSON格式返回你的专业分析补充，结构如下：

{
  "aiInsights": "<150字以内的补充分析，从教育专家角度提供更细致的建议>",
  "additionalRisks": ["<规则引擎可能遗漏的风险点1>", "<风险点2>"],
  "additionalStrengths": ["<可能被忽视的优势1>"],
  "interviewTips": ["<面试准备建议1>", "<面试准备建议2>"],
  "alternativeSchools": "<如果目标难度较大，可考虑的备选方向建议>"
}

注意：
1. 只返回JSON，不要有其他文字
2. 所有内容都要基于香港实际教育情况
3. 语气要专业、客观、有建设性`
}

/**
 * 使用AI增强评估结果
 */
export async function enhanceWithAI(
  request: FeasibilityRequest,
  ruleResult: FeasibilityResult,
  aiApiKey?: string
): Promise<FeasibilityResult> {
  if (!aiApiKey) {
    return ruleResult // 无API密钥时直接返回规则引擎结果
  }

  try {
    const prompt = buildAIPrompt(request, ruleResult)
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是香港教育专家，提供专业的升学建议。禁止给出具体成功率百分比。',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.warn('AI增强失败，使用规则引擎结果')
      return ruleResult
    }

    const data = await response.json() as any
    const content = data.choices?.[0]?.message?.content

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0])
        
        // 合并AI建议到结果中
        if (aiResult.aiInsights) {
          ruleResult.overallAssessment += '\n\n' + aiResult.aiInsights
        }
        if (aiResult.additionalRisks) {
          ruleResult.mainRisks.push(...aiResult.additionalRisks)
        }
        if (aiResult.interviewTips) {
          ruleResult.recommendations.push(...aiResult.interviewTips)
        }
      }
    }
  } catch (error) {
    console.warn('AI增强出错:', error)
  }

  return ruleResult
}
