/**
 * DSE智能刷题 - AI题目生成服务
 * 使用DeepSeek AI动态生成符合DSE考试标准的题目
 */
/**
 * 题目类型
 */
export type QuestionType = 'multiple_choice' | 'short_answer' | 'calculation' | 'explanation';
/**
 * 生成的题目接口
 */
export interface GeneratedQuestion {
    id: string;
    question: string;
    questionType: QuestionType;
    options?: string[];
    correctAnswer: string | number;
    explanation: string;
    topicTags: string[];
    estimatedTime: number;
    difficultyScore: number;
}
/**
 * 刷题配置接口
 */
export interface QuizConfig {
    grade: string;
    subject: string;
    difficulty: string;
    questionCount: number;
}
/**
 * 调用DeepSeek API生成题目
 */
export declare const generateQuestions: (config: QuizConfig) => Promise<GeneratedQuestion[]>;
/**
 * 批改答案
 */
export declare const gradeAnswer: (question: GeneratedQuestion, userAnswer: string | number) => Promise<{
    isCorrect: boolean;
    score: number;
    feedback: string;
}>;
//# sourceMappingURL=quizGenerator.d.ts.map