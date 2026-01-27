/**
 * 插班分析 V2 服务
 *
 * 核心原则：
 * 1. 规则引擎是唯一决策来源
 * 2. AI 只能"补充解释"和"生成计划"
 * 3. AI 失败必须自动降级为纯规则结果
 *
 * @version v2
 */
import type { TransferAnalysisResult, TransferSummary, CapabilityAnalysis, SchoolAssessment, TransitionPlan, TransferAnalysisInput, ExternalDataVerification, DataGapExplanation } from '../types/transferAnalysisV2';
interface AIEnhancementResult {
    capabilityAnalyses?: CapabilityAnalysis[];
    transitionPlan?: TransitionPlan;
    summaryEnhancement?: string[];
}
/**
 * 执行纯规则 V2 分析
 *
 * ⚠️ 这是唯一的决策来源，AI 不能修改其结果
 *
 * @param input - 用户输入
 * @returns TransferAnalysisResult (aiEnabled = false)
 */
export declare function executeTransferAnalysisV2(input: TransferAnalysisInput): TransferAnalysisResult;
/**
 * 调用 AI 进行增强分析
 *
 * @param apiKey - DeepSeek API Key
 * @param input - 用户输入
 * @param ruleResult - 规则分析结果
 * @returns AI 增强结果，失败返回 null
 */
export declare function callAIEnhancement(apiKey: string, input: TransferAnalysisInput, ruleResult: TransferAnalysisResult): Promise<AIEnhancementResult | null>;
/**
 * 合并规则结果和 AI 增强结果
 *
 * 合并规则（严格）：
 * - schoolAssessments：完全使用规则结果
 * - summary：规则 summary 不变，但添加 aiContribution
 * - capabilityAnalyses：AI 成功 → 使用 AI，失败 → 使用默认
 * - transitionPlan：AI 成功 → 使用 AI，失败 → 使用默认
 */
export declare function mergeAIEnhancement(ruleResult: TransferAnalysisResult, aiResult: AIEnhancementResult | null): TransferAnalysisResult;
/**
 * 检测数据缺口，确定是否需要触发 AI 核验
 *
 * 触发条件（命中其一即触发）：
 * - 插班名额未知
 * - 学校无历史插班数据
 * - 政策年份不明确
 * - 风险判断基于推断而非事实
 */
export declare function detectDataGaps(input: TransferAnalysisInput, schoolAssessments: SchoolAssessment[]): {
    shouldTrigger: boolean;
    triggerReasons: string[];
    schoolsWithGaps: string[];
};
/**
 * 调用 AI 进行外部数据核验
 *
 * ⚠️ 重要：API Key 缺失时返回 null，不返回默认模板
 * 这是为了确保 aiEnabled 状态准确反映 AI 是否真正执行
 */
export declare function callExternalDataVerification(apiKey: string, input: TransferAnalysisInput, schoolAssessments: SchoolAssessment[], triggerReasons: string[]): Promise<ExternalDataVerification | null>;
/**
 * 为学校评估添加数据缺口解释和融合结论
 */
export declare function enrichSchoolAssessmentsWithVerification(schoolAssessments: SchoolAssessment[], aiSchoolFindings: Array<{
    schoolName: string;
    dataGapExplanation?: DataGapExplanation;
    integratedConclusion?: string;
}> | undefined, verification: ExternalDataVerification): SchoolAssessment[];
/**
 * 为 Summary 添加数据缺口解释和综合结论
 */
export declare function enrichSummaryWithVerification(summary: TransferSummary, verification: ExternalDataVerification): TransferSummary;
/**
 * 完整的带外部核验的分析流程
 *
 * ⚠️ 重要架构原则（强制执行）：
 * 1. 规则引擎不能被 AI 替代 - feasibilityScore/decisionBasis 始终来自规则
 * 2. AI 只能做"增强层（Enhancement Layer）"
 * 3. 任何 AI 未执行的情况必须：aiEnabled = false，禁止使用伪 AI 模板
 *
 * ⚠️ 禁止将模板文字伪装为 AI 分析结果
 * AI 未执行时，必须：
 * 1. aiEnabled = false
 * 2. 不输出任何"根据 AI 分析..."句式
 * 3. 不返回 externalDataVerification（这是 AI 专属模块）
 */
export declare function executeTransferAnalysisV2WithVerification(input: TransferAnalysisInput, apiKey?: string): Promise<TransferAnalysisResult>;
export {};
//# sourceMappingURL=transferAnalysisV2Service.d.ts.map