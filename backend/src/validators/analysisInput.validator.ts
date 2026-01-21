import {
  SUBJECTS,
  ELECTIVE_SUBJECTS,
  HAS_SPECIAL_GRADING,
  CIVICS_STATUS,
  SubjectGrade,
  isValidSubject,
  isElectiveSubject,
} from "../../../shared/domain";

export class AnalysisInputError extends Error {
  status = 400;
}

/**
 * 校验科目成绩数组
 * - 确保 subject 在 SUBJECTS 列表中
 * - 确保公民与社会发展只能是 pass/fail
 * - 确保普通科目不能提交 pass/fail
 */
export function validateSubjectGrades(grades: SubjectGrade[]) {
  for (const { subject, value } of grades) {
    // 1. subject 必须合法
    if (!isValidSubject(subject)) {
      throw new AnalysisInputError(
        `Invalid subject: ${subject}`
      );
    }

    // 2. 公民与社会发展特殊校验
    if ((HAS_SPECIAL_GRADING as readonly string[]).includes(subject)) {
      if (
        value !== CIVICS_STATUS.PASS &&
        value !== CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid civics status for ${subject}: expected "pass" or "fail", got "${value}"`
        );
      }
    } else {
      // 3. 普通科目禁止 pass / fail
      if (
        value === CIVICS_STATUS.PASS ||
        value === CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid grade value for ${subject}: "pass"/"fail" only allowed for CSD`
        );
      }
    }
  }
}

/**
 * 校验选修科目数组
 * - 确保每个选修科目在 ELECTIVE_SUBJECTS 列表中
 */
export function validateElectives(electives: string[]) {
  for (const subject of electives) {
    if (!isElectiveSubject(subject)) {
      throw new AnalysisInputError(
        `Invalid elective subject: ${subject}`
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
  grades?: SubjectGrade[];
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
  grades?: SubjectGrade[];
}) {
  // 校验科目
  if (input.subjects) {
    for (const subject of input.subjects) {
      if (!isValidSubject(subject)) {
        throw new AnalysisInputError(
          `Invalid subject: ${subject}`
        );
      }
    }
  }

  // 校验成绩
  if (input.grades && input.grades.length > 0) {
    validateSubjectGrades(input.grades);
  }
}
