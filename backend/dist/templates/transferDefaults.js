/**
 * 插班分析 V2 默认模板
 *
 * 用途：当 AI 未启用时，确保返回非空数据
 * 原则：所有数组必须非空，避免前端渲染错误
 *
 * @version v2
 */
/**
 * 默认能力维度分析（≥3 条）
 *
 * 用于无 AI 模式下的能力评估
 */
export const DEFAULT_CAPABILITY_ANALYSES = [
    {
        dimension: 'English',
        level: '中',
        description: '英语能力对插班成功至关重要，特别是申请 EMI 学校',
        impact: '英语水平直接影响学校的面试表现和入学后的学习适应',
        suggestion: '建议加强英语听说读写训练，多接触英文教材和课外读物',
    },
    {
        dimension: 'Math',
        level: '中',
        description: '数学能力是大多数学校评估学生学术基础的重要指标',
        impact: '数学成绩影响学校对学生学习能力的整体评估',
        suggestion: '保持数学基础扎实，定期做练习题巩固知识点',
    },
    {
        dimension: 'AcademicFoundation',
        level: '中',
        description: '整体学术基础决定了学生能否顺利适应新学校的教学进度',
        impact: '学术基础薄弱可能导致入学后跟不上课程',
        suggestion: '建议系统复习各科核心知识，查漏补缺',
    },
    {
        dimension: 'LearningAdaptability',
        level: '中',
        description: '适应能力决定学生转校后的过渡期长短',
        impact: '适应能力强的学生能更快融入新环境',
        suggestion: '培养独立学习能力，保持开放心态面对新环境',
    },
    {
        dimension: 'DisciplineFit',
        level: '中',
        description: '校规校风契合度影响学生的长期发展',
        impact: '了解目标学校的文化有助于做出更合适的选择',
        suggestion: '建议提前了解目标学校的校风和管理风格',
    },
];
/**
 * 默认过渡计划
 *
 * shortTerm / midTerm / riskWarnings 都非空
 */
export const DEFAULT_TRANSITION_PLAN = {
    shortTerm: [
        '了解目标学校的申请流程和截止日期',
        '准备申请所需的成绩单和推荐信',
        '针对薄弱科目进行集中补习',
        '练习面试自我介绍和常见问题',
    ],
    midTerm: [
        '入学后主动与新同学和老师沟通',
        '尽快熟悉新学校的课程安排和评估方式',
        '如有学习困难，及时寻求老师帮助',
        '参与学校活动，融入新环境',
        '建立规律的学习作息',
    ],
    riskWarnings: [
        '插班名额有限，竞争可能较激烈',
        '不同学校的课程进度可能有差异',
        '需要时间适应新的教学风格',
        '部分学校可能要求笔试或面试',
    ],
};
/**
 * 默认风险提示列表
 *
 * 用于 summary.keyRisks 为空时的兜底
 */
export const DEFAULT_SUMMARY_RISKS = [
    '插班申请竞争激烈，名额有限',
    '需要适应新学校的教学风格和课程进度',
    '建议提前了解目标学校的具体要求',
];
/**
 * 默认优势列表
 *
 * 用于 summary.keyAdvantages 为空时的兜底
 */
export const DEFAULT_SUMMARY_ADVANTAGES = [
    '有明确的目标学校规划',
    '积极主动寻求更好的学习环境',
];
/**
 * 学校评估默认字段
 *
 * 确保每个学校评估对象都有完整字段
 */
export const DEFAULT_SCHOOL_ASSESSMENT_FIELDS = {
    requirements: [
        '良好的学习成绩',
        '品行端正',
        '面试表现优秀',
    ],
    gaps: [
        '需要了解学校具体要求',
    ],
    notes: [
        '建议提前联系学校了解详情',
    ],
};
/**
 * 根据可行性评分获取等级
 */
export function getFeasibilityLevel(score) {
    if (score >= 71)
        return '低'; // 低风险 = 高可行性
    if (score >= 51)
        return '中'; // 中等风险
    return '高'; // 高风险 = 低可行性
}
/**
 * 根据 matchScore 获取推荐类型
 */
export function getRecommendationType(matchScore) {
    if (matchScore >= 70)
        return '保底';
    if (matchScore >= 50)
        return '目标';
    return '冲刺';
}
/**
 * 根据 matchScore 获取风险等级
 */
export function getRiskLevel(matchScore) {
    if (matchScore >= 70)
        return '低';
    if (matchScore >= 50)
        return '中';
    return '高';
}
//# sourceMappingURL=transferDefaults.js.map