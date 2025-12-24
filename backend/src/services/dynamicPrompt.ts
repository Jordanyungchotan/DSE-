/**
 * DSE智能刷题系统 - 动态提示词系统
 * 
 * 功能：
 * 1. 参数化提示词模板
 * 2. 场景随机化和数字组合变化
 * 3. 多样性指令生成
 * 4. 防重复提示词
 */

import { getKnowledgeGraph } from './knowledgeGraph'

// ===== 类型定义 =====

export interface PromptConfig {
  subject: string
  grade: string
  difficulty: string
  topic?: string
  questionType?: string
  count: number
  creativity?: number        // 创意程度 0-3
  avoidPatterns?: string[]   // 避免的模式
  recentQuestions?: string[] // 最近的题目（用于避免重复）
  userWeakAreas?: string[]   // 用户薄弱点
}

export interface GeneratedPrompt {
  systemPrompt: string
  userPrompt: string
  metadata: {
    scenarioType: string
    numberRange: string
    diversityLevel: string
    antiRepeatInstructions: string[]
  }
}

// ===== 场景库 =====

const SCENARIOS: Record<string, string[]> = {
  math: [
    '小明在超市购物',
    '学校举办运动会',
    '工程师设计建筑物',
    '班级组织郊游活动',
    '图书馆整理图书',
    '农场收获庄稼',
    '餐厅准备食材',
    '银行计算利息',
    '物流公司配送包裹',
    '电影院安排座位',
    '体育场设计跑道',
    '公园规划绿化带',
    '工厂生产产品',
    '游乐场设计游戏',
    '医院分配病房',
    '学校分配教室',
    '比赛安排赛程',
    '公司分配奖金',
    '旅行规划路线',
    '装修房屋计算材料'
  ],
  physics: [
    '电梯升降过程',
    '汽车行驶实验',
    '过山车运动分析',
    '跳伞运动研究',
    '发射火箭实验',
    '游泳池水压测量',
    '电路实验室测试',
    '音响系统设计',
    '太阳能板效率',
    '风力发电研究',
    '高铁制动分析',
    '航天器轨道计算',
    '桥梁承重测试',
    '光纤通信实验',
    '家用电器功率测量'
  ],
  chemistry: [
    '实验室制备气体',
    '食品保存方法研究',
    '环境污染物检测',
    '药物合成实验',
    '电池效率测试',
    '塑料降解研究',
    '水质检测实验',
    '金属腐蚀分析',
    '化妆品成分检测',
    '肥料效果比较',
    '染料合成实验',
    '食物营养分析',
    '空气质量监测',
    '废水处理研究',
    '新材料研发'
  ]
}

// 问题结构模板
const QUESTION_STRUCTURES: Record<string, string[]> = {
  calculation: [
    '求{target}的值',
    '计算{target}',
    '找出{target}',
    '{target}是多少？',
    '求出{target}的数值',
    '算出{target}等于多少'
  ],
  proof: [
    '证明{statement}',
    '验证{statement}是否成立',
    '用{method}证明{statement}',
    '说明为什么{statement}'
  ],
  application: [
    '如果{condition}，求{target}',
    '已知{given}，问{question}',
    '在{scenario}中，{question}',
    '{scenario}，{condition}，求{target}'
  ],
  analysis: [
    '分析{phenomenon}的原因',
    '解释{phenomenon}',
    '比较{item1}和{item2}的区别',
    '{phenomenon}有什么影响？'
  ]
}

// 数字生成规则
const NUMBER_RANGES: Record<string, Record<string, { min: number, max: number, step: number }>> = {
  basic: {
    small: { min: 1, max: 20, step: 1 },
    medium: { min: 10, max: 100, step: 5 },
    large: { min: 100, max: 1000, step: 10 }
  },
  standard: {
    small: { min: 1, max: 50, step: 1 },
    medium: { min: 20, max: 500, step: 10 },
    large: { min: 100, max: 5000, step: 50 }
  },
  challenging: {
    small: { min: 1, max: 100, step: 1 },
    medium: { min: 50, max: 1000, step: 25 },
    large: { min: 500, max: 10000, step: 100 }
  },
  exam: {
    small: { min: 1, max: 200, step: 1 },
    medium: { min: 100, max: 2000, step: 50 },
    large: { min: 1000, max: 50000, step: 500 }
  }
}

// ===== 动态提示词生成器 =====

