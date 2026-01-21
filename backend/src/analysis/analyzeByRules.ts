import { 
  CSD_RULES, 
  CORE_SUBJECT_DEFAULT_RULE, 
  ELECTIVE_DEFAULT_RULE,
  getElectiveCategory,
  getElectiveNotes,
  LEARNING_STATUS_RULES,
  RANK_POSITION_ADJUSTMENTS,
  calculateRiskLevel,
  calculateOverallFeasibility,
} from "./analysisRules";
import { 
  isCoreSubject, 
  isElectiveSubject,
  hasPassFailGrading,
  CIVICS_STATUS,
  LearningStatus,
  RankPosition,
  LanguageCode,
  getSubjectDisplayName,
} from "../../../shared/domain";

// ===== 大学申请分析（保留旧逻辑）=====

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
export function analyzeSubjectGrade(input: SubjectGradeInput): SubjectAnalysisResult {
  const { subject: subjectKey, value } = input;

  // 1. CSD 特殊处理
  if (hasPassFailGrading(subjectKey)) {
    if (value === CIVICS_STATUS.PASS) {
      return { ...CSD_RULES[CIVICS_STATUS.PASS] };
    }
    if (value === CIVICS_STATUS.FAIL) {
      return { ...CSD_RULES[CIVICS_STATUS.FAIL] };
    }
    // fallback
    return {
      riskLevel: "unknown",
      summary: "无法识别的公民与社会发展成绩状态。",
      advice: "请确认成绩为「达标」或「未达标」。"
    };
  }

  // 2. 核心科目（CHINESE_LANGUAGE, ENGLISH_LANGUAGE, MATHEMATICS）
  if (isCoreSubject(subjectKey)) {
    return { ...CORE_SUBJECT_DEFAULT_RULE };
  }

  // 3. 选修科目
  if (isElectiveSubject(subjectKey)) {
    const category = getElectiveCategory(subjectKey);
    return {
      ...ELECTIVE_DEFAULT_RULE,
      category,
    };
  }

  // 4. 未知科目
  return {
    riskLevel: "unknown",
    summary: "暂无该科目的分析规则。",
    advice: "建议人工评估。"
  };
}

/**
 * 分析选修科目组合，生成综合 notes（基于 key 列表）
 */
export function analyzeElectiveCombination(electiveKeys: string[], lang: LanguageCode = 'zh-CN'): string[] {
  return getElectiveNotes(electiveKeys, lang);
}

/**
 * 批量分析科目成绩（基于 key）- 用于大学申请分析
 */
export function analyzeAllSubjects(grades: SubjectGradeInput[], lang: LanguageCode = 'zh-CN'): {
  subjectAnalyses: Array<SubjectAnalysisResult & { subject: string; grade: string }>;
  electiveNotes: string[];
} {
  const subjectAnalyses = grades.map((g) => ({
    subject: g.subject,
    grade: String(g.value),
    ...analyzeSubjectGrade(g),
  }));

  // 收集选修科目 key
  const electiveKeys = grades
    .filter((g) => isElectiveSubject(g.subject))
    .map((g) => g.subject);

  const electiveNotes = analyzeElectiveCombination(electiveKeys, lang);

  return {
    subjectAnalyses,
    electiveNotes,
  };
}

// ===== 插班分析（新版 - 基于学习状态）=====

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
export function analyzeTransferSubjectStatus(
  input: TransferSubjectStatusInput,
  lang: LanguageCode = 'zh-CN'
): TransferSubjectAnalysisResult {
  const { subject, status, rankPosition, schoolScore, scoreSource } = input;

  // 获取学习状态对应的规则
  const statusRule = LEARNING_STATUS_RULES[status];
  
  // 计算最终风险等级（考虑校内位置调整）
  const finalRiskLevel = calculateRiskLevel(status, rankPosition);

  // 构建结果
  const result: TransferSubjectAnalysisResult = {
    subjectKey: subject,
    subjectName: getSubjectDisplayName(subject, lang),
    status,
    riskLevel: finalRiskLevel,
    summary: statusRule.summary[lang],
    advice: statusRule.advice[lang],
  };

  // 添加校内位置备注（如有）
  if (rankPosition) {
    result.rankNote = RANK_POSITION_ADJUSTMENTS[rankPosition].note[lang];
  }

  // 添加校内成绩参考（仅供展示）
  if (schoolScore !== undefined) {
    result.schoolScoreRef = {
      score: schoolScore,
      source: scoreSource || 'latest',
    };
  }

  return result;
}

/**
 * 批量分析插班科目学习状态
 * 
 * 返回：
 * - subjectAnalyses: 各科目分析结果
 * - electiveNotes: 选修科目组合建议
 * - overallFeasibility: 整体可行性评估
 */
export function analyzeTransferSubjectStatuses(
  statuses: TransferSubjectStatusInput[],
  lang: LanguageCode = 'zh-CN'
): {
  subjectAnalyses: TransferSubjectAnalysisResult[];
  electiveNotes: string[];
  overallFeasibility: {
    score: number;
    level: 'A' | 'B' | 'C' | 'D' | 'E';
  };
} {
  // 分析各科目
  const subjectAnalyses = statuses.map((s) => 
    analyzeTransferSubjectStatus(s, lang)
  );

  // 收集选修科目 key
  const electiveKeys = statuses
    .filter((s) => isElectiveSubject(s.subject))
    .map((s) => s.subject);

  const electiveNotes = getElectiveNotes(electiveKeys, lang);

  // 计算整体可行性
  const overallFeasibility = calculateOverallFeasibility(
    statuses.map((s) => ({
      status: s.status,
      rankPosition: s.rankPosition,
    }))
  );

  return {
    subjectAnalyses,
    electiveNotes,
    overallFeasibility,
  };
}
