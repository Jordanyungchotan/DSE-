/**
 * 插班可行性评估引擎 v2.0
 *
 * 基于规则系统 + AI推理，提供可行性等级评估
 * 设计原则：
 * - 无真实插班数据，使用经验规则 + 相对匹配度
 * - 禁止输出具体成功百分比
 * - 强调"建议性、非保证"
 * - 转化导向话术设计
 */
// ============================================================
// 🏫 学校规则系统 (School Heuristic Rules)
// ============================================================
/** Band等级规则配置 */
const BAND_RULES = {
    1: {
        minEnglish: 75,
        minMath: 70,
        minChinese: 70,
        minAverage: 72,
        competitionLevel: 'very_high',
        englishIntensity: 'high'
    },
    2: {
        minEnglish: 65,
        minMath: 60,
        minChinese: 55,
        minAverage: 58,
        competitionLevel: 'high',
        englishIntensity: 'medium'
    },
    3: {
        minEnglish: 55,
        minMath: 55,
        minChinese: 50,
        minAverage: 50,
        competitionLevel: 'medium',
        englishIntensity: 'low'
    }
};
/** 年级敏感度系数 (越高=插班越难) */
const GRADE_SENSITIVITY = {
    'S1': 0.8, // 中一相对容易
    'S2': 1.0,
    'S3': 1.2,
    'S4': 1.5, // DSE选科后难度增加
    'S5': 1.7
};
/** 区域竞争强度系数 */
const DISTRICT_COMPETITION = {
    '中西區': { level: '极高', factor: 1.15 },
    '灣仔區': { level: '极高', factor: 1.12 },
    '九龍城區': { level: '极高', factor: 1.18 },
    '沙田區': { level: '高', factor: 1.12 },
    '油尖旺區': { level: '高', factor: 1.10 },
    '西貢區': { level: '高', factor: 1.08 },
    '東區': { level: '中高', factor: 1.05 },
    '南區': { level: '中', factor: 1.02 },
    '大埔區': { level: '中', factor: 1.05 },
    '深水埗區': { level: '中', factor: 1.05 },
    '觀塘區': { level: '中', factor: 1.02 },
    '荃灣區': { level: '中', factor: 1.02 },
    '黃大仙區': { level: '中', factor: 1.00 },
    '葵青區': { level: '中', factor: 1.00 },
    '屯門區': { level: '中', factor: 1.00 },
    '元朗區': { level: '中低', factor: 0.98 },
    '北區': { level: '中低', factor: 0.98 },
    '離島區': { level: '低', factor: 0.95 },
};
// ============================================================
// 👩‍🎓 学生风险规则 (Student Risk Rules)
// ============================================================
const RISK_FACTORS = {
    lowEnglish: {
        threshold: 65,
        message: '英文成绩偏弱，会显著影响插班竞争力'
    },
    lowMath: {
        threshold: 60,
        message: '数学成绩偏弱，影响整体学术表现'
    },
    coreSubjectGap: {
        difference: 10,
        message: '核心科目存在明显短板'
    },
    highGradeSensitivity: {
        grades: ['S4', 'S5'],
        message: '高年级插班名额稀缺，竞争激烈'
    },
    bandJump: {
        message: '跨Band插班难度较大，需充分准备'
    }
};
// ============================================================
// 转化话术系统 (Conversion Copy System)
// ============================================================
const CONVERSION_COPIES = {
    'A': {
        headline: '✨ 你的孩子目前具备插班机会',
        description: '但插班竞争非常激烈，是否能成功，关键在接下来3–6个月的针对性提升。',
        ctaText: '预约一对一升学规划',
        ctaType: 'primary',
        suggestions: [
            '插班强化英文/数学专项班',
            '插班模拟测评',
            '面试技巧培训'
        ]
    },
    'B': {
        headline: '💪 具备一定插班机会',
        description: '核心科目仍有提升空间，通过系统训练可以大幅提升竞争力。',
        ctaText: '了解提升方案',
        ctaType: 'primary',
        suggestions: [
            '3个月能力提升计划',
            '英文阅读写作强化',
            '数学解题专项训练'
        ]
    },
    'C': {
        headline: '📚 以目前成绩直接插班风险较高',
        description: '但通过系统训练是有机会改善条件的，建议制定提升计划。',
        ctaText: '获取提升方案',
        ctaType: 'secondary',
        suggestions: [
            '3个月能力提升计划',
            '插班目标学校可适当调整',
            '基础巩固课程'
        ]
    },
    'D': {
        headline: '⚠️ 不建议在现阶段直接尝试该校插班',
        description: '否则容易对孩子信心造成打击，建议先进行基础提升。',
        ctaText: '制定成绩重建方案',
        ctaType: 'warning',
        suggestions: [
            '成绩重建方案',
            '重新制定插班策略',
            '考虑更现实的目标学校'
        ]
    },
    'E': {
        headline: '🎯 需要重新评估目标',
        description: '当前条件与目标差距较大，建议从更实际的目标开始，逐步实现升学规划。',
        ctaText: '咨询升学顾问',
        ctaType: 'warning',
        suggestions: [
            '长期成绩提升计划',
            '重新制定现实目标',
            '基础学科强化课程'
        ]
    }
};
/** 科目名称映射 */
const SUBJECT_NAMES = {
    'chinese': '中文',
    'Chinese': '中文',
    'english': '英文',
    'English': '英文',
    'math': '数学',
    'Math': '数学',
    'science': '综合科学',
    'Science': '综合科学',
    'liberal': '公民与社会发展',
    'physics': '物理',
    'chemistry': '化学',
    'biology': '生物',
    'economics': '经济',
    'geography': '地理',
    'history': '历史',
};
/** 可行性等级描述 */
const LEVEL_DESCRIPTIONS = {
    'A': '可行性较高 - 学生条件与目标学校要求匹配度良好，建议把握机会',
    'B': '可行性中等 - 需要在部分方面加强，建议重点提升短板科目',
    'C': '可行性一般 - 存在较明显差距，需要较长时间准备和显著提升',
    'D': '可行性较低 - 差距较大，建议重新评估目标或制定长期计划',
    'E': '可行性极低 - 建议先巩固基础，调整目标后再考虑插班'
};
/** 免责声明 */
const DISCLAIMER = `⚠️ 重要声明：本分析基于公开教育资料与经验模型，仅供参考。香港中学插班并无公开成功率或官方成绩门槛，实际录取结果受多种因素影响，包括但不限于学校当年招生名额、面试表现、其他申请者情况等。所有建议不构成任何录取保证，建议结合学校官方信息做出决策。`;
// ============================================================
// 规则引擎核心逻辑
// ============================================================
/**
 * 分析学生能力档案
 */
