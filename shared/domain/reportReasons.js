/**
 * 分析报告原因三语文案
 *
 * 规则：
 * - 分析系统只输出 reasonKeys（英文 key）
 * - 报告生成时根据 currentLanguage 映射为可读文字
 * - 禁止分析函数中出现中文
 */
// ===== 插班分析原因 =====
export const TRANSFER_REASONS = {
    // ----- 学校相关 -----
    TRADITIONAL_ELITE_SCHOOL: {
        'zh-HK': '傳統名校，競爭激烈',
        'zh-CN': '传统名校，竞争激烈',
        en: 'Traditional elite school with intense competition',
    },
    BAND_ONE_SCHOOL: {
        'zh-HK': '第一組別學校，入學門檻較高',
        'zh-CN': '第一组别学校，入学门槛较高',
        en: 'Band 1 school with higher admission requirements',
    },
    BAND_TWO_SCHOOL: {
        'zh-HK': '第二組別學校，競爭適中',
        'zh-CN': '第二组别学校，竞争适中',
        en: 'Band 2 school with moderate competition',
    },
    BAND_THREE_SCHOOL: {
        'zh-HK': '第三組別學校，入學相對容易',
        'zh-CN': '第三组别学校，入学相对容易',
        en: 'Band 3 school with relatively easier admission',
    },
    LIMITED_PLACES: {
        'zh-HK': '插班名額有限',
        'zh-CN': '插班名额有限',
        en: 'Limited transfer places available',
    },
    POPULAR_DISTRICT: {
        'zh-HK': '熱門校網區域',
        'zh-CN': '热门校网区域',
        en: 'Popular school district',
    },
    // ----- 年级相关 -----
    HIGH_GRADE_TRANSFER: {
        'zh-HK': '高年級插班成功率較低',
        'zh-CN': '高年级插班成功率较低',
        en: 'Higher grade transfers are more competitive',
    },
    LOW_GRADE_TRANSFER: {
        'zh-HK': '低年級插班相對容易',
        'zh-CN': '低年级插班相对容易',
        en: 'Lower grade transfers are relatively easier',
    },
    DSE_YEAR_TRANSFER: {
        'zh-HK': 'DSE考試年，插班難度極高',
        'zh-CN': 'DSE考试年，插班难度极高',
        en: 'DSE exam year - transfer is extremely difficult',
    },
    // ----- 成绩相关 -----
    EXCELLENT_GRADES: {
        'zh-HK': '成績優異，具競爭優勢',
        'zh-CN': '成绩优异，具竞争优势',
        en: 'Excellent grades provide competitive advantage',
    },
    GOOD_GRADES: {
        'zh-HK': '成績良好，有一定優勢',
        'zh-CN': '成绩良好，有一定优势',
        en: 'Good grades provide some advantage',
    },
    AVERAGE_GRADES: {
        'zh-HK': '成績中等，需要努力提升',
        'zh-CN': '成绩中等，需要努力提升',
        en: 'Average grades - improvement needed',
    },
    BELOW_AVERAGE_GRADES: {
        'zh-HK': '成績偏低，建議加強準備',
        'zh-CN': '成绩偏低，建议加强准备',
        en: 'Below average grades - intensive preparation recommended',
    },
    // ----- 选修科目相关 -----
    SCIENCE_BACKGROUND: {
        'zh-HK': '理科背景，對名校插班競爭更有利',
        'zh-CN': '理科背景，对名校插班竞争更有利',
        en: 'Science background provides advantage for elite school transfers',
    },
    BUSINESS_ORIENTATION: {
        'zh-HK': '商科取向，需關注學校課程側重',
        'zh-CN': '商科取向，需关注学校课程侧重',
        en: 'Business orientation - consider school curriculum focus',
    },
    ARTS_SPORTS_TALENT: {
        'zh-HK': '部分學校對相關特長有額外考核',
        'zh-CN': '部分学校对相关特长有额外考核',
        en: 'Some schools have additional assessments for arts/sports talents',
    },
    // ----- 时间相关 -----
    SUFFICIENT_PREP_TIME: {
        'zh-HK': '有充足時間準備',
        'zh-CN': '有充足时间准备',
        en: 'Sufficient preparation time available',
    },
    LIMITED_PREP_TIME: {
        'zh-HK': '準備時間有限，需加緊複習',
        'zh-CN': '准备时间有限，需加紧复习',
        en: 'Limited preparation time - intensive review needed',
    },
    URGENT_TIMELINE: {
        'zh-HK': '時間緊迫，建議考慮備選方案',
        'zh-CN': '时间紧迫，建议考虑备选方案',
        en: 'Urgent timeline - consider backup options',
    },
};
// ===== 大学申请分析原因 =====
export const UNIVERSITY_REASONS = {
    // ----- 成绩相关 -----
    HIGH_BEST_FIVE: {
        'zh-HK': '最佳5科分數優秀，具競爭力',
        'zh-CN': '最佳5科分数优秀，具竞争力',
        en: 'Excellent Best 5 score - highly competitive',
    },
    AVERAGE_BEST_FIVE: {
        'zh-HK': '最佳5科分數中等，需選擇合適專業',
        'zh-CN': '最佳5科分数中等，需选择合适专业',
        en: 'Average Best 5 score - choose suitable programs',
    },
    LOW_BEST_FIVE: {
        'zh-HK': '最佳5科分數偏低，建議考慮副學士',
        'zh-CN': '最佳5科分数偏低，建议考虑副学士',
        en: 'Low Best 5 score - consider associate degree',
    },
    // ----- 专业相关 -----
    COMPETITIVE_PROGRAM: {
        'zh-HK': '熱門專業，競爭激烈',
        'zh-CN': '热门专业，竞争激烈',
        en: 'Popular program with intense competition',
    },
    MODERATE_PROGRAM: {
        'zh-HK': '專業競爭適中',
        'zh-CN': '专业竞争适中',
        en: 'Program with moderate competition',
    },
    NICHE_PROGRAM: {
        'zh-HK': '小眾專業，入學相對容易',
        'zh-CN': '小众专业，入学相对容易',
        en: 'Niche program with easier admission',
    },
    // ----- 匹配度相关 -----
    GOOD_SUBJECT_MATCH: {
        'zh-HK': '選修科目與專業要求匹配',
        'zh-CN': '选修科目与专业要求匹配',
        en: 'Elective subjects match program requirements',
    },
    PARTIAL_SUBJECT_MATCH: {
        'zh-HK': '部分科目符合專業要求',
        'zh-CN': '部分科目符合专业要求',
        en: 'Some subjects match program requirements',
    },
    POOR_SUBJECT_MATCH: {
        'zh-HK': '選修科目與專業要求不符',
        'zh-CN': '选修科目与专业要求不符',
        en: 'Elective subjects do not match program requirements',
    },
};
// ===== 建议类型 =====
export const ADVICE_TEXT = {
    // ----- 学习建议 -----
    FOCUS_CORE_SUBJECTS: {
        'zh-HK': '建議集中精力提升核心科目成績',
        'zh-CN': '建议集中精力提升核心科目成绩',
        en: 'Focus on improving core subject grades',
    },
    STRENGTHEN_WEAK_SUBJECTS: {
        'zh-HK': '加強薄弱科目的學習',
        'zh-CN': '加强薄弱科目的学习',
        en: 'Strengthen weak subjects',
    },
    MAINTAIN_CURRENT_LEVEL: {
        'zh-HK': '保持現有水平，穩定發揮',
        'zh-CN': '保持现有水平，稳定发挥',
        en: 'Maintain current level with stable performance',
    },
    // ----- 申请策略 -----
    CONSIDER_BACKUP_SCHOOLS: {
        'zh-HK': '建議準備備選學校',
        'zh-CN': '建议准备备选学校',
        en: 'Prepare backup school options',
    },
    PREPARE_INTERVIEW: {
        'zh-HK': '提前準備面試',
        'zh-CN': '提前准备面试',
        en: 'Prepare for interview in advance',
    },
    HIGHLIGHT_STRENGTHS: {
        'zh-HK': '在申請中突出個人優勢',
        'zh-CN': '在申请中突出个人优势',
        en: 'Highlight personal strengths in application',
    },
    // ----- 时间管理 -----
    CREATE_STUDY_PLAN: {
        'zh-HK': '制定詳細學習計劃',
        'zh-CN': '制定详细学习计划',
        en: 'Create detailed study plan',
    },
    REGULAR_PRACTICE: {
        'zh-HK': '定期練習和複習',
        'zh-CN': '定期练习和复习',
        en: 'Regular practice and review',
    },
    SEEK_TUTORING: {
        'zh-HK': '如有需要可考慮補習',
        'zh-CN': '如有需要可考虑补习',
        en: 'Consider tutoring if needed',
    },
};
// ===== 辅助函数 =====
/**
 * 获取插班分析原因文本
 */
export function getTransferReasonText(key, lang) {
    return TRANSFER_REASONS[key]?.[lang] ?? key;
}
/**
 * 获取大学分析原因文本
 */
export function getUniversityReasonText(key, lang) {
    return UNIVERSITY_REASONS[key]?.[lang] ?? key;
}
/**
 * 获取建议文本
 */
export function getAdviceText(key, lang) {
    return ADVICE_TEXT[key]?.[lang] ?? key;
}
/**
 * 批量获取原因文本
 */
export function getReasonTexts(keys, lang, type = 'transfer') {
    const reasons = type === 'transfer' ? TRANSFER_REASONS : UNIVERSITY_REASONS;
    return keys.map(key => reasons[key]?.[lang] ?? key);
}
//# sourceMappingURL=reportReasons.js.map