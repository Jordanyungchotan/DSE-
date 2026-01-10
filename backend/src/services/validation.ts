/**
 * 参数校验模块
 * 
 * 基于 Swagger/OpenAPI 规范进行严格的请求参数校验
 */

// ============================================================
// 类型定义
// ============================================================

/** 校验结果 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/** 学生档案（API 输入） */
export interface StudentProfileInput {
  age?: number
  gender?: 'male' | 'female'
  currentGrade: string
  scores: Record<string, number>
  currentSchool?: string
  strengths?: string[]
  extracurriculars?: string[]
  hobbies?: string
  achievements?: string
}

/** 目标学校（API 输入） */
export interface TargetSchoolInput {
  schoolId?: string
  schoolName: string
  bandLevel: 1 | 2 | 3
  district: string
  gender?: 'boys' | 'girls' | 'coed'
  type?: 'government' | 'aided' | 'dss' | 'private'
}

/** 分析提交请求 */
export interface AnalysisSubmitRequest {
  student: StudentProfileInput
  targetSchool: TargetSchoolInput
  enrollmentDate?: string
  semester?: string
  notes?: string
}

/** 反馈请求 */
export interface FeedbackRequest {
  analysisId: string
  userOutcome: 'success' | 'failure' | 'not_tried' | 'pending'
  targetSchool?: string
  updatedScores?: Record<string, number>
  isEnrolled?: boolean
  enrolledCourse?: string
  feedbackText?: string
  accuracyRating?: number
  usefulnessRating?: number
}

/** 咨询预约请求 */
export interface ConsultationBookRequest {
  analysisId: string
  contactName: string
  contactPhone?: string
  contactEmail?: string
  preferredTime?: string
  notes?: string
}

// ============================================================
// 校验常量
// ============================================================

/** 有效年级 */
const VALID_GRADES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', '中一', '中二', '中三', '中四', '中五', '中六']

/** 有效科目 */
const VALID_SUBJECTS = [
  'chinese', 'english', 'math', 'science', 'liberal',
  'physics', 'chemistry', 'biology', 'economics', 'bafs',
  'geography', 'history', 'ict', 'm1', 'm2',
  '中文', '英文', '数学', '科学', '通识',
]

/** 有效 Band 等级 */
const VALID_BANDS = [1, 2, 3]

/** 香港18区 */
const VALID_DISTRICTS = [
  '中西區', '灣仔區', '東區', '南區',
  '九龍城區', '油尖旺區', '深水埗區', '黃大仙區', '觀塘區',
  '沙田區', '大埔區', '北區', '西貢區',
  '葵青區', '荃灣區', '屯門區', '元朗區', '離島區',
]

// ============================================================
// 校验函数
// ============================================================

/**
 * 校验学生档案
 */
