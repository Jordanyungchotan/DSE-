/**
 * 积分服务（后端唯一积分逻辑）
 * 
 * 规则：
 * - 所有积分操作必须通过此服务
 * - 前端不做任何积分计算
 * - 使用 shared/domain/points.ts 作为唯一规则来源
 */

import {
  POINT_TASKS,
  PointTaskKey,
  isValidPointTaskKey,
  PointsSummary,
  LeaderboardEntry,
  PointEvent,
} from '../../../shared/domain/points';

// 获取今日日期字符串 (YYYY-MM-DD)
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// 生成 UUID
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 添加积分
 */
export async function addPoints(
  db: D1Database,
  userId: string,
  task: PointTaskKey,
  relatedId?: string
): Promise<{ success: boolean; points: number; message?: string }> {
  // 验证任务类型
  if (!isValidPointTaskKey(task)) {
    return { success: false, points: 0, message: 'Invalid task type' };
  }

  const rule = POINT_TASKS[task];
  const today = getTodayDateString();

  // 检查不可重复任务是否已完成
  if (!rule.repeatable) {
    const existed = await db
      .prepare('SELECT 1 FROM point_events WHERE user_id = ? AND task = ?')
      .bind(userId, task)
      .first();
    
    if (existed) {
      return { success: false, points: 0, message: 'Task already completed' };
    }
  }

  // 检查每日限制
  if (rule.dailyLimit > 0) {
    const todayCount = await db
      .prepare(
        'SELECT count FROM user_daily_task_counts WHERE user_id = ? AND task = ? AND count_date = ?'
      )
      .bind(userId, task, today)
      .first<{ count: number }>();

    if (todayCount && todayCount.count >= rule.dailyLimit) {
      return { success: false, points: 0, message: 'Daily limit reached' };
    }
  }

  // 插入积分事件
  const eventId = generateId();
  await db
    .prepare(
      'INSERT INTO point_events (id, user_id, task, points, related_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(eventId, userId, task, rule.points, relatedId || null, new Date().toISOString())
    .run();

  // 更新积分聚合表
  await db
    .prepare(`
      INSERT INTO user_point_summary (user_id, total_points, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        total_points = total_points + ?,
        updated_at = ?
    `)
    .bind(userId, rule.points, new Date().toISOString(), rule.points, new Date().toISOString())
    .run();

  // 更新每日任务计数
  if (rule.dailyLimit > 0) {
    await db
      .prepare(`
        INSERT INTO user_daily_task_counts (id, user_id, task, count_date, count)
        VALUES (?, ?, ?, ?, 1)
        ON CONFLICT(user_id, task, count_date) DO UPDATE SET
          count = count + 1
      `)
      .bind(generateId(), userId, task, today)
      .run();
  }

  return { success: true, points: rule.points };
}

/**
 * 获取用户积分摘要
 */
export async function getPointsSummary(
  db: D1Database,
  userId: string
): Promise<PointsSummary> {
  const today = getTodayDateString();

  // 获取总积分
  const summary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  // 获取各任务总完成次数
  const taskCountsResult = await db
    .prepare('SELECT task, COUNT(*) as count FROM point_events WHERE user_id = ? GROUP BY task')
    .bind(userId)
    .all<{ task: string; count: number }>();

  // 获取今日任务完成次数
  const todayCountsResult = await db
    .prepare('SELECT task, count FROM user_daily_task_counts WHERE user_id = ? AND count_date = ?')
    .bind(userId, today)
    .all<{ task: string; count: number }>();

  const taskCounts: Partial<Record<PointTaskKey, number>> = {};
  const todayCounts: Partial<Record<PointTaskKey, number>> = {};

  if (taskCountsResult.results) {
    for (const row of taskCountsResult.results) {
      if (isValidPointTaskKey(row.task)) {
        taskCounts[row.task] = row.count;
      }
    }
  }

  if (todayCountsResult.results) {
    for (const row of todayCountsResult.results) {
      if (isValidPointTaskKey(row.task)) {
        todayCounts[row.task] = row.count;
      }
    }
  }

  return {
    totalPoints: summary?.total_points || 0,
    taskCounts,
    todayCounts,
  };
}

/**
 * 获取排行榜
 */
export async function getLeaderboard(
  db: D1Database,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const results = await db
    .prepare(`
      SELECT 
        s.user_id as userId,
        u.nickname,
        u.avatar,
        s.total_points as totalPoints
      FROM user_point_summary s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.total_points DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<{
      userId: string;
      nickname: string;
      avatar: string | null;
      totalPoints: number;
    }>();

  if (!results.results) {
    return [];
  }

  return results.results.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    nickname: row.nickname || 'Anonymous',
    avatar: row.avatar || undefined,
    totalPoints: row.totalPoints,
  }));
}

/**
 * 获取用户排名
 */
export async function getUserRank(
  db: D1Database,
  userId: string
): Promise<{ rank: number; totalPoints: number } | null> {
  // 获取用户积分
  const userSummary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  if (!userSummary) {
    return null;
  }

  // 计算排名（比该用户积分高的人数 + 1）
  const rankResult = await db
    .prepare(
      'SELECT COUNT(*) as higher_count FROM user_point_summary WHERE total_points > ?'
    )
    .bind(userSummary.total_points)
    .first<{ higher_count: number }>();

  return {
    rank: (rankResult?.higher_count || 0) + 1,
    totalPoints: userSummary.total_points,
  };
}

/**
 * 获取用户积分历史
 */
export async function getPointHistory(
  db: D1Database,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PointEvent[]> {
  const results = await db
    .prepare(`
      SELECT id, user_id as userId, task, points, created_at as createdAt
      FROM point_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(userId, limit, offset)
    .all<{
      id: string;
      userId: string;
      task: string;
      points: number;
      createdAt: string;
    }>();

  if (!results.results) {
    return [];
  }

  return results.results.map((row) => ({
    id: row.id,
    userId: row.userId,
    task: row.task as PointTaskKey,
    points: row.points,
    createdAt: row.createdAt,
  }));
}

/**
 * 检查用户是否有足够积分
 */
export async function hasEnoughPoints(
  db: D1Database,
  userId: string,
  requiredPoints: number
): Promise<boolean> {
  const summary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  return (summary?.total_points || 0) >= requiredPoints;
}

/**
 * 扣除积分（用于兑换）
 */
export async function deductPoints(
  db: D1Database,
  userId: string,
  points: number,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  // 检查积分是否足够
  const hasEnough = await hasEnoughPoints(db, userId, points);
  if (!hasEnough) {
    return { success: false, message: 'Insufficient points' };
  }

  // 插入负积分事件
  const eventId = generateId();
  await db
    .prepare(
      'INSERT INTO point_events (id, user_id, task, points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(eventId, userId, 'REDEMPTION', -points, reason, new Date().toISOString())
    .run();

  // 更新积分聚合表
  await db
    .prepare(`
      UPDATE user_point_summary
      SET total_points = total_points - ?, updated_at = ?
      WHERE user_id = ?
    `)
    .bind(points, new Date().toISOString(), userId)
    .run();

  return { success: true };
}
