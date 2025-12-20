/**
 * DeepSeek API 服务模块
 * 集成DeepSeek AI进行DSE插班分析
 */

import { ApiError } from '../middleware/errorHandler.js'

/**
 * 学生信息接口
 */
export interface StudentInfo {
  enrollmentDate: string
  semester: string
  grade: string
  age: number
  currentSchool: string
  subjects: {
    subject: string
    currentScore: string
    targetScore: string
  }[]
  targetSchools: string[]
  notes: string
}

/**
 * 科目分析结果
 */
interface SubjectAnalysis {
  subject: string
  currentLevel: string
  targetLevel: string
  gap: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  estimatedTimeToImprove: string
}

/**
 * 学校评估结果
 */
interface SchoolAssessment {
  schoolName: string
  admissionProbability: number
  requirements: string[]
  gaps: string[]
  recommendations: string[]
}

/**
 * 完整分析结果
 */
export interface AnalysisResult {
  overallAssessment: {
    feasibilityScore: number
    summary: string
    keyStrengths: string[]
    keyWeaknesses: string[]
  }
  subjectAnalyses: SubjectAnalysis[]
  schoolAssessments: SchoolAssessment[]
  studyPlan: {
    weeklySchedule: string[]
    monthlyGoals: string[]
    resources: string[]
  }
  additionalAdvice: string[]
}

/**
 * DeepSeek API配置
 */
const DEEPSEEK_CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  endpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  maxTokens: 4000,
  temperature: 0.7,
}

/**
 * 科目名称映射
 */
const SUBJECT_NAME_MAP: Record<string, string> = {
  chinese: '中国语文',
  english: '英国语文',
  math: '数学',
  liberal: '公民与社会发展',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  economics: '经济',
  bafs: '企业会计与财务概论',
  geography: '地理',
  history: '历史',
  ict: '资讯及通讯科技',
  m1: '数学延伸部分(M1)',
  m2: '数学延伸部分(M2)',
}

/**
 * 年级名称映射
 */
const GRADE_NAME_MAP: Record<string, string> = {
  form4: '中四',
  form5: '中五',
  form6: '中六',
}

/**
 * 构建分析提示词
 */
const buildAnalysisPrompt = (studentInfo: StudentInfo): string => {
  // 格式化科目成绩
  const subjectsText = studentInfo.subjects
    .map((s) => `  - ${SUBJECT_NAME_MAP[s.subject] || s.subject}: 当前${s.currentScore}级，目标${s.targetScore}级`)
    .join('\n')

  // 格式化目标学校
  const schoolsText = studentInfo.targetSchools.join('、')

  // 获取年级显示名称
  const gradeName = GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade

  return `你是一位资深的香港DSE教育专家，拥有超过15年的DSE教学和升学辅导经验。

## ⚠️ 重要：禁止使用的表述

在你的回复中，**绝对禁止**使用以下任何表述：
- "年级信息未明确"
- "年龄信息未明确"  
- "信息未明确"
- "信息不完整"
- "信息缺失"
- "无法确定年级"
- "需要明确年级"
- "由于年级信息未明确"

学生的年级是【${gradeName}】，年龄是【${studentInfo.age}岁】，这些信息已经100%明确提供，请直接使用。

---

## 学生完整信息

| 项目 | 信息 |
|------|------|
| 插班日期 | ${studentInfo.enrollmentDate} |
| 目标学期 | ${studentInfo.semester} |
| **就读年级** | **${gradeName}** ✓ |
| **学生年龄** | **${studentInfo.age}岁** ✓ |
| 当前学校 | ${studentInfo.currentSchool || '未填写'} |

### 各科目成绩（共${studentInfo.subjects.length}个科目）

${subjectsText}

### 目标学校（共${studentInfo.targetSchools.length}所）

${schoolsText}

### 备注

${studentInfo.notes || '无'}

---

请以JSON格式返回分析结果，严格按照以下结构：

{
  "overallAssessment": {
    "feasibilityScore": <0-100的整数，表示插班成功的可行性评分>,
    "summary": "<200-300字的综合评估，开头必须写'该${gradeName}学生，${studentInfo.age}岁，...'，然后分析具体情况>",
    "keyStrengths": ["<优势1>", "<优势2>", "<优势3>"],
    "keyWeaknesses": ["<待改进项1，不能说年级信息未明确>", "<待改进项2>", "<待改进项3>"]
  },
  "subjectAnalyses": [
    {
      "subject": "<科目名称>",
      "currentLevel": "<当前成绩>",
      "targetLevel": "<目标成绩>",
      "gap": "<差距描述，如'差1级'、'已达标'>",
      "strengths": ["<该科目优势1>", "<该科目优势2>"],
      "weaknesses": ["<该科目弱点1>", "<该科目弱点2>"],
      "recommendations": ["<具体建议1>", "<具体建议2>", "<具体建议3>"],
      "estimatedTimeToImprove": "<预计提升所需时间>"
    }
  ],
  "schoolAssessments": [
    {
      "schoolName": "<学校名称>",
      "admissionProbability": <0-100的整数，录取概率>,
      "requirements": ["<该校录取要求1>", "<该校录取要求2>"],
      "gaps": ["<与该校要求的差距1>", "<差距2>"],
      "recommendations": ["<针对该校的建议1>", "<建议2>"]
    }
  ],
  "studyPlan": {
    "weeklySchedule": ["<周一至周五安排>", "<周末安排>"],
    "monthlyGoals": ["<第1个月目标>", "<第2个月目标>", "<第3个月目标>"],
    "resources": ["<推荐资源1>", "<推荐资源2>", "<推荐资源3>"]
  },
  "additionalAdvice": ["<额外建议1>", "<额外建议2>", "<额外建议3>", "<额外建议4>"]
}

注意事项：
1. 所有分析必须基于香港DSE考试的真实情况和标准
2. 对目标学校的评估要考虑该校的实际录取标准和竞争程度
3. 建议要具体、可操作，针对${gradeName}（${studentInfo.age}岁）学生的实际情况
4. 评分要客观，不要过于乐观或悲观
5. 只返回JSON，不要有任何其他文字
6. **再次强调：禁止在任何地方说"年级信息未明确"，学生就读${gradeName}，${studentInfo.age}岁**`
}