export function validateStudentProfile(student: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!student || typeof student !== 'object') {
    return { valid: false, errors: ['student 参数必须是对象'] }
  }
  
  const s = student as Record<string, unknown>
  
  // 年龄校验
  if (s.age !== undefined) {
    if (typeof s.age !== 'number' || s.age < 10 || s.age > 20) {
      errors.push('age 必须是 10-20 之间的数字')
    }
  }
  
  // 性别校验
  if (s.gender !== undefined) {
    if (!['male', 'female'].includes(s.gender as string)) {
      errors.push('gender 必须是 male 或 female')
    }
  }
  
  // 年级校验（必填）
  if (!s.currentGrade) {
    errors.push('currentGrade 是必填字段')
  } else if (!VALID_GRADES.includes(s.currentGrade as string)) {
    errors.push(`currentGrade 必须是有效年级: ${VALID_GRADES.slice(0, 6).join(', ')}`)
  }
  
  // 成绩校验（必填）
  if (!s.scores || typeof s.scores !== 'object') {
    errors.push('scores 是必填字段且必须是对象')
  } else {
    const scores = s.scores as Record<string, unknown>
    for (const [subject, score] of Object.entries(scores)) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        errors.push(`scores.${subject} 必须是 0-100 之间的数字`)
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验目标学校
 */
export function validateTargetSchool(school: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!school || typeof school !== 'object') {
    return { valid: false, errors: ['targetSchool 参数必须是对象'] }
  }
  
  const s = school as Record<string, unknown>
  
  // 学校名称（必填）
  if (!s.schoolName || typeof s.schoolName !== 'string') {
    errors.push('schoolName 是必填字段')
  }
  
  // Band 等级（必填）
  if (!s.bandLevel) {
    errors.push('bandLevel 是必填字段')
  } else if (!VALID_BANDS.includes(s.bandLevel as number)) {
    errors.push('bandLevel 必须是 1、2 或 3')
  }
  
  // 地区（必填）
  if (!s.district || typeof s.district !== 'string') {
    errors.push('district 是必填字段')
  }
  
  // 性别（可选）
  if (s.gender !== undefined && !['boys', 'girls', 'coed'].includes(s.gender as string)) {
    errors.push('gender 必须是 boys、girls 或 coed')
  }
  
  // 类型（可选）
  if (s.type !== undefined && !['government', 'aided', 'dss', 'private'].includes(s.type as string)) {
    errors.push('type 必须是 government、aided、dss 或 private')
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验分析提交请求
 */
export function validateAnalysisSubmit(body: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['请求体必须是 JSON 对象'] }
  }
  
  const b = body as Record<string, unknown>
  
  // 校验学生信息
  const studentResult = validateStudentProfile(b.student)
  if (!studentResult.valid) {
    errors.push(...studentResult.errors)
  }
  
  // 校验目标学校
  const schoolResult = validateTargetSchool(b.targetSchool)
  if (!schoolResult.valid) {
    errors.push(...schoolResult.errors)
  }
  
  // 入学日期格式校验
  if (b.enrollmentDate !== undefined) {
    if (typeof b.enrollmentDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.enrollmentDate)) {
      errors.push('enrollmentDate 格式应为 YYYY-MM-DD')
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验反馈请求
 */
export function validateFeedback(body: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['请求体必须是 JSON 对象'] }
  }
  
  const b = body as Record<string, unknown>
  
  // analysisId（必填）
  if (!b.analysisId || typeof b.analysisId !== 'string') {
    errors.push('analysisId 是必填字段')
  }
  
  // userOutcome（必填）
  if (!b.userOutcome) {
    errors.push('userOutcome 是必填字段')
  } else if (!['success', 'failure', 'not_tried', 'pending'].includes(b.userOutcome as string)) {
    errors.push('userOutcome 必须是 success、failure、not_tried 或 pending')
  }
  
  // 评分校验
  if (b.accuracyRating !== undefined) {
    if (typeof b.accuracyRating !== 'number' || b.accuracyRating < 1 || b.accuracyRating > 5) {
      errors.push('accuracyRating 必须是 1-5 之间的数字')
    }
  }
  
  if (b.usefulnessRating !== undefined) {
    if (typeof b.usefulnessRating !== 'number' || b.usefulnessRating < 1 || b.usefulnessRating > 5) {
      errors.push('usefulnessRating 必须是 1-5 之间的数字')
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验咨询预约请求
 */
export function validateConsultationBook(body: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['请求体必须是 JSON 对象'] }
  }
  
  const b = body as Record<string, unknown>
  
  // analysisId（必填）
  if (!b.analysisId || typeof b.analysisId !== 'string') {
    errors.push('analysisId 是必填字段')
  }
  
  // contactName（必填）
  if (!b.contactName || typeof b.contactName !== 'string') {
    errors.push('contactName 是必填字段')
  }
  
  // contactEmail 格式校验
  if (b.contactEmail !== undefined && typeof b.contactEmail === 'string') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contactEmail)) {
      errors.push('contactEmail 格式无效')
    }
  }
  
  // contactPhone 格式校验
  if (b.contactPhone !== undefined && typeof b.contactPhone === 'string') {
    if (!/^[\d\s\-+()]{6,20}$/.test(b.contactPhone)) {
      errors.push('contactPhone 格式无效')
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验登录请求
 */
export function validateLogin(body: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['请求体必须是 JSON 对象'] }
  }
  
  const b = body as Record<string, unknown>
  
  if (!b.email || typeof b.email !== 'string') {
    errors.push('email 是必填字段')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
    errors.push('email 格式无效')
  }
  
  if (!b.password || typeof b.password !== 'string') {
    errors.push('password 是必填字段')
  } else if (b.password.length < 6) {
    errors.push('password 长度至少为 6')
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * 校验注册请求
 */
export function validateRegister(body: unknown): ValidationResult {
  const loginResult = validateLogin(body)
  
  if (!loginResult.valid) {
    return loginResult
  }
  
  // 注册可以有额外字段，目前与登录相同
  return { valid: true, errors: [] }
}

// ============================================================
// 错误响应格式化
// ============================================================

/**
 * 格式化校验错误为 API 响应
 */
export function formatValidationErrors(errors: string[]): { error: string; details: string[] } {
  return {
    error: '参数校验失败',
    details: errors,
  }
}