function analyzeStudentAbility(student) {
    const scores = student.scores;
    // 标准化科目名称（兼容不同大小写）
    const normalizeKey = (key) => key.toLowerCase();
    const getScore = (keys) => {
        for (const k of keys) {
            if (scores[k] !== undefined)
                return scores[k];
            const normalized = Object.keys(scores).find(sk => normalizeKey(sk) === normalizeKey(k));
            if (normalized)
                return scores[normalized];
        }
        return 0;
    };
    const englishScore = getScore(['english', 'English', '英文']);
    const mathScore = getScore(['math', 'Math', '数学']);
    const chineseScore = getScore(['chinese', 'Chinese', '中文']);
    // 计算平均分
    const allScores = Object.values(scores);
    const averageScore = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0;
    // 分析各科目
    const weakSubjects = [];
    const strongSubjects = [];
    for (const [subject, score] of Object.entries(scores)) {
        if (score < 55) {
            weakSubjects.push(subject);
        }
        else if (score >= 75) {
            strongSubjects.push(subject);
        }
    }
    // 核心科目（中英数）平均分
    const coreScores = [englishScore, mathScore, chineseScore].filter(s => s > 0);
    const coreAverage = coreScores.length > 0
        ? coreScores.reduce((a, b) => a + b, 0) / coreScores.length
        : 0;
    let coreSubjectsStatus;
    if (coreAverage >= 75) {
        coreSubjectsStatus = 'strong';
    }
    else if (coreAverage >= 55) {
        coreSubjectsStatus = 'adequate';
    }
    else {
        coreSubjectsStatus = 'weak';
    }
    // 最大分差（用于判断偏科）
    const maxScoreGap = allScores.length > 1
        ? Math.max(...allScores) - Math.min(...allScores)
        : 0;
    // 是否存在明显短板
    const hasSignificantWeakness = englishScore < 50 || mathScore < 50 || chineseScore < 50;
    return {
        coreSubjectsStatus,
        weakSubjects,
        strongSubjects,
        averageScore,
        englishScore,
        mathScore,
        chineseScore,
        hasSignificantWeakness,
        maxScoreGap,
    };
}
/**
 * 生成风险雷达
 */
