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
// ===== 排行榜特权配置 =====
export const TOP_RANKER_PRIVILEGES = [
    {
        rank: 3, // 前 3 名
        privileges: [
            '专属头衔「学霸」',
            '解锁 VIP 咨询商品',
            '额外 20% 积分加成',
        ],
    },
    {
        rank: 10, // 前 10 名
        privileges: [
            '专属头衔「学习达人」',
            '解锁限定兑换商品',
        ],
    },
    {
        rank: 50, // 前 50 名
        privileges: [
            '专属头衔「勤奋之星」',
        ],
    },
];
// ===== 主要服务函数 =====
/**
 * 获取激励排行榜（积分榜）
 */
export async function getIncentiveLeaderboard(db, options) {
    const { type = 'POINTS_TOTAL', limit = 50, currentUserId, } = options;
    let query;
    let orderBy;
    if (type === 'POINTS_WEEKLY') {
        // 周积分榜：统计本周获得的积分
        query = `
      SELECT 
        pe.user_id,
        u.nickname as name,
        u.avatar as avatar_url,
        SUM(pe.points) as weekly_points,
        COALESCE(ups.total_points, 0) as total_points
      FROM point_events pe
      JOIN users u ON u.id = pe.user_id
      LEFT JOIN user_point_summary ups ON ups.user_id = pe.user_id
      WHERE pe.created_at >= DATE('now', '-7 days')
      AND pe.points > 0
      GROUP BY pe.user_id
      ORDER BY weekly_points DESC, total_points DESC
      LIMIT ?
    `;
        orderBy = 'weekly_points';
    }
    else {
        // 总积分榜
        query = `
      SELECT 
        ups.user_id,
        u.nickname as name,
        u.avatar as avatar_url,
        ups.total_points
      FROM user_point_summary ups
      JOIN users u ON u.id = ups.user_id
      WHERE ups.total_points > 0
      ORDER BY ups.total_points DESC
      LIMIT ?
    `;
        orderBy = 'total_points';
    }
    const results = await db
        .prepare(query)
        .bind(limit)
        .all();
    // 获取总参与人数
    const totalQuery = type === 'POINTS_WEEKLY'
        ? `SELECT COUNT(DISTINCT user_id) as total FROM point_events WHERE created_at >= DATE('now', '-7 days') AND points > 0`
        : `SELECT COUNT(*) as total FROM user_point_summary WHERE total_points > 0`;
    const totalResult = await db.prepare(totalQuery).first();
    const totalParticipants = totalResult?.total || 0;
    // 处理排名和特权
    const entries = [];
    let currentRank = 1;
    let previousValue = null;
    let skipCount = 0;
    if (results.results) {
        for (let i = 0; i < results.results.length; i++) {
            const row = results.results[i];
            const rankValue = type === 'POINTS_WEEKLY'
                ? (row.weekly_points || 0)
                : row.total_points;
            // 计算排名（并列处理）
            if (previousValue !== null && rankValue < previousValue) {
                currentRank += skipCount + 1;
                skipCount = 0;
            }
            else if (previousValue !== null && rankValue === previousValue) {
                skipCount++;
            }
            previousValue = rankValue;
            // 判断是否为 Top Ranker
            const isTopRanker = currentRank <= TOP_RANKER_PRIVILEGES[0].rank;
            // 获取对应特权
            const privileges = [];
            for (const config of TOP_RANKER_PRIVILEGES) {
                if (currentRank <= config.rank) {
                    privileges.push(...config.privileges);
                    break;
                }
            }
            entries.push({
                userId: row.user_id,
                name: row.name || 'Anonymous',
                avatarUrl: row.avatar_url || undefined,
                rank: currentRank,
                totalPoints: row.total_points,
                weeklyPoints: row.weekly_points,
                isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
                isTopRanker,
                privileges: privileges.length > 0 ? privileges : undefined,
            });
        }
    }
    // 获取当前用户排名
    let myRank;
    if (currentUserId) {
        const userInEntries = entries.find(e => e.userId === currentUserId);
        if (userInEntries) {
            const percentile = Math.round((1 - (userInEntries.rank - 1) / totalParticipants) * 100);
            // 计算与前一名的差距
            let gapToNext;
            if (userInEntries.rank > 1) {
                const prevEntry = entries.find(e => e.rank === userInEntries.rank - 1);
                if (prevEntry) {
                    const currentValue = type === 'POINTS_WEEKLY'
                        ? (userInEntries.weeklyPoints || 0)
                        : userInEntries.totalPoints;
                    const prevValue = type === 'POINTS_WEEKLY'
                        ? (prevEntry.weeklyPoints || 0)
                        : prevEntry.totalPoints;
                    gapToNext = {
                        metric: '积分',
                        value: prevValue - currentValue,
                    };
                }
            }
            myRank = {
                ...userInEntries,
                percentile,
                gapToNext,
            };
        }
        else {
            // 用户不在前 N 名，单独查询
            const userRankResult = await getUserIncentiveRank(db, currentUserId, type, totalParticipants);
            if (userRankResult) {
                myRank = userRankResult;
            }
        }
    }
    return {
        type,
        entries,
        myRank,
        totalParticipants,
        lastUpdated: new Date().toISOString(),
        topRankerPrivileges: TOP_RANKER_PRIVILEGES,
    };
}
/**
 * 获取用户的激励排名
 */
