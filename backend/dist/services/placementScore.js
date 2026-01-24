/**
 * 插班评分引擎 v1.0
 *
 * 纯规则评分逻辑，不依赖 AI
 * 基于经验规则配置进行可行性评估
 */
import { DISTRICT_COMPETITION, LEVEL_THRESHOLDS, getBandConfig, getGradeFactor, getDistrictFactor, scoreToLevel, getLevelScoreRange, LEVEL_DESCRIPTIONS, CONVERSION_COPIES, DISCLAIMER, } from '../config/index.js';
// 重新导出等级相关配置，方便外部使用
export { scoreToLevel, LEVEL_THRESHOLDS, getLevelScoreRange };
// ============================================================
// 辅助函数
// ============================================================
/**
 * 标准化科目名称
 */
function normalizeSubjectName(name) {
    const normalized = name.toLowerCase().trim();
    const mapping = {
        '英文': 'english',
        '英语': 'english',
        '英國語文': 'english',
        '数学': 'math',
        '數學': 'math',
        '中文': 'chinese',
        '中国语文': 'chinese',
        '中國語文': 'chinese',
        '语文': 'chinese',
    };
    return mapping[normalized] || normalized;
}
/**
 * 获取科目分数
 */
function getSubjectScore(scores, subjectKeys) {
    for (const key of subjectKeys) {
        if (scores[key] !== undefined)
            return scores[key];
        // 尝试标准化后匹配
        const normalized = normalizeSubjectName(key);
        for (const [k, v] of Object.entries(scores)) {
            if (normalizeSubjectName(k) === normalized)
                return v;
        }
    }
    return 0;
}
/**
 * 计算平均分
 */
function calculateAverage(scores) {
    const values = Object.values(scores);
    if (values.length === 0)
        return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}
/**
 * 判断科目状态
 */
function getSubjectStatus(score, required) {
    const gap = score - required;
    if (gap >= 10)
        return 'strong';
    if (gap >= 0)
        return 'adequate';
    if (gap >= -10)
        return 'weak';
    return 'critical';
}
// ============================================================
// 核心评分逻辑
// ============================================================
/**
 * 计算插班可行性评分
 *
 * @param student 学生档案
 * @param targetSchool 目标学校
 * @returns 评分结果
 */
