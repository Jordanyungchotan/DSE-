import {
  SUBJECTS,
  HAS_SPECIAL_GRADING,
  CIVICS_STATUS,
  SubjectGrade
} from "@/shared/domain";

export class AnalysisInputError extends Error {
  status = 400;
}

export function validateSubjectGrades(
  grades: SubjectGrade[]
) {
  for (const { subject, value } of grades) {
    // 1. subject 必须合法
    if (!SUBJECTS.includes(subject)) {
      throw new AnalysisInputError(
        `Invalid subject: ${subject}`
      );
    }

    // 2. 公民与社会发展特殊校验
    if (HAS_SPECIAL_GRADING.includes(subject)) {
      if (
        value !== CIVICS_STATUS.PASS &&
        value !== CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid civics status for ${subject}`
        );
      }
    } else {
      // 3. 普通科目禁止 pass / fail
      if (
        value === CIVICS_STATUS.PASS ||
        value === CIVICS_STATUS.FAIL
      ) {
        throw new AnalysisInputError(
          `Invalid grade value for ${subject}`
        );
      }
    }
  }
}
