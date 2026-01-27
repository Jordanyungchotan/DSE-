/**
 * 插班分析 V2 默认模板
 *
 * 用于无 AI 增强时的默认值，确保所有数组字段非空
 *
 * @version v2
 */
import type { CapabilityAnalysis, TransitionPlan, RiskLevel, RecommendationType, OverallLevel } from '../types/transferAnalysisV2';
export declare const DEFAULT_CAPABILITY_ANALYSES: CapabilityAnalysis[];
export declare const DEFAULT_TRANSITION_PLAN: TransitionPlan;
export declare const DEFAULT_SUMMARY_ADVANTAGES: string[];
export declare const DEFAULT_SUMMARY_RISKS: string[];
export declare const DEFAULT_SCHOOL_ASSESSMENT_FIELDS: {
    requirements: string[];
    gaps: string[];
    notes: string[];
};
/**
 * 根据可行性分数获取整体等级
 */
export declare function getFeasibilityLevel(score: number): OverallLevel;
/**
 * 根据匹配分数获取申请策略建议
 */
export declare function getRecommendationType(matchScore: number): RecommendationType;
/**
 * 根据匹配分数获取风险等级
 */
export declare function getRiskLevel(matchScore: number): RiskLevel;
/**
 * 根据自评等级获取能力等级
 */
export declare function mapSelfAssessmentLevel(level: 'strong' | 'medium' | 'weak' | undefined): '强' | '中' | '弱';
//# sourceMappingURL=transferDefaults.d.ts.map