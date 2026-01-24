/**
 * 插班分析规则配置模块
 *
 * 集中管理所有经验规则配置，便于维护和动态调整
 */
/** Band 等级难度配置 */
export interface BandDifficultyConfig {
    minEnglish: number;
    minMath: number;
    minChinese: number;
    minAverage: number;
    competitionLevel: 'very_high' | 'high' | 'medium' | 'low';
    englishIntensity: 'high' | 'medium' | 'low';
    description: string;
}
/** 年级敏感度配置 */
export interface GradeSensitivityConfig {
    factor: number;
    description: string;
}
/** 区域竞争配置 */
export interface DistrictCompetitionConfig {
    level: string;
    factor: number;
}
/** 可行性等级 */
export type FeasibilityLevel = 'A' | 'B' | 'C' | 'D' | 'E';
/** 转化话术配置 */
export interface ConversionCopyConfig {
    headline: string;
    description: string;
    ctaText: string;
    ctaType: 'primary' | 'secondary' | 'warning';
    suggestions: string[];
}
/** Band 等级难度规则 */
export declare const BAND_RULES: Record<1 | 2 | 3, BandDifficultyConfig>;
/** 年级难度系数 */
export declare const GRADE_SENSITIVITY: Record<string, GradeSensitivityConfig>;
/** 简化的年级系数（仅数值） */
export declare const GRADE_FACTOR: Record<string, number>;
/** 区域竞争强度 */
export declare const DISTRICT_COMPETITION: Record<string, DistrictCompetitionConfig>;
/** 风险因素配置 */
export declare const RISK_FACTORS: {
    lowEnglish: {
        threshold: number;
        weight: number;
        message: string;
    };
    lowMath: {
        threshold: number;
        weight: number;
        message: string;
    };
    lowChinese: {
        threshold: number;
        weight: number;
        message: string;
    };
    coreSubjectGap: {
        difference: number;
        weight: number;
        message: string;
    };
    highGradeSensitivity: {
        grades: string[];
        weight: number;
        message: string;
    };
    bandJump: {
        singleJump: {
            weight: number;
            message: string;
        };
        doubleJump: {
            weight: number;
            message: string;
        };
    };
    imbalancedSubjects: {
        gapThreshold: number;
        weight: number;
        message: string;
    };
};
/** 转化话术 */
export declare const CONVERSION_COPIES: Record<FeasibilityLevel, ConversionCopyConfig>;
/**
 * 获取 Band 等级配置
 */
export declare function getBandConfig(band: 1 | 2 | 3): BandDifficultyConfig;
/**
 * 获取年级难度系数
 */
export declare function getGradeFactor(grade: string): number;
/**
 * 获取区域竞争系数
 */
export declare function getDistrictFactor(district: string): number;
/**
 * 获取转化话术
 */
export declare function getConversionCopy(level: FeasibilityLevel): ConversionCopyConfig;
/**
 * 可行性等级阈值配置
 * 集中管理，方便后期调整
 */
