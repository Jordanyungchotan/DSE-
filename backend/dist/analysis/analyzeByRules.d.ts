import { LearningStatus, RankPosition, LanguageCode } from "../../../shared/domain";
/**
 * 科目成绩输入接口（基于 key）- 用于大学申请分析
 */
export interface SubjectGradeInput {
    /** 科目 key（英文标识符） */
    subject: string;
    /** 成绩值 */
    value: string;
}
export interface SubjectAnalysisResult {
    riskLevel: string;
    summary: string;
    advice: string;
    category?: string;
}
/**
 * 分析单个科目成绩（基于 key）- 用于大学申请分析
 */
export declare function analyzeSubjectGrade(input: SubjectGradeInput): SubjectAnalysisResult;
/**
 * 分析选修科目组合，生成综合 notes（基于 key 列表）
 */
export declare function analyzeElectiveCombination(electiveKeys: string[], lang?: LanguageCode): string[];
/**
 * 批量分析科目成绩（基于 key）- 用于大学申请分析
 */
export declare function analyzeAllSubjects(grades: SubjectGradeInput[], lang?: LanguageCode): {
    subjectAnalyses: Array<SubjectAnalysisResult & {
        subject: string;
        grade: string;
    }>;
    electiveNotes: string[];
};
/**
 * 插班科目学习状态输入接口
 *
 * ⚠️ 重要设计原则：
 * - status: 系统分析的唯一判断依据
 * - rankPosition: 可选辅助信息
 * - schoolScore: 仅供顾问参考，不参与系统分析
 */
export interface TransferSubjectStatusInput {
    /** 科目 key（英文标识符） */
    subject: string;
    /** 学习状态 */
    status: LearningStatus;
    /** 校内相对位置（可选） */
    rankPosition?: RankPosition;
    /** 校内成绩（仅供参考，不参与分析） */
    schoolScore?: number;
    /** 成绩来源 */
    scoreSource?: 'latest' | 'average';
}
/**
 * 插班科目分析结果
 */
export interface TransferSubjectAnalysisResult {
    /** 科目 key */
    subjectKey: string;
    /** 科目显示名称 */
    subjectName: string;
    /** 学习状态 */
    status: LearningStatus;
    /** 风险等级 */
    riskLevel: 'low' | 'medium' | 'high';
    /** 分析摘要 */
    summary: string;
    /** 建议 */
    advice: string;
    /** 校内位置备注（如有） */
    rankNote?: string;
    /**
     * 校内成绩参考（仅供展示，不参与分析）
     * ⚠️ 报告呈现时可显示为 "校内成绩参考：XX（最近一次）"
     * ❌ 禁止展示为 "相当于 DSE X 级" 或 "等同 Level X"
     */
    schoolScoreRef?: {
        score: number;
        source: 'latest' | 'average';
    };
}
/**
 * 分析单个科目的学习状态（插班分析专用）
 *
 * ⚠️ 重要：
 * - 仅基于 status 和 rankPosition 进行分析
 * - schoolScore 不参与任何分析逻辑
 */
export declare function analyzeTransferSubjectStatus(input: TransferSubjectStatusInput, lang?: LanguageCode): TransferSubjectAnalysisResult;
/**
 * 批量分析插班科目学习状态
 *
 * 返回：
 * - subjectAnalyses: 各科目分析结果
 * - electiveNotes: 选修科目组合建议
 * - overallFeasibility: 整体可行性评估
 */
export declare function analyzeTransferSubjectStatuses(statuses: TransferSubjectStatusInput[], lang?: LanguageCode): {
    subjectAnalyses: TransferSubjectAnalysisResult[];
    electiveNotes: string[];
    overallFeasibility: {
        score: number;
        level: 'A' | 'B' | 'C' | 'D' | 'E';
    };
};
//# sourceMappingURL=analyzeByRules.d.ts.map