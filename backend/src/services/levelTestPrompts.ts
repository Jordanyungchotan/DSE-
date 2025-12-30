/**
 * DSE水平测试 - DeepSeek API 提示词模板
 * 
 * 用于生成符合香港DSE标准的测试题目
 */

import { SUBJECT_TOPICS } from './levelTestService'

// ===== 基础提示词模板 =====

export const SYSTEM_PROMPT = `你是一位资深的香港DSE考试出题专家，拥有超过15年的DSE命题经验。你熟悉香港考评局的课程纲要和评分标准。

你的任务是生成高质量的DSE水平测试题目，用于准确评估学生的实际学业水平。

生成题目时必须遵守以下原则：
1. 严格遵守香港考评局课程纲要
2. 题目难度必须符合指定年级水平
3. 题目必须有明确的评分标准
4. 避免有歧义或不公平的题目
5. 确保题目具有区分度，能区分不同水平的学生

请使用简体中文回答（除非是英文科目）。`

// ===== 生成选择题的提示词 =====

export function getChoiceQuestionPrompt(
  subject: string,
  grade: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  topics?: string[]
): string {
  const topicList = topics || SUBJECT_TOPICS[subject]?.[grade] || []
  const topicStr = topicList.length > 0 ? topicList.join('、') : '本年级所有主题'
  
  const difficultyGuide = {
    easy: '基础概念理解，考查必修知识点的记忆和简单应用',
    medium: '综合应用能力，需要结合多个知识点分析',
    hard: '高阶思维能力，涉及复杂推理、批判性思考或创新应用'
  }
  
  return `请为香港DSE ${subject}科 ${grade}学生生成 ${count} 道${difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '进阶'}难度的选择题。

【知识范围】
${topicStr}

【难度要求】
${difficultyGuide[difficulty]}

【格式要求】
请按以下JSON格式返回：
{
  "questions": [
    {
      "question": "题目内容（清晰、完整）",
      "options": ["A. 选项内容", "B. 选项内容", "C. 选项内容", "D. 选项内容"],
      "correct_answer": "A",
      "explanation": "详细解释为什么这个答案是正确的",
      "knowledge_points": ["知识点1", "知识点2"],
      "difficulty": "${difficulty}",
      "estimated_time": ${difficulty === 'easy' ? 30 : difficulty === 'medium' ? 60 : 90}
    }
  ]
}

【注意事项】
1. 每题必须有且仅有4个选项（A/B/C/D）
2. 干扰项必须具有一定迷惑性，但不能有歧义
3. 正确答案必须唯一且明确
4. 题目应避免使用"以上皆是"或"以上皆非"等选项
5. 选项长度应大致相当

请只返回JSON，不要有其他内容。`
}

// ===== 生成短答题的提示词 =====

export function getShortAnswerPrompt(
  subject: string,
  grade: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  topics?: string[]
): string {
  const topicList = topics || SUBJECT_TOPICS[subject]?.[grade] || []
  const topicStr = topicList.length > 0 ? topicList.join('、') : '本年级所有主题'
  
  const difficultyGuide = {
    easy: '简单计算或概念解释，通常需要1-2个步骤',
    medium: '中等复杂度的应用题，需要综合运用知识',
    hard: '复杂的问题分析，可能涉及多步骤推理或开放性思考'
  }
  
  return `请为香港DSE ${subject}科 ${grade}学生生成 ${count} 道${difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '进阶'}难度的短答题。

【知识范围】
${topicStr}

【难度要求】
${difficultyGuide[difficulty]}

【格式要求】
请按以下JSON格式返回：
{
  "questions": [
    {
      "question": "题目内容（包含所有必要的已知条件和要求）",
      "correct_answer": "标准答案（完整的解答步骤或要点）",
      "scoring_points": ["得分点1（1分）", "得分点2（1分）", "得分点3（1分）"],
      "explanation": "详细的解题过程和解释",
      "knowledge_points": ["知识点1", "知识点2"],
      "difficulty": "${difficulty}",
      "estimated_time": ${difficulty === 'easy' ? 120 : difficulty === 'medium' ? 180 : 240}
    }
  ]
}

【注意事项】
1. 题目表述必须清晰，提供所有必要的已知条件
2. 评分点应明确、可操作，便于判分
3. 标准答案应包含完整的解答过程
4. 如涉及计算，需注明单位和精度要求
5. 数学/物理/化学题目需保证数据合理，答案为整数或简单分数

请只返回JSON，不要有其他内容。`
}

