/**
 * 申请分析输入模型定义
 *
 * 重要设计原则：
 * - 插班分析：使用学习状态（LearningStatus），不使用任何等级分数
 * - 大学申请分析：保持使用 DSE 等级（SubjectGrade）
 * - 两套系统完全独立，不允许等级逻辑回流到插班分析
 */
import { SubjectKey } from "./subjects";
import { SubjectGrade } from "./grading";
import { LearningStatus, RankPosition, ScoreSource } from "./learningStatus";
/**
 * 插班科目状态（核心输入结构）
 *
 * 设计说明：
 * - status: 系统分析的唯一判断依据
 * - rankPosition: 可选辅助信息
 * - schoolScore: 仅供顾问参考，不参与系统分析
 */
export interface TransferSubjectStatus {
    /** 科目 Key */
    subject: SubjectKey;
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
 * 插班分析完整输入（前后端统一使用）
 *
 * ⚠️ 重要：
 * - 使用 subjectStatuses: TransferSubjectStatus[] 作为科目输入
 * - 完全移除任何 grade / level / scoreLevel / subjects 字段
 * - 系统分析仅基于 status 和 rankPosition
 */
export interface TransferAnalysisInput {
    /** 插班日期 */
    enrollmentDate: string;
    /** 目标学期 */
    semester: string;
    /** 当前就读年级 */
    grade: string;
    /** 学生年龄 */
    age: number;
    /** 当前学校 */
    currentSchool?: string;
    /**
     * 各科目学习状态（核心输入）
     * 系统分析仅使用 status 字段
     */
    subjectStatuses: TransferSubjectStatus[];
    /** 目标学校列表 */
    targetSchools: string[];
    /** 备注 */
    notes?: string;
    /** 兴趣爱好 */
    hobbies?: string[];
    /** 个人特长 */
    strengths?: string[];
    /** 课外活动 */
    extracurriculars?: string[];
    /** 获奖经历 */
    achievements?: string;
}
/**
 * @deprecated 使用 TransferAnalysisInput 替代
 */
export interface TransferApplicationInput {
    targetLevel: "中二" | "中三" | "中四" | "中五";
    subjectStatuses: TransferSubjectStatus[];
    targetSchools?: string[];
    currentGrade?: string;
    currentSchoolType?: string;
}
/**
 * 大学申请分析输入
 *
 * 注意：大学申请分析继续使用 DSE 等级体系
 * 与插班分析完全独立
 */
export interface UniversityApplicationInput {
    /** 目标大学列表 */
    targetUniversities: string[];
    /** 报考科目 */
    subjects: SubjectKey[];
    /**
     * DSE 成绩等级
     * 使用 SubjectGrade（包含 DSE 等级：5**, 5*, 5, 4, 3, 2, 1, U）
     */
    grades: SubjectGrade[];
}
/**
 * 检查是否为有效的插班科目状态
 */
export declare function isValidTransferSubjectStatus(input: unknown): input is TransferSubjectStatus;
/**
 * 检查是否为有效的插班分析输入
 */
export declare function isValidTransferAnalysisInput(input: unknown): input is TransferAnalysisInput;
//# sourceMappingURL=application.d.ts.map