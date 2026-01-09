/**
 * DSE智能刷题系统 - 动态提示词系统
 *
 * 功能：
 * 1. 参数化提示词模板
 * 2. 场景随机化和数字组合变化
 * 3. 多样性指令生成
 * 4. 防重复提示词
 */
export interface PromptConfig {
    subject: string;
    grade: string;
    difficulty: string;
    topic?: string;
    questionType?: string;
    count: number;
    creativity?: number;
    avoidPatterns?: string[];
    recentQuestions?: string[];
    userWeakAreas?: string[];
}
export interface GeneratedPrompt {
    systemPrompt: string;
    userPrompt: string;
    metadata: {
        scenarioType: string;
        numberRange: string;
        diversityLevel: string;
        antiRepeatInstructions: string[];
    };
}
export declare class DynamicPromptGenerator {
    private knowledgeGraph;
    /**
     * 生成完整的动态提示词
     */
    generatePrompt(config: PromptConfig): GeneratedPrompt;
    /**
     * 选择场景
     */
    private selectScenario;
    /**
     * 选择数字范围描述
     */
    private selectNumberRange;
    /**
     * 生成多样性指令
     */
    private generateDiversityInstructions;
    /**
     * 生成防重复指令
     */
    private generateAntiRepeatInstructions;
    /**
     * 获取推荐知识点
     */
    private getRecommendedTopics;
    /**
     * 获取多样性级别描述
     */
    private getDiversityLevel;
    /**
     * 构建系统提示词
     */
    private buildSystemPrompt;
    /**
     * 构建用户提示词
     */
    private buildUserPrompt;
    /**
     * 选择问题结构
     */
    private selectQuestionStructures;
    /**
     * 生成数字建议
     */
    private generateNumberSuggestions;
    /**
     * 获取科目名称
     */
    private getSubjectName;
    /**
     * 获取年级名称
     */
    private getGradeName;
    /**
     * 获取难度名称
     */
    private getDifficultyName;
}
export declare class AdvancedPromptStrategy {
    private baseGenerator;
    /**
     * 基于用户表现生成自适应提示词
     */
    generateAdaptivePrompt(config: PromptConfig, userPerformance: {
        recentAccuracy: number;
        strongTopics: string[];
        weakTopics: string[];
        preferredQuestionTypes: string[];
    }): GeneratedPrompt;
    /**
     * 生成变体题目提示词
     */
    generateVariationPrompt(baseQuestion: string, variationType: 'numeric' | 'contextual' | 'structural', config: PromptConfig): GeneratedPrompt;
    /**
     * 获取变体指令
     */
    private getVariationInstruction;
    /**
     * 增加难度
     */
    private increaseDifficulty;
    /**
     * 降低难度
     */
    private decreaseDifficulty;
}
declare const _default: {
    DynamicPromptGenerator: typeof DynamicPromptGenerator;
    AdvancedPromptStrategy: typeof AdvancedPromptStrategy;
    SCENARIOS: Record<string, string[]>;
    QUESTION_STRUCTURES: Record<string, string[]>;
    NUMBER_RANGES: Record<string, Record<string, {
        min: number;
        max: number;
        step: number;
    }>>;
};
export default _default;
//# sourceMappingURL=dynamicPrompt.d.ts.map