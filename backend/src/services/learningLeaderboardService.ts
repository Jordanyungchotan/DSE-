/**
 * 学习排行榜服务（与积分系统完全解耦）
 * 
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 * 
 * 职责：
 * - 处理学习行为排行榜
 * - 【重要】所有数据必须从 learning_events 表读取
 * - learning_events 是排行榜的唯一事实来源
 * - 支持多维度排行（刷题数、正确率、速度）
 * - 包含轻量级抗刷机制
 * 
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */

// ===== 类型定义 =====

export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';

// ===== 抗刷配置 =====

export const ANTI_CHEAT_CONFIG = {
  // 单日刷题数上限（超过后权重衰减）
  DAILY_QUIZ_THRESHOLD: 50,
  // 权重衰减系数（超过阈值后每多一次，权重降低）
  DECAY_FACTOR: 0.95,
  // 最低有效正确率（低于此值不计入排行榜）
  MIN_ACCURACY_THRESHOLD: 0.4,
  // 最低答题时间（秒，低于此值视为异常）
  MIN_TIME_PER_QUESTION: 2,
} as const;

// ===== 接口定义 =====

export interface LearningLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  // 有效刷题题目总数（核心指标）
  totalQuestions: number;
  // 正确率（百分比 0-100）
  accuracy: number;
  // 平均每题用时（秒）
  avgTime: number;
  // 是否当前用户
  isCurrentUser?: boolean;
  // 兼容旧字段
  quizCount?: number;
}

export interface MyRankInfo extends LearningLeaderboardEntry {
  // 百分位（前 X%）
  percentile: number;
  // 与前一名的差距
  gapToNext?: {
    metric: string;
    value: number;
  };
  // 优势分析
  strengths: string[];
  // 劣势分析
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
  // 新增：抗刷提示
  antiCheatNotice?: string;
}

// ===== 辅助函数 =====

/**
 * 获取时间范围的 SQL WHERE 条件
 * 注意：使用 learning_events 表别名 (le)
 */
function getTimeRangeCondition(range: LeaderboardRange): string {
  switch (range) {
    case 'DAY':
      return `AND DATE(le.created_at) = DATE('now')`;
    case 'WEEK':
      return `AND le.created_at >= DATE('now', '-7 days')`;
    case 'ALL':
    default:
      return '';
  }
}

/**
 * 获取科目过滤条件
 * 注意：使用 learning_events 表别名 (le)
 */
function getSubjectCondition(subject: LeaderboardSubject): string {
  if (subject === 'ALL') return '';
  
  const subjectMap: Record<string, string> = {
    'MATH': 'mathematics',
    'ENG': 'english',
    'CHI': 'chinese',
    'PHYS': 'physics',
    'CHEM': 'chemistry',
    'BIO': 'biology',
    'ECON': 'economics',
    'HIST': 'history',
    'GEO': 'geography',
  };
  
  const subjectValue = subjectMap[subject];
  if (subjectValue) {
    return `AND LOWER(le.subject) = '${subjectValue}'`;
  }
  return '';
}

/**
 * 计算有效刷题数（抗刷权重衰减）
 */
function calculateEffectiveQuizCount(
  rawCount: number,
  dailyCount: number
): number {
  const { DAILY_QUIZ_THRESHOLD, DECAY_FACTOR } = ANTI_CHEAT_CONFIG;
  
  if (dailyCount <= DAILY_QUIZ_THRESHOLD) {
    return rawCount;
  }
  
  // 超过阈值的部分进行权重衰减
  const excessCount = dailyCount - DAILY_QUIZ_THRESHOLD;
  const effectiveExcess = excessCount * Math.pow(DECAY_FACTOR, excessCount);
  
  return Math.round(DAILY_QUIZ_THRESHOLD + effectiveExcess);
}

/**
 * 分析用户优势和劣势
 */
