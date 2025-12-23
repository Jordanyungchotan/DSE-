/**
 * DSE智能刷题 - AI题目生成服务
 * 使用DeepSeek AI动态生成符合DSE考试标准的题目
 */

import { ApiError } from '../middleware/errorHandler.js'

/**
 * 题目类型
 */
export type QuestionType = 'multiple_choice' | 'short_answer' | 'calculation' | 'explanation'

/**
 * 生成的题目接口
 */
export interface GeneratedQuestion {
  id: string
  question: string
  questionType: QuestionType
  options?: string[]
  correctAnswer: string | number
  explanation: string
  topicTags: string[]
  estimatedTime: number
  difficultyScore: number
}

/**
 * 刷题配置接口
 */
export interface QuizConfig {
  grade: string
  subject: string
  difficulty: string
  questionCount: number
}

/**
 * DeepSeek API配置
 */
const DEEPSEEK_CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  endpoint: process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  maxTokens: 8000,
  temperature: 0.8,
}

/**
 * 科目名称映射
 */
const SUBJECT_NAME_MAP: Record<string, string> = {
  chinese: '中国语文',
  english: '英国语文',
  math: '数学',
  ls: '公民与社会发展科',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  combined_science: '组合科学',
  economics: '经济',
  geography: '地理',
  history: '历史',
  chinese_history: '中国历史',
}

/**
 * 年级名称映射
 */
const GRADE_NAME_MAP: Record<string, string> = {
  f4: '中四',
  f5: '中五',
  f6: '中六',
}

/**
 * 难度名称映射
 */
const DIFFICULTY_NAME_MAP: Record<string, string> = {
  basic: '基础',
  standard: '标准',
  challenging: '挑战',
  exam: '考试难度',
}

/**
 * 各科目知识点
 */
