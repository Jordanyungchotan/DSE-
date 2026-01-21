import { 
  CIVICS_STATUS,
  SCIENCE_ELECTIVES,
  BUSINESS_ELECTIVES,
  ARTS_SPORTS_ELECTIVES,
} from "../../../shared/domain";

// ===== 公民与社会发展特殊规则 =====
export const CSD_RULES = {
  [CIVICS_STATUS.PASS]: {
    riskLevel: "low",
    summary: "已达到课程要求，对插班或大学申请影响较小。",
    advice: "可将精力集中于核心选修科目的提升。"
  },
  [CIVICS_STATUS.FAIL]: {
    riskLevel: "high",
    summary: "尚未达标，可能对升学及申请产生实质影响。",
    advice: "建议优先补救该科目，避免成为升学短板。"
  }
} as const;

// ===== 核心科目默认规则 =====
export const CORE_SUBJECT_DEFAULT_RULE = {
  riskLevel: "medium",
  summary: "成绩需结合目标院校及整体成绩评估。",
  advice: "建议根据目标院校要求针对性提升。"
} as const;

// ===== 选修科目分类规则（用于 notes 生成） =====
export const ELECTIVE_CATEGORY_NOTES = {
  science: "理科背景，对名校插班竞争更有利。",
  business: "商科取向，需关注学校课程侧重。",
  arts_sports: "部分学校对相关特长有额外考核。",
  other: "选修科目成绩将作为综合评估参考。"
} as const;

// ===== 选修科目默认分析规则 =====
export const ELECTIVE_DEFAULT_RULE = {
  riskLevel: "medium",
  summary: "选修科目成绩将结合整体表现评估。",
  advice: "建议根据目标学校/专业要求针对性提升。"
} as const;

/**
 * 获取选修科目类别
 */
export function getElectiveCategory(subject: string): keyof typeof ELECTIVE_CATEGORY_NOTES {
  if ((SCIENCE_ELECTIVES as readonly string[]).includes(subject)) {
    return "science";
  }
  if ((BUSINESS_ELECTIVES as readonly string[]).includes(subject)) {
    return "business";
  }
  if ((ARTS_SPORTS_ELECTIVES as readonly string[]).includes(subject)) {
    return "arts_sports";
  }
  return "other";
}

/**
 * 获取选修科目 notes
 */
export function getElectiveNotes(subjects: string[]): string[] {
  const notes: string[] = [];
  const categories = new Set<keyof typeof ELECTIVE_CATEGORY_NOTES>();

  for (const subject of subjects) {
    categories.add(getElectiveCategory(subject));
  }

  // 按类别添加 notes
  if (categories.has("science")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.science);
  }
  if (categories.has("business")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.business);
  }
  if (categories.has("arts_sports")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.arts_sports);
  }

  return notes;
}