function analyzeStrengthsWeaknesses(
  userStats: { accuracy?: number; avgTime?: number; quizCount: number },
  avgStats: { avgAccuracy: number; avgTime: number; avgQuizCount: number }
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // 正确率分析
  if (userStats.accuracy !== undefined) {
    if (userStats.accuracy >= avgStats.avgAccuracy + 10) {
      strengths.push('正确率优秀，高于平均水平');
    } else if (userStats.accuracy >= avgStats.avgAccuracy) {
      strengths.push('正确率达标');
    } else if (userStats.accuracy < avgStats.avgAccuracy - 10) {
      weaknesses.push('正确率偏低，建议多复习');
    } else {
      weaknesses.push('正确率略低于平均');
    }
  }
  
  // 速度分析
  if (userStats.avgTime !== undefined) {
    if (userStats.avgTime <= avgStats.avgTime * 0.8) {
      strengths.push('答题速度快');
    } else if (userStats.avgTime <= avgStats.avgTime) {
      strengths.push('答题速度正常');
    } else if (userStats.avgTime > avgStats.avgTime * 1.5) {
      weaknesses.push('答题速度偏慢');
    }
  }
  
  // 刷题量分析
  if (userStats.quizCount >= avgStats.avgQuizCount * 1.5) {
    strengths.push('学习勤奋，刷题量大');
  } else if (userStats.quizCount < avgStats.avgQuizCount * 0.5) {
    weaknesses.push('刷题量不足，建议多练习');
  }
  
  return { strengths, weaknesses };
}

// ===== 主要服务函数 =====

/**
 * 获取学习排行榜（带抗刷机制）
 */
