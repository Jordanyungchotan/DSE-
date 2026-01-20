export const DSE_GRADE_OPTIONS = [
  "5**",
  "5*",
  "5",
  "4",
  "3",
  "2",
  "1",
  "U"
] as const;

export type DseGrade = typeof DSE_GRADE_OPTIONS[number];
