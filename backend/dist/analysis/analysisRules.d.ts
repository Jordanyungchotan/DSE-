import { LearningStatus, RankPosition, LanguageCode } from "../../../shared/domain";
/**
 * 学习状态对应的风险等级和分析结果
 *
 * ⚠️ 重要设计原则：
 * - 系统判断仅基于 status 和 rankPosition
 * - 不使用任何分数或等级数据
 * - schoolScore 不参与任何分析逻辑
 */
export declare const LEARNING_STATUS_RULES: Record<LearningStatus, {
    riskLevel: 'low' | 'medium' | 'high';
    summary: Record<LanguageCode, string>;
    advice: Record<LanguageCode, string>;
}>;
/**
 * 校内位置对风险等级的调整
 * - top: 降低风险
 * - mid: 不变
 * - bottom: 提高风险
 */
export declare const RANK_POSITION_ADJUSTMENTS: Record<RankPosition, {
    riskAdjustment: -1 | 0 | 1;
    note: Record<LanguageCode, string>;
}>;
/**
 * 根据学习状态和校内位置计算最终风险等级
 */
export declare function calculateRiskLevel(status: LearningStatus, rankPosition?: RankPosition): 'low' | 'medium' | 'high';
export declare const CSD_RULES: {
    readonly pass: {
        readonly riskLevel: "low";
        readonly summary: "已达到课程要求，对插班或大学申请影响较小。";
        readonly advice: "可将精力集中于核心选修科目的提升。";
    };
    readonly fail: {
        readonly riskLevel: "high";
        readonly summary: "尚未达标，可能对升学及申请产生实质影响。";
        readonly advice: "建议优先补救该科目，避免成为升学短板。";
    };
};
export declare const CORE_SUBJECT_DEFAULT_RULE: {
    readonly riskLevel: "medium";
    readonly summary: "成绩需结合目标院校及整体成绩评估。";
    readonly advice: "建议根据目标院校要求针对性提升。";
};
export declare const ELECTIVE_CATEGORY_NOTES: Record<string, Record<LanguageCode, string>>;
export declare const ELECTIVE_DEFAULT_RULE: {
    readonly riskLevel: "medium";
    readonly summary: "选修科目成绩将结合整体表现评估。";
    readonly advice: "建议根据目标学校/专业要求针对性提升。";
};
/**
 * 获取选修科目类别（基于 key）
 */
export declare function getElectiveCategory(subjectKey: string): keyof typeof ELECTIVE_CATEGORY_NOTES;
/**
 * 获取选修科目 notes（基于 key 列表，支持多语言）
 */
export declare function getElectiveNotes(subjectKeys: string[], lang?: LanguageCode): string[];
/**
 * 根据科目学习状态计算整体可行性分数
 *
 * 评分规则：
 * - strong: 30 分
 * - ok: 20 分
 * - weak: 10 分
 * - 校内位置调整: top +5, mid 0, bottom -5
 *
 * 最终可行性等级：
 * - A: 90+ (平均 strong)
 * - B: 70-89 (大部分 ok 或更好)
 * - C: 50-69 (部分 weak)
 * - D: 30-49 (多数 weak)
 * - E: <30 (全部 weak)
 */
export declare function calculateOverallFeasibility(statuses: Array<{
    status: LearningStatus;
    rankPosition?: RankPosition;
}>): {
    score: number;
    level: 'A' | 'B' | 'C' | 'D' | 'E';
};
//# sourceMappingURL=analysisRules.d.ts.map