function generateRiskRadar(student, targetSchool, ability) {
    const bandRules = BAND_RULES[targetSchool.bandLevel];
    const radar = [];
    // 英文风险
    if (ability.englishScore < bandRules.minEnglish - 10) {
        radar.push({
            area: '英文',
            level: 'danger',
            message: '⚠️ 英文是当前最大挑战'
        });
    }
    else if (ability.englishScore < bandRules.minEnglish) {
        radar.push({
            area: '英文',
            level: 'warning',
            message: '⚠️ 英文成绩存在差距'
        });
    }
    else {
        radar.push({
            area: '英文',
            level: 'safe',
            message: '✅ 英文表现达标'
        });
    }
    // 数学风险
    if (ability.mathScore < bandRules.minMath - 10) {
        radar.push({
            area: '数学',
            level: 'danger',
            message: '⚠️ 数学需要重点提升'
        });
    }
    else if (ability.mathScore < bandRules.minMath) {
        radar.push({
            area: '数学',
            level: 'warning',
            message: '⚠️ 数学成绩存在波动'
        });
    }
    else {
        radar.push({
            area: '数学',
            level: 'safe',
            message: '✅ 数学表现稳定'
        });
    }
    // 中文风险
    if (ability.chineseScore < bandRules.minChinese - 10) {
        radar.push({
            area: '中文',
            level: 'danger',
            message: '⚠️ 中文需要加强'
        });
    }
    else if (ability.chineseScore < bandRules.minChinese) {
        radar.push({
            area: '中文',
            level: 'warning',
            message: '⚠️ 中文略低于期望'
        });
    }
    else {
        radar.push({
            area: '中文',
            level: 'safe',
            message: '✅ 中文表现达标'
        });
    }
    // 其他科目
    const otherSubjects = Object.entries(student.scores)
        .filter(([k]) => !['chinese', 'english', 'math', 'Chinese', 'English', 'Math'].includes(k));
    if (otherSubjects.length > 0) {
        const otherAvg = otherSubjects.reduce((sum, [, s]) => sum + s, 0) / otherSubjects.length;
        if (otherAvg >= 60) {
            radar.push({
                area: '其他科目',
                level: 'safe',
                message: '✅ 其他科目表现稳定'
            });
        }
        else {
            radar.push({
                area: '其他科目',
                level: 'warning',
                message: '⚠️ 部分科目需要关注'
            });
        }
    }
    return radar;
}
/**
 * 计算匹配度和风险评分
 */