export class DynamicPromptGenerator {
  private knowledgeGraph = getKnowledgeGraph()

  /**
   * 生成完整的动态提示词
   */
  generatePrompt(config: PromptConfig): GeneratedPrompt {
    // 选择场景
    const scenarioType = this.selectScenario(config.subject)
    
    // 选择数字范围
    const numberRange = this.selectNumberRange(config.difficulty)
    
    // 生成多样性指令
    const diversityInstructions = this.generateDiversityInstructions(config)
    
    // 生成防重复指令
    const antiRepeatInstructions = this.generateAntiRepeatInstructions(config)
    
    // 获取知识点推荐
    const recommendedTopics = this.getRecommendedTopics(config)
    
    // 构建系统提示词
    const systemPrompt = this.buildSystemPrompt(config, diversityInstructions)
    
    // 构建用户提示词
    const userPrompt = this.buildUserPrompt(
      config, 
      scenarioType, 
      numberRange, 
      antiRepeatInstructions,
      recommendedTopics
    )

    return {
      systemPrompt,
      userPrompt,
      metadata: {
        scenarioType,
        numberRange,
        diversityLevel: this.getDiversityLevel(config.creativity || 1),
        antiRepeatInstructions
      }
    }
  }

  /**
   * 选择场景
   */
  private selectScenario(subject: string): string {
    const scenarios = SCENARIOS[subject] || SCENARIOS.math
    return scenarios[Math.floor(Math.random() * scenarios.length)]
  }

