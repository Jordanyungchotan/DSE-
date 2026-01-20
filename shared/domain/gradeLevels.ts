export const GRADE_LEVEL_OPTIONS = [
  { value: "S1", label: "中一" },
  { value: "S2", label: "中二" },
  { value: "S3", label: "中三" },
  { value: "S4", label: "中四" },
  { value: "S5", label: "中五" },
  { value: "S6", label: "中六" }
] as const;

/**
 * 用于 Ant Design Select 组件的可变版本
 * （Ant Design 的 options 属性需要可变数组）
 */
export const GRADE_LEVEL_SELECT_OPTIONS = GRADE_LEVEL_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));
