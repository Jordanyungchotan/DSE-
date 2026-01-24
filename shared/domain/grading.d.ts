import { CivicsStatus } from "./civics";
export type GradeValue = string | CivicsStatus;
/**
 * 科目成绩接口（用于大学申请分析）
 *
 * 注意：使用 subject 作为科目 key 字段名
 */
export interface SubjectGrade {
    /** 科目 key（英文标识符） */
    subject: string;
    /** 成绩值 */
    value: GradeValue;
}
/**
 * @deprecated 请使用 SubjectGrade
 */
export interface LegacySubjectGrade {
    subjectKey: string;
    value: GradeValue;
}
//# sourceMappingURL=grading.d.ts.map