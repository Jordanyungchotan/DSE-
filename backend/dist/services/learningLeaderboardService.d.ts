/**
 * 学习排行榜服务
 *
 * ⚠️ 数据唯一来源：learning_events
 * ⚠️ 禁止从其他表读取刷题或积分依据
 *
 * 核心职责：
 * - 计算用户 score（后端唯一计算点）
 * - 返回排名（dense rank，同分并列）
 * - 支持总榜 / 日榜 / 周榜
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';
export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
/**
 * 【后端唯一 Score 计算规则】
 *
 * score = total_questions * 1
 *       + correct_questions * 2
 *       + ROUND(duration_minutes * 0.1, 2)
 *
 * 示例：
 * - 做了 100 题，答对 80 题，用时 60 分钟
 * - score = 100 * 1 + 80 * 2 + 60 * 0.1 = 100 + 160 + 6 = 266
 *
 * 权重说明：
 * - total_questions * 1：鼓励多做题
 * - correct_questions * 2：奖励正确答案（权重更高）
 * - duration_minutes * 0.1：坚持时间（微小加分）
 */
export declare const SCORE_CONFIG: {
    readonly WEIGHT_TOTAL_QUESTIONS: 1;
    readonly WEIGHT_CORRECT_QUESTIONS: 2;
    readonly WEIGHT_DURATION_MINUTES: 0.1;
};
export declare const ANTI_CHEAT_CONFIG: {
    readonly MIN_ACCURACY_THRESHOLD: 0.4;
    readonly MIN_TIME_PER_QUESTION: 2;
};
/**
 * 排行榜条目（精简版，前端直接渲染）
 */
export interface LeaderboardEntry {
    userId: string;
    name: string;
    avatarUrl?: string;
    rank: number;
    score: number;
    isCurrentUser?: boolean;
}
/**
 * 排行榜响应
 */
export interface LeaderboardResponse {
    range: LeaderboardRange;
    subject: LeaderboardSubject;
    entries: LeaderboardEntry[];
    myRank?: LeaderboardEntry & {
        percentile: number;
        gapToNext?: number;
    };
    totalParticipants: number;
    lastUpdated: string;
    scoreFormula: string;
}
export interface LearningLeaderboardEntry extends LeaderboardEntry {
    totalQuestions: number;
    accuracy: number;
    avgTime: number;
    quizCount?: number;
}
export interface MyRankInfo extends LearningLeaderboardEntry {
    percentile: number;
    gapToNext?: {
        metric: string;
        value: number;
    };
    strengths: string[];
    weaknesses: string[];
}
export interface LearningLeaderboardResponse {
    metric: LeaderboardMetric;
    range: LeaderboardRange;
    subject: LeaderboardSubject;
    entries: LearningLeaderboardEntry[];
    myRank?: MyRankInfo;
    totalParticipants: number;
    lastUpdated: string;
    antiCheatNotice?: string;
}
/**
 * 获取学习排行榜（简洁版，UI 直接可用）
 *
 * 【核心规则】
 * 1. 数据源：learning_events（唯一）
 * 2. Score 公式：total_questions * 1 + correct_questions * 2 + duration_minutes * 0.1
 * 3. 排名：Dense Rank（同分并列）
 * 4. 抗刷：正确率 >= 40%，每题用时 >= 2秒
 */
export declare function getLeaderboard(db: D1Database, options?: {
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    limit?: number;
    currentUserId?: string;
}): Promise<LeaderboardResponse>;
/**
 * 获取学习排行榜（兼容旧接口）
 * @deprecated 使用 getLeaderboard 替代
 */
export declare function getLearningLeaderboard(db: D1Database, options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    limit?: number;
    currentUserId?: string;
}): Promise<LearningLeaderboardResponse>;
/**
 * 获取用户学习排名（兼容旧接口）
 * @deprecated 使用 getLeaderboard 替代
 */
export declare function getUserLearningRankWithAnalysis(db: D1Database, userId: string, options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    totalParticipants?: number;
    avgStats?: {
        avgAccuracy: number;
        avgTime: number;
        avgQuizCount: number;
    };
}): Promise<MyRankInfo | null>;
/**
 * 获取用户学习排名（简化版）
 * @deprecated 使用 getLeaderboard 替代
 */
export declare function getUserLearningRank(db: D1Database, userId: string, options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
}): Promise<LearningLeaderboardEntry | null>;
/**
 * 获取用户学习统计
 */
export declare function getUserLearningStats(db: D1Database, userId: string): Promise<{
    totalQuizzes: number;
    totalQuestions: number;
    correctAnswers: number;
    averageAccuracy: number;
    averageTimePerQuestion: number;
    currentStreak: number;
    longestStreak: number;
    perfectSessions: number;
    recentScores: number[];
    effectiveQuizzes: number;
    filteredQuizzes: number;
} | null>;
//# sourceMappingURL=learningLeaderboardService.d.ts.map