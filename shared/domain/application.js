/**
 * 申请分析输入模型定义
 *
 * 重要设计原则：
 * - 插班分析：使用学习状态（LearningStatus），不使用任何等级分数
 * - 大学申请分析：保持使用 DSE 等级（SubjectGrade）
 * - 两套系统完全独立，不允许等级逻辑回流到插班分析
 */
// ===== 类型守卫 =====
/**
 * 检查是否为有效的插班科目状态
 */
export function isValidTransferSubjectStatus(input) {
    if (!input || typeof input !== 'object')
        return false;
    const obj = input;
    // subject 必须存在且为字符串
    if (typeof obj.subject !== 'string')
        return false;
    // status 必须为 strong / ok / weak
    if (!['strong', 'ok', 'weak'].includes(obj.status))
        return false;
    // rankPosition 如存在，必须为 top / mid / bottom
    if (obj.rankPosition !== undefined && !['top', 'mid', 'bottom'].includes(obj.rankPosition)) {
        return false;
    }
    // schoolScore 如存在，必须为 0-100 整数
    if (obj.schoolScore !== undefined) {
        const score = obj.schoolScore;
        if (typeof score !== 'number' || score < 0 || score > 100 || !Number.isInteger(score)) {
            return false;
        }
    }
    // scoreSource 如存在，必须为 latest / average
    if (obj.scoreSource !== undefined && !['latest', 'average'].includes(obj.scoreSource)) {
        return false;
    }
    return true;
}
/**
 * 检查是否为有效的插班分析输入
 */
export function isValidTransferAnalysisInput(input) {
    if (!input || typeof input !== 'object')
        return false;
    const obj = input;
    // 必填字段检查
    if (typeof obj.enrollmentDate !== 'string')
        return false;
    if (typeof obj.semester !== 'string')
        return false;
    if (typeof obj.grade !== 'string')
        return false;
    if (typeof obj.age !== 'number')
        return false;
    // subjectStatuses 必须存在且为数组
    if (!Array.isArray(obj.subjectStatuses))
        return false;
    // 验证每个科目状态
    for (const status of obj.subjectStatuses) {
        if (!isValidTransferSubjectStatus(status))
            return false;
    }
    // targetSchools 必须存在且为数组
    if (!Array.isArray(obj.targetSchools))
        return false;
    return true;
}
//# sourceMappingURL=application.js.map