async function getUserIncentiveRank(db, userId, type, totalParticipants) {
    // 获取用户积分
    const userQuery = `
    SELECT 
      ups.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
      ups.total_points
    FROM user_point_summary ups
    JOIN users u ON u.id = ups.user_id
    WHERE ups.user_id = ?
  `;
    const userResult = await db.prepare(userQuery).bind(userId).first();
    if (!userResult) {
        return null;
    }
    // 计算排名
    const rankQuery = type === 'POINTS_WEEKLY'
        ? `
      SELECT COUNT(*) as higher_count
      FROM (
        SELECT user_id, SUM(points) as weekly_points
        FROM point_events
        WHERE created_at >= DATE('now', '-7 days')
        AND points > 0
        GROUP BY user_id
        HAVING weekly_points > (
          SELECT COALESCE(SUM(points), 0)
          FROM point_events
          WHERE user_id = ? AND created_at >= DATE('now', '-7 days') AND points > 0
        )
      )
    `
        : `
      SELECT COUNT(*) as higher_count
      FROM user_point_summary
      WHERE total_points > ?
    `;
    const rankResult = type === 'POINTS_WEEKLY'
        ? await db.prepare(rankQuery).bind(userId).first()
        : await db.prepare(rankQuery).bind(userResult.total_points).first();
    const rank = (rankResult?.higher_count || 0) + 1;
    const percentile = Math.round((1 - (rank - 1) / totalParticipants) * 100);
    // 获取对应特权
    const privileges = [];
    for (const config of TOP_RANKER_PRIVILEGES) {
        if (rank <= config.rank) {
            privileges.push(...config.privileges);
            break;
        }
    }
    return {
        userId: userResult.user_id,
        name: userResult.name || 'Anonymous',
        avatarUrl: userResult.avatar_url || undefined,
        rank,
        totalPoints: userResult.total_points,
        isCurrentUser: true,
        isTopRanker: rank <= TOP_RANKER_PRIVILEGES[0].rank,
        privileges: privileges.length > 0 ? privileges : undefined,
        percentile,
    };
}
/**
 * 检查用户是否有排行榜专属特权
 */
export async function checkUserPrivileges(db, userId) {
    // 获取用户在总榜的排名
    const userSummary = await db.prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?').bind(userId).first();
    if (!userSummary) {
        return { rank: 0, privileges: [], canAccessVipItems: false };
    }
    const rankResult = await db.prepare('SELECT COUNT(*) as higher_count FROM user_point_summary WHERE total_points > ?').bind(userSummary.total_points).first();
    const rank = (rankResult?.higher_count || 0) + 1;
    // 获取对应特权
    const privileges = [];
    let canAccessVipItems = false;
    for (const config of TOP_RANKER_PRIVILEGES) {
        if (rank <= config.rank) {
            privileges.push(...config.privileges);
            if (config.rank <= 3) {
                canAccessVipItems = true; // 前 3 名可访问 VIP 商品
            }
            break;
        }
    }
    return { rank, privileges, canAccessVipItems };
}
//# sourceMappingURL=incentiveLeaderboardService.js.map