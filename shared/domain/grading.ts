import { CivicsStatus } from "./civics";

export type GradeValue = string | CivicsStatus;

/**
 * 科目成绩接口（使用 key）
 */
export interface SubjectGrade {
  /** 科目 key（英文标识符） */
  subjectKey: string;
  /** 成绩值 */
  value: GradeValue;
}

/** @deprecated 使用 SubjectGrade.subjectKey 替代 */
export interface LegacySubjectGrade {
  subject: string;
  value: GradeValue;
}
