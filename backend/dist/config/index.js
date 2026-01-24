/**
 * 插班分析规则配置模块
 *
 * 集中管理所有经验规则配置，便于维护和动态调整
 */
// 导入 JSON 配置
import SchoolDifficultyConfig from './SchoolDifficultyConfig.json';
import GradeSensitivity from './GradeSensitivity.json';
import DistrictCompetition from './DistrictCompetition.json';
import RiskFactors from './RiskFactors.json';
import ConversionCopy from './ConversionCopy.json';
import RecommendedActions from './RecommendedActions.json';
// ============================================================
// 配置导出
// ============================================================
/** Band 等级难度规则 */
export const BAND_RULES = {
    1: SchoolDifficultyConfig.band1,
    2: SchoolDifficultyConfig.band2,
    3: SchoolDifficultyConfig.band3,
};
/** 年级难度系数 */
export const GRADE_SENSITIVITY = GradeSensitivity;
/** 简化的年级系数（仅数值） */
export const GRADE_FACTOR = Object.fromEntries(Object.entries(GradeSensitivity).map(([grade, config]) => [grade, config.factor]));
/** 区域竞争强度 */
export const DISTRICT_COMPETITION = DistrictCompetition;
/** 风险因素配置 */
export const RISK_FACTORS = RiskFactors;
/** 转化话术 */
export const CONVERSION_COPIES = ConversionCopy;
// ============================================================
// 辅助函数
// ============================================================
/**
 * 获取 Band 等级配置
 */
export function getBandConfig(band) {
    return BAND_RULES[band];
}
/**
 * 获取年级难度系数
 */
export function getGradeFactor(grade) {
    const config = GRADE_SENSITIVITY[grade];
    return config ? config.factor : 1.0;
}
/**
 * 获取区域竞争系数
 */
export function getDistrictFactor(district) {
    const config = DISTRICT_COMPETITION[district];
    return config ? config.factor : 1.0;
}
/**
 * 获取转化话术
 */
export function getConversionCopy(level) {
    return CONVERSION_COPIES[level];
}
/**
 * 可行性等级阈值配置
 * 集中管理，方便后期调整
 */
export const LEVEL_THRESHOLDS = {
    A: 80, // score ≥ 80 → A
    B: 60, // 60 ≤ score < 80 → B
    C: 45, // 45 ≤ score < 60 → C
    D: 30, // 30 ≤ score < 45 → D
    E: 0, // score < 30 → E
};
/**
 * 根据分数计算可行性等级
 *
 * 规则：
 * - score ≥ 80 → A
 * - 60–79 → B
 * - 45–59 → C
 * - 30–44 → D
 * - < 30 → E
 *
 * @param score 0-100 的评分
 * @returns 可行性等级 A-E
 */
export function scoreToLevel(score) {
    if (score >= LEVEL_THRESHOLDS.A)
        return 'A';
    if (score >= LEVEL_THRESHOLDS.B)
        return 'B';
    if (score >= LEVEL_THRESHOLDS.C)
        return 'C';
    if (score >= LEVEL_THRESHOLDS.D)
        return 'D';
    return 'E';
}
/**
 * 获取等级对应的分数范围描述
 */
export function getLevelScoreRange(level) {
    switch (level) {
        case 'A': return '80-100分';
        case 'B': return '60-79分';
        case 'C': return '45-59分';
        case 'D': return '30-44分';
        case 'E': return '0-29分';
    }
}
/**
 * 可行性等级描述
 */
export const LEVEL_DESCRIPTIONS = {
    'A': '可行性较高 - 学生条件与目标学校要求匹配度良好，建议把握机会',
    'B': '可行性中等 - 需要在部分方面加强，建议重点提升短板科目',
    'C': '可行性一般 - 存在较明显差距，需要较长时间准备和显著提升',
    'D': '可行性较低 - 差距较大，建议重新评估目标或制定长期计划',
    'E': '可行性极低 - 建议先巩固基础，调整目标后再考虑插班'
};
/**
 * 免责声明（标准版本）
 * 用于所有分析结果返回，前后端统一使用
 */
export const DISCLAIMER = '本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。';
/**
 * 免责声明（详细版本）
 * 可选用于需要更详细说明的场景
 */
export const DISCLAIMER_FULL = `⚠️ 重要声明：本分析基于公开教育资料与经验模型，仅供参考。香港中学插班并无公开成功率或官方成绩门槛，实际录取结果受多种因素影响，包括但不限于学校当年招生名额、面试表现、其他申请者情况等。所有建议不构成任何录取保证，建议结合学校官方信息做出决策。`;
/**
 * 免责声明简写（与标准版一致）
 */
export const DISCLAIMER_SHORT = DISCLAIMER;
/**
 * 免责声明对象（统一导出）
 */
export const DISCLAIMERS = {
    standard: DISCLAIMER,
    short: DISCLAIMER,
    full: DISCLAIMER_FULL,
};
/** 根据等级获取推荐行动 */
export const RECOMMENDED_ACTIONS = RecommendedActions;
/**
 * 获取等级对应的推荐行动
 */
export function getRecommendedActions(level) {
    return RECOMMENDED_ACTIONS[level];
}
/**
 * 获取主要推荐行动（优先级最高的）
 */
export function getPrimaryAction(level) {
    const recommendation = RECOMMENDED_ACTIONS[level];
    return recommendation.actions.sort((a, b) => a.priority - b.priority)[0];
}
// 默认导出所有配置
export default {
    BAND_RULES,
    GRADE_SENSITIVITY,
    GRADE_FACTOR,
    DISTRICT_COMPETITION,
    RISK_FACTORS,
    CONVERSION_COPIES,
    LEVEL_THRESHOLDS,
    LEVEL_DESCRIPTIONS,
    DISCLAIMER,
    DISCLAIMER_FULL,
    DISCLAIMER_SHORT,
    DISCLAIMERS,
    RECOMMENDED_ACTIONS,
};
//# sourceMappingURL=index.js.map