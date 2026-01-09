/**
 * DeepSeek API 服务模块
 * 集成DeepSeek AI进行DSE插班分析
 */
/**
 * 学生信息接口
 */
export interface StudentInfo {
    enrollmentDate: string;
    semester: string;
    grade: string;
    age: number;
    currentSchool: string;
    subjects: {
        subject: string;
        currentScore: string;
        targetScore: string;
    }[];
    targetSchools: string[];
    notes: string;
}
/**
 * 科目分析结果
 */
interface SubjectAnalysis {
    subject: string;
    currentLevel: string;
    targetLevel: string;
    gap: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    estimatedTimeToImprove: string;
}
/**
 * 学校评估结果
 */
interface SchoolAssessment {
    schoolName: string;
    admissionProbability: number;
    requirements: string[];
    gaps: string[];
    recommendations: string[];
}
/**
 * 完整分析结果
 */
export interface AnalysisResult {
    overallAssessment: {
        feasibilityScore: number;
        summary: string;
        keyStrengths: string[];
        keyWeaknesses: string[];
    };
    subjectAnalyses: SubjectAnalysis[];
    schoolAssessments: SchoolAssessment[];
    studyPlan: {
        weeklySchedule: string[];
        monthlyGoals: string[];
        resources: string[];
    };
    additionalAdvice: string[];
}
/**
 * 调用DeepSeek API进行分析
 */
export declare const analyzeWithDeepSeek: (studentInfo: StudentInfo) => Promise<AnalysisResult>;
export {};
//# sourceMappingURL=deepseek.d.ts.map