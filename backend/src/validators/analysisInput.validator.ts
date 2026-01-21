import {
  ALL_SUBJECT_KEYS,
  ELECTIVE_SUBJECT_KEYS,
  CIVICS_STATUS,
  isValidSubjectKey,
  isElectiveSubject,
  hasPassFailGrading,
} from "../../../shared/domain";

export class AnalysisInputError extends Error {
  status = 400;
}

/**
 * 科目成绩接口（基于 key）
 */
export interface SubjectGradeInput {
  /** 科目 key（英文标识符） */
  subject: string;
  /** 成绩值 */
  value: string;
}

/**
 * 校验科目成绩数组
 * - 确保 subject key 在 ALL_SUBJECT_KEYS 列表中
 * - 确保 CSD 只能是 pass/fail
 * - 确保普通科目不能提交 pass/fail
 */
export function validateSubjectGrades(grades: SubjectGradeInput[]) {
  for (const { subject, value } of grades) {
    // 1. subject key 必须合法
    if (!isValidSubjectKey(subject)) {
      throw new AnalysisInputError(
        `Invalid subject key: ${subject}. Expected one of: ${ALL_SUBJECT_KEYS.join(', ')}`
      );
    }

    // 2. CSD 特殊校验
    if (hasPassFailGrading(subject)) {
      if (
        value !== CIVICS_STATUS.PASS &&
        value !== CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid grade for ${subject}: expected "pass" or "fail", got "${value}"`
        );
      }
    } else {
      // 3. 普通科目禁止 pass / fail
      if (
        value === CIVICS_STATUS.PASS ||
        value === CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid grade for ${subject}: "pass"/"fail" only allowed for CSD`
        );
      }
    }
  }
}

/**
 * 校验选修科目数组
 * - 确保每个选修科目 key 在 ELECTIVE_SUBJECT_KEYS 列表中
 */
export function validateElectives(electives: string[]) {
  for (const subjectKey of electives) {
    if (!isElectiveSubject(subjectKey)) {
      throw new AnalysisInputError(
        `Invalid elective subject key: ${subjectKey}. Expected one of: ${ELECTIVE_SUBJECT_KEYS.join(', ')}`
      );
    }
  }
}

/**
 * 校验插班分析输入
 */
export function validateTransferAnalysisInput(input: {
  targetSchools?: string[];
  targetGrade?: string;
  electives?: string[];
  grades?: SubjectGradeInput[];
}) {
  // 校验选修科目
  if (input.electives && input.electives.length > 0) {
    validateElectives(input.electives);
  }

  // 校验成绩
  if (input.grades && input.grades.length > 0) {
    validateSubjectGrades(input.grades);
  }
}

/**
 * 校验大学申请分析输入
 */
export function validateUniversityAnalysisInput(input: {
  targetUniversities?: string[];
  subjects?: string[];
  grades?: SubjectGradeInput[];
}) {
  // 校验科目 key
  if (input.subjects) {
    for (const subjectKey of input.subjects) {
      if (!isValidSubjectKey(subjectKey)) {
        throw new AnalysisInputError(
          `Invalid subject key: ${subjectKey}`
        );
      }
    }
  }

  // 校验成绩
  if (input.grades && input.grades.length > 0) {
    validateSubjectGrades(input.grades);
  }
}
