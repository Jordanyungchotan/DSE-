/**
 * 插班可行性评估引擎
 *
 * 基于规则系统 + AI推理，提供可行性等级评估
 * 设计原则：
 * - 无真实插班数据，使用经验规则 + 相对匹配度
 * - 禁止输出具体成功百分比
 * - 强调"建议性、非保证"
 */
/** 学生信息输入 */
export interface StudentProfile {
    age: number;
    gender: 'male' | 'female';
    currentGrade: string;
    scores: Record<string, number>;
    currentSchool?: string;
    currentBand?: number;
    strengths?: string[];
    extracurriculars?: string[];
}
/** 目标学校信息 */
export interface TargetSchool {
    schoolId?: string;
    schoolName: string;
    bandLevel: 1 | 2 | 3;
    district: string;
    gender?: 'boys' | 'girls' | 'coed';
    type?: 'government' | 'aided' | 'dss' | 'private';
    englishRequirement?: 'high' | 'medium' | 'low';
}
/** 可行性评估请求 */
export interface FeasibilityRequest {
    student: StudentProfile;
    targetSchool: TargetSchool;
}
/** 可行性等级 */
export type FeasibilityLevel = 'A' | 'B' | 'C' | 'D';
/** 可行性评估结果 */
export interface FeasibilityResult {
    feasibilityLevel: FeasibilityLevel;
    levelDescription: string;
    overallAssessment: string;
    mainRisks: string[];
    keyStrengths: string[];
    recommendations: string[];
    subjectAnalysis: SubjectAnalysisResult[];
    preparationPlan: PreparationPlan;
    disclaimer: string;
}
/** 科目分析结果 */
interface SubjectAnalysisResult {
    subject: string;
    score: number;
    status: 'strong' | 'adequate' | 'weak' | 'critical';
    statusDescription: string;
    recommendation: string;
}
/** 准备计划 */
interface PreparationPlan {
    priorityActions: string[];
    shortTermGoals: string[];
    mediumTermGoals: string[];
    resources: string[];
}
/**
 * 执行可行性评估（规则引擎版）
 */
export declare function evaluateFeasibility(request: FeasibilityRequest): FeasibilityResult;
/**
 * AI增强评估Prompt
 */
export declare function buildAIPrompt(request: FeasibilityRequest, ruleResult: FeasibilityResult): string;
/**
 * 使用AI增强评估结果
 */
export declare function enhanceWithAI(request: FeasibilityRequest, ruleResult: FeasibilityResult, aiApiKey?: string): Promise<FeasibilityResult>;
export {};
//# sourceMappingURL=feasibilityEngine.d.ts.map