  /**
   * 选择数字范围描述
   */
  private selectNumberRange(difficulty: string): string {
    const ranges = NUMBER_RANGES[difficulty] || NUMBER_RANGES.standard
    const size = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)]
    const range = ranges[size as keyof typeof ranges]
    return `${range.min}-${range.max}`
  }

  /**
   * 生成多样性指令
   */
  private generateDiversityInstructions(config: PromptConfig): string[] {
    const instructions: string[] = []
    const creativity = config.creativity || 1

    // 基础多样性
    instructions.push('确保每道题目的情境和背景都不同')
    instructions.push('使用不同的数字组合，避免使用常见的"整数"如10、100、1000')
    
    if (creativity >= 1) {
      instructions.push('尝试使用现实生活中的新颖场景')
      instructions.push('问题的表述方式要多样化')
    }
    
    if (creativity >= 2) {
      instructions.push('融入跨学科元素（如结合经济、科技、环保等话题）')
      instructions.push('设计非常规的解题路径')
    }
    
    if (creativity >= 3) {
      instructions.push('创造独特的题目结构和呈现方式')
      instructions.push('引入前沿科技或社会热点话题')
      instructions.push('设计开放性或多解法的题目')
    }

    return instructions
  }

  /**
   * 生成防重复指令
   */
  private generateAntiRepeatInstructions(config: PromptConfig): string[] {
    const instructions: string[] = [
      '不要使用以下常见的数字组合：12和18、24和36、45和60',
      '避免使用过于简单的场景如"小明买苹果"、"学校有学生"',
      '每道题的结构和问法要有明显差异'
    ]

    // 如果有最近的题目，添加特定的避免指令
    if (config.recentQuestions && config.recentQuestions.length > 0) {
      instructions.push(`请避免生成与以下题目相似的内容：\n${config.recentQuestions.slice(0, 3).join('\n')}`)
    }

    // 如果有要避免的模式
    if (config.avoidPatterns && config.avoidPatterns.length > 0) {
      instructions.push(`避免使用以下模式：${config.avoidPatterns.join('、')}`)
    }

    return instructions
  }

  /**
   * 获取推荐知识点
   */
  private getRecommendedTopics(config: PromptConfig): string[] {
    if (config.topic) {
      // 如果指定了主题，获取相关主题
      return [config.topic, ...this.knowledgeGraph.recommendTopics(
        config.subject,
        config.userWeakAreas,
        [],
        2
      )]
    }

    // 否则推荐主题
    return this.knowledgeGraph.recommendTopics(
      config.subject,
      config.userWeakAreas,
      [],
      3
    )
  }

  /**
   * 获取多样性级别描述
   */
  private getDiversityLevel(creativity: number): string {
    const levels = ['标准', '中等创意', '高创意', '极高创意']
    return levels[Math.min(creativity, 3)]
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(config: PromptConfig, diversityInstructions: string[]): string {
    const subjectName = this.getSubjectName(config.subject)
    const gradeName = this.getGradeName(config.grade)
    const difficultyName = this.getDifficultyName(config.difficulty)

    return `你是一位经验丰富的香港DSE ${subjectName}科教育专家和题目设计师。

【你的专业背景】
- 拥有超过10年的DSE考试辅导经验
- 精通DSE ${subjectName}科的课程大纲和考试要求
- 了解${gradeName}学生的认知水平和常见错误

【题目设计原则】
1. 严格遵循DSE考试的题型和难度标准
2. 确保题目表述清晰、无歧义
3. 答案必须准确无误
4. 解释要详细且有教育价值

【多样性要求】
${diversityInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

【难度标准：${difficultyName}】
- 基础题：考查基本概念和简单应用，约70-80%的学生能正确解答
- 标准题：需要运用多个概念，约50-60%的学生能正确解答
- 挑战题：涉及复杂推理或多步骤，约30-40%的学生能正确解答
- 考试题：模拟真实DSE难度，涵盖各难度层次

【输出格式要求】
你必须严格按照JSON格式输出，不要添加任何其他内容。`
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(
    config: PromptConfig,
    scenario: string,
    numberRange: string,
    antiRepeatInstructions: string[],
    recommendedTopics: string[]
  ): string {
    const subjectName = this.getSubjectName(config.subject)
    const gradeName = this.getGradeName(config.grade)
    const difficultyName = this.getDifficultyName(config.difficulty)

    // 随机选择问题结构
    const questionStructures = this.selectQuestionStructures(config.questionType || 'mixed', config.count)

    // 生成随机数字建议
    const numberSuggestions = this.generateNumberSuggestions(config.difficulty, config.count)

    return `请为${gradeName}学生生成${config.count}道${difficultyName}${subjectName}题目。

【知识点范围】
主要知识点：${recommendedTopics.join('、')}

【场景建议】
参考场景（请根据此场景创意发挥，不要照搬）："${scenario}"

【数字范围建议】
请在${numberRange}范围内选择数字，建议使用：${numberSuggestions.join('、')}

【问题结构参考】
${questionStructures.map((s, i) => `题目${i + 1}：${s}`).join('\n')}

【防重复要求】
${antiRepeatInstructions.map(inst => `⚠️ ${inst}`).join('\n')}

【特别强调】
1. 每道题必须有独特的情境背景
2. 避免使用千篇一律的问法
3. 数字要经过精心设计，确保计算结果合理
4. 答案必须准确可验证

请生成${config.count}道题目，每道题目包含以下字段：
\`\`\`json
{
  "questions": [
    {
      "id": "唯一ID",
      "question": "题目内容",
      "questionType": "${config.questionType || 'calculation'}",
      "options": ["选项A", "选项B", "选项C", "选项D"],  // 仅选择题需要
      "correctAnswer": "正确答案",
      "explanation": "详细解释",
      "difficulty": "${config.difficulty}",
      "topicTags": ["知识点1", "知识点2"],
      "hints": ["提示1", "提示2"]
    }
  ]
}
\`\`\``
  }

  /**
   * 选择问题结构
   */
  private selectQuestionStructures(questionType: string, count: number): string[] {
    const structures: string[] = []
    const types = questionType === 'mixed' 
      ? Object.keys(QUESTION_STRUCTURES)
      : [questionType]

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length]
      const typeStructures = QUESTION_STRUCTURES[type] || QUESTION_STRUCTURES.calculation
      const structure = typeStructures[Math.floor(Math.random() * typeStructures.length)]
      structures.push(`[${type}] ${structure}`)
    }

    return structures
  }

  /**
   * 生成数字建议
   */
  private generateNumberSuggestions(difficulty: string, count: number): string[] {
    const suggestions: string[] = []
    const ranges = NUMBER_RANGES[difficulty] || NUMBER_RANGES.standard

    for (let i = 0; i < Math.min(count, 5); i++) {
      const sizeKeys = Object.keys(ranges) as Array<keyof typeof ranges>
      const size = sizeKeys[i % sizeKeys.length]
      const range = ranges[size]
      
      // 生成不那么"整"的数字
      const baseNumber = range.min + Math.floor(Math.random() * (range.max - range.min) / range.step) * range.step
      const offset = Math.floor(Math.random() * 5) - 2
      const number = Math.max(range.min, baseNumber + offset)
      
      suggestions.push(number.toString())
    }

    return suggestions
  }

  /**
   * 获取科目名称
   */
  private getSubjectName(subject: string): string {
    const names: Record<string, string> = {
      math: '数学',
      physics: '物理',
      chemistry: '化学',
      biology: '生物',
      chinese: '中文',
      english: '英文',
      economics: '经济',
      geography: '地理',
      history: '历史'
    }
    return names[subject] || subject
  }

  /**
   * 获取年级名称
   */
  private getGradeName(grade: string): string {
    const names: Record<string, string> = {
      f4: '中四',
      f5: '中五',
      f6: '中六'
    }
    return names[grade] || grade
  }

  /**
   * 获取难度名称
   */
  private getDifficultyName(difficulty: string): string {
    const names: Record<string, string> = {
      basic: '基础',
      standard: '标准',
      challenging: '挑战',
      exam: 'DSE考试模拟'
    }
    return names[difficulty] || difficulty
  }
}

