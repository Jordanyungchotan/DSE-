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
