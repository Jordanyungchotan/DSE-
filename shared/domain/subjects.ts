// ===== DSE 科目三语支持（繁/简/英）统一规范 =====

/**
 * 支持的语言代码（全项目唯一）
 * zh-HK: 繁体中文（香港）
 * zh-CN: 简体中文
 * en: 英文
 */
export type LanguageCode = 'zh-HK' | 'zh-CN' | 'en';

/**
 * 科目定义结构
 */
export interface SubjectDefinition {
  key: string;
  category: 'core' | 'elective';
  displayName: Record<LanguageCode, string>;
  grading: 'level' | 'passfail';
}

// ===== 必修科目（Core Subjects） =====
export const CORE_SUBJECTS: SubjectDefinition[] = [
  {
    key: 'CHINESE_LANGUAGE',
    category: 'core',
    grading: 'level',
    displayName: {
      'zh-HK': '中國語文',
      'zh-CN': '中国语文',
      en: 'Chinese Language',
    },
  },
  {
    key: 'ENGLISH_LANGUAGE',
    category: 'core',
    grading: 'level',
    displayName: {
      'zh-HK': '英國語文',
      'zh-CN': '英国语文',
      en: 'English Language',
    },
  },
  {
    key: 'MATHEMATICS',
    category: 'core',
    grading: 'level',
    displayName: {
      'zh-HK': '數學',
      'zh-CN': '数学',
      en: 'Mathematics',
    },
  },
  {
    key: 'CITIZENSHIP_AND_SOCIAL_DEVELOPMENT',
    category: 'core',
    grading: 'passfail',
    displayName: {
      'zh-HK': '公民與社會發展',
      'zh-CN': '公民与社会发展',
      en: 'Citizenship and Social Development',
    },
  },
];

// ===== 选修科目（Elective Subjects） =====
export const ELECTIVE_SUBJECTS: SubjectDefinition[] = [
  {
    key: 'CHINESE_LITERATURE',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '中國文學',
      'zh-CN': '中国文学',
      en: 'Chinese Literature',
    },
  },
  {
    key: 'ENGLISH_LITERATURE',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '英語文學',
      'zh-CN': '英语文学',
      en: 'English Literature',
    },
  },
  {
    key: 'CHINESE_HISTORY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '中國歷史',
      'zh-CN': '中国历史',
      en: 'Chinese History',
    },
  },
  {
    key: 'BIOLOGY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '生物',
      'zh-CN': '生物',
      en: 'Biology',
    },
  },
  {
    key: 'BAFS',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '企業、會計與財務概論',
      'zh-CN': '企业、会计与财务概论',
      en: 'Business, Accounting and Financial Studies',
    },
  },
  {
    key: 'CHEMISTRY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '化學',
      'zh-CN': '化学',
      en: 'Chemistry',
    },
  },
  {
    key: 'DESIGN_AND_APPLIED_TECHNOLOGY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '設計與應用科技',
      'zh-CN': '设计与应用科技',
      en: 'Design and Applied Technology',
    },
  },
  {
    key: 'PHYSICS',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '物理',
      'zh-CN': '物理',
      en: 'Physics',
    },
  },
  {
    key: 'HEALTH_MANAGEMENT_AND_SOCIAL_CARE',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '健康管理與社會關懷',
      'zh-CN': '健康管理与社会关怀',
      en: 'Health Management and Social Care',
    },
  },
  {
    key: 'ECONOMICS',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '經濟',
      'zh-CN': '经济',
      en: 'Economics',
    },
  },
  {
    key: 'ICT',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '資訊及通訊科技',
      'zh-CN': '信息及通信技术',
      en: 'Information and Communication Technology',
    },
  },
  {
    key: 'ETHICS_AND_RELIGIOUS_STUDIES',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '倫理與宗教',
      'zh-CN': '伦理与宗教',
      en: 'Ethics and Religious Studies',
    },
  },
  {
    key: 'TECHNOLOGY_AND_LIVING',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '科技與生活',
      'zh-CN': '科技与生活',
      en: 'Technology and Living',
    },
  },
  {
    key: 'GEOGRAPHY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '地理',
      'zh-CN': '地理',
      en: 'Geography',
    },
  },
  {
    key: 'HISTORY',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '歷史',
      'zh-CN': '历史',
      en: 'History',
    },
  },
  {
    key: 'MUSIC',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '音樂',
      'zh-CN': '音乐',
      en: 'Music',
    },
  },
  {
    key: 'VISUAL_ARTS',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '視覺藝術',
      'zh-CN': '视觉艺术',
      en: 'Visual Arts',
    },
  },
  {
    key: 'TOURISM_AND_HOSPITALITY_STUDIES',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '旅遊與款待',
      'zh-CN': '旅游与款待',
      en: 'Tourism and Hospitality Studies',
    },
  },
  {
    key: 'PHYSICAL_EDUCATION',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '體育',
      'zh-CN': '体育',
      en: 'Physical Education',
    },
  },
  {
    key: 'MATHEMATICS_M1',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '數學延伸單元一（M1）',
      'zh-CN': '数学延伸单元一（M1）',
      en: 'Mathematics Extended Module 1 (M1)',
    },
  },
  {
    key: 'MATHEMATICS_M2',
    category: 'elective',
    grading: 'level',
    displayName: {
      'zh-HK': '數學延伸單元二（M2）',
      'zh-CN': '数学延伸单元二（M2）',
      en: 'Mathematics Extended Module 2 (M2)',
    },
  },
];

