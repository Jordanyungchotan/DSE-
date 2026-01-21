/**
 * 积分服务（后端唯一积分逻辑）
 * 
 * 规则：
 * - 所有积分操作必须通过此服务
 * - 前端不做任何积分计算
 * - 使用 shared/domain/points.ts 作为唯一规则来源
 * - 【关键】积分触发基于 learning_events 事实表，而非前端行为
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
  PointsApiResponse,
  PointTaskDefinition,
} from '../../../shared/domain/points';
import { LanguageCode } from '../../../shared/domain/subjects';

// ===== 积分触发条件配置 =====

/** 
 * 基于 learning_events 的积分触发条件
 * 【关键】积分发放条件改为基于 learning_events，而非前端行为
 */
export const LEARNING_EVENT_TRIGGERS = {
  // 单次刷题：至少 5 题，正确率 >= 50%
  COMPLETE_QUIZ: {
    minQuestionCount: 5,
    minAccuracy: 0.5,
  },
  // 水平测试：正确率 >= 40%
  COMPLETE_LEVEL_TEST: {
    minAccuracy: 0.4,
  },
  // 每日刷题 30 题
  DAILY_QUIZ_30: {
    dailyMinQuestionCount: 30,
    minAccuracy: 0.5,
  },
  // 每日刷题 50 题
  DAILY_QUIZ_50: {
    dailyMinQuestionCount: 50,
    minAccuracy: 0.5,
  },
  // 每日刷题 100 题
  DAILY_QUIZ_100: {
    dailyMinQuestionCount: 100,
    minAccuracy: 0.5,
  },
} as const;

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

// ===== 基于 learning_events 的积分触发 =====

/**
 * 【核心函数】基于 learning_events 检查并发放积分
 * 
 * 调用时机：
 * - 刷题完成时（recordLearningEvent 后）
 * - 水平测试完成时（recordLearningEvent 后）
 * 
 * 规则：
 * - 积分触发基于 learning_events 事实表
 * - 禁止前端直接请求加分
 * - learning_events 记录事实，point_events 记录奖励
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
  const today = getTodayDateString();

  // ===== 1. 检查单次事件是否满足积分条件 =====
  
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
    
    // ===== 2. 检查每日累计刷题里程碑 =====
    
    // 从 learning_events 读取今日累计有效题目数
    const todayStats = await db.prepare(`
      SELECT 
        COALESCE(SUM(question_count), 0) as total_questions,
        COALESCE(SUM(correct_count), 0) as total_correct
      FROM learning_events
      WHERE user_id = ?
      AND event_type = 'QUIZ'
      AND DATE(created_at) = DATE('now')
      AND accuracy >= ?
    `).bind(userId, LEARNING_EVENT_TRIGGERS.DAILY_QUIZ_30.minAccuracy).first<{
      total_questions: number;
      total_correct: number;
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
    
    // ===== 3. 检查首次刷题成就 =====
    const result = await addPoints(db, userId, 'FIRST_QUIZ', String(learningEventId));
    if (result.success) {
      awarded.push({ task: 'FIRST_QUIZ', points: result.points });
    }
  }
  
  if (eventType === 'LEVEL_TEST') {
    const trigger = LEARNING_EVENT_TRIGGERS.COMPLETE_LEVEL_TEST;
    
    // 水平测试积分条件：正确率 >= 40%
    if (eventData.accuracy >= trigger.minAccuracy) {
      const result = await addPoints(db, userId, 'COMPLETE_LEVEL_TEST', String(learningEventId));
      if (result.success) {
        awarded.push({ task: 'COMPLETE_LEVEL_TEST', points: result.points });
      }
    }
  }
  
  if (eventType === 'ANALYSIS') {
    // 分析完成积分
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
 * 获取用户今日学习统计（从 learning_events 读取）
 * 用于前端展示"今日学习进度"
 */
export async function getTodayLearningProgress(
  db: D1Database,
  userId: string
): Promise<{
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  quizCount: number;
  // 里程碑进度
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
 * 获取排行榜（支持并列排名）
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

  // 获取总参与人数
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

  // 计算排名（支持并列：相同分数同排名）
  let currentRank = 1;
  let previousScore: number | null = null;
  let skipCount = 0;

  const rankings: LeaderboardEntry[] = results.results.map((row, index) => {
    if (previousScore !== null && row.score < previousScore) {
      currentRank += skipCount + 1;
      skipCount = 0;
    } else if (previousScore !== null && row.score === previousScore) {
      skipCount++;
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

  // 获取当前用户排名（如果不在榜单中）
  let currentUserRank: LeaderboardEntry | undefined;
  if (currentUserId) {
    const userInRankings = rankings.find(r => r.userId === currentUserId);
    if (userInRankings) {
      currentUserRank = userInRankings;
    } else {
      // 用户不在前 N 名，需要单独查询
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
  // 获取用户积分
  const userSummary = await db
    .prepare('SELECT total_points FROM user_point_summary WHERE user_id = ?')
    .bind(userId)
    .first<{ total_points: number }>();

  if (!userSummary) {
    return null;
  }

  // 计算排名（比该用户积分高的人数 + 1，支持并列）
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
 * 获取每日任务状态（UI 可直接渲染）
 */
export async function getDailyTaskStatus(
  db: D1Database,
  userId: string,
  lang: LanguageCode = 'zh-CN'
): Promise<DailyTaskStatus[]> {
  const today = getTodayDateString();

  // 获取今日任务完成次数
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

  // 检查一次性任务是否已完成
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

  // 构建任务状态列表（只返回有每日限制的任务）
  const taskStatuses: DailyTaskStatus[] = [];

  for (const taskKey of POINT_TASK_KEYS) {
    const task = POINT_TASKS[taskKey];
    
    // 跳过一次性任务（没有每日限制）
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
