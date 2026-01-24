/**
 * 全站 UI 三语文案（唯一来源）
 *
 * 规则：
 * - 所有可见 UI 文字必须从此处获取
 * - 禁止在组件中直接写中文或英文
 * - key 使用大写蛇形命名
 */
// ===== 通用 UI 文案 =====
export const UI_TEXT = {
    // ----- 页面标题 -----
    ANALYSIS_FORM_TITLE: {
        'zh-HK': '學校插班分析',
        'zh-CN': '学校插班分析',
        en: 'School Transfer Analysis',
    },
    UNIVERSITY_ANALYSIS_TITLE: {
        'zh-HK': '大學申請分析',
        'zh-CN': '大学申请分析',
        en: 'University Application Analysis',
    },
    RESULT_TITLE: {
        'zh-HK': '分析結果',
        'zh-CN': '分析结果',
        en: 'Analysis Result',
    },
    // ----- 按钮 -----
    SUBMIT_BUTTON: {
        'zh-HK': '開始分析',
        'zh-CN': '开始分析',
        en: 'Analyze',
    },
    NEXT_STEP: {
        'zh-HK': '下一步',
        'zh-CN': '下一步',
        en: 'Next',
    },
    PREVIOUS_STEP: {
        'zh-HK': '上一步',
        'zh-CN': '上一步',
        en: 'Previous',
    },
    CANCEL: {
        'zh-HK': '取消',
        'zh-CN': '取消',
        en: 'Cancel',
    },
    CONFIRM: {
        'zh-HK': '確認',
        'zh-CN': '确认',
        en: 'Confirm',
    },
    SAVE: {
        'zh-HK': '儲存',
        'zh-CN': '保存',
        en: 'Save',
    },
    DELETE: {
        'zh-HK': '刪除',
        'zh-CN': '删除',
        en: 'Delete',
    },
    BACK: {
        'zh-HK': '返回',
        'zh-CN': '返回',
        en: 'Back',
    },
    // ----- 表单标签 -----
    SELECT_SUBJECT: {
        'zh-HK': '選擇科目',
        'zh-CN': '选择科目',
        en: 'Select Subject',
    },
    SELECT_GRADE: {
        'zh-HK': '選擇年級',
        'zh-CN': '选择年级',
        en: 'Select Grade',
    },
    SELECT_SCHOOL: {
        'zh-HK': '選擇學校',
        'zh-CN': '选择学校',
        en: 'Select School',
    },
    CURRENT_SCORE: {
        'zh-HK': '當前成績',
        'zh-CN': '当前成绩',
        en: 'Current Score',
    },
    TARGET_SCORE: {
        'zh-HK': '目標成績',
        'zh-CN': '目标成绩',
        en: 'Target Score',
    },
    ENROLLMENT_DATE: {
        'zh-HK': '插班日期',
        'zh-CN': '插班日期',
        en: 'Enrollment Date',
    },
    CURRENT_SCHOOL: {
        'zh-HK': '當前學校',
        'zh-CN': '当前学校',
        en: 'Current School',
    },
    TARGET_SCHOOL: {
        'zh-HK': '目標學校',
        'zh-CN': '目标学校',
        en: 'Target School',
    },
    STUDENT_AGE: {
        'zh-HK': '學生年齡',
        'zh-CN': '学生年龄',
        en: 'Student Age',
    },
    NOTES: {
        'zh-HK': '備註',
        'zh-CN': '备注',
        en: 'Notes',
    },
    // ----- 风险等级 -----
    RISK_HIGH: {
        'zh-HK': '風險高',
        'zh-CN': '风险高',
        en: 'High Risk',
    },
    RISK_MEDIUM: {
        'zh-HK': '風險中',
        'zh-CN': '风险中',
        en: 'Medium Risk',
    },
    RISK_LOW: {
        'zh-HK': '風險低',
        'zh-CN': '风险低',
        en: 'Low Risk',
    },
    RISK_UNKNOWN: {
        'zh-HK': '風險未知',
        'zh-CN': '风险未知',
        en: 'Unknown Risk',
    },
    // ----- 可行性等级 -----
    FEASIBILITY_HIGH: {
        'zh-HK': '可行性高',
        'zh-CN': '可行性高',
        en: 'High Feasibility',
    },
    FEASIBILITY_MEDIUM: {
        'zh-HK': '可行性中',
        'zh-CN': '可行性中',
        en: 'Medium Feasibility',
    },
    FEASIBILITY_LOW: {
        'zh-HK': '可行性低',
        'zh-CN': '可行性低',
        en: 'Low Feasibility',
    },
    // ----- 分析结果标签 -----
    OVERALL_ASSESSMENT: {
        'zh-HK': '整體評估',
        'zh-CN': '整体评估',
        en: 'Overall Assessment',
    },
    SUBJECT_ANALYSIS: {
        'zh-HK': '科目分析',
        'zh-CN': '科目分析',
        en: 'Subject Analysis',
    },
    SCHOOL_ASSESSMENT: {
        'zh-HK': '學校評估',
        'zh-CN': '学校评估',
        en: 'School Assessment',
    },
    STUDY_PLAN: {
        'zh-HK': '學習計劃',
        'zh-CN': '学习计划',
        en: 'Study Plan',
    },
    RECOMMENDATIONS: {
        'zh-HK': '建議',
        'zh-CN': '建议',
        en: 'Recommendations',
    },
    STRENGTHS: {
        'zh-HK': '優勢',
        'zh-CN': '优势',
        en: 'Strengths',
    },
    WEAKNESSES: {
        'zh-HK': '需改進',
        'zh-CN': '需改进',
        en: 'Areas for Improvement',
    },
    // ----- 科目类别 -----
    CORE_SUBJECTS: {
        'zh-HK': '核心科目',
        'zh-CN': '核心科目',
        en: 'Core Subjects',
    },
    ELECTIVE_SUBJECTS: {
        'zh-HK': '選修科目',
        'zh-CN': '选修科目',
        en: 'Elective Subjects',
    },
    REQUIRED: {
        'zh-HK': '必修',
        'zh-CN': '必修',
        en: 'Required',
    },
    // ----- 状态 -----
    LOADING: {
        'zh-HK': '載入中...',
        'zh-CN': '加载中...',
        en: 'Loading...',
    },
    ANALYZING: {
        'zh-HK': '分析中...',
        'zh-CN': '分析中...',
        en: 'Analyzing...',
    },
    SUCCESS: {
        'zh-HK': '成功',
        'zh-CN': '成功',
        en: 'Success',
    },
    ERROR: {
        'zh-HK': '錯誤',
        'zh-CN': '错误',
        en: 'Error',
    },
    // ----- 验证消息 -----
    REQUIRED_FIELD: {
        'zh-HK': '此欄位為必填',
        'zh-CN': '此字段为必填',
        en: 'This field is required',
    },
    INVALID_INPUT: {
        'zh-HK': '輸入無效',
        'zh-CN': '输入无效',
        en: 'Invalid input',
    },
    // ----- CSD 成绩 -----
    PASS: {
        'zh-HK': '達標',
        'zh-CN': '达标',
        en: 'Pass',
    },
    FAIL: {
        'zh-HK': '未達標',
        'zh-CN': '未达标',
        en: 'Fail',
    },
    // ----- 导航 -----
    HOME: {
        'zh-HK': '首頁',
        'zh-CN': '首页',
        en: 'Home',
    },
    TRANSFER_ANALYSIS: {
        'zh-HK': '插班分析',
        'zh-CN': '插班分析',
        en: 'Transfer Analysis',
    },
    UNIVERSITY_ANALYSIS: {
        'zh-HK': '大學分析',
        'zh-CN': '大学分析',
        en: 'University Analysis',
    },
    HISTORY: {
        'zh-HK': '歷史記錄',
        'zh-CN': '历史记录',
        en: 'History',
    },
    SETTINGS: {
        'zh-HK': '設定',
        'zh-CN': '设置',
        en: 'Settings',
    },
    LANGUAGE: {
        'zh-HK': '語言',
        'zh-CN': '语言',
        en: 'Language',
    },
    // ----- 时间相关 -----
    MONTHS: {
        'zh-HK': '個月',
        'zh-CN': '个月',
        en: 'months',
    },
    WEEKS: {
        'zh-HK': '週',
        'zh-CN': '周',
        en: 'weeks',
    },
    DAYS: {
        'zh-HK': '天',
        'zh-CN': '天',
        en: 'days',
    },
};
/**
 * 获取 UI 文本
 */
export function getUIText(key, lang) {
    return UI_TEXT[key]?.[lang] ?? key;
}
/**
 * 风险等级映射
 */
export const RISK_LEVEL_TEXT = {
    high: UI_TEXT.RISK_HIGH,
    medium: UI_TEXT.RISK_MEDIUM,
    low: UI_TEXT.RISK_LOW,
    unknown: UI_TEXT.RISK_UNKNOWN,
};
/**
 * 获取风险等级文本
 */
export function getRiskLevelText(level, lang) {
    return RISK_LEVEL_TEXT[level]?.[lang] ?? level;
}
//# sourceMappingURL=ui.js.map