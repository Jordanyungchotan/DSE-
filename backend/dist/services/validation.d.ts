/**
 * 参数校验模块
 *
 * 基于 Swagger/OpenAPI 规范进行严格的请求参数校验
 */
/** 校验结果 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/** 学生档案（API 输入） */
export interface StudentProfileInput {
    age?: number;
    gender?: 'male' | 'female';
    currentGrade: string;
    scores: Record<string, number>;
    currentSchool?: string;
    strengths?: string[];
    extracurriculars?: string[];
    hobbies?: string;
    achievements?: string;
}
/** 目标学校（API 输入） */
export interface TargetSchoolInput {
    schoolId?: string;
    schoolName: string;
    bandLevel: 1 | 2 | 3;
    district: string;
    gender?: 'boys' | 'girls' | 'coed';
    type?: 'government' | 'aided' | 'dss' | 'private';
}
/** 分析提交请求 */
export interface AnalysisSubmitRequest {
    student: StudentProfileInput;
    targetSchool: TargetSchoolInput;
    enrollmentDate?: string;
    semester?: string;
    notes?: string;
}
/** 反馈请求 */
export interface FeedbackRequest {
    analysisId: string;
    userOutcome: 'success' | 'failure' | 'not_tried' | 'pending';
    targetSchool?: string;
    updatedScores?: Record<string, number>;
    isEnrolled?: boolean;
    enrolledCourse?: string;
    feedbackText?: string;
    accuracyRating?: number;
    usefulnessRating?: number;
}
/** 咨询预约请求 */
export interface ConsultationBookRequest {
    analysisId: string;
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    preferredTime?: string;
    notes?: string;
}
/**
 * 校验学生档案
 */
export declare function validateStudentProfile(student: unknown): ValidationResult;
/**
 * 校验目标学校
 */
export declare function validateTargetSchool(school: unknown): ValidationResult;
/**
 * 校验分析提交请求
 */
export declare function validateAnalysisSubmit(body: unknown): ValidationResult;
/**
 * 校验反馈请求
 */
export declare function validateFeedback(body: unknown): ValidationResult;
/**
 * 校验咨询预约请求
 */
export declare function validateConsultationBook(body: unknown): ValidationResult;
/**
 * 校验登录请求
 */
export declare function validateLogin(body: unknown): ValidationResult;
/**
 * 校验注册请求
 */
export declare function validateRegister(body: unknown): ValidationResult;
/**
 * 格式化校验错误为 API 响应
 */
export declare function formatValidationErrors(errors: string[]): {
    error: string;
    details: string[];
};
//# sourceMappingURL=validation.d.ts.map