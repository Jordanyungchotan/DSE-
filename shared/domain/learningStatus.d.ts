/**
 * 插班分析 - 学习状态定义（唯一真源）
 *
 * 设计原则：
 * - 系统判断仅基于学习状态，不使用任何等级分数
 * - 适用于中一至中五学生，无需了解 DSE 等级概念
 * - 分数仅作为顾问参考信息，不参与系统分析
 */
import { LanguageCode } from './subjects';
export declare const LEARNING_STATUS: {
    readonly STRONG: "strong";
    readonly OK: "ok";
    readonly WEAK: "weak";
};
export type LearningStatus = typeof LEARNING_STATUS[keyof typeof LEARNING_STATUS];
export interface LearningStatusOption {
    value: LearningStatus;
    label: Record<LanguageCode, string>;
    description: Record<LanguageCode, string>;
}
export declare const LEARNING_STATUS_OPTIONS: LearningStatusOption[];
export declare const RANK_POSITION: {
    readonly TOP: "top";
    readonly MID: "mid";
    readonly BOTTOM: "bottom";
};
export type RankPosition = typeof RANK_POSITION[keyof typeof RANK_POSITION];
export interface RankPositionOption {
    value: RankPosition;
    label: Record<LanguageCode, string>;
}
export declare const RANK_POSITION_OPTIONS: RankPositionOption[];
export declare const SCORE_SOURCE: {
    readonly LATEST: "latest";
    readonly AVERAGE: "average";
};
export type ScoreSource = typeof SCORE_SOURCE[keyof typeof SCORE_SOURCE];
export interface ScoreSourceOption {
    value: ScoreSource;
    label: Record<LanguageCode, string>;
}
export declare const SCORE_SOURCE_OPTIONS: ScoreSourceOption[];
/**
 * 检查是否为有效的学习状态
 */
export declare function isValidLearningStatus(status: string): status is LearningStatus;
/**
 * 检查是否为有效的校内位置
 */
export declare function isValidRankPosition(position: string): position is RankPosition;
/**
 * 检查是否为有效的成绩来源
 */
export declare function isValidScoreSource(source: string): source is ScoreSource;
/**
 * 获取学习状态显示文本
 */
export declare function getLearningStatusLabel(status: LearningStatus, lang: LanguageCode): string;
/**
 * 获取校内位置显示文本
 */
export declare function getRankPositionLabel(position: RankPosition, lang: LanguageCode): string;
/**
 * 获取成绩来源显示文本
 */
export declare function getScoreSourceLabel(source: ScoreSource, lang: LanguageCode): string;
//# sourceMappingURL=learningStatus.d.ts.map