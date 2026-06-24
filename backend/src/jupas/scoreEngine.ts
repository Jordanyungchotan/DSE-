/**
 * JUPAS 加权分计算引擎
 * 
 * 只对 A 类 (WEIGHTED_STRUCTURED) 课程执行加权计算
 * B/C/D 类课程仅计算基础分
 */

import {
  ProgrammeScoringType,
  GRADE_TO_SCORE,
  CITYU_2025_GRADE_TO_SCORE,
  SUBJECT_MAP,
  UserGrades,
  WeightDetail,
  ProgrammeMatchResult,
  ScoringFormulaRow,
} from './types'

/** 将用户的各科成绩转为分数 */
export function gradesToScores(
  grades: UserGrades,
  conversionTable: Record<string, number> = GRADE_TO_SCORE
): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const [subject, grade] of Object.entries(grades)) {
    scores[subject] = conversionTable[grade] ?? 0
  }
  return scores
}

/** 获取分数换算表 */
function getConversionTable(university: string, year: number): Record<string, number> {
  if (university === 'cityu' && year >= 2025) {
    return CITYU_2025_GRADE_TO_SCORE
  }
  return GRADE_TO_SCORE
}

/** 计算 Best N 分数 (取最高 N 科的总分) */
function calcBestN(scores: Record<string, number>, n: number): number {
  return Object.values(scores)
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((sum, s) => sum + s, 0)
}

/** 检查科目约束 */
function checkConstraints(
  userSubjects: string[],
  requireEng: boolean,
  requireMath: boolean,
  requireSpecific: string[]
): { met: boolean; missing: string[] } {
  const missing: string[] = []
  const normalizedSubjects = userSubjects.map(s => s.toLowerCase())

  if (requireEng && !normalizedSubjects.some(s => s.includes('english') || s.includes('eng'))) {
    missing.push('english')
  }
  if (requireMath && !normalizedSubjects.some(s => s.includes('math') || s.includes('mathematics'))) {
    missing.push('math')
  }
  for (const spec of requireSpecific) {
    if (!normalizedSubjects.some(s => s.includes(spec.toLowerCase()))) {
      missing.push(spec)
    }
  }
  return { met: missing.length === 0, missing }
}

/**
 * 计算基础分数 (不加权)
 * 根据 scoring_base 选择计算方式
 */
export function calcBaseScore(
  scores: Record<string, number>,
  scoringBase: string,
  requireEng: boolean,
  requireMath: boolean,
  requireSpecific: string[],
  sixthBonus: number = 0
): number {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])

  switch (scoringBase) {
    case 'best_5': {
      return entries.slice(0, 5).reduce((s, [, v]) => s + v, 0)
    }
    case 'best_6': {
      return entries.slice(0, 6).reduce((s, [, v]) => s + v, 0)
    }
    case '3core_2elec': {
      // 3 核心 + 2 最佳选修
      const coreKeys = ['chinese', 'english', 'math', 'mathematics', 'liberal_studies', 'citizenship']
      const coreScores: number[] = []
      const elecScores: number[] = []
      for (const [subj, score] of entries) {
        if (coreKeys.some(k => subj.toLowerCase().includes(k))) {
          coreScores.push(score)
        } else {
          elecScores.push(score)
        }
      }
      const topCore = coreScores.sort((a, b) => b - a).slice(0, 3)
      const topElec = elecScores.sort((a, b) => b - a).slice(0, 2)
      return [...topCore, ...topElec].reduce((s, v) => s + v, 0)
    }
    case 'best_5_plus_6th_bonus': {
      const best5 = entries.slice(0, 5).reduce((s, [, v]) => s + v, 0)
      const sixth = entries[5]?.[1] ?? 0
      return best5 + sixth * sixthBonus
    }
    default:
      return entries.slice(0, 5).reduce((s, [, v]) => s + v, 0)
  }
}

/**
 * A类课程: 精确加权计算
 * 
 * 计算逻辑:
 * 1. 将用户成绩转换为基础分数
 * 2. 命中 subject_weights 的科目执行乘权
 * 3. 按 scoring_base 选科
 * 4. 返回加权分 + 计算详情
 */
