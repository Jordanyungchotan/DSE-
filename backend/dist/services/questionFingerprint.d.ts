/**
 * DSE智能刷题系统 - 题目指纹系统
 *
 * 功能：
 * 1. 生成题目多维度指纹（语义哈希、结构特征、数值模式、概念签名）
 * 2. 检测题目相似度
 * 3. 过滤重复题目
 */
export interface QuestionFingerprint {
    questionId: string;
    semanticHash: string;
    structuralFeatures: StructuralFeatures;
    numericalPattern: NumericalPattern;
    conceptualSignature: ConceptualSignature;
    answerPattern: AnswerPattern;
    createdAt: string;
}
export interface StructuralFeatures {
    questionType: string;
    sentenceCount: number;
    hasFormula: boolean;
    hasGraph: boolean;
    hasTable: boolean;
    wordCount: number;
    complexity: number;
    questionPattern: string;
}
export interface NumericalPattern {
    numbers: number[];
    numberCount: number;
    hasDecimals: boolean;
    hasFractions: boolean;
    hasNegatives: boolean;
    magnitudeRange: string;
    units: string[];
    numericHash: string;
}
export interface ConceptualSignature {
    subject: string;
    topics: string[];
    skills: string[];
    difficulty: string;
    cognitiveLevel: string;
    conceptHash: string;
}
export interface AnswerPattern {
    answerType: string;
    answerLength: string;
    stepsRequired: number;
    answerHash: string;
}
export interface SimilarityResult {
    isDuplicate: boolean;
    isVariant: boolean;
    similarities: {
        semantic: number;
        structural: number;
        numerical: number;
        conceptual: number;
        overall: number;
    };
    duplicateConfidence: number;
    duplicateReason: string | null;
}
export interface SimilarityThresholds {
    semantic: number;
    structural: number;
    numerical: number;
    conceptual: number;
    duplicate: number;
    variant: number;
}
export declare class QuestionFingerprintGenerator {
    private thresholds;
    constructor(thresholds?: Partial<SimilarityThresholds>);
    /**
     * 生成题目指纹
     */
    generateFingerprint(question: {
        id: string;
        question: string;
        questionType: string;
        correctAnswer: string | number;
        explanation?: string;
        topicTags?: string[];
        subject?: string;
        difficulty?: string;
        options?: string[];
    }): Promise<QuestionFingerprint>;
    /**
     * 生成语义哈希
     * 使用标准化文本内容生成哈希
     */
    private generateSemanticHash;
    /**
     * 标准化文本
     */
    private normalizeText;
    /**
     * 提取关键词
     */
    private extractKeywords;
    /**
     * 提取结构特征
     */
    private extractStructuralFeatures;
    /**
     * 检测问题模式
     */
    private detectQuestionPattern;
    /**
     * 计算复杂度
     */
    private calculateComplexity;
    /**
     * 提取数值模式
     */
    private extractNumericalPattern;
    /**
     * 提取单位
     */
    private extractUnits;
    /**
     * 提取概念签名
     */
    private extractConceptualSignature;
    /**
     * 检测认知层次（布鲁姆分类法）
     */
    private detectCognitiveLevel;
    /**
     * 提取所需技能
     */
    private extractSkills;
    /**
     * 提取答案模式
     */
    private extractAnswerPattern;
    /**
     * 估算解题步骤数
     */
    private estimateSteps;
    /**
     * 计算两个题目的相似度
     */
    calculateSimilarity(fp1: QuestionFingerprint, fp2: QuestionFingerprint): SimilarityResult;
    /**
     * 计算语义相似度
     */
    private calculateSemanticSimilarity;
    /**
     * 计算结构相似度
     */
    private calculateStructuralSimilarity;
    /**
     * 计算数值相似度
     */
    private calculateNumericalSimilarity;
    /**
     * 计算数组重叠度
     */
    private calculateArrayOverlap;
    /**
     * 计算数字重叠度
     */
    private calculateNumberOverlap;
    /**
     * 计算概念相似度
     */
    private calculateConceptualSimilarity;
}
export declare class QuestionDeduplicator {
    private generator;
    private fingerprintCache;
    constructor(thresholds?: Partial<SimilarityThresholds>);
    /**
     * 过滤重复题目
     */
    filterDuplicates(newQuestions: Array<{
        id: string;
        question: string;
        questionType: string;
        correctAnswer: string | number;
        explanation?: string;
        topicTags?: string[];
        subject?: string;
        difficulty?: string;
    }>, existingFingerprints: QuestionFingerprint[]): Promise<{
        unique: typeof newQuestions;
        duplicates: Array<{
            question: typeof newQuestions[0];
            reason: string;
            similarTo: string;
        }>;
        variants: Array<{
            question: typeof newQuestions[0];
            similarTo: string;
        }>;
    }>;
    /**
     * 计算题目集合的多样性分数
     */
    calculateDiversityScore(questions: Array<{
        id: string;
        question: string;
        questionType: string;
        correctAnswer: string | number;
        topicTags?: string[];
        subject?: string;
        difficulty?: string;
    }>): Promise<{
        overallScore: number;
        dimensions: {
            structuralDiversity: number;
            numericalDiversity: number;
            conceptualDiversity: number;
            topicCoverage: number;
        };
    }>;
    private calculateStructuralDiversity;
    private calculateNumericalDiversity;
    private calculateConceptualDiversity;
    private calculateTopicCoverage;
}
declare const _default: {
    QuestionFingerprintGenerator: typeof QuestionFingerprintGenerator;
    QuestionDeduplicator: typeof QuestionDeduplicator;
};
export default _default;
//# sourceMappingURL=questionFingerprint.d.ts.map