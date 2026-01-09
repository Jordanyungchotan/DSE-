/**
 * 智能答案匹配系统
 * 解决DSE刷题系统中的答案格式问题
 */
export interface AnswerMatchingResult {
    isCorrect: boolean;
    matchType: 'exact' | 'normalized' | 'numeric' | 'equation' | 'semantic' | 'ai_judged';
    userAnswer: string;
    normalizedUserAnswer: string;
    expectedAnswer: string;
    confidence: number;
    feedback: string;
    suggestedFormat?: string;
}
export interface QuestionTypeRules {
    requiredPrecision: number;
    unitRequired: boolean;
    acceptEquationForm: boolean;
    acceptPlainNumber: boolean;
    caseSensitive: boolean;
    matchingStrategies: string[];
}
export declare const QUESTION_TYPE_RULES: Record<string, QuestionTypeRules>;
export declare class AnswerPreprocessor {
    /**
     * 通用答案规范化
     */
    normalize(answer: string): string;
    /**
     * 数学答案预处理
     */
    preprocessMath(answer: string): string;
    /**
     * 选择题答案预处理
     */
    preprocessChoice(answer: string): string;
    /**
     * 根据题目类型预处理答案
     */
    preprocess(answer: string, questionType: string): string;
}
export declare class NumericMatcher {
    /**
     * 提取数字
     */
    extractNumber(str: string): number | null;
    /**
     * 数值相等性判断（带容差）
     */
    isNumericEqual(userNum: number, expectedNum: number, precision?: number): boolean;
    /**
     * 匹配数值
     */
    match(userAnswer: string, expectedAnswer: string, precision?: number): boolean;
}
export declare class EquationMatcher {
    private numericMatcher;
    /**
     * 提取方程的解
     */
    extractSolution(equation: string): number | null;
    /**
     * 匹配方程答案
     */
    match(userAnswer: string, expectedAnswer: string): boolean;
}
export declare class UnitProcessor {
    private unitMap;
    /**
     * 标准化单位
     */
    normalizeUnit(unit: string): string;
    /**
     * 提取数值和单位
     */
    extractValueAndUnit(text: string): {
        value: number;
        unit: string;
    } | null;
}
export declare class IntelligentAnswerMatcher {
    private preprocessor;
    private numericMatcher;
    private equationMatcher;
    private unitProcessor;
    /**
     * 多层匹配策略
     */
    matchAnswer(userAnswer: string, expectedAnswer: string, questionType: string): Promise<AnswerMatchingResult>;
    /**
     * 完全匹配
     */
    private exactMatch;
    /**
     * 规范化后匹配
     */
    private normalizedMatch;
    /**
     * 选择题匹配
     */
    private matchChoice;
    /**
     * 生成错误答案反馈
     */
    private generateWrongAnswerFeedback;
    /**
     * 创建匹配结果
     */
    private createResult;
}
export declare const answerMatcher: IntelligentAnswerMatcher;
//# sourceMappingURL=answerMatcher.d.ts.map