const SUBJECT_TOPICS: Record<string, Record<string, string[]>> = {
  math: {
    f4: ['二次函数', '指数与对数', '多项式', '坐标几何入门', '三角比'],
    f5: ['圆的方程', '直线方程', '排列组合', '概率论', '微分入门'],
    f6: ['积分', '向量', '复数', '数列与级数', '统计推断'],
  },
  physics: {
    f4: ['力学基础', '运动学', '牛顿定律', '能量守恒', '动量'],
    f5: ['波动', '光学', '电磁学入门', '电路', '热力学'],
    f6: ['电磁感应', '原子物理', '核物理', '相对论入门', '量子力学入门'],
  },
  chemistry: {
    f4: ['原子结构', '化学键', '元素周期表', '化学方程式', '氧化还原'],
    f5: ['酸碱盐', '电化学', '有机化学入门', '反应速率', '化学平衡'],
    f6: ['有机合成', '化学分析', '工业化学', '环境化学', '生物化学'],
  },
  biology: {
    f4: ['细胞结构', '生命特征', '营养与消化', '呼吸作用', '光合作用'],
    f5: ['遗传学', 'DNA与RNA', '生物进化', '生态系统', '人体系统'],
    f6: ['分子生物学', '生物技术', '免疫系统', '神经系统', '激素调节'],
  },
  economics: {
    f4: ['需求与供应', '市场均衡', '弹性', '生产与成本', '市场结构'],
    f5: ['国民收入', 'GDP', '通货膨胀', '失业', '货币政策'],
    f6: ['国际贸易', '汇率', '经济增长', '政府财政政策', '香港经济'],
  },
  chinese: {
    f4: ['阅读理解', '文言文基础', '写作技巧', '修辞手法', '语法'],
    f5: ['古诗词鉴赏', '文言文进阶', '议论文写作', '说明文', '记叙文'],
    f6: ['综合阅读', '批判性写作', '文学分析', '语言运用', '应试技巧'],
  },
  english: {
    f4: ['Grammar Basics', 'Reading Comprehension', 'Vocabulary', 'Writing Basics', 'Listening'],
    f5: ['Advanced Grammar', 'Essay Writing', 'Reading Strategies', 'Speaking Skills', 'Tenses'],
    f6: ['Critical Reading', 'Academic Writing', 'Exam Techniques', 'Integrated Skills', 'Error Analysis'],
  },
  ls: {
    f4: ['个人成长与人际关系', '香港社会', '法治与社会', '基本法与公民责任', '能源与环境'],
    f5: ['公共卫生', '科技与社会', '全球化', '中国发展', '国际关系'],
    f6: ['综合议题分析', '批判性思维', '时事评论', '专题研究', '考试技巧'],
  },
  geography: {
    f4: ['地图阅读', '气候', '河流', '海岸', '人口'],
    f5: ['城市地理', '农业', '工业', '旅游业', '交通运输'],
    f6: ['自然灾害', '资源管理', '可持续发展', '地理信息系统', '野外考察'],
  },
  history: {
    f4: ['香港开埠', '殖民时期', '抗日战争', '战后发展', '回归祖国'],
    f5: ['中国近代史', '冷战', '二战', '民族主义', '帝国主义'],
    f6: ['全球化历史', '现代国际关系', '史料分析', '历史写作', '专题研究'],
  },
  chinese_history: {
    f4: ['秦汉时期', '三国两晋南北朝', '隋唐时期', '宋元时期', '明清时期'],
    f5: ['鸦片战争', '太平天国', '洋务运动', '戊戌变法', '辛亥革命'],
    f6: ['民国时期', '抗日战争', '国共内战', '新中国成立', '改革开放'],
  },
  combined_science: {
    f4: ['物理基础', '化学基础', '生物基础', '科学探究', '实验技能'],
    f5: ['综合物理', '综合化学', '综合生物', '科学与社会', '环境科学'],
    f6: ['跨学科议题', '科学写作', '实验设计', '数据分析', '考试技巧'],
  },
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 构建题目生成提示词
 */
const buildQuestionPrompt = (config: QuizConfig): string => {
  const subjectName = SUBJECT_NAME_MAP[config.subject] || config.subject
  const gradeName = GRADE_NAME_MAP[config.grade] || config.grade
  const difficultyName = DIFFICULTY_NAME_MAP[config.difficulty] || config.difficulty
  
  // 获取知识点
  const topics = SUBJECT_TOPICS[config.subject]?.[config.grade] || ['综合知识点']
  const topicsList = topics.join('、')

  // 根据科目决定题目类型分布
  let questionTypeInstructions = ''
  if (config.subject === 'math' || config.subject === 'physics' || config.subject === 'chemistry') {
    questionTypeInstructions = `
题目类型分布建议：
- 选择题（multiple_choice）: 约50%
- 计算题（calculation）: 约30%
- 简答题（short_answer）: 约20%`
  } else if (config.subject === 'english') {
    questionTypeInstructions = `
题目类型分布建议：
- 选择题（multiple_choice）: 约60%
- 简答题（short_answer）: 约30%
- 解释题（explanation）: 约10%`
  } else {
    questionTypeInstructions = `
题目类型分布建议：
- 选择题（multiple_choice）: 约50%
- 简答题（short_answer）: 约30%
- 解释题（explanation）: 约20%`
  }

  return `你是一位资深的香港DSE考试命题专家，拥有超过15年的DSE教学和命题经验。请根据以下要求生成DSE考试题目。

【生成要求】
1. 科目：${subjectName}
2. 年级：${gradeName}（${config.grade}）
3. 难度：${difficultyName}
4. 题目数量：${config.questionCount}题
5. 考察知识点范围：${topicsList}

${questionTypeInstructions}

【题目质量标准】
- 严格符合香港DSE考试局最新课程标准（2024年版）
- 参考近五年DSE真题的题型和难度分布
- 语言表达准确清晰，无歧义
- 选择题的干扰项要有迷惑性，避免明显错误
- 计算题需确保数字合理、计算过程可行
- 每道题必须有详细的解析，解析要包含解题思路和关键知识点
- 题目之间不能重复或过于相似

【难度说明】
- 基础：考查基本概念理解，计算简单，大多数学生应能正确回答
- 标准：需要一定的分析和推理能力，模拟日常考试难度
- 挑战：需要综合运用多个知识点，考查深层理解
- 考试难度：完全模拟DSE真题难度，包含高分题型

【输出格式要求】
请严格按照以下JSON格式输出，生成一个包含${config.questionCount}道题目的数组：

[
  {
    "question": "题目正文（如需要可使用Markdown格式，数学公式请用简单文字描述）",
    "questionType": "multiple_choice 或 short_answer 或 calculation 或 explanation",
    "options": ["选项A", "选项B", "选项C", "选项D"],  // 仅选择题需要，非选择题不要包含此字段
    "correctAnswer": "正确答案（选择题为0-3的索引数字，其他题型为文字答案）",
    "explanation": "详细解析，包含：1.解题思路 2.关键知识点 3.常见错误提醒",
    "topicTags": ["知识点标签1", "知识点标签2"],
    "estimatedTime": 60,  // 建议答题时间（秒）
    "difficultyScore": 5  // 难度评分1-10，1最简单
  }
]

【重要提醒】
1. 只返回JSON数组，不要有任何其他文字说明
2. 确保JSON格式正确，可以被程序解析
3. 选择题必须有4个选项
4. correctAnswer对于选择题必须是0-3的数字索引
5. 每道题的知识点标签至少要有1个
6. 难度评分要与设定的难度级别相符：基础(1-3)、标准(4-6)、挑战(7-8)、考试难度(8-10)

请开始生成${config.questionCount}道高质量的${subjectName}DSE题目。`
}

/**
 * 调用DeepSeek API生成题目
 */
export const generateQuestions = async (config: QuizConfig): Promise<GeneratedQuestion[]> => {
  // 检查API密钥
  if (!DEEPSEEK_CONFIG.apiKey) {
    console.warn('⚠️ DeepSeek API密钥未配置，使用模拟数据')
    return generateMockQuestions(config)
  }

  try {
    const prompt = buildQuestionPrompt(config)

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
            content: `你是一位专业的香港DSE考试命题专家。你的任务是生成高质量、符合考试标准的题目。
            
重要规则：
1. 只返回JSON格式的题目数组，不要有任何额外文字
2. 确保每道题目都有完整的解析
3. 选择题的正确答案必须是0-3的数字索引
4. 题目内容要准确、无歧义`,
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
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('无法解析AI返回内容:', content)
      throw new ApiError('无法解析题目生成结果', 500)
    }

    const questions = JSON.parse(jsonMatch[0])
    
    // 为每道题目添加唯一ID
    const questionsWithIds: GeneratedQuestion[] = questions.map((q: Omit<GeneratedQuestion, 'id'>) => ({
      ...q,
      id: generateId(),
      // 确保必要字段存在
      topicTags: q.topicTags || [],
      estimatedTime: q.estimatedTime || 60,
      difficultyScore: q.difficultyScore || 5,
    }))

    return questionsWithIds
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    console.error('DeepSeek API调用错误:', error)
    // 如果API调用失败，返回模拟数据
    return generateMockQuestions(config)
  }
}

