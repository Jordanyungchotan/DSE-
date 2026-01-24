/**
 * 激励排行榜服务（积分相关排行榜）
 *
 * ⚠️ 数据唯一来源：point_events / user_point_summary（积分表）
 * ⚠️ 学习数据必须从 learning_events / question_attempts 读取
 * ⚠️ 禁止从 quiz 表直接读取
 *
 * 职责：
 * - 处理积分排行榜
 * - 与学习排行榜分离，数据源不同
 * - 仅用于激励展示，不参与学习能力评估
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
export type IncentiveLeaderboardType = 'POINTS_TOTAL' | 'POINTS_WEEKLY';
export interface IncentiveLeaderboardEntry {
    userId: string;
    name: string;
    avatarUrl?: string;
    rank: number;
    totalPoints: number;
    weeklyPoints?: number;
    isCurrentUser?: boolean;
    isTopRanker?: boolean;
    privileges?: string[];
}
export interface IncentiveMyRankInfo extends IncentiveLeaderboardEntry {
    percentile: number;
    gapToNext?: {
        metric: string;
        value: number;
    };
}
export interface IncentiveLeaderboardResponse {
    type: IncentiveLeaderboardType;
    entries: IncentiveLeaderboardEntry[];
    myRank?: IncentiveMyRankInfo;
    totalParticipants: number;
    lastUpdated: string;
    topRankerPrivileges?: {
        rank: number;
        privileges: string[];
    }[];
}
export declare const TOP_RANKER_PRIVILEGES: {
    rank: number;
    privileges: string[];
}[];
/**
 * 获取激励排行榜（积分榜）
 */
export declare function getIncentiveLeaderboard(db: D1Database, options: {
    type?: IncentiveLeaderboardType;
    limit?: number;
    currentUserId?: string;
}): Promise<IncentiveLeaderboardResponse>;
/**
 * 检查用户是否有排行榜专属特权
 */
export declare function checkUserPrivileges(db: D1Database, userId: string): Promise<{
    rank: number;
    privileges: string[];
    canAccessVipItems: boolean;
}>;
//# sourceMappingURL=incentiveLeaderboardService.d.ts.map