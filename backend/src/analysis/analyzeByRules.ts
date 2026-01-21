import { 
  CSD_RULES, 
  CORE_SUBJECT_DEFAULT_RULE, 
  ELECTIVE_DEFAULT_RULE,
  getElectiveCategory,
  getElectiveNotes,
  ELECTIVE_CATEGORY_NOTES,
} from "./analysisRules";
import { 
  SubjectGrade, 
  isCoreSubject, 
  isElectiveSubject,
  hasSpecialGrading,
  CIVICS_STATUS,
} from "../../../shared/domain";

export interface SubjectAnalysisResult {
  riskLevel: string;
  summary: string;
  advice: string;
  category?: string;
}

/**
 * 分析单个科目成绩
 */
export function analyzeSubjectGrade(grade: SubjectGrade): SubjectAnalysisResult {
  const { subject, value } = grade;

  // 1. 公民与社会发展特殊处理
  if (hasSpecialGrading(subject)) {
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

  // 2. 核心科目（中文、英文、数学）
  if (isCoreSubject(subject)) {
    return { ...CORE_SUBJECT_DEFAULT_RULE };
  }

  // 3. 选修科目
  if (isElectiveSubject(subject)) {
    const category = getElectiveCategory(subject);
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
 * 分析选修科目组合，生成综合 notes
 */
export function analyzeElectiveCombination(electives: string[]): string[] {
  return getElectiveNotes(electives);
}

/**
 * 批量分析科目成绩
 */
export function analyzeAllSubjects(grades: SubjectGrade[]): {
  subjectAnalyses: Array<SubjectAnalysisResult & { subject: string; grade: string }>;
  electiveNotes: string[];
} {
  const subjectAnalyses = grades.map((g) => ({
    subject: g.subject,
    grade: String(g.value),
    ...analyzeSubjectGrade(g),
  }));

  // 收集选修科目
  const electives = grades
    .filter((g) => isElectiveSubject(g.subject))
    .map((g) => g.subject);

  const electiveNotes = analyzeElectiveCombination(electives);

  return {
    subjectAnalyses,
    electiveNotes,
  };
}
