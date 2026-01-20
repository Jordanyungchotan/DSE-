export const CIVICS_STATUS = {
  PASS: "pass",
  FAIL: "fail"
} as const;

export type CivicsStatus =
  typeof CIVICS_STATUS[keyof typeof CIVICS_STATUS];

export const CIVICS_OPTIONS = [
  { value: CIVICS_STATUS.PASS, label: "达标" },
  { value: CIVICS_STATUS.FAIL, label: "未达标" }
];