export declare const LEVEL_THRESHOLDS: {
    readonly A: 80;
    readonly B: 60;
    readonly C: 45;
    readonly D: 30;
    readonly E: 0;
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
export declare function scoreToLevel(score: number): FeasibilityLevel;
/**
 * 获取等级对应的分数范围描述
 */
export declare function getLevelScoreRange(level: FeasibilityLevel): string;
/**
 * 可行性等级描述
 */
export declare const LEVEL_DESCRIPTIONS: Record<FeasibilityLevel, string>;
/**
 * 免责声明（标准版本）
 * 用于所有分析结果返回，前后端统一使用
 */
export declare const DISCLAIMER = "\u672C\u5206\u6790\u57FA\u4E8E\u516C\u5F00\u8D44\u6599\u4E0E\u6559\u80B2\u7ECF\u9A8C\u6A21\u578B\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u4EFB\u4F55\u5F55\u53D6\u4FDD\u8BC1\u3002";
/**
 * 免责声明（详细版本）
 * 可选用于需要更详细说明的场景
 */
export declare const DISCLAIMER_FULL = "\u26A0\uFE0F \u91CD\u8981\u58F0\u660E\uFF1A\u672C\u5206\u6790\u57FA\u4E8E\u516C\u5F00\u6559\u80B2\u8D44\u6599\u4E0E\u7ECF\u9A8C\u6A21\u578B\uFF0C\u4EC5\u4F9B\u53C2\u8003\u3002\u9999\u6E2F\u4E2D\u5B66\u63D2\u73ED\u5E76\u65E0\u516C\u5F00\u6210\u529F\u7387\u6216\u5B98\u65B9\u6210\u7EE9\u95E8\u69DB\uFF0C\u5B9E\u9645\u5F55\u53D6\u7ED3\u679C\u53D7\u591A\u79CD\u56E0\u7D20\u5F71\u54CD\uFF0C\u5305\u62EC\u4F46\u4E0D\u9650\u4E8E\u5B66\u6821\u5F53\u5E74\u62DB\u751F\u540D\u989D\u3001\u9762\u8BD5\u8868\u73B0\u3001\u5176\u4ED6\u7533\u8BF7\u8005\u60C5\u51B5\u7B49\u3002\u6240\u6709\u5EFA\u8BAE\u4E0D\u6784\u6210\u4EFB\u4F55\u5F55\u53D6\u4FDD\u8BC1\uFF0C\u5EFA\u8BAE\u7ED3\u5408\u5B66\u6821\u5B98\u65B9\u4FE1\u606F\u505A\u51FA\u51B3\u7B56\u3002";
/**
 * 免责声明简写（与标准版一致）
 */
export declare const DISCLAIMER_SHORT = "\u672C\u5206\u6790\u57FA\u4E8E\u516C\u5F00\u8D44\u6599\u4E0E\u6559\u80B2\u7ECF\u9A8C\u6A21\u578B\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u4EFB\u4F55\u5F55\u53D6\u4FDD\u8BC1\u3002";
/**
 * 免责声明对象（统一导出）
 */
export declare const DISCLAIMERS: {
    standard: string;
    short: string;
    full: string;
};
/** 推荐行动项 */
export interface RecommendedAction {
    type: 'consultation' | 'course' | 'assessment';
    title: string;
    description: string;
    ctaText: string;
    priority: number;
}
/** 等级推荐行动 */
export interface LevelRecommendation {
    title: string;
    actions: RecommendedAction[];
}
/** 根据等级获取推荐行动 */
export declare const RECOMMENDED_ACTIONS: Record<FeasibilityLevel, LevelRecommendation>;
/**
 * 获取等级对应的推荐行动
 */
export declare function getRecommendedActions(level: FeasibilityLevel): LevelRecommendation;
/**
 * 获取主要推荐行动（优先级最高的）
 */
export declare function getPrimaryAction(level: FeasibilityLevel): RecommendedAction;
declare const _default: {
    BAND_RULES: Record<1 | 2 | 3, BandDifficultyConfig>;
    GRADE_SENSITIVITY: Record<string, GradeSensitivityConfig>;
    GRADE_FACTOR: Record<string, number>;
    DISTRICT_COMPETITION: Record<string, DistrictCompetitionConfig>;
    RISK_FACTORS: {
        lowEnglish: {
            threshold: number;
            weight: number;
            message: string;
        };
        lowMath: {
            threshold: number;
            weight: number;
            message: string;
        };
        lowChinese: {
            threshold: number;
            weight: number;
            message: string;
        };
        coreSubjectGap: {
            difference: number;
            weight: number;
            message: string;
        };
        highGradeSensitivity: {
            grades: string[];
            weight: number;
            message: string;
        };
        bandJump: {
            singleJump: {
                weight: number;
                message: string;
            };
            doubleJump: {
                weight: number;
                message: string;
            };
        };
        imbalancedSubjects: {
            gapThreshold: number;
            weight: number;
            message: string;
        };
    };
    CONVERSION_COPIES: Record<FeasibilityLevel, ConversionCopyConfig>;
    LEVEL_THRESHOLDS: {
        readonly A: 80;
        readonly B: 60;
        readonly C: 45;
        readonly D: 30;
        readonly E: 0;
    };
    LEVEL_DESCRIPTIONS: Record<FeasibilityLevel, string>;
    DISCLAIMER: string;
    DISCLAIMER_FULL: string;
    DISCLAIMER_SHORT: string;
    DISCLAIMERS: {
        standard: string;
        short: string;
        full: string;
    };
    RECOMMENDED_ACTIONS: Record<FeasibilityLevel, LevelRecommendation>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map