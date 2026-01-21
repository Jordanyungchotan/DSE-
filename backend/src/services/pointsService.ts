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

import {
  POINT_TASKS,
  PointTaskKey,
  POINT_TASK_KEYS,
  isValidPointTaskKey,
  getPointTaskDisplayName,
  getPointTaskDescription,
  PointsSummary,
  LeaderboardEntry,
  LeaderboardResponse,
  DailyTaskStatus,
  PointEvent,
} from '../../../shared/domain/points';
import { LanguageCode } from '../../../shared/domain/subjects';

// ===== 积分触发条件配置（基于 learning_events）=====

/**
 * 积分发放条件（全部基于 learning_events 事实表）
 * 
 * ⚠️ 禁止任何基于前端行为的触发
 */
export const LEARNING_EVENT_TRIGGERS = {
  // 单次刷题积分条件
  COMPLETE_QUIZ: {
    minQuestionCount: 5,
    minAccuracy: 0.5,
  },
  // 水平测试积分条件
  COMPLETE_LEVEL_TEST: {
    minAccuracy: 0.4,
  },
  // 每日里程碑条件
  DAILY_QUIZ_30: {
    dailyMinQuestionCount: 30,
    minAccuracy: 0.5,
  },
  DAILY_QUIZ_50: {
    dailyMinQuestionCount: 50,
    minAccuracy: 0.5,
  },
  DAILY_QUIZ_100: {
    dailyMinQuestionCount: 100,
    minAccuracy: 0.5,
  },
} as const;

// ===== 工具函数 =====

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return crypto.randomUUID();
}

// ===== 核心积分函数 =====

/**
 * 【内部函数】添加积分到 point_events
 * 
 * ⚠️ 此函数不应被外部直接调用
 * ⚠️ 请使用 checkAndAwardPointsFromLearningEvent() 触发积分
 */
