export const SUBJECTS = [
  "中文",
  "英文",
  "数学",
  "公民与社会发展",
  "历史",
  "经济",
  "物理",
  "化学",
  "生物",
  "视觉艺术",
  "音乐",
  "体育"
] as const;

export type Subject = typeof SUBJECTS[number];

export const CORE_SUBJECTS: Subject[] = [
  "中文",
  "英文",
  "数学",
  "公民与社会发展"
];

export const ELECTIVE_SUBJECTS: Subject[] = SUBJECTS.filter(
  (subject) => !CORE_SUBJECTS.includes(subject)
);

export const HAS_SPECIAL_GRADING: Subject[] = [
  "公民与社会发展"
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
  return (CORE_SUBJECTS as string[]).includes(value);
}

/**
 * 检查是否为特殊成绩体系科目（接受 string 类型）
 */
export function hasSpecialGrading(value: string): boolean {
  return (HAS_SPECIAL_GRADING as string[]).includes(value);
}