// ===== 统一入口 =====
export const ALL_SUBJECTS: SubjectDefinition[] = [...CORE_SUBJECTS, ...ELECTIVE_SUBJECTS];

// ===== 科目 Key 类型 =====
export type SubjectKey = typeof CORE_SUBJECTS[number]['key'] | typeof ELECTIVE_SUBJECTS[number]['key'];

// ===== 所有科目 Key 列表 =====
export const ALL_SUBJECT_KEYS = ALL_SUBJECTS.map((s) => s.key);
export const CORE_SUBJECT_KEYS = CORE_SUBJECTS.map((s) => s.key);
export const ELECTIVE_SUBJECT_KEYS = ELECTIVE_SUBJECTS.map((s) => s.key);

// ===== 选修科目分类（用于分析系统，基于 key） =====
export const SCIENCE_ELECTIVE_KEYS = ['BIOLOGY', 'CHEMISTRY', 'PHYSICS', 'ICT', 'MATHEMATICS_M1', 'MATHEMATICS_M2'] as const;
export const BUSINESS_ELECTIVE_KEYS = ['ECONOMICS', 'BAFS'] as const;
export const ARTS_SPORTS_ELECTIVE_KEYS = ['MUSIC', 'VISUAL_ARTS', 'PHYSICAL_EDUCATION'] as const;

// ===== 辅助函数 =====

/**
 * 根据 key 获取科目定义
 */
export function getSubjectByKey(key: string): SubjectDefinition | undefined {
  return ALL_SUBJECTS.find((s) => s.key === key);
}

/**
 * 根据 key 获取科目显示名称
 */
export function getSubjectDisplayName(key: string, lang: LanguageCode): string {
  const subject = getSubjectByKey(key);
  return subject?.displayName[lang] ?? key;
}

/**
 * 检查 key 是否为有效科目
 */
export function isValidSubjectKey(key: string): boolean {
  return ALL_SUBJECT_KEYS.includes(key);
}

/**
 * 检查 key 是否为核心科目
 */
export function isCoreSubject(key: string): boolean {
  return CORE_SUBJECT_KEYS.includes(key);
}

/**
 * 检查 key 是否为选修科目
 */
export function isElectiveSubject(key: string): boolean {
  return ELECTIVE_SUBJECT_KEYS.includes(key);
}

/**
 * 检查科目是否使用 Pass/Fail 成绩体系
 */
export function hasPassFailGrading(key: string): boolean {
  const subject = getSubjectByKey(key);
  return subject?.grading === 'passfail';
}

/**
 * 检查是否为理科选修
 */
export function isScienceElective(key: string): boolean {
  return (SCIENCE_ELECTIVE_KEYS as readonly string[]).includes(key);
}

/**
 * 检查是否为商科选修
 */
export function isBusinessElective(key: string): boolean {
  return (BUSINESS_ELECTIVE_KEYS as readonly string[]).includes(key);
}

/**
 * 检查是否为艺术/体育类选修
 */
export function isArtsSportsElective(key: string): boolean {
  return (ARTS_SPORTS_ELECTIVE_KEYS as readonly string[]).includes(key);
}

/**
 * 生成 Select 组件的 options（根据语言）
 */
export function getSubjectOptions(lang: LanguageCode, category?: 'core' | 'elective') {
  let subjects = ALL_SUBJECTS;
  if (category === 'core') {
    subjects = CORE_SUBJECTS;
  } else if (category === 'elective') {
    subjects = ELECTIVE_SUBJECTS;
  }
  return subjects.map((s) => ({
    value: s.key,
    label: s.displayName[lang],
  }));
}

/**
 * 获取选修科目的分析 notes（基于选修科目类别）
 */
export function getElectiveAnalysisNotes(keys: string[], lang: LanguageCode): string[] {
  const notes: string[] = [];
  const hasScience = keys.some((k) => isScienceElective(k));
  const hasBusiness = keys.some((k) => isBusinessElective(k));
  const hasArtsSports = keys.some((k) => isArtsSportsElective(k));

  const NOTES = {
    science: {
      'zh-HK': '理科背景，對名校插班競爭更有利。',
      'zh-CN': '理科背景，对名校插班竞争更有利。',
      en: 'Science background provides competitive advantage for elite school transfers.',
    },
    business: {
      'zh-HK': '商科取向，需關注學校課程側重。',
      'zh-CN': '商科取向，需关注学校课程侧重。',
      en: 'Business orientation - consider school curriculum focus.',
    },
    artsSports: {
      'zh-HK': '部分學校對相關特長有額外考核。',
      'zh-CN': '部分学校对相关特长有额外考核。',
      en: 'Some schools have additional assessments for arts/sports talents.',
    },
  };

  if (hasScience) notes.push(NOTES.science[lang]);
  if (hasBusiness) notes.push(NOTES.business[lang]);
  if (hasArtsSports) notes.push(NOTES.artsSports[lang]);

  return notes;
}

// ===== 向后兼容导出（过渡期使用，后续可移除） =====
/** @deprecated 使用 ALL_SUBJECT_KEYS 替代 */
export const SUBJECTS = ALL_SUBJECT_KEYS;
/** @deprecated 使用 hasPassFailGrading 替代 */
export const HAS_SPECIAL_GRADING = ['CITIZENSHIP_AND_SOCIAL_DEVELOPMENT'];
/** @deprecated 使用 isValidSubjectKey 替代 */
export const isValidSubject = isValidSubjectKey;
/** @deprecated 使用 hasPassFailGrading 替代 */
export const hasSpecialGrading = hasPassFailGrading;
