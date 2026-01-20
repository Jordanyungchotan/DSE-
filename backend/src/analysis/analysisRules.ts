import { CIVICS_STATUS } from "@/shared/domain";

export const ANALYSIS_RULES = {
  "公民与社会发展": {
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
  },

  // 普通科目示例（先占位，后续可逐步补齐）
  "数学": {
    default: {
      riskLevel: "medium",
      summary: "成绩需结合目标院校及整体成绩评估。",
      advice: "建议根据目标院校要求针对性提升。"
    }
  }
} as const;