function calculateMatchingScore(student, targetSchool) {
    const ability = analyzeStudentAbility(student);
    const bandRules = BAND_RULES[targetSchool.bandLevel];
    const districtInfo = DISTRICT_COMPETITION[targetSchool.district] || { level: '中', factor: 1.0 };
    const gradeFactor = GRADE_SENSITIVITY[student.currentGrade] || 1.0;
    const riskFactors = [];
    const positiveFactors = [];
    // 计算调整后的要求分数
    const adjustedMinAverage = bandRules.minAverage * districtInfo.factor * gradeFactor;
    let riskScore = 0;
    // 1. 英文评估（权重最高）
    if (ability.englishScore < bandRules.minEnglish - 15) {
        riskScore += 4;
        riskFactors.push(RISK_FACTORS.lowEnglish.message);
    }
    else if (ability.englishScore < bandRules.minEnglish) {
        riskScore += 2;
        riskFactors.push('英文成绩略低于该校常见插班要求');
    }
    else if (ability.englishScore >= bandRules.minEnglish + 10) {
        positiveFactors.push('英文成绩优秀，具有竞争优势');
    }
    // 2. 数学评估
    if (ability.mathScore < bandRules.minMath - 15) {
        riskScore += 3;
        riskFactors.push(RISK_FACTORS.lowMath.message);
    }
    else if (ability.mathScore < bandRules.minMath) {
        riskScore += 1.5;
        riskFactors.push('数学稳定性不足，容易影响整体竞争力');
    }
    else if (ability.mathScore >= bandRules.minMath + 10) {
        positiveFactors.push('数学表现突出');
    }
    // 3. 核心科目短板
    if (ability.hasSignificantWeakness) {
        riskScore += 2;
        riskFactors.push(RISK_FACTORS.coreSubjectGap.message);
    }
    // 4. 偏科检查
    if (ability.maxScoreGap > 20) {
        riskScore += 1;
        riskFactors.push('各科成绩差距较大，建议均衡发展');
    }
    // 5. 年级因素
    if (RISK_FACTORS.highGradeSensitivity.grades.includes(student.currentGrade)) {
        riskScore += 1.5;
        riskFactors.push(RISK_FACTORS.highGradeSensitivity.message);
    }
    // 6. Band跨越
    if (student.currentBand && student.currentBand > targetSchool.bandLevel) {
        const bandGap = student.currentBand - targetSchool.bandLevel;
        if (bandGap >= 2) {
            riskScore += 4;
            riskFactors.push(`从Band ${student.currentBand}跨越至Band ${targetSchool.bandLevel}挑战较大`);
        }
        else {
            riskScore += 2;
            riskFactors.push(RISK_FACTORS.bandJump.message);
        }
    }
    // 7. 区域竞争
    if (districtInfo.factor >= 1.1) {
        riskScore += 1;
        riskFactors.push(`${targetSchool.district}属于竞争${districtInfo.level}区域`);
    }
    // 8. 整体成绩
    const scoreDiff = ability.averageScore - adjustedMinAverage;
    if (scoreDiff < -15) {
        riskScore += 3;
    }
    else if (scoreDiff < -5) {
        riskScore += 1.5;
    }
    else if (scoreDiff >= 5) {
        positiveFactors.push('整体成绩达到该校期望水平');
    }
    // 正面因素
    if (ability.strongSubjects.length >= 2) {
        positiveFactors.push(`多个科目表现突出（${ability.strongSubjects.map(s => SUBJECT_NAMES[s] || s).join('、')}）`);
    }
    if (student.extracurriculars && student.extracurriculars.length > 0) {
        positiveFactors.push('有丰富的课外活动经历');
    }
    // 确定可行性等级 (A-E)
    let matchLevel;
    if (riskScore <= 1.5 && scoreDiff >= 0) {
        matchLevel = 'A';
    }
    else if (riskScore <= 4 && scoreDiff >= -10) {
        matchLevel = 'B';
    }
    else if (riskScore <= 7) {
        matchLevel = 'C';
    }
    else if (riskScore <= 10) {
        matchLevel = 'D';
    }
    else {
        matchLevel = 'E';
    }
    return { matchLevel, riskFactors, positiveFactors, riskScore };
}
/**
 * 生成科目分析
 */
function generateSubjectAnalysis(student, targetSchool) {
    const bandRules = BAND_RULES[targetSchool.bandLevel];
    const results = [];
    for (const [subject, score] of Object.entries(student.scores)) {
        const subjectName = SUBJECT_NAMES[subject] || subject;
        const lowerSubject = subject.toLowerCase();
        let threshold = bandRules.minAverage;
        if (lowerSubject === 'english')
            threshold = bandRules.minEnglish;
        if (lowerSubject === 'chinese')
            threshold = bandRules.minChinese;
        if (lowerSubject === 'math')
            threshold = bandRules.minMath;
        let status;
        let statusDescription;
        let recommendation;
        if (score >= threshold + 15) {
            status = 'strong';
            statusDescription = '表现优秀，是明显优势科目';
            recommendation = '保持现有水平，可作为加分项展示';
        }
        else if (score >= threshold) {
            status = 'adequate';
            statusDescription = '达到基本要求';
            recommendation = '继续巩固，争取进一步提升';
        }
        else if (score >= threshold - 15) {
            status = 'weak';
            statusDescription = '略低于期望水平，需要加强';
            recommendation = `每天额外投入30-45分钟进行${subjectName}专项训练`;
        }
        else {
            status = 'critical';
            statusDescription = '与期望水平有较大差距';
            recommendation = `${subjectName}是目前最需要突破的科目，建议寻求专业辅导`;
        }
        results.push({
            subject: subjectName,
            score,
            status,
            statusDescription,
            recommendation,
        });
    }
    // 按状态排序（critical在前）
    const statusOrder = { critical: 0, weak: 1, adequate: 2, strong: 3 };
    results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    return results;
}
/**
 * 生成改进计划 (3-6个月可执行)
 */