// ===== 生成论述题的提示词 =====

export function getLongAnswerPrompt(
  subject: string,
  grade: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  topics?: string[]
): string {
  const topicList = topics || SUBJECT_TOPICS[subject]?.[grade] || []
  const topicStr = topicList.length > 0 ? topicList.join('、') : '本年级所有主题'
  
  const difficultyGuide = {
    easy: '结构化论述，有明确的答题框架',
    medium: '综合性论述，需要多角度分析',
    hard: '开放性论述，需要批判性思维和创新见解'
  }
  
  return `请为香港DSE ${subject}科 ${grade}学生生成 ${count} 道${difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '进阶'}难度的论述题。

【知识范围】
${topicStr}

【难度要求】
${difficultyGuide[difficulty]}

【格式要求】
请按以下JSON格式返回：
{
  "questions": [
    {
      "question": "题目内容（包含背景材料、具体问题和字数/要求说明）",
      "correct_answer": "参考答案（完整的范文或答题要点）",
      "scoring_points": [
        "内容层面：观点明确且有说服力（2分）",
        "分析层面：论证逻辑清晰（2分）",
        "例证层面：使用恰当的例子支持论点（2分）",
        "表达层面：语言准确、流畅（2分）"
      ],
      "explanation": "评分说明和优秀答案的特点",
      "knowledge_points": ["知识点1", "知识点2"],
      "difficulty": "${difficulty}",
      "estimated_time": ${difficulty === 'easy' ? 300 : difficulty === 'medium' ? 420 : 600}
    }
  ]
}

【注意事项】
1. 题目应有实际意义，贴近学生生活或社会现实
2. 评分点应涵盖内容、分析、表达等多个维度
3. 参考答案应具有示范作用，展示优秀答案的特点
4. 如有材料分析题，材料应简洁、相关、权威
5. 明确字数要求或答题篇幅建议

请只返回JSON，不要有其他内容。`
}

// ===== 生成综合测试的完整提示词 =====

