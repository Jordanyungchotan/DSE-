/**
 * 分析报告原因三语文案
 *
 * 规则：
 * - 分析系统只输出 reasonKeys（英文 key）
 * - 报告生成时根据 currentLanguage 映射为可读文字
 * - 禁止分析函数中出现中文
 */
import { LanguageCode } from '../i18n/ui';
type I18nText = Record<LanguageCode, string>;
export declare const TRANSFER_REASONS: {
    readonly TRADITIONAL_ELITE_SCHOOL: I18nText;
    readonly BAND_ONE_SCHOOL: I18nText;
    readonly BAND_TWO_SCHOOL: I18nText;
    readonly BAND_THREE_SCHOOL: I18nText;
    readonly LIMITED_PLACES: I18nText;
    readonly POPULAR_DISTRICT: I18nText;
    readonly HIGH_GRADE_TRANSFER: I18nText;
    readonly LOW_GRADE_TRANSFER: I18nText;
    readonly DSE_YEAR_TRANSFER: I18nText;
    readonly EXCELLENT_GRADES: I18nText;
    readonly GOOD_GRADES: I18nText;
    readonly AVERAGE_GRADES: I18nText;
    readonly BELOW_AVERAGE_GRADES: I18nText;
    readonly SCIENCE_BACKGROUND: I18nText;
    readonly BUSINESS_ORIENTATION: I18nText;
    readonly ARTS_SPORTS_TALENT: I18nText;
    readonly SUFFICIENT_PREP_TIME: I18nText;
    readonly LIMITED_PREP_TIME: I18nText;
    readonly URGENT_TIMELINE: I18nText;
};
export declare const UNIVERSITY_REASONS: {
    readonly HIGH_BEST_FIVE: I18nText;
    readonly AVERAGE_BEST_FIVE: I18nText;
    readonly LOW_BEST_FIVE: I18nText;
    readonly COMPETITIVE_PROGRAM: I18nText;
    readonly MODERATE_PROGRAM: I18nText;
    readonly NICHE_PROGRAM: I18nText;
    readonly GOOD_SUBJECT_MATCH: I18nText;
    readonly PARTIAL_SUBJECT_MATCH: I18nText;
    readonly POOR_SUBJECT_MATCH: I18nText;
};
export declare const ADVICE_TEXT: {
    readonly FOCUS_CORE_SUBJECTS: I18nText;
    readonly STRENGTHEN_WEAK_SUBJECTS: I18nText;
    readonly MAINTAIN_CURRENT_LEVEL: I18nText;
    readonly CONSIDER_BACKUP_SCHOOLS: I18nText;
    readonly PREPARE_INTERVIEW: I18nText;
    readonly HIGHLIGHT_STRENGTHS: I18nText;
    readonly CREATE_STUDY_PLAN: I18nText;
    readonly REGULAR_PRACTICE: I18nText;
    readonly SEEK_TUTORING: I18nText;
};
/**
 * 获取插班分析原因文本
 */
export declare function getTransferReasonText(key: keyof typeof TRANSFER_REASONS, lang: LanguageCode): string;
/**
 * 获取大学分析原因文本
 */
export declare function getUniversityReasonText(key: keyof typeof UNIVERSITY_REASONS, lang: LanguageCode): string;
/**
 * 获取建议文本
 */
export declare function getAdviceText(key: keyof typeof ADVICE_TEXT, lang: LanguageCode): string;
/**
 * 批量获取原因文本
 */
export declare function getReasonTexts(keys: string[], lang: LanguageCode, type?: 'transfer' | 'university'): string[];
export {};
//# sourceMappingURL=reportReasons.d.ts.map