/**
 * 全站 UI 三语文案（唯一来源）
 * 
 * 规则：
 * - 所有可见 UI 文字必须从此处获取
 * - 禁止在组件中直接写中文或英文
 * - key 使用大写蛇形命名
 */

export type LanguageCode = 'zh-HK' | 'zh-CN' | 'en';

type I18nText = Record<LanguageCode, string>;

// ===== 通用 UI 文案 =====
export const UI_TEXT = {
  // ----- 页面标题 -----
  ANALYSIS_FORM_TITLE: {
    'zh-HK': '學校插班分析',
    'zh-CN': '学校插班分析',
    en: 'School Transfer Analysis',
  } as I18nText,
  
  UNIVERSITY_ANALYSIS_TITLE: {
    'zh-HK': '大學申請分析',
    'zh-CN': '大学申请分析',
    en: 'University Application Analysis',
  } as I18nText,
  
  RESULT_TITLE: {
    'zh-HK': '分析結果',
    'zh-CN': '分析结果',
    en: 'Analysis Result',
  } as I18nText,
  
  // ----- 按钮 -----
  SUBMIT_BUTTON: {
    'zh-HK': '開始分析',
    'zh-CN': '开始分析',
    en: 'Analyze',
  } as I18nText,
  
  NEXT_STEP: {
    'zh-HK': '下一步',
    'zh-CN': '下一步',
    en: 'Next',
  } as I18nText,
  
  PREVIOUS_STEP: {
    'zh-HK': '上一步',
    'zh-CN': '上一步',
    en: 'Previous',
  } as I18nText,
  
  CANCEL: {
    'zh-HK': '取消',
    'zh-CN': '取消',
    en: 'Cancel',
  } as I18nText,
  
  CONFIRM: {
    'zh-HK': '確認',
    'zh-CN': '确认',
    en: 'Confirm',
  } as I18nText,
  
  SAVE: {
    'zh-HK': '儲存',
    'zh-CN': '保存',
    en: 'Save',
  } as I18nText,
  
  DELETE: {
    'zh-HK': '刪除',
    'zh-CN': '删除',
    en: 'Delete',
  } as I18nText,
  
  BACK: {
    'zh-HK': '返回',
    'zh-CN': '返回',
    en: 'Back',
  } as I18nText,
  
  // ----- 表单标签 -----
  SELECT_SUBJECT: {
    'zh-HK': '選擇科目',
    'zh-CN': '选择科目',
    en: 'Select Subject',
  } as I18nText,
  
  SELECT_GRADE: {
    'zh-HK': '選擇年級',
    'zh-CN': '选择年级',
    en: 'Select Grade',
  } as I18nText,
  
  SELECT_SCHOOL: {
    'zh-HK': '選擇學校',
    'zh-CN': '选择学校',
    en: 'Select School',
  } as I18nText,
  
  CURRENT_SCORE: {
    'zh-HK': '當前成績',
    'zh-CN': '当前成绩',
    en: 'Current Score',
  } as I18nText,
  
  TARGET_SCORE: {
    'zh-HK': '目標成績',
    'zh-CN': '目标成绩',
    en: 'Target Score',
  } as I18nText,
  
  ENROLLMENT_DATE: {
    'zh-HK': '插班日期',
    'zh-CN': '插班日期',
    en: 'Enrollment Date',
  } as I18nText,
  
  CURRENT_SCHOOL: {
    'zh-HK': '當前學校',
    'zh-CN': '当前学校',
    en: 'Current School',
  } as I18nText,
  
  TARGET_SCHOOL: {
    'zh-HK': '目標學校',
    'zh-CN': '目标学校',
    en: 'Target School',
  } as I18nText,
  
  STUDENT_AGE: {
    'zh-HK': '學生年齡',
    'zh-CN': '学生年龄',
    en: 'Student Age',
  } as I18nText,
  
  NOTES: {
    'zh-HK': '備註',
    'zh-CN': '备注',
    en: 'Notes',
  } as I18nText,
  
  // ----- 风险等级 -----
  RISK_HIGH: {
    'zh-HK': '風險高',
    'zh-CN': '风险高',
    en: 'High Risk',
  } as I18nText,
  
  RISK_MEDIUM: {
    'zh-HK': '風險中',
    'zh-CN': '风险中',
    en: 'Medium Risk',
  } as I18nText,
  
  RISK_LOW: {
    'zh-HK': '風險低',
    'zh-CN': '风险低',
    en: 'Low Risk',
  } as I18nText,
  
  RISK_UNKNOWN: {
    'zh-HK': '風險未知',
    'zh-CN': '风险未知',
    en: 'Unknown Risk',
  } as I18nText,
  
  // ----- 可行性等级 -----
  FEASIBILITY_HIGH: {
    'zh-HK': '可行性高',
    'zh-CN': '可行性高',
    en: 'High Feasibility',
  } as I18nText,
  
  FEASIBILITY_MEDIUM: {
    'zh-HK': '可行性中',
    'zh-CN': '可行性中',
    en: 'Medium Feasibility',
  } as I18nText,
  
  FEASIBILITY_LOW: {
    'zh-HK': '可行性低',
    'zh-CN': '可行性低',
    en: 'Low Feasibility',
  } as I18nText,
  
  // ----- 分析结果标签 -----
  OVERALL_ASSESSMENT: {
    'zh-HK': '整體評估',
    'zh-CN': '整体评估',
    en: 'Overall Assessment',
  } as I18nText,
  
  SUBJECT_ANALYSIS: {
    'zh-HK': '科目分析',
    'zh-CN': '科目分析',
    en: 'Subject Analysis',
  } as I18nText,
  
  SCHOOL_ASSESSMENT: {
    'zh-HK': '學校評估',
    'zh-CN': '学校评估',
    en: 'School Assessment',
  } as I18nText,
  
  STUDY_PLAN: {
    'zh-HK': '學習計劃',
    'zh-CN': '学习计划',
    en: 'Study Plan',
  } as I18nText,
  
  RECOMMENDATIONS: {
    'zh-HK': '建議',
    'zh-CN': '建议',
    en: 'Recommendations',
  } as I18nText,
  
  STRENGTHS: {
    'zh-HK': '優勢',
    'zh-CN': '优势',
    en: 'Strengths',
  } as I18nText,
  
  WEAKNESSES: {
    'zh-HK': '需改進',
    'zh-CN': '需改进',
    en: 'Areas for Improvement',
  } as I18nText,
  
  // ----- 科目类别 -----
  CORE_SUBJECTS: {
    'zh-HK': '核心科目',
    'zh-CN': '核心科目',
    en: 'Core Subjects',
  } as I18nText,
  
  ELECTIVE_SUBJECTS: {
    'zh-HK': '選修科目',
    'zh-CN': '选修科目',
    en: 'Elective Subjects',
  } as I18nText,
  
  REQUIRED: {
    'zh-HK': '必修',
    'zh-CN': '必修',
    en: 'Required',
  } as I18nText,
  
  // ----- 状态 -----
  LOADING: {
    'zh-HK': '載入中...',
    'zh-CN': '加载中...',
    en: 'Loading...',
  } as I18nText,
  
  ANALYZING: {
    'zh-HK': '分析中...',
    'zh-CN': '分析中...',
    en: 'Analyzing...',
  } as I18nText,
  
  SUCCESS: {
    'zh-HK': '成功',
    'zh-CN': '成功',
    en: 'Success',
  } as I18nText,
  
  ERROR: {
    'zh-HK': '錯誤',
    'zh-CN': '错误',
    en: 'Error',
  } as I18nText,
  
  // ----- 验证消息 -----
  REQUIRED_FIELD: {
    'zh-HK': '此欄位為必填',
    'zh-CN': '此字段为必填',
    en: 'This field is required',
  } as I18nText,
  
  INVALID_INPUT: {
    'zh-HK': '輸入無效',
    'zh-CN': '输入无效',
    en: 'Invalid input',
  } as I18nText,
  
  // ----- CSD 成绩 -----
  PASS: {
    'zh-HK': '達標',
    'zh-CN': '达标',
    en: 'Pass',
  } as I18nText,
  
  FAIL: {
    'zh-HK': '未達標',
    'zh-CN': '未达标',
    en: 'Fail',
  } as I18nText,
  
  // ----- 导航 -----
  HOME: {
    'zh-HK': '首頁',
    'zh-CN': '首页',
    en: 'Home',
  } as I18nText,
  
  TRANSFER_ANALYSIS: {
    'zh-HK': '插班分析',
    'zh-CN': '插班分析',
    en: 'Transfer Analysis',
  } as I18nText,
  
  UNIVERSITY_ANALYSIS: {
    'zh-HK': '大學分析',
    'zh-CN': '大学分析',
    en: 'University Analysis',
  } as I18nText,
  
  HISTORY: {
    'zh-HK': '歷史記錄',
    'zh-CN': '历史记录',
    en: 'History',
  } as I18nText,
  
  SETTINGS: {
    'zh-HK': '設定',
    'zh-CN': '设置',
    en: 'Settings',
  } as I18nText,
  
  LANGUAGE: {
    'zh-HK': '語言',
    'zh-CN': '语言',
    en: 'Language',
  } as I18nText,
  
  // ----- 时间相关 -----
  MONTHS: {
    'zh-HK': '個月',
    'zh-CN': '个月',
    en: 'months',
  } as I18nText,
  
  WEEKS: {
    'zh-HK': '週',
    'zh-CN': '周',
    en: 'weeks',
  } as I18nText,
  
  DAYS: {
    'zh-HK': '天',
    'zh-CN': '天',
    en: 'days',
  } as I18nText,
} as const;

/**
 * 获取 UI 文本
 */
export function getUIText(key: keyof typeof UI_TEXT, lang: LanguageCode): string {
  return UI_TEXT[key]?.[lang] ?? key;
}

/**
 * 风险等级映射
 */
export const RISK_LEVEL_TEXT: Record<string, I18nText> = {
  high: UI_TEXT.RISK_HIGH,
  medium: UI_TEXT.RISK_MEDIUM,
  low: UI_TEXT.RISK_LOW,
  unknown: UI_TEXT.RISK_UNKNOWN,
};

/**
 * 获取风险等级文本
 */
export function getRiskLevelText(level: string, lang: LanguageCode): string {
  return RISK_LEVEL_TEXT[level]?.[lang] ?? level;
}
