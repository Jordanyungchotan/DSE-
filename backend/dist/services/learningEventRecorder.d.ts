/**
 * 学习行为事件记录器
 *
 * ⚠️ learning_events 是排行榜、积分、学习分析的【唯一事实来源】
 * ⚠️ 禁止从 quiz 表读取数据进行统计
 *
 * 统一记录所有学习行为到 learning_events 表
 *
 * 规则：
 * - append-only：只增不改
 * - 所有统计必须从 learning_events 读取
 * - 禁止直接读取 quiz_sessions / level_tests 表进行统计
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
export type LearningEventType = 'QUIZ' | 'LEVEL_TEST' | 'ANALYSIS';
export interface LearningEventInput {
    userId: string;
    eventType: LearningEventType;
    subject?: string;
    questionCount: number;
    correctCount: number;
    durationSeconds: number;
    accuracy?: number;
    sourceId?: string;
    metadata?: Record<string, unknown>;
}
export interface LearningEvent {
    id: number;
    userId: string;
    eventType: LearningEventType;
    subject: string | null;
    questionCount: number;
    correctCount: number;
    durationSeconds: number;
    accuracy: number;
    sourceId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
export interface LearningStats {
    totalQuizCount: number;
    totalCorrectCount: number;
    totalQuestionCount: number;
    overallAccuracy: number;
    totalDurationSeconds: number;
    averageAccuracy: number;
    subjectStats: Record<string, {
        quizCount: number;
        correctCount: number;
        questionCount: number;
        accuracy: number;
    }>;
}
/**
 * 记录学习行为事件
 *
 * 使用示例：
 * await recordLearningEvent(db, {
 *   userId: 'user-123',
 *   eventType: 'QUIZ',
 *   subject: '数学',
 *   questionCount: 10,
 *   correctCount: 8,
 *   durationSeconds: 300,
 *   sourceId: 'quiz-session-abc'
 * });
 */
export declare function recordLearningEvent(db: D1Database, input: LearningEventInput): Promise<{
    success: boolean;
    eventId?: number;
    error?: string;
}>;
/**
 * 批量记录学习事件
 */
export declare function recordLearningEventsBatch(db: D1Database, events: LearningEventInput[]): Promise<{
    success: boolean;
    count: number;
    errors: string[];
}>;
/**
 * 获取用户学习统计（从 learning_events 读取）
 */
export declare function getUserLearningStats(db: D1Database, userId: string, options?: {
    eventType?: LearningEventType;
    subject?: string;
    startDate?: string;
    endDate?: string;
}): Promise<LearningStats>;
/**
 * 获取今日学习统计
 */
export declare function getTodayLearningStats(db: D1Database, userId: string): Promise<{
    quizCount: number;
    questionCount: number;
    correctCount: number;
    accuracy: number;
    durationSeconds: number;
}>;
/**
 * 获取用户连续学习天数
 */
export declare function getUserStreakDays(db: D1Database, userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
}>;
/**
 * 获取排行榜数据（从 learning_events 读取）
 */
export declare function getLeaderboardFromEvents(db: D1Database, options: {
    metric: 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
    range: 'ALL' | 'WEEK' | 'DAY';
    subject?: string;
    limit?: number;
}): Promise<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    quizCount: number;
    accuracy: number;
    avgTime: number;
    rank: number;
}[]>;
/**
 * 获取用户在排行榜中的位置（从 learning_events 读取）
 */
export declare function getUserRankFromEvents(db: D1Database, userId: string, options: {
    metric: 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
    range: 'ALL' | 'WEEK' | 'DAY';
    subject?: string;
}): Promise<{
    rank: number;
    quizCount: number;
    accuracy: number;
    avgTime: number;
    totalParticipants: number;
    percentile: number;
} | null>;
//# sourceMappingURL=learningEventRecorder.d.ts.map