function generateImprovementPlan(subjectAnalysis, level) {
    const plan = [];
    const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical');
    const weakSubjects = subjectAnalysis.filter(s => s.status === 'weak');
    // 根据等级给出不同建议
    if (level === 'A' || level === 'B') {
        if (weakSubjects.length > 0) {
            plan.push(`未来3个月重点加强${weakSubjects.map(s => s.subject).join('和')}训练`);
        }
        plan.push('通过针对性练习提升解题速度与准确率');
        plan.push('避免同时报考过多高竞争学校');
    }
    else if (level === 'C') {
        if (criticalSubjects.length > 0) {
            plan.push(`优先解决${criticalSubjects.map(s => s.subject).join('、')}的基础问题`);
        }
        plan.push('制定3-6个月系统提升计划');
        plan.push('可考虑将目标学校下调1-2所作为备选');
    }
    else {
        plan.push('建议先进行3个月基础巩固');
        plan.push('重新评估目标学校定位');
        plan.push('建立规律学习习惯，稳扎稳打');
    }
    return plan;
}
/**
 * 生成准备计划
 */
function generatePreparationPlan(subjectAnalysis) {
    const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical');
    const weakSubjects = subjectAnalysis.filter(s => s.status === 'weak');
    const priorityActions = [];
    const shortTermGoals = [];
    const mediumTermGoals = [];
    const resources = [];
    // 优先行动
    if (criticalSubjects.length > 0) {
        priorityActions.push(`立即开始${criticalSubjects.map(s => s.subject).join('、')}的强化训练`);
    }
    if (weakSubjects.length > 0) {
        priorityActions.push(`制定${weakSubjects.map(s => s.subject).join('、')}的提升计划`);
    }
    priorityActions.push('收集目标学校的插班信息和要求');
    priorityActions.push('准备个人简历和过往成绩单');
    // 短期目标（1-2个月）
    criticalSubjects.forEach(s => {
        shortTermGoals.push(`${s.subject}成绩提升至及格线以上`);
    });
    shortTermGoals.push('完成各科知识点梳理');
    shortTermGoals.push('每周进行一次模拟测试');
    // 中期目标（3-4个月）
    weakSubjects.forEach(s => {
        mediumTermGoals.push(`${s.subject}达到目标学校期望水平`);
    });
    mediumTermGoals.push('全面提升综合能力，准备面试');
    mediumTermGoals.push('培养良好学习习惯');
    // 推荐资源
    resources.push('历年插班试题（如有）');
    resources.push('各科精编练习册');
    resources.push('专业补习班或私人导师');
    resources.push('学校开放日和咨询活动');
    return {
        priorityActions,
        shortTermGoals,
        mediumTermGoals,
        resources,
    };
}
/**
 * 生成简短总结 (summary)
 */
function generateSummary(level, ability) {
    const summaries = {
        'A': (a) => `该学生整体表现良好（平均${Math.round(a.averageScore)}分），具备较好的插班条件。`,
        'B': (a) => `该学生具备一定插班机会，但在${a.weakSubjects.length > 0 ? a.weakSubjects.map(s => SUBJECT_NAMES[s] || s).join('、') : '部分科目'}上仍存在提升空间。`,
        'C': (a) => `该学生与目标学校存在一定差距，需要在${a.weakSubjects.length > 0 ? a.weakSubjects.map(s => SUBJECT_NAMES[s] || s).join('、') : '核心科目'}进行较大提升。`,
        'D': () => `以目前条件直接插班风险较高，建议先进行基础提升或调整目标。`,
        'E': () => `当前条件与目标差距较大，建议制定长期提升计划后再考虑插班。`,
    };
    return summaries[level](ability);
}
/**
 * 生成综合评估描述
 */
