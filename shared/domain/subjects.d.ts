/**
 * 支持的语言代码（全项目唯一）
 * zh-HK: 繁体中文（香港）
 * zh-CN: 简体中文
 * en: 英文
 */
export type LanguageCode = 'zh-HK' | 'zh-CN' | 'en';
/**
 * 科目定义结构
 */
export interface SubjectDefinition {
    key: string;
    category: 'core' | 'elective';
    displayName: Record<LanguageCode, string>;
    grading: 'level' | 'passfail';
}
export declare const CORE_SUBJECTS: SubjectDefinition[];
export declare const ELECTIVE_SUBJECTS: SubjectDefinition[];
export declare const ALL_SUBJECTS: SubjectDefinition[];
export type SubjectKey = typeof CORE_SUBJECTS[number]['key'] | typeof ELECTIVE_SUBJECTS[number]['key'];
export declare const ALL_SUBJECT_KEYS: string[];
export declare const CORE_SUBJECT_KEYS: string[];
export declare const ELECTIVE_SUBJECT_KEYS: string[];
export declare const SCIENCE_ELECTIVE_KEYS: readonly ["BIOLOGY", "CHEMISTRY", "PHYSICS", "ICT", "MATHEMATICS_M1", "MATHEMATICS_M2"];
export declare const BUSINESS_ELECTIVE_KEYS: readonly ["ECONOMICS", "BAFS"];
export declare const ARTS_SPORTS_ELECTIVE_KEYS: readonly ["MUSIC", "VISUAL_ARTS", "PHYSICAL_EDUCATION"];
/**
 * 根据 key 获取科目定义
 */
export declare function getSubjectByKey(key: string): SubjectDefinition | undefined;
/**
 * 根据 key 获取科目显示名称
 */
export declare function getSubjectDisplayName(key: string, lang: LanguageCode): string;
/**
 * 检查 key 是否为有效科目
 */
export declare function isValidSubjectKey(key: string): boolean;
/**
 * 检查 key 是否为核心科目
 */
export declare function isCoreSubject(key: string): boolean;
/**
 * 检查 key 是否为选修科目
 */
export declare function isElectiveSubject(key: string): boolean;
/**
 * 检查科目是否使用 Pass/Fail 成绩体系
 */
export declare function hasPassFailGrading(key: string): boolean;
/**
 * 检查是否为理科选修
 */
export declare function isScienceElective(key: string): boolean;
/**
 * 检查是否为商科选修
 */
export declare function isBusinessElective(key: string): boolean;
/**
 * 检查是否为艺术/体育类选修
 */
export declare function isArtsSportsElective(key: string): boolean;
/**
 * 生成 Select 组件的 options（根据语言）
 */
export declare function getSubjectOptions(lang: LanguageCode, category?: 'core' | 'elective'): {
    value: string;
    label: string;
}[];
/**
 * 获取选修科目的分析 notes（基于选修科目类别）
 */
export declare function getElectiveAnalysisNotes(keys: string[], lang: LanguageCode): string[];
/** @deprecated 使用 ALL_SUBJECT_KEYS 替代 */
export declare const SUBJECTS: string[];
/** @deprecated 使用 hasPassFailGrading 替代 */
export declare const HAS_SPECIAL_GRADING: string[];
/** @deprecated 使用 isValidSubjectKey 替代 */
export declare const isValidSubject: typeof isValidSubjectKey;
/** @deprecated 使用 hasPassFailGrading 替代 */
export declare const hasSpecialGrading: typeof hasPassFailGrading;
//# sourceMappingURL=subjects.d.ts.map