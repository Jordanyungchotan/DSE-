import { 
  CIVICS_STATUS,
  SCIENCE_ELECTIVE_KEYS,
  BUSINESS_ELECTIVE_KEYS,
  ARTS_SPORTS_ELECTIVE_KEYS,
  isScienceElective,
  isBusinessElective,
  isArtsSportsElective,
  LearningStatus,
  RankPosition,
  LanguageCode,
} from "../../../shared/domain";

// ===== 学习状态分析规则（插班分析专用）=====

/**
 * 学习状态对应的风险等级和分析结果
 * 
 * ⚠️ 重要设计原则：
 * - 系统判断仅基于 status 和 rankPosition
 * - 不使用任何分数或等级数据
 * - schoolScore 不参与任何分析逻辑
 */
export const LEARNING_STATUS_RULES: Record<LearningStatus, {
  riskLevel: 'low' | 'medium' | 'high';
  summary: Record<LanguageCode, string>;
  advice: Record<LanguageCode, string>;
}> = {
  strong: {
    riskLevel: 'low',
    summary: {
      'zh-HK': '學習狀態良好，在該科目有明顯優勢。',
      'zh-CN': '学习状态良好，在该科目有明显优势。',
      en: 'Good learning status, has clear advantage in this subject.',
    },
    advice: {
      'zh-HK': '保持現有學習節奏，可作為插班競爭優勢。',
      'zh-CN': '保持现有学习节奏，可作为插班竞争优势。',
      en: 'Maintain current learning pace, can be a competitive advantage for transfer.',
    },
  },
  ok: {
    riskLevel: 'medium',
    summary: {
      'zh-HK': '學習狀態一般，勉強跟得上課程進度。',
      'zh-CN': '学习状态一般，勉强跟得上课程进度。',
      en: 'Average learning status, barely keeping up with the curriculum.',
    },
    advice: {
      'zh-HK': '建議加強該科目學習，提升插班競爭力。',
      'zh-CN': '建议加强该科目学习，提升插班竞争力。',
      en: 'Suggest strengthening this subject to improve transfer competitiveness.',
    },
  },
  weak: {
    riskLevel: 'high',
    summary: {
      'zh-HK': '學習狀態較弱，明顯吃力，可能影響插班申請。',
      'zh-CN': '学习状态较弱，明显吃力，可能影响插班申请。',
      en: 'Weak learning status, clearly struggling, may affect transfer application.',
    },
    advice: {
      'zh-HK': '需重點補強該科目，建議尋求專業輔導。',
      'zh-CN': '需重点补强该科目，建议寻求专业辅导。',
      en: 'Need to focus on improving this subject, suggest seeking professional tutoring.',
    },
  },
};

/**
 * 校内位置对风险等级的调整
 * - top: 降低风险
 * - mid: 不变
 * - bottom: 提高风险
 */
export const RANK_POSITION_ADJUSTMENTS: Record<RankPosition, {
  riskAdjustment: -1 | 0 | 1;
  note: Record<LanguageCode, string>;
}> = {
  top: {
    riskAdjustment: -1,
    note: {
      'zh-HK': '在班級/年級排名靠前，競爭力較強。',
      'zh-CN': '在班级/年级排名靠前，竞争力较强。',
      en: 'Ranked high in class/grade, strong competitiveness.',
    },
  },
  mid: {
    riskAdjustment: 0,
    note: {
      'zh-HK': '在班級/年級排名中等。',
      'zh-CN': '在班级/年级排名中等。',
      en: 'Ranked average in class/grade.',
    },
  },
  bottom: {
    riskAdjustment: 1,
    note: {
      'zh-HK': '在班級/年級排名較後，需加強努力。',
      'zh-CN': '在班级/年级排名较后，需加强努力。',
      en: 'Ranked lower in class/grade, need more effort.',
    },
  },
};

/**
 * 根据学习状态和校内位置计算最终风险等级
 */
export function calculateRiskLevel(
  status: LearningStatus,
  rankPosition?: RankPosition
): 'low' | 'medium' | 'high' {
  const baseRiskLevels = { low: 0, medium: 1, high: 2 };
  const reverseRiskLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  
  let riskScore = baseRiskLevels[LEARNING_STATUS_RULES[status].riskLevel];
  
  if (rankPosition) {
    riskScore += RANK_POSITION_ADJUSTMENTS[rankPosition].riskAdjustment;
  }
  
  // 限制在 0-2 范围内
  riskScore = Math.max(0, Math.min(2, riskScore));
  
  return reverseRiskLevels[riskScore];
}

// ===== CSD 特殊规则（基于 key: CITIZENSHIP_AND_SOCIAL_DEVELOPMENT） =====
// 保留用于大学申请分析
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