function generateOverallAssessment(student, targetSchool, level, ability) {
    const gradeMap = {
        'S1': '中一', 'S2': '中二', 'S3': '中三',
        'S4': '中四', 'S5': '中五', 'S6': '中六',
    };
    const gradeName = gradeMap[student.currentGrade] || student.currentGrade;
    const genderText = student.gender === 'female' ? '女' : '男';
    let assessment = `该${gradeName}${genderText}生，${student.age}岁，`;
    assessment += `目前各科平均分约${Math.round(ability.averageScore)}分。`;
    if (level === 'A') {
        assessment += `整体学术表现良好，与目标Band ${targetSchool.bandLevel}学校（${targetSchool.schoolName}）的期望水平较为匹配。`;
        assessment += `核心科目表现${ability.coreSubjectsStatus === 'strong' ? '突出' : '稳定'}，`;
        assessment += `建议把握机会，做好充分准备。`;
    }
    else if (level === 'B') {
        assessment += `学术表现中等偏上，基本符合Band ${targetSchool.bandLevel}学校的要求，`;
        assessment += `但仍有提升空间。建议在接下来的准备期间，`;
        assessment += `重点加强薄弱环节，同时保持优势科目的水平。`;
    }
    else if (level === 'C') {
        assessment += `与目标学校（Band ${targetSchool.bandLevel}）的期望水平存在一定差距。`;
        assessment += `需要在多个方面进行较大幅度的提升，`;
        assessment += `建议制定3-6个月的系统性准备计划。`;
    }
    else if (level === 'D') {
        assessment += `目前条件与目标学校差距较大，`;
        assessment += `直接插班可能面临较大挑战，容易对孩子信心造成影响。`;
        assessment += `建议考虑调整目标学校层次，或制定更长期的提升计划。`;
    }
    else {
        assessment += `当前学术条件与目标学校要求差距明显，`;
        assessment += `建议先进行基础巩固，待条件改善后再考虑插班。`;
        assessment += `可以从更实际的目标开始，逐步实现升学规划。`;
    }
    return assessment;
}
/**
 * 生成建议列表
 */
function generateRecommendations(subjectAnalysis, targetSchool) {
    const recommendations = [];
    const criticalSubjects = subjectAnalysis.filter(s => s.status === 'critical');
    const weakSubjects = subjectAnalysis.filter(s => s.status === 'weak');
    if (criticalSubjects.length > 0) {
        recommendations.push(`优先提升${criticalSubjects.map(s => s.subject).join('和')}，这是目前最需要突破的领域`);
    }
    if (weakSubjects.length > 0) {
        recommendations.push(`加强${weakSubjects.map(s => s.subject).join('、')}的训练，确保达到目标学校期望水平`);
    }
    // Band 1学校特别建议
    if (targetSchool.bandLevel === 1) {
        recommendations.push('提升英语综合能力，包括阅读理解和写作表达');
        recommendations.push('培养批判性思维，准备可能的面试环节');
    }
    // 通用建议
    recommendations.push('定期进行模拟测试，检验学习成效');
    recommendations.push('了解目标学校的办学理念和特色，准备个人陈述');
    recommendations.push('保持良好作息和学习习惯，确保稳定发挥');
    return recommendations.slice(0, 6);
}
// ============================================================
// 主评估函数
// ============================================================
/**
 * 执行可行性评估（规则引擎版）
 */
export function evaluateFeasibility(request) {
    const { student, targetSchool } = request;
    // 分析学生能力
    const ability = analyzeStudentAbility(student);
    // 计算匹配度
    const matching = calculateMatchingScore(student, targetSchool);
    // 生成科目分析
    const subjectAnalysis = generateSubjectAnalysis(student, targetSchool);
    // 生成风险雷达
    const riskRadar = generateRiskRadar(student, targetSchool, ability);
    // 生成准备计划
    const preparationPlan = generatePreparationPlan(subjectAnalysis);
    // 生成改进计划
    const improvementPlan = generateImprovementPlan(subjectAnalysis, matching.matchLevel);
    // 生成综合评估描述
    const overallAssessment = generateOverallAssessment(student, targetSchool, matching.matchLevel, ability);
    // 生成建议
    const recommendations = generateRecommendations(subjectAnalysis, targetSchool);
    // 生成简短总结
    const summary = generateSummary(matching.matchLevel, ability);
    return {
        feasibilityLevel: matching.matchLevel,
        levelDescription: LEVEL_DESCRIPTIONS[matching.matchLevel],
        summary,
        overallAssessment,
        mainRisks: matching.riskFactors.slice(0, 3), // 最多3个风险点
        keyStrengths: matching.positiveFactors,
        recommendations,
        improvementPlan,
        subjectAnalysis,
        preparationPlan,
        conversionCopy: CONVERSION_COPIES[matching.matchLevel],
        riskRadar,
        disclaimer: DISCLAIMER,
    };
}
// ============================================================
// AI增强评估
// ============================================================
/**
 * AI增强评估 System Prompt
 */
