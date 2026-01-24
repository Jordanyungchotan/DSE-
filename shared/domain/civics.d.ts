import { LanguageCode } from "./subjects";
export declare const CIVICS_STATUS: {
    readonly PASS: "pass";
    readonly FAIL: "fail";
};
export type CivicsStatus = typeof CIVICS_STATUS[keyof typeof CIVICS_STATUS];
/**
 * CSD 成绩选项（三语支持）
 */
export declare const CIVICS_OPTIONS: Record<LanguageCode, {
    value: CivicsStatus;
    label: string;
}[]>;
/**
 * 获取 CSD 成绩选项（根据语言）
 */
export declare function getCivicsOptions(lang: LanguageCode): {
    value: CivicsStatus;
    label: string;
}[];
//# sourceMappingURL=civics.d.ts.map