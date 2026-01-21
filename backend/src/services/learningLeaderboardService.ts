/**
 * 学习排行榜服务（与积分系统完全解耦）
 * 
 * 职责：
 * - 处理学习行为排行榜
 * - 基于 quiz_sessions / quiz_results 表计算
 * - 支持多维度排行（刷题数、正确率、速度）
 * - 包含轻量级抗刷机制
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
  quizCount: number;
  accuracy?: number;
  avgTime?: number;
  isCurrentUser?: boolean;
  // 新增：有效刷题数（抗刷后）
  effectiveQuizCount?: number;
}

export interface MyRankInfo extends LearningLeaderboardEntry {
  // 新增：百分位（前 X%）
  percentile: number;
  // 新增：与前一名的差距
  gapToNext?: {
    metric: string;
    value: number;
  };
  // 新增：优势分析
  strengths: string[];
  // 新增：劣势分析
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
 */
function getTimeRangeCondition(range: LeaderboardRange): string {
  switch (range) {
    case 'DAY':
      return `AND DATE(qs.created_at) = DATE('now')`;
    case 'WEEK':
      return `AND qs.created_at >= DATE('now', '-7 days')`;
    case 'ALL':
    default:
      return '';
  }
}

/**
 * 获取科目过滤条件
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
    return `AND LOWER(qs.subject) = '${subjectValue}'`;
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
  
  // 抗刷：过滤低正确率的刷题
  const antiCheatCondition = `AND qs.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}`;
  const minTimeCondition = `AND qs.avg_time_per_question >= ${ANTI_CHEAT_CONFIG.MIN_TIME_PER_QUESTION}`;

  // 根据不同指标构建不同的查询
  let orderBy: string;
  
  switch (metric) {
    case 'ACCURACY':
      orderBy = 'accuracy DESC, quiz_count DESC';
      break;
    case 'SPEED':
      orderBy = 'avg_time ASC, quiz_count DESC';
      break;
    case 'QUIZ_COUNT':
    default:
      orderBy = 'quiz_count DESC, accuracy DESC';
      break;
  }

  // 主查询：获取排行榜数据（带抗刷过滤）
  const query = `
    SELECT 
      qs.user_id,
      COUNT(DISTINCT qs.id) as quiz_count,
      ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
      ROUND(AVG(qs.avg_time_per_question), 1) as avg_time,
      u.nickname as name,
      u.avatar as avatar_url,
      u.created_at as user_created_at
    FROM quiz_sessions qs
    JOIN users u ON u.id = qs.user_id
    WHERE qs.status = 'completed'
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    ${minTimeCondition}
    GROUP BY qs.user_id
    HAVING quiz_count > 0
    ORDER BY ${orderBy}, user_created_at ASC
    LIMIT ?
  `;

  const results = await db
    .prepare(query)
    .bind(limit)
    .all<{
      user_id: string;
      quiz_count: number;
      accuracy: number | null;
      avg_time: number | null;
      name: string | null;
      avatar_url: string | null;
      user_created_at: string;
    }>();

  // 获取总参与人数（有效参与）
  const totalQuery = `
    SELECT COUNT(DISTINCT qs.user_id) as total
    FROM quiz_sessions qs
    WHERE qs.status = 'completed'
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
  `;
  const totalResult = await db.prepare(totalQuery).first<{ total: number }>();
  const totalParticipants = totalResult?.total || 0;

  // 获取平均统计（用于分析优劣势）
  const avgStatsQuery = `
    SELECT 
      AVG(sub.accuracy) as avg_accuracy,
      AVG(sub.avg_time) as avg_time,
      AVG(sub.quiz_count) as avg_quiz_count
    FROM (
      SELECT 
        ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
        ROUND(AVG(qs.avg_time_per_question), 1) as avg_time,
        COUNT(DISTINCT qs.id) as quiz_count
      FROM quiz_sessions qs
      WHERE qs.status = 'completed'
      ${timeCondition}
      ${subjectCondition}
      ${antiCheatCondition}
      GROUP BY qs.user_id
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

  // 处理排名（支持并列，tie-break 用 created_at）
  const entries: LearningLeaderboardEntry[] = [];
  let currentRank = 1;
  let previousValue: number | null = null;
  let skipCount = 0;

  if (results.results) {
    for (let i = 0; i < results.results.length; i++) {
      const row = results.results[i];
      
      // 根据指标确定排名值
      let rankValue: number;
      switch (metric) {
        case 'ACCURACY':
          rankValue = row.accuracy || 0;
          break;
        case 'SPEED':
          rankValue = row.avg_time || 999999;
          break;
        case 'QUIZ_COUNT':
        default:
          rankValue = row.quiz_count;
          break;
      }

      // 计算排名（并列处理）
      if (previousValue !== null) {
        if (metric === 'SPEED') {
          if (rankValue > previousValue) {
            currentRank += skipCount + 1;
            skipCount = 0;
          } else if (rankValue === previousValue) {
            skipCount++;
          }
        } else {
          if (rankValue < previousValue) {
            currentRank += skipCount + 1;
            skipCount = 0;
          } else if (rankValue === previousValue) {
            skipCount++;
          }
        }
      }
      previousValue = rankValue;

      entries.push({
        userId: row.user_id,
        name: row.name || 'Anonymous',
        avatarUrl: row.avatar_url || undefined,
        rank: currentRank,
        quizCount: row.quiz_count,
        accuracy: row.accuracy || undefined,
        avgTime: row.avg_time || undefined,
        isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
        effectiveQuizCount: row.quiz_count, // 简化：可后续加入每日衰减计算
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
                metric: '刷题数',
                value: prevEntry.quizCount - userInEntries.quizCount,
              };
              break;
          }
        }
      }
      
      // 分析优劣势
      const { strengths, weaknesses } = analyzeStrengthsWeaknesses(
        { accuracy: userInEntries.accuracy, avgTime: userInEntries.avgTime, quizCount: userInEntries.quizCount },
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
  const antiCheatCondition = `AND qs.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}`;

  // 获取用户的学习数据
  const userQuery = `
    SELECT 
      qs.user_id,
      COUNT(DISTINCT qs.id) as quiz_count,
      ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
      ROUND(AVG(qs.avg_time_per_question), 1) as avg_time,
      u.nickname as name,
      u.avatar as avatar_url
    FROM quiz_sessions qs
    JOIN users u ON u.id = qs.user_id
    WHERE qs.user_id = ?
    AND qs.status = 'completed'
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY qs.user_id
  `;

  const userResult = await db
    .prepare(userQuery)
    .bind(userId)
    .first<{
      user_id: string;
      quiz_count: number;
      accuracy: number | null;
      avg_time: number | null;
      name: string | null;
      avatar_url: string | null;
    }>();

  if (!userResult || userResult.quiz_count === 0) {
    return null;
  }

  // 计算排名
  let rankCondition: string;
  switch (metric) {
    case 'ACCURACY':
      rankCondition = `
        (ROUND(AVG(qs2.accuracy) * 100, 1) > ${userResult.accuracy || 0})
        OR (ROUND(AVG(qs2.accuracy) * 100, 1) = ${userResult.accuracy || 0} AND COUNT(DISTINCT qs2.id) > ${userResult.quiz_count})
      `;
      break;
    case 'SPEED':
      rankCondition = `
        (ROUND(AVG(qs2.avg_time_per_question), 1) < ${userResult.avg_time || 999999})
        OR (ROUND(AVG(qs2.avg_time_per_question), 1) = ${userResult.avg_time || 999999} AND COUNT(DISTINCT qs2.id) > ${userResult.quiz_count})
      `;
      break;
    case 'QUIZ_COUNT':
    default:
      rankCondition = `
        (COUNT(DISTINCT qs2.id) > ${userResult.quiz_count})
        OR (COUNT(DISTINCT qs2.id) = ${userResult.quiz_count} AND ROUND(AVG(qs2.accuracy) * 100, 1) > ${userResult.accuracy || 0})
      `;
      break;
  }

  const rankQuery = `
    SELECT COUNT(*) as higher_count
    FROM (
      SELECT qs2.user_id
      FROM quiz_sessions qs2
      WHERE qs2.status = 'completed'
      ${timeCondition.replace(/qs\./g, 'qs2.')}
      ${subjectCondition.replace(/qs\./g, 'qs2.')}
      AND qs2.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
      GROUP BY qs2.user_id
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
    { accuracy: userResult.accuracy || undefined, avgTime: userResult.avg_time || undefined, quizCount: userResult.quiz_count },
    defaultAvgStats
  );

  return {
    userId: userResult.user_id,
    name: userResult.name || 'Anonymous',
    avatarUrl: userResult.avatar_url || undefined,
    rank,
    quizCount: userResult.quiz_count,
    accuracy: userResult.accuracy || undefined,
    avgTime: userResult.avg_time || undefined,
    isCurrentUser: true,
    percentile,
    strengths,
    weaknesses,
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
    quizCount: result.quizCount,
    accuracy: result.accuracy,
    avgTime: result.avgTime,
    isCurrentUser: true,
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
  // 基础统计（所有刷题）
  const allStatsQuery = `
    SELECT 
      COUNT(DISTINCT qs.id) as total_quizzes
    FROM quiz_sessions qs
    WHERE qs.user_id = ?
    AND qs.status = 'completed'
  `;
  const allStats = await db.prepare(allStatsQuery).bind(userId).first<{ total_quizzes: number }>();

  // 有效统计（抗刷过滤后）
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT qs.id) as effective_quizzes,
      SUM(qs.total_questions) as total_questions,
      SUM(qs.correct_answers) as correct_answers,
      ROUND(AVG(qs.accuracy) * 100, 1) as avg_accuracy,
      ROUND(AVG(qs.avg_time_per_question), 1) as avg_time,
      SUM(CASE WHEN qs.accuracy = 1.0 THEN 1 ELSE 0 END) as perfect_sessions
    FROM quiz_sessions qs
    WHERE qs.user_id = ?
    AND qs.status = 'completed'
    AND qs.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
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

  // 最近 5 次有效得分
  const recentQuery = `
    SELECT ROUND(accuracy * 100) as score
    FROM quiz_sessions
    WHERE user_id = ?
    AND status = 'completed'
    AND accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const recentResults = await db.prepare(recentQuery).bind(userId).all<{ score: number }>();
  const recentScores = recentResults.results?.map(r => r.score) || [];

  // 连续学习天数
  const streakQuery = `
    SELECT DATE(created_at) as quiz_date
    FROM quiz_sessions
    WHERE user_id = ?
    AND status = 'completed'
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