// ===== 高级提示词策略 =====

export class AdvancedPromptStrategy {
  private baseGenerator = new DynamicPromptGenerator()

  /**
   * 基于用户表现生成自适应提示词
   */
  generateAdaptivePrompt(
    config: PromptConfig,
    userPerformance: {
      recentAccuracy: number
      strongTopics: string[]
      weakTopics: string[]
      preferredQuestionTypes: string[]
    }
  ): GeneratedPrompt {
    // 根据正确率调整难度
    let adjustedDifficulty = config.difficulty
    if (userPerformance.recentAccuracy > 0.85) {
      // 正确率很高，增加难度
      adjustedDifficulty = this.increaseDifficulty(config.difficulty)
    } else if (userPerformance.recentAccuracy < 0.5) {
      // 正确率较低，降低难度
      adjustedDifficulty = this.decreaseDifficulty(config.difficulty)
    }

    // 优先覆盖薄弱知识点
    const adjustedConfig: PromptConfig = {
      ...config,
      difficulty: adjustedDifficulty,
      userWeakAreas: userPerformance.weakTopics,
      avoidPatterns: userPerformance.strongTopics.slice(0, 2), // 少出强项题目
      creativity: Math.min((config.creativity || 1) + 1, 3) // 增加创意
    }

    return this.baseGenerator.generatePrompt(adjustedConfig)
  }

  /**
   * 生成变体题目提示词
   */
  generateVariationPrompt(
    baseQuestion: string,
    variationType: 'numeric' | 'contextual' | 'structural',
    config: PromptConfig
  ): GeneratedPrompt {
    const basePrompt = this.baseGenerator.generatePrompt(config)

    // 添加变体生成指令
    const variationInstruction = this.getVariationInstruction(variationType)

    basePrompt.userPrompt = `【变体生成任务】
请基于以下原题，生成${config.count}道变体题目：

【原题】
${baseQuestion}

【变体类型：${variationType}】
${variationInstruction}

【要求】
1. 保持核心知识点不变
2. 确保变体题目难度相近
3. 变体之间也要有明显差异
4. 答案必须重新计算

${basePrompt.userPrompt}`

    return basePrompt
  }

  /**
   * 获取变体指令
   */
  private getVariationInstruction(type: string): string {
    const instructions: Record<string, string> = {
      numeric: '更改题目中的数字，保持相同的解题方法，但确保新数字导致不同的计算结果',
      contextual: '更换题目的情境背景（如从购物场景改为旅行场景），但保持数学结构不变',
      structural: '改变题目的问法或结构（如从求和改为求差），但保持涉及的知识点相同'
    }
    return instructions[type] || instructions.numeric
  }

  /**
   * 增加难度
   */
  private increaseDifficulty(current: string): string {
    const levels = ['basic', 'standard', 'challenging', 'exam']
    const currentIndex = levels.indexOf(current)
    return levels[Math.min(currentIndex + 1, levels.length - 1)]
  }

  /**
   * 降低难度
   */
  private decreaseDifficulty(current: string): string {
    const levels = ['basic', 'standard', 'challenging', 'exam']
    const currentIndex = levels.indexOf(current)
    return levels[Math.max(currentIndex - 1, 0)]
  }
}

export default {
  DynamicPromptGenerator,
  AdvancedPromptStrategy,
  SCENARIOS,
  QUESTION_STRUCTURES,
  NUMBER_RANGES
}