// ===== 核心科目默认规则（保留用于大学申请分析）=====
export const CORE_SUBJECT_DEFAULT_RULE = {
  riskLevel: "medium",
  summary: "成绩需结合目标院校及整体成绩评估。",
  advice: "建议根据目标院校要求针对性提升。"
} as const;

// ===== 选修科目分类规则（用于 notes 生成） =====
export const ELECTIVE_CATEGORY_NOTES: Record<string, Record<LanguageCode, string>> = {
  science: {
    'zh-HK': '理科背景，對名校插班競爭更有利。',
    'zh-CN': '理科背景，对名校插班竞争更有利。',
    en: 'Science background, more advantageous for competitive school transfers.',
  },
  business: {
    'zh-HK': '商科取向，需關注學校課程側重。',
    'zh-CN': '商科取向，需关注学校课程侧重。',
    en: 'Business-oriented, need to pay attention to school curriculum focus.',
  },
  arts_sports: {
    'zh-HK': '部分學校對相關特長有額外考核。',
    'zh-CN': '部分学校对相关特长有额外考核。',
    en: 'Some schools have additional assessments for related talents.',
  },
  other: {
    'zh-HK': '選修科目成績將作為綜合評估參考。',
    'zh-CN': '选修科目成绩将作为综合评估参考。',
    en: 'Elective subject results will be used as a comprehensive assessment reference.',
  },
};

// ===== 选修科目默认分析规则 =====
export const ELECTIVE_DEFAULT_RULE = {
  riskLevel: "medium",
  summary: "选修科目成绩将结合整体表现评估。",
  advice: "建议根据目标学校/专业要求针对性提升。"
} as const;

/**
 * 获取选修科目类别（基于 key）
 */
export function getElectiveCategory(subjectKey: string): keyof typeof ELECTIVE_CATEGORY_NOTES {
  if (isScienceElective(subjectKey)) {
    return "science";
  }
  if (isBusinessElective(subjectKey)) {
    return "business";
  }
  if (isArtsSportsElective(subjectKey)) {
    return "arts_sports";
  }
  return "other";
}

/**
 * 获取选修科目 notes（基于 key 列表，支持多语言）
 */
export function getElectiveNotes(subjectKeys: string[], lang: LanguageCode = 'zh-CN'): string[] {
  const notes: string[] = [];
  const categories = new Set<keyof typeof ELECTIVE_CATEGORY_NOTES>();

  for (const key of subjectKeys) {
    categories.add(getElectiveCategory(key));
  }

  // 按类别添加 notes
  if (categories.has("science")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.science[lang]);
  }
  if (categories.has("business")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.business[lang]);
  }
  if (categories.has("arts_sports")) {
    notes.push(ELECTIVE_CATEGORY_NOTES.arts_sports[lang]);
  }

  return notes;
}

// ===== 整体可行性评估规则 =====

/**
 * 根据科目学习状态计算整体可行性分数
 * 
 * 评分规则：
 * - strong: 30 分
 * - ok: 20 分
 * - weak: 10 分
 * - 校内位置调整: top +5, mid 0, bottom -5
 * 
 * 最终可行性等级：
 * - A: 90+ (平均 strong)
 * - B: 70-89 (大部分 ok 或更好)
 * - C: 50-69 (部分 weak)
 * - D: 30-49 (多数 weak)
 * - E: <30 (全部 weak)
 */
export function calculateOverallFeasibility(
  statuses: Array<{
    status: LearningStatus;
    rankPosition?: RankPosition;
  }>
): {
  score: number;
  level: 'A' | 'B' | 'C' | 'D' | 'E';
} {
  if (statuses.length === 0) {
    return { score: 0, level: 'E' };
  }

  const statusScores: Record<LearningStatus, number> = {
    strong: 30,
    ok: 20,
    weak: 10,
  };

  const rankAdjustments: Record<RankPosition, number> = {
    top: 5,
    mid: 0,
    bottom: -5,
  };

  let totalScore = 0;
  for (const item of statuses) {
    let subjectScore = statusScores[item.status];
    if (item.rankPosition) {
      subjectScore += rankAdjustments[item.rankPosition];
    }
    totalScore += subjectScore;
  }

  // 计算平均分（满分 35）
  const avgScore = totalScore / statuses.length;
  // 转换为百分制
  const normalizedScore = Math.round((avgScore / 35) * 100);

  let level: 'A' | 'B' | 'C' | 'D' | 'E';
  if (normalizedScore >= 90) {
    level = 'A';
  } else if (normalizedScore >= 70) {
    level = 'B';
  } else if (normalizedScore >= 50) {
    level = 'C';
  } else if (normalizedScore >= 30) {
    level = 'D';
  } else {
    level = 'E';
  }

  return { score: normalizedScore, level };
}
