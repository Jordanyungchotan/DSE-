/**
 * 插班分析 V2 默认模板
 *
 * 用途：当 AI 未启用时，确保返回非空数据
 * 原则：所有数组必须非空，避免前端渲染错误
 *
 * @version v2
 */
import type { CapabilityAnalysis, TransitionPlan } from '../types/transferAnalysisV2';
/**
 * 默认能力维度分析（≥3 条）
 *
 * 用于无 AI 模式下的能力评估
 */
export declare const DEFAULT_CAPABILITY_ANALYSES: CapabilityAnalysis[];
/**
 * 默认过渡计划
 *
 * shortTerm / midTerm / riskWarnings 都非空
 */
export declare const DEFAULT_TRANSITION_PLAN: TransitionPlan;
/**
 * 默认风险提示列表
 *
 * 用于 summary.keyRisks 为空时的兜底
 */
export declare const DEFAULT_SUMMARY_RISKS: string[];
/**
 * 默认优势列表
 *
 * 用于 summary.keyAdvantages 为空时的兜底
 */
export declare const DEFAULT_SUMMARY_ADVANTAGES: string[];
/**
 * 学校评估默认字段
 *
 * 确保每个学校评估对象都有完整字段
 */
export declare const DEFAULT_SCHOOL_ASSESSMENT_FIELDS: {
    requirements: string[];
    gaps: string[];
    notes: string[];
};
/**
 * 根据可行性评分获取等级
 */
export declare function getFeasibilityLevel(score: number): '低' | '中' | '高';
/**
 * 根据 matchScore 获取推荐类型
 */
export declare function getRecommendationType(matchScore: number): '保底' | '目标' | '冲刺';
/**
 * 根据 matchScore 获取风险等级
 */
export declare function getRiskLevel(matchScore: number): '低' | '中' | '高';
//# sourceMappingURL=transferDefaults.d.ts.map