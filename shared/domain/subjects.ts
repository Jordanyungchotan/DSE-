// ===== 核心科目（必修） =====
export const CORE_SUBJECTS = [
  "中文",
  "英文",
  "数学",
  "公民与社会发展",
] as const;

export type CoreSubject = typeof CORE_SUBJECTS[number];

// ===== 选修科目（权威清单，不可删减） =====
export const ELECTIVE_SUBJECTS = [
  "中國文學",
  "英語文學",
  "中國歷史",
  "經濟",
  "倫理與宗教",
  "地理",
  "歷史",
  "旅遊與款待",
  "生物",
  "化學",
  "物理",
  "資訊及通訊科技",
  "企業、會計與財務概論",
  "設計與應用科技",
  "健康管理與社會關懷",
  "科技與生活",
  "音樂",
  "視覺藝術",
  "體育",
] as const;

export type ElectiveSubject = typeof ELECTIVE_SUBJECTS[number];

// ===== 全部科目（核心 + 选修） =====
export const SUBJECTS = [...CORE_SUBJECTS, ...ELECTIVE_SUBJECTS] as const;

export type Subject = CoreSubject | ElectiveSubject;

// ===== 特殊成绩体系科目 =====
export const HAS_SPECIAL_GRADING: readonly string[] = [
  "公民与社会发展",
];

// ===== 选修科目分类（用于分析系统） =====
export const SCIENCE_ELECTIVES: readonly ElectiveSubject[] = [
  "生物",
  "化學",
  "物理",
  "資訊及通訊科技",
];

export const BUSINESS_ELECTIVES: readonly ElectiveSubject[] = [
  "經濟",
  "企業、會計與財務概論",
];

export const ARTS_SPORTS_ELECTIVES: readonly ElectiveSubject[] = [
  "音樂",
  "視覺藝術",
  "體育",
];

// ===== 兼容性辅助函数（用于 UI 组件和动态字符串检查） =====

/**
 * 类型安全的科目检查
 * 用于检查动态字符串是否为有效科目
 */
export function isValidSubject(value: string): value is Subject {
  return (SUBJECTS as readonly string[]).includes(value);
}

/**
 * 检查是否为核心科目（接受 string 类型）
 */
export function isCoreSubject(value: string): boolean {
  return (CORE_SUBJECTS as readonly string[]).includes(value);
}

/**
 * 检查是否为选修科目（接受 string 类型）
 */
export function isElectiveSubject(value: string): value is ElectiveSubject {
  return (ELECTIVE_SUBJECTS as readonly string[]).includes(value);
}

/**
 * 检查是否为特殊成绩体系科目（接受 string 类型）
 */
export function hasSpecialGrading(value: string): boolean {
  return HAS_SPECIAL_GRADING.includes(value);
}

/**
 * 检查是否为理科选修
 */
export function isScienceElective(value: string): boolean {
  return (SCIENCE_ELECTIVES as readonly string[]).includes(value);
}

/**
 * 检查是否为商科选修
 */
export function isBusinessElective(value: string): boolean {
  return (BUSINESS_ELECTIVES as readonly string[]).includes(value);
}

/**
 * 检查是否为艺术/体育类选修
 */
export function isArtsSportsElective(value: string): boolean {
  return (ARTS_SPORTS_ELECTIVES as readonly string[]).includes(value);
}
