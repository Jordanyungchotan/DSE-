/**
 * 全站 UI 三语文案（唯一来源）
 *
 * 规则：
 * - 所有可见 UI 文字必须从此处获取
 * - 禁止在组件中直接写中文或英文
 * - key 使用大写蛇形命名
 */
export type LanguageCode = 'zh-HK' | 'zh-CN' | 'en';
type I18nText = Record<LanguageCode, string>;
export declare const UI_TEXT: {
    readonly ANALYSIS_FORM_TITLE: I18nText;
    readonly UNIVERSITY_ANALYSIS_TITLE: I18nText;
    readonly RESULT_TITLE: I18nText;
    readonly SUBMIT_BUTTON: I18nText;
    readonly NEXT_STEP: I18nText;
    readonly PREVIOUS_STEP: I18nText;
    readonly CANCEL: I18nText;
    readonly CONFIRM: I18nText;
    readonly SAVE: I18nText;
    readonly DELETE: I18nText;
    readonly BACK: I18nText;
    readonly SELECT_SUBJECT: I18nText;
    readonly SELECT_GRADE: I18nText;
    readonly SELECT_SCHOOL: I18nText;
    readonly CURRENT_SCORE: I18nText;
    readonly TARGET_SCORE: I18nText;
    readonly ENROLLMENT_DATE: I18nText;
    readonly CURRENT_SCHOOL: I18nText;
    readonly TARGET_SCHOOL: I18nText;
    readonly STUDENT_AGE: I18nText;
    readonly NOTES: I18nText;
    readonly RISK_HIGH: I18nText;
    readonly RISK_MEDIUM: I18nText;
    readonly RISK_LOW: I18nText;
    readonly RISK_UNKNOWN: I18nText;
    readonly FEASIBILITY_HIGH: I18nText;
    readonly FEASIBILITY_MEDIUM: I18nText;
    readonly FEASIBILITY_LOW: I18nText;
    readonly OVERALL_ASSESSMENT: I18nText;
    readonly SUBJECT_ANALYSIS: I18nText;
    readonly SCHOOL_ASSESSMENT: I18nText;
    readonly STUDY_PLAN: I18nText;
    readonly RECOMMENDATIONS: I18nText;
    readonly STRENGTHS: I18nText;
    readonly WEAKNESSES: I18nText;
    readonly CORE_SUBJECTS: I18nText;
    readonly ELECTIVE_SUBJECTS: I18nText;
    readonly REQUIRED: I18nText;
    readonly LOADING: I18nText;
    readonly ANALYZING: I18nText;
    readonly SUCCESS: I18nText;
    readonly ERROR: I18nText;
    readonly REQUIRED_FIELD: I18nText;
    readonly INVALID_INPUT: I18nText;
    readonly PASS: I18nText;
    readonly FAIL: I18nText;
    readonly HOME: I18nText;
    readonly TRANSFER_ANALYSIS: I18nText;
    readonly UNIVERSITY_ANALYSIS: I18nText;
    readonly HISTORY: I18nText;
    readonly SETTINGS: I18nText;
    readonly LANGUAGE: I18nText;
    readonly MONTHS: I18nText;
    readonly WEEKS: I18nText;
    readonly DAYS: I18nText;
};
/**
 * 获取 UI 文本
 */
export declare function getUIText(key: keyof typeof UI_TEXT, lang: LanguageCode): string;
/**
 * 风险等级映射
 */
export declare const RISK_LEVEL_TEXT: Record<string, I18nText>;
/**
 * 获取风险等级文本
 */
export declare function getRiskLevelText(level: string, lang: LanguageCode): string;
export {};
//# sourceMappingURL=ui.d.ts.map