export async function addPoints(
  db: D1Database,
  userId: string,
  task: PointTaskKey,
  relatedId?: string
): Promise<{ success: boolean; points: number; message?: string }> {
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

// ===== 基于 learning_events 的积分触发（唯一入口）=====

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
export async function checkAndAwardPointsFromLearningEvent(
  db: D1Database,
  userId: string,
  eventType: 'QUIZ' | 'LEVEL_TEST' | 'ANALYSIS',
  learningEventId: number,
  eventData: {
    questionCount: number;
    correctCount: number;
    accuracy: number;
    durationSeconds: number;
  }
): Promise<{ awarded: { task: PointTaskKey; points: number }[]; message: string }> {
  const awarded: { task: PointTaskKey; points: number }[] = [];

  // ===== 1. 检查每日登录（当日第一条 learning_events）=====
  
  const todayEventCount = await db.prepare(`
    SELECT COUNT(*) as count
    FROM learning_events
    WHERE user_id = ?
    AND DATE(created_at) = DATE('now')
  `).bind(userId).first<{ count: number }>();
  
  // 如果这是今天的第一条事件，触发 DAILY_LOGIN
  if (todayEventCount?.count === 1) {
    const loginResult = await addPoints(db, userId, 'DAILY_LOGIN', String(learningEventId));
    if (loginResult.success) {
      awarded.push({ task: 'DAILY_LOGIN', points: loginResult.points });
    }
    
    // 检查连续登录成就
    const streakInfo = await checkLoginStreak(db, userId);
    if (streakInfo.streak === 7) {
      const streakResult = await addPoints(db, userId, 'STREAK_7_DAYS');
      if (streakResult.success) {
        awarded.push({ task: 'STREAK_7_DAYS', points: streakResult.points });
      }
    }
    if (streakInfo.streak === 30) {
      const streakResult = await addPoints(db, userId, 'STREAK_30_DAYS');
      if (streakResult.success) {
        awarded.push({ task: 'STREAK_30_DAYS', points: streakResult.points });
      }
    }
  }

  // ===== 2. 检查刷题相关积分 =====
  
  if (eventType === 'QUIZ') {
    const trigger = LEARNING_EVENT_TRIGGERS.COMPLETE_QUIZ;
    
    // 单次刷题积分条件：至少 5 题，正确率 >= 50%
    if (
      eventData.questionCount >= trigger.minQuestionCount &&
      eventData.accuracy >= trigger.minAccuracy
    ) {
      const result = await addPoints(db, userId, 'COMPLETE_QUIZ', String(learningEventId));
      if (result.success) {
        awarded.push({ task: 'COMPLETE_QUIZ', points: result.points });
      }
    }
    
    // 首次刷题成就
    const firstQuizResult = await addPoints(db, userId, 'FIRST_QUIZ', String(learningEventId));
    if (firstQuizResult.success) {
      awarded.push({ task: 'FIRST_QUIZ', points: firstQuizResult.points });
    }
    
    // ===== 3. 检查每日累计刷题里程碑 =====
    
    const todayStats = await db.prepare(`
      SELECT 
        COALESCE(SUM(question_count), 0) as total_questions
      FROM learning_events
      WHERE user_id = ?
      AND event_type = 'QUIZ'
      AND DATE(created_at) = DATE('now')
      AND accuracy >= ?
    `).bind(userId, LEARNING_EVENT_TRIGGERS.DAILY_QUIZ_30.minAccuracy).first<{
      total_questions: number;
    }>();
    
    const dailyQuestions = todayStats?.total_questions || 0;
    
    // 每日 30 题里程碑
    if (dailyQuestions >= LEARNING_EVENT_TRIGGERS.DAILY_QUIZ_30.dailyMinQuestionCount) {
      const result = await addPoints(db, userId, 'DAILY_QUIZ_30');
      if (result.success) {
        awarded.push({ task: 'DAILY_QUIZ_30', points: result.points });
      }
    }
    
    // 每日 50 题里程碑
    if (dailyQuestions >= LEARNING_EVENT_TRIGGERS.DAILY_QUIZ_50.dailyMinQuestionCount) {
      const result = await addPoints(db, userId, 'DAILY_QUIZ_50');
      if (result.success) {
        awarded.push({ task: 'DAILY_QUIZ_50', points: result.points });
      }
    }
    
    // 每日 100 题里程碑
    if (dailyQuestions >= LEARNING_EVENT_TRIGGERS.DAILY_QUIZ_100.dailyMinQuestionCount) {
      const result = await addPoints(db, userId, 'DAILY_QUIZ_100');
      if (result.success) {
        awarded.push({ task: 'DAILY_QUIZ_100', points: result.points });
      }
    }
  }
  
  // ===== 4. 检查水平测试积分 =====
  
  if (eventType === 'LEVEL_TEST') {
    const trigger = LEARNING_EVENT_TRIGGERS.COMPLETE_LEVEL_TEST;
    
    if (eventData.accuracy >= trigger.minAccuracy) {
      const result = await addPoints(db, userId, 'COMPLETE_LEVEL_TEST', String(learningEventId));
      if (result.success) {
        awarded.push({ task: 'COMPLETE_LEVEL_TEST', points: result.points });
      }
    }
  }
  
  // ===== 5. 检查分析积分 =====
  
  if (eventType === 'ANALYSIS') {
    const result = await addPoints(db, userId, 'COMPLETE_ANALYSIS', String(learningEventId));
    if (result.success) {
      awarded.push({ task: 'COMPLETE_ANALYSIS', points: result.points });
    }
    
    // 首次分析成就
    const firstResult = await addPoints(db, userId, 'FIRST_ANALYSIS', String(learningEventId));
    if (firstResult.success) {
      awarded.push({ task: 'FIRST_ANALYSIS', points: firstResult.points });
    }
  }

  const totalPoints = awarded.reduce((sum, a) => sum + a.points, 0);
  
  return {
    awarded,
    message: awarded.length > 0 
      ? `获得 ${totalPoints} 积分` 
      : '未满足积分条件',
  };
}

/**
 * 检查用户登录连续天数（从 learning_events 读取）
 */
async function checkLoginStreak(
  db: D1Database,
  userId: string
): Promise<{ streak: number }> {
  // 从 learning_events 读取最近 30 天有活动的日期
  const result = await db.prepare(`
    SELECT DISTINCT DATE(created_at) as activity_date
    FROM learning_events
    WHERE user_id = ?
    AND created_at >= DATE('now', '-30 days')
    ORDER BY activity_date DESC
    LIMIT 31
  `).bind(userId).all<{ activity_date: string }>();
  
  if (!result.results || result.results.length === 0) {
    return { streak: 0 };
  }
  
  let streak = 0;
  const today = getTodayDateString();
  
  for (let i = 0; i < result.results.length; i++) {
    const date = result.results[i].activity_date;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];
    
    if (date === expected || (i === 0 && date === today)) {
      streak++;
    } else {
      break;
    }
  }
  
  return { streak };
}

