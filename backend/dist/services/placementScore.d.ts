/**
 * 插班评分引擎 v1.0
 *
 * 纯规则评分逻辑，不依赖 AI
 * 基于经验规则配置进行可行性评估
 */
import { LEVEL_THRESHOLDS, scoreToLevel, getLevelScoreRange, type FeasibilityLevel, type ConversionCopyConfig } from '../config/index.js';
export { scoreToLevel, LEVEL_THRESHOLDS, getLevelScoreRange, type FeasibilityLevel };
/** 学生档案 */
export interface StudentProfile {
    /** 年龄 */
    age: number;
    /** 当前年级 (S1-S6) */
    currentGrade: string;
    /** 各科成绩 (科目名 -> 分数 0-100) */
    scores: Record<string, number>;
    /** 当前学校名称 */
    currentSchool?: string;
    /** 当前学校 Band 等级 */
    currentBand?: 1 | 2 | 3;
    /** 个人优势 */
    strengths?: string[];
    /** 课外活动 */
    extracurriculars?: string[];
}
/** 目标学校 */
export interface TargetSchool {
    /** 学校名称 */
    schoolName: string;
    /** Band 等级 */
    bandLevel: 1 | 2 | 3;
    /** 所在区域 */
    district: string;
    /** 学校类型 */
    schoolType?: 'boys' | 'girls' | 'coed';
    /** 资助类型 */
    fundingType?: 'government' | 'aided' | 'dss' | 'private';
}
/** 科目分析结果 */
export interface SubjectAnalysis {
    subject: string;
    score: number;
    required: number;
    status: 'strong' | 'adequate' | 'weak' | 'critical';
    gap: number;
    message: string;
}
/** 风险雷达项 */
export interface RiskRadarItem {
    area: string;
    level: 'safe' | 'warning' | 'danger';
    message: string;
}
/** 评分结果 */
export interface PlacementScoreResult {
    /** 总分 (0-100) */
    score: number;
    /** 可行性等级 (A-E) */
    level: FeasibilityLevel;
    /** 等级描述 */
    levelDescription: string;
    /** 扣分原因列表 */
    reasons: string[];
    /** 加分原因列表 */
    positiveReasons: string[];
    /** 科目分析 */
    subjectAnalysis: SubjectAnalysis[];
    /** 风险雷达 */
    riskRadar: RiskRadarItem[];
    /** 转化话术 */
    conversionCopy: ConversionCopyConfig;
    /** 免责声明 */
    disclaimer: string;
    /** 评分明细 */
    breakdown: ScoreBreakdown;
}
/** 评分明细 */
export interface ScoreBreakdown {
    baseScore: number;
    englishAdjustment: number;
    mathAdjustment: number;
    chineseAdjustment: number;
    gradeAdjustment: number;
    districtAdjustment: number;
    bandJumpAdjustment: number;
    bonusPoints: number;
    finalScore: number;
}
/**
 * 计算插班可行性评分
 *
 * @param student 学生档案
 * @param targetSchool 目标学校
 * @returns 评分结果
 */
export declare function calculatePlacementScore(student: StudentProfile, targetSchool: TargetSchool): PlacementScoreResult;
/**
 * 批量评估多个目标学校
 */
export declare function calculateMultiSchoolScore(student: StudentProfile, targetSchools: TargetSchool[]): Array<PlacementScoreResult & {
    schoolName: string;
}>;
/**
 * 获取最佳匹配学校
 */
export declare function getBestMatchSchool(student: StudentProfile, targetSchools: TargetSchool[]): {
    school: TargetSchool;
    result: PlacementScoreResult;
} | null;
/** 简化评分结果（核心字段） */
export interface SimpleScoreResult {
    /** 总分 (0-100) */
    score: number;
    /** 可行性等级 (A-E) */
    level: FeasibilityLevel;
    /** 扣分/风险原因列表 */
    reasons: string[];
}
/**
 * 简化版评分函数
 *
 * 只返回核心字段：score, level, reasons
 * 适用于快速评估场景
 *
 * 等级映射规则（集中管理于 LEVEL_THRESHOLDS）：
 * - score ≥ 80 → A
 * - 60–79 → B
 * - 45–59 → C
 * - 30–44 → D
 * - < 30 → E
 */
export declare function getSimpleScore(student: StudentProfile, targetSchool: TargetSchool): SimpleScoreResult;
/**
 * 批量获取简化评分
 */
export declare function getMultipleSimpleScores(student: StudentProfile, targetSchools: TargetSchool[]): Array<SimpleScoreResult & {
    schoolName: string;
}>;
declare const _default: {
    calculatePlacementScore: typeof calculatePlacementScore;
    calculateMultiSchoolScore: typeof calculateMultiSchoolScore;
    getBestMatchSchool: typeof getBestMatchSchool;
    getSimpleScore: typeof getSimpleScore;
    getMultipleSimpleScores: typeof getMultipleSimpleScores;
    scoreToLevel: typeof scoreToLevel;
    LEVEL_THRESHOLDS: {
        readonly A: 80;
        readonly B: 60;
        readonly C: 45;
        readonly D: 30;
        readonly E: 0;
    };
};
export default _default;
//# sourceMappingURL=placementScore.d.ts.map