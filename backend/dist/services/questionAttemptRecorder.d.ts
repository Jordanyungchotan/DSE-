/**
 * 题目级别事实记录服务
 *
 * ⚠️ question_attempts 是错题本 & 学习档案的唯一数据来源
 * ⚠️ 所有查询必须从此表读取，禁止读取 quiz 表
 *
 * 规则：
 * 1. 一道题一次作答 = 一条记录
 * 2. 永远 INSERT，不允许 UPDATE（append-only）
 * 3. 这是错题本 & 学习档案的唯一"原始事实"
 *
 * 用途：
 * - 错题本：统计错误次数、错误答案、解析
 * - 学习档案：科目掌握度、知识点掌握度、学习趋势
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results / quiz_answers 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
export type QuestionSourceType = 'QUIZ' | 'LEVEL_TEST' | 'WRONG_REVIEW';
export interface QuestionAttemptInput {
    userId: string;
    questionId: string;
    questionText?: string;
    questionType?: string;
    subject?: string;
    topic?: string;
    selectedAnswer?: string;
    correctAnswer?: string;
    isCorrect: boolean;
    explanation?: string;
    durationSeconds?: number;
    sourceType: QuestionSourceType;
    sourceId?: string;
}
export interface QuestionAttemptResult {
    success: boolean;
    attemptId?: number;
    error?: string;
}
/**
 * 记录单道题目的作答事实
 * 【关键】永远 INSERT，不允许 UPDATE
 */
export declare function recordQuestionAttempt(db: D1Database, input: QuestionAttemptInput): Promise<QuestionAttemptResult>;
/**
 * 批量记录题目作答事实
 * 用于刷题完成时一次性记录所有题目
 */
export declare function recordQuestionAttemptsBatch(db: D1Database, inputs: QuestionAttemptInput[]): Promise<{
    success: boolean;
    count: number;
    errors: string[];
}>;
export type WrongQuestionStatus = 'UNREVIEWED' | 'REVIEWED' | 'MASTERED';
export interface WrongQuestionItem {
    id: string;
    questionText: string;
    questionType: string;
    subject: string;
    topic: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    wrongCount: number;
    status: WrongQuestionStatus;
    firstAttemptDate: string;
    lastAttemptDate: string;
}
export interface WrongQuestionsResponse {
    stats: {
        total: number;
        unreviewed: number;
        reviewed: number;
        mastered: number;
    };
    items: WrongQuestionItem[];
}
/**
 * 获取用户错题列表（从原始事实聚合）
 *
 * 【数据来源】
 * - question_attempts: 题目作答事实
 * - wrong_question_status: 用户标记的状态
 *
 * 【返回结构完全对齐前端】
 */
export declare function getWrongQuestionsByUser(db: D1Database, userId: string, options?: {
    subject?: string;
    topic?: string;
    status?: WrongQuestionStatus;
    limit?: number;
    offset?: number;
}): Promise<WrongQuestionsResponse>;
/**
 * 更新错题状态（用户主动标记）
 */
export declare function updateWrongQuestionStatus(db: D1Database, userId: string, questionId: string, status: WrongQuestionStatus): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * 批量更新错题状态
 */
export declare function updateWrongQuestionStatusBatch(db: D1Database, userId: string, questionIds: string[], status: WrongQuestionStatus): Promise<{
    success: boolean;
    count: number;
}>;
/**
 * 删除错题状态（用于重置）
 */
export declare function deleteWrongQuestionStatus(db: D1Database, userId: string, questionId: string): Promise<{
    success: boolean;
}>;
/**
 * 获取用户科目掌握度（从原始事实聚合）
 */
export declare function getSubjectMasteryByUser(db: D1Database, userId: string): Promise<Array<{
    subject: string;
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
    recentAccuracy: number;
    recentTrend: 'up' | 'down' | 'stable';
    lastPracticed: string;
}>>;
/**
 * 获取用户知识点掌握度（从原始事实聚合）
 */
export declare function getTopicMasteryByUser(db: D1Database, userId: string, options?: {
    subject?: string;
    limit?: number;
}): Promise<Array<{
    topic: string;
    subject: string;
    totalQuestions: number;
    correctCount: number;
    mastery: number;
    lastAttempted: string;
}>>;
/**
 * 获取用户最近学习活动（从原始事实聚合）
 */
export declare function getRecentActivityByUser(db: D1Database, userId: string, days?: number): Promise<Array<{
    date: string;
    quizCount: number;
    questionsAnswered: number;
    correctCount: number;
    accuracy: number;
}>>;
/**
 * 获取用户学习档案总体统计（从 question_attempts）
 */
export declare function getLearningProfileStats(db: D1Database, userId: string): Promise<{
    totalQuizzes: number;
    totalQuestions: number;
    correctAnswers: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    uniqueSubjects: number;
    uniqueTopics: number;
}>;
export interface LearningProfileOverview {
    totalQuizzes: number;
    totalQuestions: number;
    correctAnswers: number;
    totalTimeSpent: number;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string;
}
export interface SubjectMasteryItem {
    subjectId: string;
    subjectName: string;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    recentTrend: 'up' | 'down' | 'stable';
    lastPracticed: string;
}
export interface TopicMasteryItem {
    topic: string;
    subject: string;
    mastery: number;
    questionsAttempted: number;
    lastAttempted: string;
}
export interface RecentActivityItem {
    date: string;
    quizCount: number;
    questionsAnswered: number;
    accuracy: number;
}
export interface LearningProfileResponse {
    overview: LearningProfileOverview;
    subjectMastery: SubjectMasteryItem[];
    topicMastery: TopicMasteryItem[];
    recentActivity: RecentActivityItem[];
}
/**
 * 获取完整学习档案（对齐前端结构）
 *
 * 数据来源：
 * - overview: learning_events（总体统计 + streak）
 * - recentActivity: learning_events（每日活动）
 * - subjectMastery: question_attempts（科目掌握度）
 * - topicMastery: question_attempts（知识点掌握度）
 */
export declare function getLearningProfile(db: D1Database, userId: string): Promise<LearningProfileResponse>;
//# sourceMappingURL=questionAttemptRecorder.d.ts.map