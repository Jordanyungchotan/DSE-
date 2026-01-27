/**
 * 插班分析 V2 数据结构定义
 *
 * 设计原则：
 * 1. 不复用 JUPAS / DSE 的 subjectAnalyses（因为插班不需要 DSE 成绩）
 * 2. 不假设有 DSE 成绩输入
 * 3. 所有字段都必须可选或有明确用途，避免空数组 bug
 *
 * @version v2
 * @module transferAnalysisV2
 */
/**
 * 插班分析完整结果
 *
 * 这是插班分析 API 返回的顶层结构
 */
export interface TransferAnalysisResult {
    /** 分析记录唯一标识（UUID） */
    analysisId: string;
    /** 分析类型，固定为 'transfer' */
    analysisType: 'transfer';
    /** 是否启用了 AI 增强分析 */
    aiEnabled: boolean;
    /** 分析摘要 */
    summary: TransferSummary;
    /** 能力维度分析（替代 subjectAnalyses） */
    capabilityAnalyses: CapabilityAnalysis[];
    /** 目标学校评估列表 */
    schoolAssessments: SchoolAssessment[];
    /** 过渡/学习计划（替代 studyPlan） */
    transitionPlan: TransitionPlan;
    /**
     * AI 外部数据核验结果（V2 新增）
     *
     * 当系统检测到数据缺失时自动触发
     * 用于增强报告的现实可信度
     */
    externalDataVerification?: ExternalDataVerification;
    /** 分析元数据 */
    meta: AnalysisMeta;
}
/**
 * 能力分析维度类型
 *
 * - English: 英语能力（EMI 学校尤为重要）
 * - Math: 数学能力（理科学校参考）
 * - AcademicFoundation: 学术基础（整体学力）
 * - LearningAdaptability: 学习适应能力（转校适应）
 * - DisciplineFit: 校规/校风契合度
 */
export type CapabilityDimension = 'English' | 'Math' | 'AcademicFoundation' | 'LearningAdaptability' | 'DisciplineFit';
/**
 * 能力评估等级
 */
export type CapabilityLevel = '强' | '中' | '弱';
/**
 * 能力维度分析
 *
 * 用于替代 JUPAS 的 subjectAnalyses
 * 插班分析关注的是综合能力而非具体 DSE 科目
 */
export interface CapabilityAnalysis {
    /** 能力维度 */
    dimension: CapabilityDimension;
    /** 评估等级 */
    level: CapabilityLevel;
    /** 能力描述（简短说明当前状态） */
    description: string;
    /** 对插班申请的影响说明 */
    impact: string;
    /** 改进建议 */
    suggestion: string;
}
/**
 * 风险等级
 */
export type RiskLevel = '低' | '中' | '高';
/**
 * 申请策略建议
 *
 * - 保底: 把握较大，建议优先申请
 * - 目标: 有一定机会，可作为主要目标
 * - 冲刺: 难度较高，作为冲刺选项
 */
export type RecommendationType = '保底' | '目标' | '冲刺';
/**
 * 目标学校评估
 *
 * 每所目标学校的详细评估结果
 */
export interface SchoolAssessment {
    /** 学校名称 */
    schoolName: string;
    /** 目标年级/班别（如 "中四"） */
    programme: string;
    /** 匹配度评分（0-100） */
    matchScore: number;
    /** 风险等级 */
    riskLevel: RiskLevel;
    /** 申请策略建议 */
    recommendation: RecommendationType;
    /** 学校的申请要求/条件 */
    requirements: string[];
    /** 申请者与学校要求的差距 */
    gaps: string[];
    /** 补充说明（学校特点、注意事项等） */
    notes: string[];
    /**
     * 该学校的数据缺口解释（V2 新增）
     *
     * 替代"暂无数据"的结构化三段式输出
     * 只有当该学校存在数据缺口时才有值
     */
    dataGapExplanations?: DataGapExplanation[];
    /**
     * 融合结论（V2 新增）
     *
     * 系统规则结论 + AI 网络现实对照 + 针对该学生的行动建议
     * 必须达到三层信息融合的层级
     */
    integratedConclusion?: string;
}
/**
 * 过渡/学习计划
 *
 * 用于替代 JUPAS 的 studyPlan
 * 插班关注的是转校过渡期的准备，而非 DSE 备考
 */
export interface TransitionPlan {
    /** 短期计划（申请前准备，1-2个月） */
    shortTerm: string[];
    /** 中期计划（入学后适应，3-6个月） */
    midTerm: string[];
    /** 风险提示（可能遇到的困难） */
    riskWarnings: string[];
}
/**
 * 整体可行性等级
 */