// ===== 查询函数 =====

/**
 * 获取用户今日学习进度（从 learning_events 读取）
 */
export async function getTodayLearningProgress(
  db: D1Database,
  userId: string
): Promise<{
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
}> {
  const stats = await db.prepare(`
    SELECT 
      COALESCE(SUM(question_count), 0) as total_questions,
      COALESCE(SUM(correct_count), 0) as total_correct,
      COUNT(*) as quiz_count
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND DATE(created_at) = DATE('now')
    AND accuracy >= ?
  `).bind(userId, LEARNING_EVENT_TRIGGERS.COMPLETE_QUIZ.minAccuracy).first<{
    total_questions: number;
    total_correct: number;
    quiz_count: number;
  }>();
  
  const totalQuestions = stats?.total_questions || 0;
  const totalCorrect = stats?.total_correct || 0;
  const quizCount = stats?.quiz_count || 0;
  
  // 检查里程碑完成状态
  const today = getTodayDateString();
  const completedMilestones = await db.prepare(`
    SELECT task FROM user_daily_task_counts
    WHERE user_id = ? AND count_date = ?
    AND task IN ('DAILY_QUIZ_30', 'DAILY_QUIZ_50', 'DAILY_QUIZ_100')
    AND count > 0
  `).bind(userId, today).all<{ task: string }>();
  
  const completedSet = new Set(completedMilestones.results?.map(r => r.task) || []);
  
  return {
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
    quizCount,
    milestones: [
      {
        target: 30,
        current: Math.min(totalQuestions, 30),
        completed: completedSet.has('DAILY_QUIZ_30'),
        task: 'DAILY_QUIZ_30' as PointTaskKey,
      },
      {
        target: 50,
        current: Math.min(totalQuestions, 50),
        completed: completedSet.has('DAILY_QUIZ_50'),
        task: 'DAILY_QUIZ_50' as PointTaskKey,
      },
      {
        target: 100,
        current: Math.min(totalQuestions, 100),
        completed: completedSet.has('DAILY_QUIZ_100'),
        task: 'DAILY_QUIZ_100' as PointTaskKey,
      },
    ],
  };
}

/**
 * 获取用户积分摘要
 */