const AI_SYSTEM_PROMPT = `你是一名熟悉香港中学插班制度的资深升学顾问。

请注意：
- 香港中学插班并无公开成功率或官方成绩门槛
- 你必须基于经验规则、学校难度特征与学生成绩匹配度进行分析
- 不允许输出任何具体百分比成功率
- 只能输出「可行性等级」与分析理由
- 所有建议均为参考，不构成录取保证

你的目标是：
1. 判断学生与目标中学的插班匹配程度
2. 指出最关键的风险点与短板
3. 给出3–6个月内可执行的提升建议`;
/**
 * 构建AI用户提示
 */
export function buildAIPrompt(request, ruleResult) {
    const { student, targetSchool } = request;
    const districtInfo = DISTRICT_COMPETITION[targetSchool.district] || { level: '中', factor: 1.0 };
    const gradeSensitivity = GRADE_SENSITIVITY[student.currentGrade] || 1.0;
    return `学生资料：
- 年级：${student.currentGrade}
- 年龄：${student.age}
- 性别：${student.gender === 'female' ? '女' : '男'}
- 各科成绩：
${Object.entries(student.scores).map(([s, score]) => `  - ${SUBJECT_NAMES[s] || s}：${score}`).join('\n')}

目标中学资料：
- 学校名称：${targetSchool.schoolName}
- Band 等级：Band ${targetSchool.bandLevel}
- 所在地区：${targetSchool.district}
- 区域竞争强度：${districtInfo.level}
- 英文要求强度：${BAND_RULES[targetSchool.bandLevel].englishIntensity}
- 插班年级敏感度：${gradeSensitivity > 1.2 ? '高' : gradeSensitivity > 1 ? '中' : '低'}

规则引擎初步评估：
- 可行性等级: ${ruleResult.feasibilityLevel}
- ${ruleResult.summary}

请完成以下分析：
1. 给出插班可行性等级（A–E）
2. 指出不超过3个最主要的风险点
3. 给出具体、可执行的提升建议
4. 使用家长可理解的语言表达，避免专业术语

请以JSON格式返回：
{
  "feasibilityLevel": "B",
  "summary": "该学生具备一定插班机会，但在核心科目上仍存在提升空间。",
  "mainRisks": [
    "英文成绩略低于该校常见插班要求",
    "数学稳定性不足，容易影响整体竞争力"
  ],
  "improvementPlan": [
    "未来3个月重点加强英文阅读与写作训练",
    "通过针对性练习提升数学解题速度与准确率",
    "避免同时报考过多高竞争学校"
  ]
}

注意：只返回JSON，不要有其他文字。`;
}
/**
 * 使用AI增强评估结果
 */
export async function enhanceWithAI(request, ruleResult, aiApiKey) {
    if (!aiApiKey) {
        return ruleResult;
    }
    try {
        const prompt = buildAIPrompt(request, ruleResult);
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: AI_SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });
        if (!response.ok) {
            console.warn('AI增强失败，使用规则引擎结果');
            return ruleResult;
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiResult = JSON.parse(jsonMatch[0]);
                // 合并AI建议
                if (aiResult.summary) {
                    ruleResult.summary = aiResult.summary;
                }
                if (aiResult.mainRisks && Array.isArray(aiResult.mainRisks)) {
                    // 去重合并
                    const existingRisks = new Set(ruleResult.mainRisks);
                    aiResult.mainRisks.forEach((r) => {
                        if (!existingRisks.has(r)) {
                            ruleResult.mainRisks.push(r);
                        }
                    });
                    ruleResult.mainRisks = ruleResult.mainRisks.slice(0, 3);
                }
                if (aiResult.improvementPlan && Array.isArray(aiResult.improvementPlan)) {
                    ruleResult.improvementPlan = aiResult.improvementPlan;
                }
            }
        }
    }
    catch (error) {
        console.warn('AI增强出错:', error);
    }
    return ruleResult;
}
//# sourceMappingURL=feasibilityEngine.js.map