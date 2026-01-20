import { ANALYSIS_RULES } from "./analysisRules";
import { SubjectGrade } from "@/shared/domain";

export function analyzeSubjectGrade(
  grade: SubjectGrade
) {
  const rules = ANALYSIS_RULES[grade.subject];
  if (!rules) {
    return {
      riskLevel: "unknown",
      summary: "暂无该科目的分析规则。",
      advice: "建议人工评估。"
    };
  }
  // 公民与社会发展等特殊科目
  if (typeof rules === "object" && grade.value in rules) {
    return rules[grade.value as keyof typeof rules];
  }
  // 普通科目 fallback
  if ("default" in rules) {
    return rules.default;
  }
  return {
    riskLevel: "unknown",
    summary: "无法匹配分析规则。",
    advice: "请检查输入数据。"
  };
}