export async function getLearningLeaderboard(
  db: D1Database,
  options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    limit?: number;
    currentUserId?: string;
  }
): Promise<LearningLeaderboardResponse> {
  const {
    metric = 'QUIZ_COUNT',
    range = 'ALL',
    subject = 'ALL',
    limit = 50,
    currentUserId,
  } = options;

  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);
  
  // 抗刷条件：
  // 1. 正确率 >= 40%
  // 2. 每题用时 >= 2秒（duration_seconds >= question_count * 2）
  const antiCheatCondition = `
    AND le.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
    AND le.duration_seconds >= le.question_count * ${ANTI_CHEAT_CONFIG.MIN_TIME_PER_QUESTION}
  `;

  // tie-break 排序规则：
  // 1. 有效刷题数量 DESC
  // 2. 正确率 DESC
  // 3. 平均用时 ASC
  // 4. 最早达到该成绩者优先（user_created_at ASC）
  let orderBy: string;
  
  switch (metric) {
    case 'ACCURACY':
      // 正确率榜：正确率优先，然后题目数，再平均用时
      orderBy = 'accuracy DESC, total_questions DESC, avg_time ASC, first_activity ASC';
      break;
    case 'SPEED':
      // 速度榜：平均用时优先（越快越好），然后正确率，再题目数
      orderBy = 'avg_time ASC, accuracy DESC, total_questions DESC, first_activity ASC';
      break;
    case 'QUIZ_COUNT':
    default:
      // 总榜：题目数优先，然后正确率，再平均用时
      orderBy = 'total_questions DESC, accuracy DESC, avg_time ASC, first_activity ASC';
      break;
  }

  // 主查询：从 learning_events 事实表获取排行榜数据
  // 【关键】learning_events 是排行榜唯一数据来源
  // 【关键】按题目总数（而非刷题次数）排序
  const query = `
    SELECT 
      le.user_id,
      SUM(le.question_count) as total_questions,
      SUM(le.correct_count) as total_correct,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.correct_count) * 100.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as accuracy,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.duration_seconds) * 1.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as avg_time,
      COUNT(DISTINCT le.id) as quiz_count,
      MIN(le.created_at) as first_activity,
      u.nickname as name,
      u.avatar as avatar_url
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.event_type = 'QUIZ'
    AND le.question_count > 0
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
    HAVING total_questions > 0
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  const results = await db
    .prepare(query)
    .bind(limit)
    .all<{
      user_id: string;
      total_questions: number;
      total_correct: number;
      accuracy: number;
      avg_time: number;
      quiz_count: number;
      first_activity: string;
      name: string | null;
      avatar_url: string | null;
    }>();

  // 获取总参与人数（有效参与）
  // 【关键】从 learning_events 读取
  const totalQuery = `
    SELECT COUNT(DISTINCT le.user_id) as total
    FROM learning_events le
    WHERE le.event_type = 'QUIZ'
    AND le.question_count > 0
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
  `;
  const totalResult = await db.prepare(totalQuery).first<{ total: number }>();
  const totalParticipants = totalResult?.total || 0;

  // 获取平均统计（用于分析优劣势）
  // 【关键】从 learning_events 读取
  const avgStatsQuery = `
    SELECT 
      AVG(sub.accuracy) as avg_accuracy,
      AVG(sub.avg_time) as avg_time,
      AVG(sub.total_questions) as avg_quiz_count
    FROM (
      SELECT 
        ROUND(
          CASE 
            WHEN SUM(le.question_count) > 0 
            THEN SUM(le.correct_count) * 100.0 / SUM(le.question_count)
            ELSE 0 
          END, 1
        ) as accuracy,
        ROUND(
          CASE 
            WHEN SUM(le.question_count) > 0 
            THEN SUM(le.duration_seconds) * 1.0 / SUM(le.question_count)
            ELSE 0 
          END, 1
        ) as avg_time,
        SUM(le.question_count) as total_questions
      FROM learning_events le
      WHERE le.event_type = 'QUIZ'
      AND le.question_count > 0
      ${timeCondition}
      ${subjectCondition}
      ${antiCheatCondition}
      GROUP BY le.user_id
    ) sub
  `;
  const avgStatsResult = await db.prepare(avgStatsQuery).first<{
    avg_accuracy: number;
    avg_time: number;
    avg_quiz_count: number;
  }>();
  const avgStats = {
    avgAccuracy: avgStatsResult?.avg_accuracy || 50,
    avgTime: avgStatsResult?.avg_time || 30,
    avgQuizCount: avgStatsResult?.avg_quiz_count || 10,
  };

  // 处理排名
  // 【关键】后端直接计算好排名，前端禁止二次计算
  // 排名已由 SQL ORDER BY 保证，直接按顺序赋值
  const entries: LearningLeaderboardEntry[] = [];

  if (results.results) {
    for (let i = 0; i < results.results.length; i++) {
      const row = results.results[i];
      
      // 排名直接使用索引 + 1（SQL 已保证排序正确）
      // tie-break 规则由 SQL ORDER BY 处理：
      // 1. 有效刷题数量 DESC
      // 2. 正确率 DESC
      // 3. 平均用时 ASC
      // 4. 最早达到该成绩者优先
      const rank = i + 1;

      entries.push({
        userId: row.user_id,
        name: row.name || 'Anonymous',
        avatarUrl: row.avatar_url || undefined,
        rank,
        // 【关键】返回 totalQuestions（题目总数），而非 quizCount（刷题次数）
        totalQuestions: row.total_questions || 0,
        accuracy: row.accuracy || 0,
        avgTime: row.avg_time || 0,
        isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
        // 兼容旧字段
        quizCount: row.quiz_count || 0,
      });
    }
  }

  // 获取当前用户排名（如果不在榜单中）
  let myRank: MyRankInfo | undefined;
  if (currentUserId) {
    const userInEntries = entries.find(e => e.userId === currentUserId);
    if (userInEntries) {
      // 计算百分位
      const percentile = Math.round((1 - (userInEntries.rank - 1) / totalParticipants) * 100);
      
      // 计算与前一名的差距
      let gapToNext: MyRankInfo['gapToNext'];
      if (userInEntries.rank > 1) {
        const prevEntry = entries.find(e => e.rank === userInEntries.rank - 1);
        if (prevEntry) {
          switch (metric) {
            case 'ACCURACY':
              gapToNext = {
                metric: '正确率',
                value: (prevEntry.accuracy || 0) - (userInEntries.accuracy || 0),
              };
              break;
            case 'SPEED':
              gapToNext = {
                metric: '用时',
                value: (userInEntries.avgTime || 0) - (prevEntry.avgTime || 0),
              };
              break;
            case 'QUIZ_COUNT':
            default:
              gapToNext = {
                metric: '题目数',
                value: (prevEntry.totalQuestions || 0) - (userInEntries.totalQuestions || 0),
              };
              break;
          }
        }
      }
      
      // 分析优劣势
      const { strengths, weaknesses } = analyzeStrengthsWeaknesses(
        { accuracy: userInEntries.accuracy, avgTime: userInEntries.avgTime, quizCount: userInEntries.totalQuestions || 0 },
        avgStats
      );
      
      myRank = {
        ...userInEntries,
        percentile,
        gapToNext,
        strengths,
        weaknesses,
      };
    } else {
      // 用户不在前 N 名，单独查询
      const userRankResult = await getUserLearningRankWithAnalysis(db, currentUserId, {
        metric,
        range,
        subject,
        totalParticipants,
        avgStats,
      });
      if (userRankResult) {
        myRank = userRankResult;
      }
    }
  }

  return {
    metric,
    range,
    subject,
    entries,
    myRank,
    totalParticipants,
    lastUpdated: new Date().toISOString(),
    antiCheatNotice: '排行榜仅统计正确率≥40%的有效刷题',
  };
}

/**
 * 获取用户的学习排名（带分析）
 */
export async function getUserLearningRankWithAnalysis(
  db: D1Database,
  userId: string,
  options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    totalParticipants?: number;
    avgStats?: { avgAccuracy: number; avgTime: number; avgQuizCount: number };
  }
): Promise<MyRankInfo | null> {
  const {
    metric = 'QUIZ_COUNT',
    range = 'ALL',
    subject = 'ALL',
    totalParticipants,
    avgStats,
  } = options;

  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);
  // 抗刷条件：正确率 >= 40% 且 每题用时 >= 2秒
  const antiCheatCondition = `
    AND le.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
    AND le.duration_seconds >= le.question_count * ${ANTI_CHEAT_CONFIG.MIN_TIME_PER_QUESTION}
  `;

  // 获取用户的学习数据（从 learning_events 读取）
  const userQuery = `
    SELECT 
      le.user_id,
      SUM(le.question_count) as total_questions,
      SUM(le.correct_count) as total_correct,
      COUNT(DISTINCT le.id) as quiz_count,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.correct_count) * 100.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as accuracy,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.duration_seconds) * 1.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as avg_time,
      u.nickname as name,
      u.avatar as avatar_url
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
  `;

  const userResult = await db
    .prepare(userQuery)
    .bind(userId)
    .first<{
      user_id: string;
      total_questions: number;
      total_correct: number;
      quiz_count: number;
      accuracy: number;
      avg_time: number;
      name: string | null;
      avatar_url: string | null;
    }>();

  if (!userResult || userResult.total_questions === 0) {
    return null;
  }

  // 计算排名（从 learning_events 读取）
  // 【关键】按题目总数排名，而非刷题次数
  let rankCondition: string;
  switch (metric) {
    case 'ACCURACY':
      rankCondition = `
        (ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.correct_count) * 100.0 / SUM(le2.question_count) ELSE 0 END, 1) > ${userResult.accuracy || 0})
        OR (ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.correct_count) * 100.0 / SUM(le2.question_count) ELSE 0 END, 1) = ${userResult.accuracy || 0} AND SUM(le2.question_count) > ${userResult.total_questions})
      `;
      break;
    case 'SPEED':
      rankCondition = `
        (ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.duration_seconds) * 1.0 / SUM(le2.question_count) ELSE 999999 END, 1) < ${userResult.avg_time || 999999})
        OR (ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.duration_seconds) * 1.0 / SUM(le2.question_count) ELSE 999999 END, 1) = ${userResult.avg_time || 999999} AND ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.correct_count) * 100.0 / SUM(le2.question_count) ELSE 0 END, 1) > ${userResult.accuracy || 0})
      `;
      break;
    case 'QUIZ_COUNT':
    default:
      rankCondition = `
        (SUM(le2.question_count) > ${userResult.total_questions})
        OR (SUM(le2.question_count) = ${userResult.total_questions} AND ROUND(CASE WHEN SUM(le2.question_count) > 0 THEN SUM(le2.correct_count) * 100.0 / SUM(le2.question_count) ELSE 0 END, 1) > ${userResult.accuracy || 0})
      `;
      break;
  }

  const rankQuery = `
    SELECT COUNT(*) as higher_count
    FROM (
      SELECT le2.user_id
      FROM learning_events le2
      WHERE le2.event_type = 'QUIZ'
      AND le2.question_count > 0
      ${timeCondition.replace(/le\./g, 'le2.')}
      ${subjectCondition.replace(/le\./g, 'le2.')}
      AND le2.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
      AND le2.duration_seconds >= le2.question_count * ${ANTI_CHEAT_CONFIG.MIN_TIME_PER_QUESTION}
      GROUP BY le2.user_id
      HAVING ${rankCondition}
    )
  `;

  const rankResult = await db.prepare(rankQuery).first<{ higher_count: number }>();
  const rank = (rankResult?.higher_count || 0) + 1;

  // 计算百分位
  const total = totalParticipants || 1;
  const percentile = Math.round((1 - (rank - 1) / total) * 100);

  // 分析优劣势
  const defaultAvgStats = avgStats || { avgAccuracy: 50, avgTime: 30, avgQuizCount: 10 };
  const { strengths, weaknesses } = analyzeStrengthsWeaknesses(
    { accuracy: userResult.accuracy || 0, avgTime: userResult.avg_time || 0, quizCount: userResult.total_questions },
    defaultAvgStats
  );

  return {
    userId: userResult.user_id,
    name: userResult.name || 'Anonymous',
    avatarUrl: userResult.avatar_url || undefined,
    rank,
    // 【关键】返回 totalQuestions（题目总数）
    totalQuestions: userResult.total_questions || 0,
    accuracy: userResult.accuracy || 0,
    avgTime: userResult.avg_time || 0,
    isCurrentUser: true,
    percentile,
    strengths,
    weaknesses,
    // 兼容旧字段
    quizCount: userResult.quiz_count || 0,
  };
}

/**
 * 获取用户的学习排名（简化版，兼容旧接口）
 */
export async function getUserLearningRank(
  db: D1Database,
  userId: string,
  options: {
    metric?: LeaderboardMetric;
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
  }
): Promise<LearningLeaderboardEntry | null> {
  const result = await getUserLearningRankWithAnalysis(db, userId, options);
  if (!result) return null;
  
  // 转换为简化格式
  return {
    userId: result.userId,
    name: result.name,
    avatarUrl: result.avatarUrl,
    rank: result.rank,
    totalQuestions: result.totalQuestions,
    accuracy: result.accuracy,
    avgTime: result.avgTime,
    isCurrentUser: true,
    quizCount: result.quizCount,
  };
}

/**
 * 获取用户学习统计
 */
export async function getUserLearningStats(
  db: D1Database,
  userId: string
): Promise<{
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  averageAccuracy: number;
  averageTimePerQuestion: number;
  currentStreak: number;
  longestStreak: number;
  perfectSessions: number;
  recentScores: number[];
  // 新增：有效刷题数（抗刷后）
  effectiveQuizzes: number;
  // 新增：被过滤的低质量刷题数
  filteredQuizzes: number;
} | null> {
  // 基础统计（所有刷题）- 从 learning_events 读取
  const allStatsQuery = `
    SELECT 
      COUNT(DISTINCT le.id) as total_quizzes
    FROM learning_events le
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
  `;
  const allStats = await db.prepare(allStatsQuery).bind(userId).first<{ total_quizzes: number }>();

  // 有效统计（抗刷过滤后）- 从 learning_events 读取
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT le.id) as effective_quizzes,
      SUM(le.question_count) as total_questions,
      SUM(le.correct_count) as correct_answers,
      ROUND(AVG(le.accuracy) * 100, 1) as avg_accuracy,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.duration_seconds) * 1.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as avg_time,
      SUM(CASE WHEN le.accuracy = 1.0 THEN 1 ELSE 0 END) as perfect_sessions
    FROM learning_events le
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
    AND le.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
  `;

  const stats = await db.prepare(statsQuery).bind(userId).first<{
    effective_quizzes: number;
    total_questions: number;
    correct_answers: number;
    avg_accuracy: number | null;
    avg_time: number | null;
    perfect_sessions: number;
  }>();

  if (!allStats || allStats.total_quizzes === 0) {
    return null;
  }

  // 最近 5 次有效得分 - 从 learning_events 读取
  const recentQuery = `
    SELECT ROUND(accuracy * 100) as score
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const recentResults = await db.prepare(recentQuery).bind(userId).all<{ score: number }>();
  const recentScores = recentResults.results?.map(r => r.score) || [];

  // 连续学习天数 - 从 learning_events 读取
  const streakQuery = `
    SELECT DATE(created_at) as quiz_date
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    GROUP BY DATE(created_at)
    ORDER BY quiz_date DESC
    LIMIT 30
  `;
  const streakResults = await db.prepare(streakQuery).bind(userId).all<{ quiz_date: string }>();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  
  if (streakResults.results) {
    for (let i = 0; i < streakResults.results.length; i++) {
      const date = streakResults.results[i].quiz_date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (date === expected || (i === 0 && date === today)) {
        tempStreak++;
        if (i === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        currentStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  const effectiveQuizzes = stats?.effective_quizzes || 0;
  const filteredQuizzes = allStats.total_quizzes - effectiveQuizzes;

  return {
    totalQuizzes: allStats.total_quizzes,
    totalQuestions: stats?.total_questions || 0,
    correctAnswers: stats?.correct_answers || 0,
    averageAccuracy: stats?.avg_accuracy || 0,
    averageTimePerQuestion: stats?.avg_time || 0,
    currentStreak,
    longestStreak,
    perfectSessions: stats?.perfect_sessions || 0,
    recentScores,
    effectiveQuizzes,
    filteredQuizzes,
  };
}