/**
 * 生成模拟题目（用于开发测试或API不可用时）
 */
const generateMockQuestions = (config: QuizConfig): GeneratedQuestion[] => {
  const subjectName = SUBJECT_NAME_MAP[config.subject] || config.subject
  const topics = SUBJECT_TOPICS[config.subject]?.[config.grade] || ['综合知识点']
  const questions: GeneratedQuestion[] = []

  for (let i = 0; i < config.questionCount; i++) {
    const isMultipleChoice = i % 3 !== 2 // 约2/3是选择题
    const topic = topics[i % topics.length]
    
    if (isMultipleChoice) {
      questions.push({
        id: generateId(),
        question: `【${subjectName} - ${topic}】这是第${i + 1}道模拟选择题。请选择正确答案：

根据${topic}的相关知识，以下哪个选项是正确的？`,
        questionType: 'multiple_choice',
        options: [
          `选项A：这是关于${topic}的第一个选项`,
          `选项B：这是关于${topic}的第二个选项`,
          `选项C：这是关于${topic}的第三个选项（正确答案）`,
          `选项D：这是关于${topic}的第四个选项`,
        ],
        correctAnswer: 2, // C选项
        explanation: `【解题思路】
这道题考查的是${topic}的基本概念。

【关键知识点】
${topic}是${subjectName}的重要内容，需要理解其核心概念和应用。

【答案解析】
选项C是正确答案，因为它准确描述了${topic}的特点。其他选项存在以下问题：
- 选项A：表述不够准确
- 选项B：概念混淆
- 选项D：与实际不符

【备考建议】
建议同学们多复习${topic}相关的基础知识，掌握核心概念。`,
        topicTags: [topic, subjectName],
        estimatedTime: 60,
        difficultyScore: config.difficulty === 'basic' ? 3 : config.difficulty === 'standard' ? 5 : config.difficulty === 'challenging' ? 7 : 9,
      })
    } else {
      questions.push({
        id: generateId(),
        question: `【${subjectName} - ${topic}】这是第${i + 1}道模拟简答题。

请简要说明${topic}的主要特点和应用场景。`,
        questionType: 'short_answer',
        correctAnswer: `${topic}的主要特点包括：1. 基本概念清晰 2. 应用范围广泛 3. 与其他知识点联系紧密。应用场景包括日常生活和考试中的相关问题。`,
        explanation: `【解题思路】
回答这类简答题需要从以下几个方面入手：
1. 先明确${topic}的定义
2. 分析其主要特点
3. 结合实际说明应用场景

【评分标准】
- 完整回答主要特点（3分）
- 说明应用场景（2分）
- 语言表达清晰（1分）

【参考答案要点】
需要包含${topic}的核心概念、主要特征和实际应用。`,
        topicTags: [topic, subjectName],
        estimatedTime: 120,
        difficultyScore: config.difficulty === 'basic' ? 3 : config.difficulty === 'standard' ? 5 : config.difficulty === 'challenging' ? 7 : 9,
      })
    }
  }

  return questions
}

