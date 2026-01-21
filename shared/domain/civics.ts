import { LanguageCode } from "./subjects";

export const CIVICS_STATUS = {
  PASS: "pass",
  FAIL: "fail"
} as const;

export type CivicsStatus =
  typeof CIVICS_STATUS[keyof typeof CIVICS_STATUS];

/**
 * CSD 成绩选项（三语支持）
 */
export const CIVICS_OPTIONS: Record<LanguageCode, { value: CivicsStatus; label: string }[]> = {
  'zh-HK': [
    { value: CIVICS_STATUS.PASS, label: "達標" },
    { value: CIVICS_STATUS.FAIL, label: "未達標" }
  ],
  'zh-CN': [
    { value: CIVICS_STATUS.PASS, label: "达标" },
    { value: CIVICS_STATUS.FAIL, label: "未达标" }
  ],
  en: [
    { value: CIVICS_STATUS.PASS, label: "Pass" },
    { value: CIVICS_STATUS.FAIL, label: "Fail" }
  ],
};

/**
 * 获取 CSD 成绩选项（根据语言）
 */
export function getCivicsOptions(lang: LanguageCode) {
  return CIVICS_OPTIONS[lang];
}
