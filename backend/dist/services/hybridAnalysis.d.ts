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
import { type PlacementScoreResult, type FeasibilityLevel } from './placementScore.js';
import { CONVERSION_COPIES, type LevelRecommendation } from '../config/index.js';
/** 规则引擎结果（核心评分数据） */
export interface RuleResult {
    /** 评分 (0-100) */
    score: number;
    /** 可行性等级 (A-E) */
    level: FeasibilityLevel;
    /** 扣分原因 */
    reasons: string[];
    /** 加分原因 */
    positiveReasons: string[];
    /** 科目分析 */
    subjectAnalysis: PlacementScoreResult['subjectAnalysis'];
    /** 风险雷达 */
    riskRadar: PlacementScoreResult['riskRadar'];
    /** 评分明细 */
    breakdown: PlacementScoreResult['breakdown'];
}
/**
 * AI 标准化输出结构（强制格式）
 *
 * 这是 AI 必须输出的格式，后端会进行严格校验
 */
export interface AIStandardOutput {
    /** 可行性等级 (A-E)，必须与规则引擎一致 */
    feasibilityLevel: FeasibilityLevel;
    /** 整体评价摘要 */
    summary: string;
    /** 主要风险点 (2-5个) */
    mainRisks: string[];
    /** 3-6个月可执行改进建议 (3-6个) */
    improvementPlan: string[];
}
/** 混合分析完整结果 */
export interface HybridAnalysisResult {
    /** 规则引擎结果（客观评分） */
    ruleResult: RuleResult;
    /** AI 解释结果（标准化输出） */
    aiExplanation: AIStandardOutput;
    /** 转化话术 */
    conversionCopy: typeof CONVERSION_COPIES['A'];
    /** 推荐行动（基于等级） */
    recommendedActions: LevelRecommendation;
    /** 免责声明 */
    disclaimer: string;
    /** 分析时间戳 */
    analyzedAt: string;
}
/** 学生输入信息（前端传入） */
export interface StudentInput {
    enrollmentDate: string;
    semester: string;
    grade: string;
    age: number;
    currentSchool?: string;
    currentBand?: 1 | 2 | 3;
    subjects: Array<{
        subject: string;
        currentScore: string;
        targetScore?: string;
    }>;
    targetSchools: Array<{
        name: string;
        bandLevel: 1 | 2 | 3;
        district: string;
    }>;
    notes?: string;
    hobbies?: string[];
    strengths?: string[];
    extracurriculars?: string[];
    achievements?: string;
}
/**
 * 校验 AI 输出是否符合标准结构
 *
 * 必须包含：
 * - feasibilityLevel: 字符串，A-E 之一
 * - summary: 非空字符串
 * - mainRisks: 字符串数组，至少 1 项
 * - improvementPlan: 字符串数组，至少 1 项
 */
declare function validateAIOutput(data: unknown): data is AIStandardOutput;
/**
 * 执行混合分析
 *
 * 流程：
 * 1. 调用规则评分引擎 → 获得 ruleResult
 * 2. 调用 AI（带校验和重试） → 获得 aiExplanation
 * 3. 如果 AI 失败，使用备用生成
 * 4. 合并返回完整结果
 */
export declare function analyzeWithHybridEngine(input: StudentInput, apiKey: string): Promise<HybridAnalysisResult>;
/**
 * 评估多个目标学校
 */
export declare function analyzeMultipleSchools(input: StudentInput, apiKey: string): Promise<Array<HybridAnalysisResult & {
    schoolName: string;
}>>;
export { validateAIOutput };
declare const _default: {
    analyzeWithHybridEngine: typeof analyzeWithHybridEngine;
    analyzeMultipleSchools: typeof analyzeMultipleSchools;
    validateAIOutput: typeof validateAIOutput;
};
export default _default;
//# sourceMappingURL=hybridAnalysis.d.ts.map