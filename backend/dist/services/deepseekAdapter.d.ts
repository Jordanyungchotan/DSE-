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
import { type FeasibilityLevel } from './placementScore.js';
/** 规则评分输入 */
export interface RuleScoreInput {
    score: number;
    level: FeasibilityLevel;
    reasons: string[];
    positiveReasons?: string[];
}
/** 学生基本信息 */
export interface StudentInfo {
    age: number;
    grade: string;
    currentSchool?: string;
    enrollmentDate?: string;
    subjects: Array<{
        subject: string;
        score: number;
    }>;
}
/** 目标学校信息 */
export interface TargetSchoolInfo {
    name: string;
    band: 1 | 2 | 3;
    district: string;
}
/** AI 标准化输出（必须符合此格式） */
export interface AIAnalysisOutput {
    feasibilityLevel: FeasibilityLevel;
    summary: string;
    mainRisks: string[];
    improvementPlan: string[];
}
/**
 * 检查文本是否包含禁止词
 */
declare function containsForbiddenContent(text: string): boolean;
/**
 * 构建系统 Prompt
 */
declare function buildSystemPrompt(): string;
/**
 * 构建用户 Prompt
 */
declare function buildUserPrompt(ruleScore: RuleScoreInput, student: StudentInfo, targetSchool: TargetSchoolInfo): string;
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
export declare function generateAIExplanation(ruleScore: RuleScoreInput, student: StudentInfo, targetSchool: TargetSchoolInfo, apiKey: string, maxRetries?: number): Promise<AIAnalysisOutput>;
/**
 * 生成本地备用输出（当 AI 调用失败时）
 */
declare function generateFallbackOutput(ruleScore: RuleScoreInput): AIAnalysisOutput;
export { buildSystemPrompt, buildUserPrompt, containsForbiddenContent, generateFallbackOutput, };
//# sourceMappingURL=deepseekAdapter.d.ts.map