/**
 * 调用DeepSeek API进行分析
 */
export const analyzeWithDeepSeek = async (studentInfo: StudentInfo): Promise<AnalysisResult> => {
  // 检查API密钥
  if (!DEEPSEEK_CONFIG.apiKey) {
    console.warn('⚠️ DeepSeek API密钥未配置，使用模拟数据')
    return generateMockResult(studentInfo)
  }

  try {
    const prompt = buildAnalysisPrompt(studentInfo)

    const response = await fetch(DEEPSEEK_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: `你是一位专业的香港DSE教育顾问，擅长分析学生情况并提供升学建议。

重要规则：
1. 用户提供的学生信息（年级、年龄等）都是完整的，绝对不要说"信息未明确"、"信息不完整"、"年级信息未明确"等类似表述
2. 直接使用用户提供的年级和年龄进行分析
3. 只返回JSON格式的分析结果`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: DEEPSEEK_CONFIG.maxTokens,
        temperature: DEEPSEEK_CONFIG.temperature,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('DeepSeek API错误:', errorData)
      throw new ApiError(`DeepSeek API调用失败: ${response.status}`, 500)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new ApiError('DeepSeek API返回数据异常', 500)
    }

    // 解析JSON结果
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new ApiError('无法解析分析结果', 500)
    }

    const result: AnalysisResult = JSON.parse(jsonMatch[0])
    return result
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('DeepSeek API调用错误:', error)
    // 如果API调用失败，返回模拟数据
    return generateMockResult(studentInfo)
  }
}

/**
 * 生成模拟分析结果（用于开发测试或API不可用时）
 */
const generateMockResult = (studentInfo: StudentInfo): AnalysisResult => {
  // 计算基础可行性评分
  let baseScore = 70
  
  // 根据年级调整
  if (studentInfo.grade === 'form6') baseScore -= 10
  if (studentInfo.grade === 'form4') baseScore += 5

  // 生成科目分析
  const subjectAnalyses: SubjectAnalysis[] = studentInfo.subjects.map((s) => {
    const subjectName = SUBJECT_NAME_MAP[s.subject] || s.subject
    const current = parseInt(s.currentScore) || 3
    const target = parseInt(s.targetScore) || 5
    const diff = target - current

    let gap = '已达标'
    if (diff > 0) gap = `差${diff}级`
    if (diff < 0) gap = '超出目标'

    return {
      subject: subjectName,
      currentLevel: s.currentScore,
      targetLevel: s.targetScore,
      gap,
      strengths: ['有一定基础', '学习态度积极'],
      weaknesses: diff > 0 ? ['需要提升', '部分知识点需巩固'] : ['保持现有水平'],
      recommendations: [
        '每天复习30分钟',
        '完成每周练习题',
        '定期进行模拟测试',
      ],
      estimatedTimeToImprove: diff > 1 ? '3-4个月' : diff > 0 ? '1-2个月' : '保持即可',
    }
  })

  // 生成学校评估
  const schoolAssessments: SchoolAssessment[] = studentInfo.targetSchools.map((school, index) => ({
    schoolName: school,
    admissionProbability: Math.max(40, baseScore - index * 10),
    requirements: ['优异的DSE成绩', '良好的品行记录', '面试表现优秀'],
    gaps: ['部分科目成绩需提升', '需准备面试'],
    recommendations: ['重点提升薄弱科目', '准备自我介绍', '了解学校文化'],
  }))

  return {
    overallAssessment: {
      feasibilityScore: baseScore,
      summary: `该学生目前就读${GRADE_NAME_MAP[studentInfo.grade] || studentInfo.grade}，计划于${studentInfo.enrollmentDate}插班。根据提供的成绩信息，整体学术表现中等偏上。主要优势在于学习态度积极，部分科目表现良好。建议重点加强薄弱科目的学习，合理规划复习时间，为目标学校的录取做好充分准备。`,
      keyStrengths: [
        '学习态度积极',
        '部分科目基础扎实',
        '有明确的目标规划',
      ],
      keyWeaknesses: [
        '部分科目需要提升',
        '时间管理能力待加强',
        '需要更多实战练习',
      ],
    },
    subjectAnalyses,
    schoolAssessments,
    studyPlan: {
      weeklySchedule: [
        '周一至周五：每天2小时自习，重点复习薄弱科目',
        '周六上午：数学/理科难题训练',
        '周六下午：英语写作练习',
        '周日上午：中文作文练习',
        '周日下午：综合复习和错题整理',
      ],
      monthlyGoals: [
        '第1个月：夯实各科基础，完成知识点梳理',
        '第2个月：针对性提升薄弱环节',
        '第3个月：模拟考试训练，查漏补缺',
        '第4个月：冲刺复习，保持状态',
      ],
      resources: [
        'DSE历年真题集',
        '各科知识点总结笔记',
        '在线模拟考试平台',
        '学科专项练习册',
        '名师讲解视频课程',
      ],
    },
    additionalAdvice: [
      '保持规律作息，每天保证7-8小时睡眠',
      '定期与老师沟通学习进度，及时调整策略',
      '适当进行体育锻炼，保持身心健康',
      '制定详细的复习计划表，并严格执行',
      '保持积极心态，相信自己能够达成目标',
    ],
  }
}