export function calculatePlacementScore(student, targetSchool) {
    const reasons = [];
    const positiveReasons = [];
    const subjectAnalysis = [];
    const riskRadar = [];
    // 获取配置
    const bandConfig = getBandConfig(targetSchool.bandLevel);
    const gradeFactor = getGradeFactor(student.currentGrade);
    const districtFactor = getDistrictFactor(targetSchool.district);
    // 获取核心科目分数
    const englishScore = getSubjectScore(student.scores, ['english', 'English', '英文', '英语']);
    const mathScore = getSubjectScore(student.scores, ['math', 'Math', '数学', '數學']);
    const chineseScore = getSubjectScore(student.scores, ['chinese', 'Chinese', '中文', '语文']);
    const averageScore = calculateAverage(student.scores);
    // ============================================================
    // Step 1: 基础分 (满分 100)
    // ============================================================
    let baseScore = 100;
    // ============================================================
    // Step 2: 英文评估 (-30 ~ +5)
    // ============================================================
    let englishAdjustment = 0;
    const englishGap = englishScore - bandConfig.minEnglish;
    if (englishGap >= 15) {
        englishAdjustment = 5;
        positiveReasons.push(`英文成绩优异 (${englishScore}分)，显著超出目标学校要求`);
    }
    else if (englishGap >= 5) {
        englishAdjustment = 2;
        positiveReasons.push(`英文成绩良好 (${englishScore}分)，达到目标学校要求`);
    }
    else if (englishGap >= 0) {
        englishAdjustment = 0;
        // 刚好达标，不加不减
    }
    else if (englishGap >= -10) {
        englishAdjustment = englishGap * 1.5; // -1 到 -15
        reasons.push(`英文成绩 (${englishScore}分) 略低于目标学校参考线 (${bandConfig.minEnglish}分)`);
    }
    else if (englishGap >= -20) {
        englishAdjustment = -15 + (englishGap + 10) * 1.0; // -15 到 -25
        reasons.push(`英文成绩 (${englishScore}分) 明显低于目标学校要求，需重点提升`);
    }
    else {
        englishAdjustment = -30;
        reasons.push(`英文成绩 (${englishScore}分) 与目标学校要求差距较大，建议重新评估目标`);
    }
    subjectAnalysis.push({
        subject: '英文',
        score: englishScore,
        required: bandConfig.minEnglish,
        status: getSubjectStatus(englishScore, bandConfig.minEnglish),
        gap: englishGap,
        message: englishGap >= 0
            ? `达到 Band ${targetSchool.bandLevel} 参考线`
            : `距离参考线差 ${Math.abs(englishGap)} 分`
    });
    // ============================================================
    // Step 3: 数学评估 (-25 ~ +5)
    // ============================================================
    let mathAdjustment = 0;
    const mathGap = mathScore - bandConfig.minMath;
    if (mathGap >= 15) {
        mathAdjustment = 5;
        positiveReasons.push(`数学成绩优异 (${mathScore}分)，具有明显优势`);
    }
    else if (mathGap >= 5) {
        mathAdjustment = 2;
        positiveReasons.push(`数学成绩良好 (${mathScore}分)，达到目标学校要求`);
    }
    else if (mathGap >= 0) {
        mathAdjustment = 0;
    }
    else if (mathGap >= -10) {
        mathAdjustment = mathGap * 1.2;
        reasons.push(`数学成绩 (${mathScore}分) 略低于目标学校参考线 (${bandConfig.minMath}分)`);
    }
    else if (mathGap >= -20) {
        mathAdjustment = -12 + (mathGap + 10) * 0.8;
        reasons.push(`数学成绩 (${mathScore}分) 需要显著提升`);
    }
    else {
        mathAdjustment = -25;
        reasons.push(`数学成绩 (${mathScore}分) 与目标学校要求差距较大`);
    }
    subjectAnalysis.push({
        subject: '数学',
        score: mathScore,
        required: bandConfig.minMath,
        status: getSubjectStatus(mathScore, bandConfig.minMath),
        gap: mathGap,
        message: mathGap >= 0
            ? `达到 Band ${targetSchool.bandLevel} 参考线`
            : `距离参考线差 ${Math.abs(mathGap)} 分`
    });
    // ============================================================
    // Step 4: 中文评估 (-15 ~ +3)
    // ============================================================
    let chineseAdjustment = 0;
    const chineseGap = chineseScore - bandConfig.minChinese;
    if (chineseGap >= 15) {
        chineseAdjustment = 3;
        positiveReasons.push(`中文成绩优秀 (${chineseScore}分)`);
    }
    else if (chineseGap >= 5) {
        chineseAdjustment = 1;
    }
    else if (chineseGap >= 0) {
        chineseAdjustment = 0;
    }
    else if (chineseGap >= -15) {
        chineseAdjustment = chineseGap * 0.8;
        reasons.push(`中文成绩 (${chineseScore}分) 略低于目标学校参考线`);
    }
    else {
        chineseAdjustment = -15;
        reasons.push(`中文成绩 (${chineseScore}分) 需要加强`);
    }
    subjectAnalysis.push({
        subject: '中文',
        score: chineseScore,
        required: bandConfig.minChinese,
        status: getSubjectStatus(chineseScore, bandConfig.minChinese),
        gap: chineseGap,
        message: chineseGap >= 0
            ? `达到 Band ${targetSchool.bandLevel} 参考线`
            : `距离参考线差 ${Math.abs(chineseGap)} 分`
    });
    // ============================================================
    // Step 5: 年级敏感度调整 (-20 ~ 0)
    // ============================================================
    let gradeAdjustment = 0;
    if (gradeFactor > 1.0) {
        // 高年级扣分
        gradeAdjustment = -(gradeFactor - 1.0) * 20;
        if (student.currentGrade === 'S5' || student.currentGrade === 'S6') {
            reasons.push(`${student.currentGrade} 插班名额稀缺，竞争非常激烈`);
        }
        else if (student.currentGrade === 'S4') {
            reasons.push(`${student.currentGrade} 已进入 DSE 选科阶段，插班难度增加`);
        }
        else {
            reasons.push(`${student.currentGrade} 年级插班有一定难度`);
        }
    }
    else if (gradeFactor < 1.0) {
        // 低年级略微加分
        gradeAdjustment = (1.0 - gradeFactor) * 5;
        positiveReasons.push(`${student.currentGrade} 年级插班相对容易，名额较多`);
    }
    // ============================================================
    // Step 6: 区域竞争调整 (-10 ~ 0)
    // ============================================================
    let districtAdjustment = 0;
    const districtConfig = DISTRICT_COMPETITION[targetSchool.district];
    if (districtFactor > 1.1) {
        districtAdjustment = -(districtFactor - 1.0) * 50;
        reasons.push(`${targetSchool.district} 为插班热门区域，竞争程度: ${districtConfig?.level || '高'}`);
    }
    else if (districtFactor > 1.0) {
        districtAdjustment = -(districtFactor - 1.0) * 30;
    }
    // ============================================================
    // Step 7: 跨 Band 跳级调整 (-20 ~ 0)
    // ============================================================
    let bandJumpAdjustment = 0;
    if (student.currentBand && student.currentBand > targetSchool.bandLevel) {
        const bandGap = student.currentBand - targetSchool.bandLevel;
        if (bandGap >= 2) {
            bandJumpAdjustment = -20;
            reasons.push(`从 Band ${student.currentBand} 跨越至 Band ${targetSchool.bandLevel}，跨度较大，难度极高`);
        }
        else {
            bandJumpAdjustment = -10;
            reasons.push(`从 Band ${student.currentBand} 提升至 Band ${targetSchool.bandLevel}，需要充分准备`);
        }
    }
    else if (student.currentBand && student.currentBand < targetSchool.bandLevel) {
        // 下调 Band，相对容易
        bandJumpAdjustment = 5;
        positiveReasons.push(`目标学校 Band 等级与当前匹配或更低，录取机会较大`);
    }
    // ============================================================
    // Step 8: 加分项
    // ============================================================
    let bonusPoints = 0;
    // 课外活动加分
    if (student.extracurriculars && student.extracurriculars.length >= 3) {
        bonusPoints += 3;
        positiveReasons.push(`丰富的课外活动经历 (${student.extracurriculars.length}项)`);
    }
    else if (student.extracurriculars && student.extracurriculars.length >= 1) {
        bonusPoints += 1;
    }
    // 个人优势加分
    if (student.strengths && student.strengths.length >= 2) {
        bonusPoints += 2;
        positiveReasons.push(`具备明确的个人特长`);
    }
    // 整体成绩优秀加分
    if (averageScore >= 80) {
        bonusPoints += 5;
        positiveReasons.push(`整体成绩优异，平均分 ${averageScore.toFixed(1)} 分`);
    }
    else if (averageScore >= 70) {
        bonusPoints += 2;
    }
    // ============================================================
    // 计算最终分数
    // ============================================================
    const rawScore = baseScore
        + englishAdjustment
        + mathAdjustment
        + chineseAdjustment
        + gradeAdjustment
        + districtAdjustment
        + bandJumpAdjustment
        + bonusPoints;
    // 限制在 0-100 范围内
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    // ============================================================
    // 生成风险雷达
    // ============================================================
    // 英文风险
    if (englishGap < -10) {
        riskRadar.push({ area: '英文', level: 'danger', message: '⚠️ 英文是当前最大挑战' });
    }
    else if (englishGap < 0) {
        riskRadar.push({ area: '英文', level: 'warning', message: '⚠️ 英文成绩存在差距' });
    }
    else {
        riskRadar.push({ area: '英文', level: 'safe', message: '✅ 英文表现达标' });
    }
    // 数学风险
    if (mathGap < -10) {
        riskRadar.push({ area: '数学', level: 'danger', message: '⚠️ 数学需要重点提升' });
    }
    else if (mathGap < 0) {
        riskRadar.push({ area: '数学', level: 'warning', message: '⚠️ 数学成绩存在波动' });
    }
    else {
        riskRadar.push({ area: '数学', level: 'safe', message: '✅ 数学表现稳定' });
    }
    // 中文风险
    if (chineseGap < -10) {
        riskRadar.push({ area: '中文', level: 'danger', message: '⚠️ 中文需要加强' });
    }
    else if (chineseGap < 0) {
        riskRadar.push({ area: '中文', level: 'warning', message: '⚠️ 中文略低于期望' });
    }
    else {
        riskRadar.push({ area: '中文', level: 'safe', message: '✅ 中文表现达标' });
    }
    // 年级风险
    if (gradeFactor >= 1.5) {
        riskRadar.push({ area: '年级', level: 'danger', message: '⚠️ 高年级插班难度大' });
    }
    else if (gradeFactor > 1.0) {
        riskRadar.push({ area: '年级', level: 'warning', message: '⚠️ 需注意年级因素' });
    }
    else {
        riskRadar.push({ area: '年级', level: 'safe', message: '✅ 年级适合插班' });
    }
    // 竞争风险
    if (districtFactor >= 1.15) {
        riskRadar.push({ area: '竞争', level: 'danger', message: '⚠️ 区域竞争极激烈' });
    }
    else if (districtFactor > 1.05) {
        riskRadar.push({ area: '竞争', level: 'warning', message: '⚠️ 区域竞争较激烈' });
    }
    else {
        riskRadar.push({ area: '竞争', level: 'safe', message: '✅ 区域竞争适中' });
    }
    // ============================================================
    // 生成结果
    // ============================================================
    const level = scoreToLevel(finalScore);
    return {
        score: finalScore,
        level,
        levelDescription: LEVEL_DESCRIPTIONS[level],
        reasons,
        positiveReasons,
        subjectAnalysis,
        riskRadar,
        conversionCopy: CONVERSION_COPIES[level],
        disclaimer: DISCLAIMER,
        breakdown: {
            baseScore,
            englishAdjustment: Math.round(englishAdjustment * 10) / 10,
            mathAdjustment: Math.round(mathAdjustment * 10) / 10,
            chineseAdjustment: Math.round(chineseAdjustment * 10) / 10,
            gradeAdjustment: Math.round(gradeAdjustment * 10) / 10,
            districtAdjustment: Math.round(districtAdjustment * 10) / 10,
            bandJumpAdjustment,
            bonusPoints,
            finalScore,
        },
    };
}
// ============================================================
// 批量评估
// ============================================================
/**
 * 批量评估多个目标学校
 */