export function getFullTestPrompt(
  subject: string,
  grade: string,
  distribution: {
    choice: { easy: number; medium: number; hard: number }
    short: { easy: number; medium: number; hard: number }
    long: { easy: number; medium: number; hard: number }
  }
): string {
  const topicList = SUBJECT_TOPICS[subject]?.[grade] || []
  const topicStr = topicList.length > 0 ? topicList.join('、') : '本年级所有主题'
  
  const totalChoice = distribution.choice.easy + distribution.choice.medium + distribution.choice.hard
  const totalShort = distribution.short.easy + distribution.short.medium + distribution.short.hard
  const totalLong = distribution.long.easy + distribution.long.medium + distribution.long.hard
  
  return `你是一位香港DSE考试出题专家。请为 ${subject}科 ${grade}学生生成一套完整的水平测试试卷。

【试卷结构】
1. 选择题：共${totalChoice}题
   - 基础题${distribution.choice.easy}道（每题1分）
   - 中等题${distribution.choice.medium}道（每题1分）
   - 进阶题${distribution.choice.hard}道（每题2分）

2. 短答题：共${totalShort}题
   - 基础题${distribution.short.easy}道（每题2分）
   - 中等题${distribution.short.medium}道（每题3分）
   - 进阶题${distribution.short.hard}道（每题4分）

3. 论述题：共${totalLong}题
   - 基础题${distribution.long.easy}道（每题4分）
   - 中等题${distribution.long.medium}道（每题6分）
   - 进阶题${distribution.long.hard}道（每题8分）

【知识范围】
${topicStr}

【难度分布说明】
- 基础题（30%）：考查基本概念理解和简单应用
- 中等题（50%）：考查综合应用和分析能力
- 进阶题（20%）：考查高阶思维和创新能力

【格式要求】
请按以下JSON格式返回：
{
  "test_info": {
    "subject": "${subject}",
    "grade": "${grade}",
    "total_questions": ${totalChoice + totalShort + totalLong},
    "total_score": ${
      distribution.choice.easy * 1 + distribution.choice.medium * 1 + distribution.choice.hard * 2 +
      distribution.short.easy * 2 + distribution.short.medium * 3 + distribution.short.hard * 4 +
      distribution.long.easy * 4 + distribution.long.medium * 6 + distribution.long.hard * 8
    }
  },
  "choice_questions": [
    {
      "question": "题目",
      "options": ["A. xxx", "B. xxx", "C. xxx", "D. xxx"],
      "correct_answer": "A",
      "explanation": "解释",
      "knowledge_points": ["知识点"],
      "difficulty": "easy|medium|hard",
      "score": 1
    }
  ],
  "short_questions": [
    {
      "question": "题目",
      "correct_answer": "标准答案",
      "scoring_points": ["得分点1", "得分点2"],
      "explanation": "解释",
      "knowledge_points": ["知识点"],
      "difficulty": "easy|medium|hard",
      "score": 2
    }
  ],
  "long_questions": [
    {
      "question": "题目",
      "correct_answer": "参考答案",
      "scoring_points": ["评分点1", "评分点2", "评分点3"],
      "explanation": "评分说明",
      "knowledge_points": ["知识点"],
      "difficulty": "easy|medium|hard",
      "score": 4
    }
  ]
}

【质量要求】
1. 题目必须符合DSE考试标准
2. 知识点覆盖要全面，避免重复
3. 题目表述清晰无歧义
4. 答案准确，评分点明确
5. 难度梯度合理

请只返回JSON，不要有其他内容。`
}

// ===== AI评分提示词 =====

export function getGradingPrompt(
  question: {
    questionText: string
    questionType: 'choice' | 'short' | 'long'
    correctAnswer: string
    scoringPoints?: string[]
    maxScore: number
  },
  userAnswer: string
): string {
  if (question.questionType === 'choice') {
    // 选择题直接比较
    return ''
  }
  
  const scoringPointsStr = question.scoringPoints?.join('\n- ') || '根据答案完整性和准确性评分'
  
  return `你是一位经验丰富的DSE阅卷老师。请根据评分标准，对学生的答案进行评分。

【题目】
${question.questionText}

【标准答案】
${question.correctAnswer}

【评分要点】
- ${scoringPointsStr}

【满分】
${question.maxScore}分

【学生答案】
${userAnswer}

【评分要求】
1. 按照评分要点逐一检查
2. 给出具体的得分（0到${question.maxScore}分）
3. 提供简要的评分反馈
4. 对于部分正确的答案，按比例给分

请按以下JSON格式返回：
{
  "score": 0,
  "feedback": "评分反馈，指出优点和不足",
  "matched_points": ["匹配的得分点"],
  "missing_points": ["缺失的得分点"]
}

请只返回JSON，不要有其他内容。`
}

// ===== 报告生成提示词 =====