export function calcWeightedScore(
  grades: UserGrades,
  weights: Record<string, number>,
  scoringBase: string,
  university: string,
  year: number,
  requireEng: boolean,
  requireMath: boolean,
  sixthBonus: number = 0
): { weightedScore: number; details: WeightDetail[] } {
  const conversionTable = getConversionTable(university, year)
  const details: WeightDetail[] = []

  // 构建每科的加权分
  const weightedEntries: Array<{ subject: string; weighted: number }> = []

  for (const [subject, grade] of Object.entries(grades)) {
    const baseScore = conversionTable[grade] ?? 0
    const subjectLower = subject.toLowerCase()
    
    // 查找匹配的加权
    let weight = 1
    for (const [wKey, wVal] of Object.entries(weights)) {
      if (subjectLower.includes(wKey.toLowerCase()) || wKey.toLowerCase().includes(subjectLower)) {
        weight = wVal
        break
      }
    }

    // other_elective 的特殊处理
    if (weight === 1 && weights['other_elective']) {
      const coreKeys = ['chinese', 'english', 'math', 'mathematics', 'liberal_studies', 'citizenship']
      const isCore = coreKeys.some(k => subjectLower.includes(k))
      const isSpecificWeighted = Object.keys(weights).some(k => 
        k !== 'other_elective' && subjectLower.includes(k.toLowerCase())
      )
      if (!isCore && !isSpecificWeighted) {
        weight = weights['other_elective']
      }
    }

    const weightedScore = baseScore * weight
    details.push({
      subject,
      subjectLabel: SUBJECT_MAP[subjectLower] || subject,
      grade,
      baseScore,
      weight,
      weightedScore,
    })
    weightedEntries.push({ subject, weighted: weightedScore })
  }

  // 按加权后分数排序
  weightedEntries.sort((a, b) => b.weighted - a.weighted)

  // 根据 scoring_base 选取科目
  let totalWeighted: number
  switch (scoringBase) {
    case 'best_5':
      totalWeighted = weightedEntries.slice(0, 5).reduce((s, e) => s + e.weighted, 0)
      break
    case 'best_6':
      totalWeighted = weightedEntries.slice(0, 6).reduce((s, e) => s + e.weighted, 0)
      break
    case '3core_2elec': {
      const coreKeys = ['chinese', 'english', 'math', 'mathematics', 'liberal_studies', 'citizenship']
      const cores = weightedEntries.filter(e => coreKeys.some(k => e.subject.toLowerCase().includes(k)))
      const elecs = weightedEntries.filter(e => !coreKeys.some(k => e.subject.toLowerCase().includes(k)))
      const topCores = cores.sort((a, b) => b.weighted - a.weighted).slice(0, 3)
      const topElecs = elecs.sort((a, b) => b.weighted - a.weighted).slice(0, 2)
      totalWeighted = [...topCores, ...topElecs].reduce((s, e) => s + e.weighted, 0)
      break
    }
    default:
      totalWeighted = weightedEntries.slice(0, 5).reduce((s, e) => s + e.weighted, 0)
  }

  return { weightedScore: totalWeighted, details }
}

/**
 * 计算单个课程的匹配结果
 */
export function calculateProgrammeMatch(
  row: ScoringFormulaRow,
  grades: UserGrades
): ProgrammeMatchResult {
  const scoringType = row.scoring_type as ProgrammeScoringType
  const conversionTable = getConversionTable(row.university, row.year)
  const scores = gradesToScores(grades, conversionTable)

  // 解析约束
  let includeSpecific: string[] = []
  try {
    includeSpecific = JSON.parse(row.include_specific || '[]')
  } catch { /* ignore */ }

  // 检查约束
  const userSubjects = Object.keys(grades)
  const constraintCheck = checkConstraints(
    userSubjects,
    !!row.include_english,
    !!row.include_math,
    includeSpecific
  )

  // 计算基础分
  const baseScore = calcBaseScore(
    scores,
    row.scoring_base,
    !!row.include_english,
    !!row.include_math,
    includeSpecific,
    row.sixth_subject_bonus
  )

  // A 类: 加权计算
  let weightedScore: number | null = null
  let weightDetails: WeightDetail[] | null = null
  let disclaimer: string | null = null

  if (scoringType === ProgrammeScoringType.WEIGHTED_STRUCTURED) {
    let weights: Record<string, number> = {}
    try {
      weights = JSON.parse(row.subject_weights || '{}')
    } catch { /* ignore */ }

    if (Object.keys(weights).length > 0) {
      const result = calcWeightedScore(
        grades, weights, row.scoring_base,
        row.university, row.year,
        !!row.include_english, !!row.include_math,
        row.sixth_subject_bonus
      )
      weightedScore = result.weightedScore
      weightDetails = result.details
    }
  } else if (scoringType === ProgrammeScoringType.WEIGHTED_DESCRIBED) {
    disclaimer = '该课程有加权规则但尚未完全结构化，显示的是基础分数（保守评估）。'
  }

  // 中位数比较
  const median = row.median
  let meetsMedian: boolean | null = null
  let medianGap: number | null = null
  if (median != null) {
    const compareScore = weightedScore ?? baseScore
    meetsMedian = compareScore >= median
    medianGap = compareScore - median
  }

  return {
    programmeCode: row.programme_code,
    programmeName: row.programme_name || row.programme_code,
    university: row.university,
    scoringType,
    scoringBase: row.scoring_base,
    weightedScore,
    baseScore,
    medianScore: median,
    meetsMedian,
    medianGap,
    weightDetails,
    constraints: {
      requireEnglish: !!row.include_english,
      requireMath: !!row.include_math,
      requireSpecific: includeSpecific,
    },
    meetsConstraints: constraintCheck.met,
    disclaimer,
  }
}

/**
 * 排序规则:
 * 1. WEIGHTED_STRUCTURED 按 weightedScore 降序
 * 2. SUBJECT_CONSTRAINED / SIMPLE 按 baseScore 降序
 * 3. WEIGHTED_DESCRIBED 排最后
 */
export function sortProgrammeResults(results: ProgrammeMatchResult[]): ProgrammeMatchResult[] {
  const typeOrder: Record<string, number> = {
    [ProgrammeScoringType.WEIGHTED_STRUCTURED]: 0,
    [ProgrammeScoringType.SUBJECT_CONSTRAINED]: 1,
    [ProgrammeScoringType.SIMPLE]: 1,
    [ProgrammeScoringType.WEIGHTED_DESCRIBED]: 2,
  }

  return [...results].sort((a, b) => {
    // 先按类型优先级
    const orderA = typeOrder[a.scoringType] ?? 1
    const orderB = typeOrder[b.scoringType] ?? 1
    if (orderA !== orderB) return orderA - orderB

    // 同类型内按分数降序
    const scoreA = a.weightedScore ?? a.baseScore
    const scoreB = b.weightedScore ?? b.baseScore
    return scoreB - scoreA
  })
}