export function calculateMultiSchoolScore(student, targetSchools) {
    return targetSchools.map(school => ({
        schoolName: school.schoolName,
        ...calculatePlacementScore(student, school),
    }));
}
/**
 * 获取最佳匹配学校
 */
export function getBestMatchSchool(student, targetSchools) {
    if (targetSchools.length === 0)
        return null;
    let bestSchool = targetSchools[0];
    let bestResult = calculatePlacementScore(student, bestSchool);
    for (let i = 1; i < targetSchools.length; i++) {
        const result = calculatePlacementScore(student, targetSchools[i]);
        if (result.score > bestResult.score) {
            bestSchool = targetSchools[i];
            bestResult = result;
        }
    }
    return { school: bestSchool, result: bestResult };
}
/**
 * 简化版评分函数
 *
 * 只返回核心字段：score, level, reasons
 * 适用于快速评估场景
 *
 * 等级映射规则（集中管理于 LEVEL_THRESHOLDS）：
 * - score ≥ 80 → A
 * - 60–79 → B
 * - 45–59 → C
 * - 30–44 → D
 * - < 30 → E
 */
export function getSimpleScore(student, targetSchool) {
    const fullResult = calculatePlacementScore(student, targetSchool);
    return {
        score: fullResult.score,
        level: fullResult.level,
        reasons: fullResult.reasons,
    };
}
/**
 * 批量获取简化评分
 */
export function getMultipleSimpleScores(student, targetSchools) {
    return targetSchools.map(school => {
        const result = getSimpleScore(student, school);
        return {
            schoolName: school.schoolName,
            ...result,
        };
    });
}
// 默认导出
export default {
    // 完整评分
    calculatePlacementScore,
    calculateMultiSchoolScore,
    getBestMatchSchool,
    // 简化评分
    getSimpleScore,
    getMultipleSimpleScores,
    // 等级映射
    scoreToLevel,
    LEVEL_THRESHOLDS,
};
//# sourceMappingURL=placementScore.js.map