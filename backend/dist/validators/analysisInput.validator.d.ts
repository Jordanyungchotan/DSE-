import { LearningStatus, RankPosition, ScoreSource } from "../../../shared/domain";
export declare class AnalysisInputError extends Error {
    status: number;
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
export declare function validateTransferSubjectStatuses(statuses: TransferSubjectStatusInput[]): void;
/**
 * 校验科目成绩数组（用于大学申请分析）
 * - 确保 subject key 在 ALL_SUBJECT_KEYS 列表中
 * - 确保 CSD 只能是 pass/fail
 * - 确保普通科目不能提交 pass/fail
 */
export declare function validateSubjectGrades(grades: SubjectGradeInput[]): void;
/**
 * 校验选修科目数组
 * - 确保每个选修科目 key 在 ELECTIVE_SUBJECT_KEYS 列表中
 */
export declare function validateElectives(electives: string[]): void;
/**
 * 校验插班分析输入（新版 - 基于学习状态）
 *
 * ⚠️ 重要：
 * - 系统分析仅使用 subjectStatuses 中的 status 和 rankPosition
 * - schoolScore 仅作为 reportContext 传入报告生成，不参与分析
 */
export declare function validateTransferAnalysisInputV2(input: {
    targetSchools?: string[];
    grade?: string;
    subjectStatuses?: TransferSubjectStatusInput[];
}): void;
/**
 * 校验插班分析输入（旧版兼容）
 * @deprecated 请使用 validateTransferAnalysisInputV2
 */
export declare function validateTransferAnalysisInput(input: {
    targetSchools?: string[];
    targetGrade?: string;
    electives?: string[];
    grades?: SubjectGradeInput[];
}): void;
/**
 * 校验大学申请分析输入
 *
 * 注意：大学申请分析继续使用 DSE 等级体系
 */
export declare function validateUniversityAnalysisInput(input: {
    targetUniversities?: string[];
    subjects?: string[];
    grades?: SubjectGradeInput[];
}): void;
//# sourceMappingURL=analysisInput.validator.d.ts.map