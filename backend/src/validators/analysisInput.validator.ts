import {
  ALL_SUBJECT_KEYS,
  ELECTIVE_SUBJECT_KEYS,
  CIVICS_STATUS,
  isValidSubjectKey,
  isElectiveSubject,
  hasPassFailGrading,
  isValidLearningStatus,
  isValidRankPosition,
  isValidScoreSource,
  LearningStatus,
  RankPosition,
  ScoreSource,
} from "../../../shared/domain";

export class AnalysisInputError extends Error {
  status = 400;
}

/**
 * 科目成绩接口（基于 key）- 用于大学申请分析
 */
export interface SubjectGradeInput {
  /** 科目 key（英文标识符） */
  subject: string;
  /** 成绩值 */
  value: string;
}

/**
 * 插班科目学习状态输入接口
 * 
 * ⚠️ 重要设计原则：
 * - status: 系统分析的唯一判断依据
 * - schoolScore: 仅供顾问参考，不参与系统分析
 */
export interface TransferSubjectStatusInput {
  /** 科目 key（英文标识符） */
  subject: string;
  
  /** 
   * 学习状态（系统分析主判断）
   * - strong: 明显跟得上 / 有优势
   * - ok: 勉强跟得上
   * - weak: 明显吃力
   */
  status: LearningStatus;
  
  /**
   * 校内相对位置（可选辅助信息）
   * - top: 前 25%
   * - mid: 中间 50%
   * - bottom: 后 25%
   */
  rankPosition?: RankPosition;
  
  /**
   * 校内成绩（0-100）
   * ⚠️ 仅供顾问/老师参考，不得用于系统分析或风险判断
   */
  schoolScore?: number;
  
  /**
   * 成绩来源
   * - latest: 最近一次
   * - average: 学期平均
   */
  scoreSource?: ScoreSource;
}

/**
 * 校验插班科目学习状态数组
 * 
 * 校验规则：
 * 1. subject key 必须合法
 * 2. status 必须为 strong / ok / weak
 * 3. rankPosition 如存在，必须为 top / mid / bottom
 * 4. schoolScore 如存在，必须为 0-100 整数
 * 5. scoreSource 如存在，必须为 latest / average
 * 
 * ⚠️ 注意：schoolScore 仅作为参考信息传入，不参与任何分析逻辑
 */
export function validateTransferSubjectStatuses(statuses: TransferSubjectStatusInput[]) {
  for (const item of statuses) {
    // 1. subject key 必须合法
    if (!isValidSubjectKey(item.subject)) {
      throw new AnalysisInputError(
        `Invalid subject key: ${item.subject}. Expected one of: ${ALL_SUBJECT_KEYS.join(', ')}`
      );
    }

    // 2. status 必须为有效的学习状态
    if (!isValidLearningStatus(item.status)) {
      throw new AnalysisInputError(
        `Invalid learning status for ${item.subject}: expected "strong", "ok", or "weak", got "${item.status}"`
      );
    }

    // 3. rankPosition 校验（可选）
    if (item.rankPosition !== undefined && !isValidRankPosition(item.rankPosition)) {
      throw new AnalysisInputError(
        `Invalid rank position for ${item.subject}: expected "top", "mid", or "bottom", got "${item.rankPosition}"`
      );
    }

    // 4. schoolScore 校验（可选，0-100 整数）
    if (item.schoolScore !== undefined) {
      if (
        typeof item.schoolScore !== 'number' ||
        item.schoolScore < 0 ||
        item.schoolScore > 100 ||
        !Number.isInteger(item.schoolScore)
      ) {
        throw new AnalysisInputError(
          `Invalid school score for ${item.subject}: expected integer 0-100, got "${item.schoolScore}"`
        );
      }
    }

    // 5. scoreSource 校验（可选）
    if (item.scoreSource !== undefined && !isValidScoreSource(item.scoreSource)) {
      throw new AnalysisInputError(
        `Invalid score source for ${item.subject}: expected "latest" or "average", got "${item.scoreSource}"`
      );
    }
  }
}

/**
 * 校验科目成绩数组（用于大学申请分析）
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
 * 校验插班分析输入（新版 - 基于学习状态）
 * 
 * ⚠️ 重要：
 * - 系统分析仅使用 subjectStatuses 中的 status 和 rankPosition
 * - schoolScore 仅作为 reportContext 传入报告生成，不参与分析
 */
export function validateTransferAnalysisInputV2(input: {
  targetSchools?: string[];
  grade?: string;
  subjectStatuses?: TransferSubjectStatusInput[];
}) {
  // 校验学习状态
  if (input.subjectStatuses && input.subjectStatuses.length > 0) {
    validateTransferSubjectStatuses(input.subjectStatuses);
  }
}

/**
 * 校验插班分析输入（旧版兼容）
 * @deprecated 请使用 validateTransferAnalysisInputV2
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
 * 
 * 注意：大学申请分析继续使用 DSE 等级体系
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
