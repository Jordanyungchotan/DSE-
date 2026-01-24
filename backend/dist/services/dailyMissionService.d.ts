/**
 * 每日学习任务服务
 *
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 *
 * 职责：
 * - 基于用户当前状态，动态生成【今日学习任务】
 * - 行为引导，而非仅仅发分
 * - 让用户知道"今天做什么最划算"
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results / quiz_answers 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
export type MissionType = 'DAILY_QUIZ' | 'SUBJECT_FOCUS' | 'ACCURACY_BOOST' | 'SPEED_CHALLENGE' | 'STREAK_MAINTAIN' | 'RANK_BREAKTHROUGH' | 'WEAKNESS_FIX' | 'REVIEW_MISTAKES';
export type MissionPriority = 'high' | 'medium' | 'low';
export interface MissionReward {
    points: number;
    leaderboardBoost?: boolean;
    streakBonus?: boolean;
    badgeProgress?: string;
}
export interface MissionProgress {
    current: number;
    target: number;
    unit?: string;
}
export interface DailyMission {
    id: string;
    type: MissionType;
    title: string;
    description: string;
    reason: string;
    priority: MissionPriority;
    reward: MissionReward;
    progress: MissionProgress;
    actionPath: string;
    actionLabel: string;
    completed: boolean;
    expiresAt: string;
}
export interface DailyMissionResponse {
    date: string;
    userId: string;
    missions: DailyMission[];
    completedCount: number;
    totalCount: number;
    bonusUnlocked: boolean;
    nextRefreshAt: string;
}
/**
 * 获取用户今日学习任务
 *
 * 【重要】此函数必须健壮，即使用户没有任何学习数据也能正常返回
 * 整个函数被 try-catch 包裹，确保任何情况下都返回有效响应
 */
export declare function getDailyMissions(db: D1Database, userId: string): Promise<DailyMissionResponse>;
/**
 * 检查并更新任务进度
 */
export declare function checkMissionProgress(db: D1Database, userId: string, eventType: 'QUIZ_COMPLETE' | 'MISTAKE_REVIEW', eventData: {
    quizCount?: number;
    accuracy?: number;
    subject?: string;
    reviewCount?: number;
}): Promise<{
    completedMissions: string[];
    newlyCompleted: string[];
    totalPoints: number;
}>;
//# sourceMappingURL=dailyMissionService.d.ts.map