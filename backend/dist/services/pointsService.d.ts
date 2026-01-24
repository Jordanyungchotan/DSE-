/**
 * 积分服务（后端唯一积分逻辑）
 *
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 *
 * ==============================
 * 【积分触发来源（全部来自 learning_events）】
 *
 * - DAILY_LOGIN
 *   → learning_events 中当日第一条事件
 *
 * - COMPLETE_QUIZ
 *   → learning_events.event_type = 'QUIZ'
 *
 * - COMPLETE_LEVEL_TEST
 *   → learning_events.event_type = 'LEVEL_TEST'
 *
 * - COMPLETE_ANALYSIS
 *   → learning_events.event_type = 'ANALYSIS'
 *
 * - DAILY_QUIZ_30/50/100
 *   → 当日 learning_events 累计题目数达到阈值
 *
 * ==============================
 * 【禁止】
 *
 * ❌ 前端调用"加积分" API
 * ❌ 页面点击直接加分
 * ❌ 从排行榜反推积分
 * ❌ 直接读取 quiz 表
 *
 * ==============================
 * 【允许】
 *
 * ✅ 后端在写入 learning_events 后 → 同步写入 point_events
 * ✅ 通过 checkAndAwardPointsFromLearningEvent() 触发积分
 *
 * ==============================
 */
import { PointTaskKey, PointsSummary, LeaderboardResponse, DailyTaskStatus, PointEvent } from '../../../shared/domain/points';
import { LanguageCode } from '../../../shared/domain/subjects';
/**
 * 积分发放条件（全部基于 learning_events 事实表）
 *
 * ⚠️ 禁止任何基于前端行为的触发
 */
export declare const LEARNING_EVENT_TRIGGERS: {
    readonly COMPLETE_QUIZ: {
        readonly minQuestionCount: 5;
        readonly minAccuracy: 0.5;
    };
    readonly COMPLETE_LEVEL_TEST: {
        readonly minAccuracy: 0.4;
    };
    readonly DAILY_QUIZ_30: {
        readonly dailyMinQuestionCount: 30;
        readonly minAccuracy: 0.5;
    };
    readonly DAILY_QUIZ_50: {
        readonly dailyMinQuestionCount: 50;
        readonly minAccuracy: 0.5;
    };
    readonly DAILY_QUIZ_100: {
        readonly dailyMinQuestionCount: 100;
        readonly minAccuracy: 0.5;
    };
};
/**
 * 【内部函数】添加积分到 point_events
 *
 * ⚠️ 此函数不应被外部直接调用
 * ⚠️ 请使用 checkAndAwardPointsFromLearningEvent() 触发积分
 */
export declare function addPoints(db: D1Database, userId: string, task: PointTaskKey, relatedId?: string): Promise<{
    success: boolean;
    points: number;
    message?: string;
}>;
/**
 * 【核心函数】基于 learning_events 检查并发放积分
 *
 * ⚠️ 这是积分发放的唯一合法入口
 * ⚠️ 必须在 recordLearningEvent() 之后调用
 *
 * 调用时机：
 * - 刷题完成时（recordLearningEvent 后）
 * - 水平测试完成时（recordLearningEvent 后）
 * - 分析完成时（recordLearningEvent 后）
 *
 * 触发映射：
 * - DAILY_LOGIN      → 当日第一条 learning_events
 * - COMPLETE_QUIZ    → event_type = 'QUIZ'
 * - COMPLETE_LEVEL_TEST → event_type = 'LEVEL_TEST'
 * - DAILY_QUIZ_30/50/100 → 当日累计题目数
 */
export declare function checkAndAwardPointsFromLearningEvent(db: D1Database, userId: string, eventType: 'QUIZ' | 'LEVEL_TEST' | 'ANALYSIS', learningEventId: number, eventData: {
    questionCount: number;
    correctCount: number;
    accuracy: number;
    durationSeconds: number;
}): Promise<{
    awarded: {
        task: PointTaskKey;
        points: number;
    }[];
    message: string;
}>;
/**
 * 获取用户今日学习进度（从 learning_events 读取）
 */
export declare function getTodayLearningProgress(db: D1Database, userId: string): Promise<{
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
    quizCount: number;
    milestones: {
        target: number;
        current: number;
        completed: boolean;
        task: PointTaskKey;
    }[];
}>;
/**
 * 获取用户积分摘要
 */
export declare function getPointsSummary(db: D1Database, userId: string): Promise<PointsSummary>;
/**
 * 获取积分排行榜（积分来源于 point_events，而非 learning_events）
 */
export declare function getLeaderboard(db: D1Database, currentUserId?: string, limit?: number): Promise<LeaderboardResponse>;
/**
 * 获取用户排名
 */
export declare function getUserRank(db: D1Database, userId: string): Promise<{
    rank: number;
    totalPoints: number;
} | null>;
/**
 * 获取每日任务状态（UI 可直接渲染）
 */
export declare function getDailyTaskStatus(db: D1Database, userId: string, lang?: LanguageCode): Promise<DailyTaskStatus[]>;
/**
 * 获取用户积分历史
 */
export declare function getPointHistory(db: D1Database, userId: string, limit?: number, offset?: number): Promise<PointEvent[]>;
/**
 * 检查用户是否有足够积分
 */
export declare function hasEnoughPoints(db: D1Database, userId: string, requiredPoints: number): Promise<boolean>;
/**
 * 扣除积分（用于兑换）
 */
export declare function deductPoints(db: D1Database, userId: string, points: number, reason: string): Promise<{
    success: boolean;
    message?: string;
}>;
//# sourceMappingURL=pointsService.d.ts.map