export type OverallLevel = '稳妥' | '可尝试' | '高风险';
/**
 * 插班分析摘要
 *
 * 提供分析结果的概览
 */
export interface TransferSummary {
    /** 整体可行性等级 */
    overallLevel: OverallLevel;
    /** 可行性评分（0-100） */
    feasibilityScore: number;
    /** 主要优势 */
    keyAdvantages: string[];
    /** 主要风险 */
    keyRisks: string[];
    /**
     * 决策依据（规则引擎解释）
     *
     * 回答"这个结论是如何得出的？"
     * - 至少 3 条
     * - 纯规则生成
     */
    decisionBasis: string[];
    /**
     * AI 实际参与内容（可选）
     *
     * 仅当 AI 增强成功时存在
     * - 描述 AI 实际生成的内容
     * - AI 失败/未启用时不存在
     */
    aiContribution?: string[];
    /**
     * 整体数据缺口解释（V2 新增）
     *
     * 当分析中存在全局性数据缺口时使用
     */
    dataGapExplanations?: DataGapExplanation[];
    /**
     * 综合现实结论（V2 新增）
     *
     * 融合三层信息：系统规则结论 + AI 网络现实对照 + 行动建议
     */
    integratedRealityConclusion?: string;
}
/**
 * 数据可用性等级
 */
export type DataAvailability = '充分' | '有限' | '极少' | '几乎没有';
/**
 * 对评估的影响程度
 */
export type ImpactLevel = '不影响' | '轻微影响' | '明显影响';
/**
 * AI 外部数据核验结果
 *
 * 当系统检测到数据缺失时，触发 AI 进行网络公开信息核验
 * 这不是实时爬虫，而是基于公开网络常识的综合判断
 */
export interface ExternalDataVerification {
    /** 是否触发了核验 */
    triggered: boolean;
    /** 触发核验的原因 */
    triggerReasons?: string[];
    /** 数据可用性评估 */
    dataAvailability?: DataAvailability;
    /** 公开信息发现（AI 对公开经验的总结） */
    publicFindings?: string[];
    /** 现实推断结论 */
    realityInference?: string;
    /** 对当前评估的影响 */
    impactOnAssessment?: ImpactLevel;
    /** 建议的行动 */
    recommendedActions?: string[];
}
/**
 * 数据缺口结构化解释
 *
 * 用于替代"暂无数据"的三段式输出
 */
export interface DataGapExplanation {
    /** 缺失数据类型（如 "插班名额"、"历史录取数据"） */
    gapType: string;
    /** 为什么缺失（现实原因 + AI 网络判断） */
    whyMissing: string;
    /** 是否影响当前判断（定性说明） */
    impactStatement: string;
    /** 用户可以做什么（可执行建议） */
    userActions: string[];
}
/**
 * 分析元数据
 *
 * 记录分析的技术信息
 */
export interface AnalysisMeta {
    /** 分析生成时间（ISO 8601 格式） */
    generatedAt: string;
    /** 数据结构版本 */
    version: 'v2';
    /** AI 模型信息（如有） */
    aiModel?: string;
    /** AI 调用延迟（毫秒） */
    aiLatency?: number;
}
/**
 * 科目状态输入
 */
export interface SubjectStatusInput {
    subject: string;
    status: 'strong' | 'ok' | 'weak';
    rankPosition?: 'top' | 'top10' | 'top30' | 'mid' | 'middle' | 'bottom' | 'bottom30';
}
/**
 * 插班分析输入参数
 *
 * 用于 /api/transfer/analyze/v2 接口的请求体
 */
export interface TransferAnalysisInput {
    /** 目标学校列表 */
    targetSchools: string[];
    /** 目标年级 */
    targetGrade?: string;
    /** 语言偏好 */
    languagePreference?: 'EMI' | 'CMI';
    /** 是否启用 AI 增强分析 */
    enableAI?: boolean;
    /** 科目学习状态（用于规则引擎分析） */
    subjectStatuses?: SubjectStatusInput[];
    /** 学生自评能力（可选，用于 AI 分析） */
    selfAssessment?: {
        englishLevel?: 'strong' | 'medium' | 'weak';
        mathLevel?: 'strong' | 'medium' | 'weak';
        academicLevel?: 'strong' | 'medium' | 'weak';
        adaptability?: 'strong' | 'medium' | 'weak';
    };
}
/**
 * 插班分析 API 响应
 */
export interface TransferAnalysisResponse {
    success: boolean;
    data?: {
        analysis_id: string;
        result: TransferAnalysisResult;
    };
    error?: string;
}
//# sourceMappingURL=transferAnalysisV2.d.ts.map