export function getReportPrompt(
  testInfo: {
    subject: string
    grade: string
    score: number
    level: string
    abilityRadar: Record<string, number>
    strengthPoints: string[]
    weaknessPoints: string[]
  }
): string {
  return `作为一位专业的DSE学业顾问，请根据以下测试结果，为学生生成详细的学习建议报告。

【测试信息】
- 科目：${testInfo.subject}
- 年级：${testInfo.grade}
- 得分：${testInfo.score}分
- DSE预测等级：${testInfo.level}

【能力维度分析】
- 知识理解：${testInfo.abilityRadar.knowledge}%
- 应用能力：${testInfo.abilityRadar.application}%
- 分析能力：${testInfo.abilityRadar.analysis}%
- 综合能力：${testInfo.abilityRadar.synthesis}%
- 评价能力：${testInfo.abilityRadar.evaluation}%

【优势知识点】
${testInfo.strengthPoints.join('、') || '暂无突出优势'}

【薄弱知识点】
${testInfo.weaknessPoints.join('、') || '暂无明显薄弱点'}

请生成一份包含以下内容的报告：
1. 总体评价（2-3句话总结学生水平）
2. 详细的学习建议（针对薄弱点）
3. 推荐的学习资源和练习方向
4. 预期进步时间线（如何在3个月内提升一个等级）

请按以下JSON格式返回：
{
  "summary": "总体评价",
  "detailed_analysis": "详细分析（包含各维度说明）",
  "recommendations": [
    {
      "priority": 1,
      "topic": "需要改进的知识点",
      "current_level": "当前水平描述",
      "target_level": "目标水平",
      "action_plan": "具体行动计划",
      "resources": ["推荐资源1", "推荐资源2"],
      "estimated_time": "预计所需时间"
    }
  ],
  "progress_timeline": {
    "month_1": "第一个月目标",
    "month_2": "第二个月目标",
    "month_3": "第三个月目标"
  },
  "encouragement": "鼓励性话语"
}

请只返回JSON，不要有其他内容。`
}

// ===== 英文科目专用提示词 =====

export function getEnglishQuestionPrompt(
  grade: string,
  questionType: 'choice' | 'short' | 'long',
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): string {
  const topics = SUBJECT_TOPICS['英文']?.[grade] || []
  
  const typeGuide = {
    choice: 'multiple choice questions testing grammar, vocabulary, and reading comprehension',
    short: 'short answer questions testing writing skills and language application',
    long: 'essay or extended writing tasks testing integrated language skills'
  }
  
  return `You are a Hong Kong DSE English Language examination expert. Please generate ${count} ${difficulty} ${typeGuide[questionType]} for Form ${grade === '中四' ? '4' : grade === '中五' ? '5' : '6'} students.

【Topics to Cover】
${topics.join(', ')}

【Difficulty Level】
${difficulty === 'easy' ? 'Basic - testing fundamental language skills' : 
  difficulty === 'medium' ? 'Intermediate - requiring application of multiple skills' : 
  'Advanced - testing higher-order thinking and sophisticated language use'}

【Format】
Return in the following JSON format:
{
  "questions": [
    {
      "question": "Question text (in English)",
      ${questionType === 'choice' ? '"options": ["A. option", "B. option", "C. option", "D. option"],' : ''}
      "correct_answer": "Model answer",
      ${questionType !== 'choice' ? '"scoring_points": ["Point 1", "Point 2"],' : ''}
      "explanation": "Detailed explanation",
      "knowledge_points": ["Grammar point", "Skill tested"],
      "difficulty": "${difficulty}",
      "estimated_time": ${questionType === 'choice' ? (difficulty === 'easy' ? 30 : difficulty === 'medium' ? 60 : 90) : 
        questionType === 'short' ? (difficulty === 'easy' ? 120 : difficulty === 'medium' ? 180 : 240) :
        (difficulty === 'easy' ? 300 : difficulty === 'medium' ? 420 : 600)}
    }
  ]
}

【Requirements】
1. All questions must be in English
2. Questions should align with HKDSE English curriculum
3. Vocabulary and structures must be appropriate for the grade level
4. Provide clear, accurate model answers

Return only JSON, no other content.`
}