export async function getPointsSummary(
  db: D1Database,
  userId: string
): Promise<PointsSummary> {
  const today = getTodayDateString();

  const summary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  const taskCountsResult = await db
    .prepare('SELECT task, COUNT(*) as count FROM point_events WHERE user_id = ? GROUP BY task')
    .bind(userId)
    .all<{ task: string; count: number }>();

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
 * 获取积分排行榜（积分来源于 point_events，而非 learning_events）
 */
export async function getLeaderboard(
  db: D1Database,
  currentUserId?: string,
  limit: number = 50
): Promise<LeaderboardResponse> {
  const results = await db
    .prepare(`
      SELECT 
        s.user_id as userId,
        u.nickname,
        u.avatar,
        s.total_points as score
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
      score: number;
    }>();

  const totalResult = await db
    .prepare('SELECT COUNT(*) as total FROM user_point_summary')
    .first<{ total: number }>();

  const totalParticipants = totalResult?.total || 0;

  if (!results.results || results.results.length === 0) {
    return {
      rankings: [],
      totalParticipants,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Dense Rank（同分并列）
  let currentRank = 1;
  let previousScore: number | null = null;

  const rankings: LeaderboardEntry[] = results.results.map((row) => {
    if (previousScore !== null && row.score < previousScore) {
      currentRank++;
    }
    previousScore = row.score;

    return {
      rank: currentRank,
      userId: row.userId,
      name: row.nickname || 'Anonymous',
      avatarUrl: row.avatar || undefined,
      score: row.score,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
    };
  });

  // 获取当前用户排名
  let currentUserRank: LeaderboardEntry | undefined;
  if (currentUserId) {
    const userInRankings = rankings.find(r => r.userId === currentUserId);
    if (userInRankings) {
      currentUserRank = userInRankings;
    } else {
      const userRankInfo = await getUserRank(db, currentUserId);
      if (userRankInfo) {
        const userInfo = await db
          .prepare('SELECT nickname, avatar FROM users WHERE id = ?')
          .bind(currentUserId)
          .first<{ nickname: string; avatar: string | null }>();
        
        currentUserRank = {
          rank: userRankInfo.rank,
          userId: currentUserId,
          name: userInfo?.nickname || 'Anonymous',
          avatarUrl: userInfo?.avatar || undefined,
          score: userRankInfo.totalPoints,
          isCurrentUser: true,
        };
      }
    }
  }

  return {
    rankings,
    currentUserRank,
    totalParticipants,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 获取用户排名
 */
export async function getUserRank(
  db: D1Database,
  userId: string
): Promise<{ rank: number; totalPoints: number } | null> {
  const userSummary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  if (!userSummary) {
    return null;
  }

  // Dense Rank
  const rankResult = await db
    .prepare(
      'SELECT COUNT(DISTINCT total_points) as higher_count FROM user_point_summary WHERE total_points > ?'
    )
    .bind(userSummary.total_points)
    .first<{ higher_count: number }>();

  return {
    rank: (rankResult?.higher_count || 0) + 1,
    totalPoints: userSummary.total_points,
  };
}

/**
 * 获取每日任务状态（UI 可直接渲染）
 */
export async function getDailyTaskStatus(
  db: D1Database,
  userId: string,
  lang: LanguageCode = 'zh-CN'
): Promise<DailyTaskStatus[]> {
  const today = getTodayDateString();

  const todayCountsResult = await db
    .prepare('SELECT task, count FROM user_daily_task_counts WHERE user_id = ? AND count_date = ?')
    .bind(userId, today)
    .all<{ task: string; count: number }>();

  const todayCounts: Record<string, number> = {};
  if (todayCountsResult.results) {
    for (const row of todayCountsResult.results) {
      todayCounts[row.task] = row.count;
    }
  }

  const oneTimeTasksResult = await db
    .prepare('SELECT DISTINCT task FROM point_events WHERE user_id = ?')
    .bind(userId)
    .all<{ task: string }>();

  const completedOneTimeTasks = new Set<string>();
  if (oneTimeTasksResult.results) {
    for (const row of oneTimeTasksResult.results) {
      completedOneTimeTasks.add(row.task);
    }
  }

  const taskStatuses: DailyTaskStatus[] = [];

  for (const taskKey of POINT_TASK_KEYS) {
    const task = POINT_TASKS[taskKey];
    
    if (task.dailyLimit === 0) {
      continue;
    }

    const todayCount = todayCounts[taskKey] || 0;
    const completed = todayCount >= task.dailyLimit;

    taskStatuses.push({
      taskKey,
      label: getPointTaskDisplayName(taskKey, lang),
      description: getPointTaskDescription(taskKey, lang),
      completed,
      achievedPoints: todayCount * task.points,
      maxPoints: task.dailyLimit * task.points,
      todayCount,
      dailyLimit: task.dailyLimit,
      pointsPerTime: task.points,
    });
  }

  return taskStatuses;
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
  const hasEnough = await hasEnoughPoints(db, userId, points);
  if (!hasEnough) {
    return { success: false, message: 'Insufficient points' };
  }

  const eventId = generateId();
  await db
    .prepare(
      'INSERT INTO point_events (id, user_id, task, points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(eventId, userId, 'REDEMPTION', -points, reason, new Date().toISOString())
    .run();

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