/**
 * 批改答案
 */
export const gradeAnswer = async (
  question: GeneratedQuestion,
  userAnswer: string | number
): Promise<{
  isCorrect: boolean
  score: number
  feedback: string
}> => {
  // 选择题直接比较
  if (question.questionType === 'multiple_choice') {
    const isCorrect = Number(userAnswer) === Number(question.correctAnswer)
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? '回答正确！' : `正确答案是选项${String.fromCharCode(65 + Number(question.correctAnswer))}`,
    }
  }

  // 其他题型使用AI批改（如果API可用）
  if (DEEPSEEK_CONFIG.apiKey) {
    try {
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
              content: '你是一位DSE阅卷老师，请批改学生答案并给出分数和反馈。',
            },
            {
              role: 'user',
              content: `题目：${question.question}
参考答案：${question.correctAnswer}
学生答案：${userAnswer}

请判断学生答案是否正确或部分正确，给出0-1分的分数和简短反馈。
以JSON格式返回：{"isCorrect": true/false, "score": 0-1, "feedback": "反馈内容"}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
        return {
          isCorrect: result.isCorrect ?? false,
          score: result.score ?? 0,
          feedback: result.feedback ?? '无法解析批改结果',
        }
      }
    } catch (error) {
      console.error('AI批改失败:', error)
    }
  }

  // 简单字符串匹配作为备选
  const normalizedUserAnswer = String(userAnswer).toLowerCase().trim()
  const normalizedCorrectAnswer = String(question.correctAnswer).toLowerCase().trim()
  const isCorrect = normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
                   normalizedCorrectAnswer.includes(normalizedUserAnswer)

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    feedback: isCorrect ? '回答基本正确！' : '答案不够完整或准确，请参考解析。',
  }
}

