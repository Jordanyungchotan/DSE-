import { 
  CSD_RULES, 
  CORE_SUBJECT_DEFAULT_RULE, 
  ELECTIVE_DEFAULT_RULE,
  getElectiveCategory,
  getElectiveNotes,
} from "./analysisRules";
import { 
  isCoreSubject, 
  isElectiveSubject,
  hasPassFailGrading,
  CIVICS_STATUS,
} from "../../../shared/domain";

/**
 * 科目成绩输入接口（基于 key）
 */
export interface SubjectGradeInput {
  /** 科目 key（英文标识符） */
  subjectKey: string;
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
 * 分析单个科目成绩（基于 key）
 */
export function analyzeSubjectGrade(input: SubjectGradeInput): SubjectAnalysisResult {
  const { subjectKey, value } = input;

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
export function analyzeElectiveCombination(electiveKeys: string[]): string[] {
  return getElectiveNotes(electiveKeys);
}

/**
 * 批量分析科目成绩（基于 key）
 */
export function analyzeAllSubjects(grades: SubjectGradeInput[]): {
  subjectAnalyses: Array<SubjectAnalysisResult & { subjectKey: string; grade: string }>;
  electiveNotes: string[];
} {
  const subjectAnalyses = grades.map((g) => ({
    subjectKey: g.subjectKey,
    grade: String(g.value),
    ...analyzeSubjectGrade(g),
  }));

  // 收集选修科目 key
  const electiveKeys = grades
    .filter((g) => isElectiveSubject(g.subjectKey))
    .map((g) => g.subjectKey);

  const electiveNotes = analyzeElectiveCombination(electiveKeys);

  return {
    subjectAnalyses,
    electiveNotes,
  };
}
