/**
 * 插班分析 - 学习状态定义（唯一真源）
 *
 * 设计原则：
 * - 系统判断仅基于学习状态，不使用任何等级分数
 * - 适用于中一至中五学生，无需了解 DSE 等级概念
 * - 分数仅作为顾问参考信息，不参与系统分析
 */
// ===== 学习状态枚举 =====
export const LEARNING_STATUS = {
    STRONG: 'strong',
    OK: 'ok',
    WEAK: 'weak',
};
export const LEARNING_STATUS_OPTIONS = [
    {
        value: LEARNING_STATUS.STRONG,
        label: {
            'zh-HK': '明顯跟得上 / 有優勢',
            'zh-CN': '明显跟得上 / 有优势',
            en: 'Clearly keeping up / Has advantage',
        },
        description: {
            'zh-HK': '學科成績優秀，學習輕鬆',
            'zh-CN': '学科成绩优秀，学习轻松',
            en: 'Excellent grades, learning is easy',
        },
    },
    {
        value: LEARNING_STATUS.OK,
        label: {
            'zh-HK': '勉強跟得上',
            'zh-CN': '勉强跟得上',
            en: 'Barely keeping up',
        },
        description: {
            'zh-HK': '成績中等，需要一定努力',
            'zh-CN': '成绩中等，需要一定努力',
            en: 'Average grades, requires some effort',
        },
    },
    {
        value: LEARNING_STATUS.WEAK,
        label: {
            'zh-HK': '明顯吃力',
            'zh-CN': '明显吃力',
            en: 'Clearly struggling',
        },
        description: {
            'zh-HK': '學習有困難，成績較弱',
            'zh-CN': '学习有困难，成绩较弱',
            en: 'Having difficulty, weaker grades',
        },
    },
];
// ===== 校内相对位置 =====
export const RANK_POSITION = {
    TOP: 'top',
    MID: 'mid',
    BOTTOM: 'bottom',
};
export const RANK_POSITION_OPTIONS = [
    {
        value: RANK_POSITION.TOP,
        label: {
            'zh-HK': '前 25%',
            'zh-CN': '前 25%',
            en: 'Top 25%',
        },
    },
    {
        value: RANK_POSITION.MID,
        label: {
            'zh-HK': '中間 50%',
            'zh-CN': '中间 50%',
            en: 'Middle 50%',
        },
    },
    {
        value: RANK_POSITION.BOTTOM,
        label: {
            'zh-HK': '後 25%',
            'zh-CN': '后 25%',
            en: 'Bottom 25%',
        },
    },
];
// ===== 成绩来源 =====
export const SCORE_SOURCE = {
    LATEST: 'latest',
    AVERAGE: 'average',
};
export const SCORE_SOURCE_OPTIONS = [
    {
        value: SCORE_SOURCE.LATEST,
        label: {
            'zh-HK': '最近一次',
            'zh-CN': '最近一次',
            en: 'Latest',
        },
    },
    {
        value: SCORE_SOURCE.AVERAGE,
        label: {
            'zh-HK': '學期平均',
            'zh-CN': '学期平均',
            en: 'Semester average',
        },
    },
];
// ===== 辅助函数 =====
/**
 * 检查是否为有效的学习状态
 */
export function isValidLearningStatus(status) {
    return Object.values(LEARNING_STATUS).includes(status);
}
/**
 * 检查是否为有效的校内位置
 */
export function isValidRankPosition(position) {
    return Object.values(RANK_POSITION).includes(position);
}
/**
 * 检查是否为有效的成绩来源
 */
export function isValidScoreSource(source) {
    return Object.values(SCORE_SOURCE).includes(source);
}
/**
 * 获取学习状态显示文本
 */
export function getLearningStatusLabel(status, lang) {
    const option = LEARNING_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label[lang] ?? status;
}
/**
 * 获取校内位置显示文本
 */
export function getRankPositionLabel(position, lang) {
    const option = RANK_POSITION_OPTIONS.find(opt => opt.value === position);
    return option?.label[lang] ?? position;
}
/**
 * 获取成绩来源显示文本
 */
export function getScoreSourceLabel(source, lang) {
    const option = SCORE_SOURCE_OPTIONS.find(opt => opt.value === source);
    return option?.label[lang] ?? source;
}
//# sourceMappingURL=learningStatus.js.map