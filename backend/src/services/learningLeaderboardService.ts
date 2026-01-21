/**
 * 学习排行榜服务（与积分系统完全解耦）
 * 
 * 职责：
 * - 处理学习行为排行榜
 * - 基于 quiz_sessions / quiz_results 表计算
 * - 支持多维度排行（刷题数、正确率、速度）
 */

// ===== 类型定义 =====

export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';
export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';

export interface LearningLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;
  quizCount: number;
  accuracy?: number;
  avgTime?: number;
  isCurrentUser?: boolean;
}

export interface LearningLeaderboardResponse {
  metric: LeaderboardMetric;
  range: LeaderboardRange;
  subject: LeaderboardSubject;
  entries: LearningLeaderboardEntry[];
  myRank?: LearningLeaderboardEntry;
  totalParticipants: number;
  lastUpdated: string;
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

// ===== 主要服务函数 =====

/**
 * 获取学习排行榜
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

  // 根据不同指标构建不同的查询
  let orderBy: string;
  let selectFields: string;
  
  switch (metric) {
    case 'ACCURACY':
      selectFields = `
        qs.user_id,
        COUNT(DISTINCT qs.id) as quiz_count,
        ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
        ROUND(AVG(qs.avg_time_per_question), 1) as avg_time
      `;
      orderBy = 'accuracy DESC, quiz_count DESC';
      break;
    case 'SPEED':
      selectFields = `
        qs.user_id,
        COUNT(DISTINCT qs.id) as quiz_count,
        ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
        ROUND(AVG(qs.avg_time_per_question), 1) as avg_time
      `;
      orderBy = 'avg_time ASC, quiz_count DESC';
      break;
    case 'QUIZ_COUNT':
    default:
      selectFields = `
        qs.user_id,
        COUNT(DISTINCT qs.id) as quiz_count,
        ROUND(AVG(qs.accuracy) * 100, 1) as accuracy,
        ROUND(AVG(qs.avg_time_per_question), 1) as avg_time
      `;
      orderBy = 'quiz_count DESC, accuracy DESC';
      break;
  }

  // 主查询：获取排行榜数据
  const query = `
    SELECT 
      ${selectFields},
      u.nickname as name,
      u.avatar as avatar_url,
      u.created_at as user_created_at
    FROM quiz_sessions qs
    JOIN users u ON u.id = qs.user_id
    WHERE qs.status = 'completed'
    ${timeCondition}
    ${subjectCondition}
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

  // 获取总参与人数
  const totalQuery = `
    SELECT COUNT(DISTINCT qs.user_id) as total
    FROM quiz_sessions qs
    WHERE qs.status = 'completed'
    ${timeCondition}
    ${subjectCondition}
  `;
  const totalResult = await db.prepare(totalQuery).first<{ total: number }>();
  const totalParticipants = totalResult?.total || 0;

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
          rankValue = row.avg_time || 999999; // 速度越小越好
          break;
        case 'QUIZ_COUNT':
        default:
          rankValue = row.quiz_count;
          break;
      }

      // 计算排名（并列处理）
      if (previousValue !== null) {
        if (metric === 'SPEED') {
          // 速度：越小越好
          if (rankValue > previousValue) {
            currentRank += skipCount + 1;
            skipCount = 0;
          } else if (rankValue === previousValue) {
            skipCount++;
          }
        } else {
          // 刷题数/正确率：越大越好
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
      });
    }
  }

  // 获取当前用户排名（如果不在榜单中）
  let myRank: LearningLeaderboardEntry | undefined;
  if (currentUserId) {
    const userInEntries = entries.find(e => e.userId === currentUserId);
    if (userInEntries) {
      myRank = userInEntries;
    } else {
      // 用户不在前 N 名，单独查询
      const userRankResult = await getUserLearningRank(db, currentUserId, {
        metric,
        range,
        subject,
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
  };
}

/**
 * 获取用户的学习排名
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
  const {
    metric = 'QUIZ_COUNT',
    range = 'ALL',
    subject = 'ALL',
  } = options;

  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);

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
      GROUP BY qs2.user_id
      HAVING ${rankCondition}
    )
  `;

  const rankResult = await db.prepare(rankQuery).first<{ higher_count: number }>();
  const rank = (rankResult?.higher_count || 0) + 1;

  return {
    userId: userResult.user_id,
    name: userResult.name || 'Anonymous',
    avatarUrl: userResult.avatar_url || undefined,
    rank,
    quizCount: userResult.quiz_count,
    accuracy: userResult.accuracy || undefined,
    avgTime: userResult.avg_time || undefined,
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
} | null> {
  // 基础统计
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT qs.id) as total_quizzes,
      SUM(qs.total_questions) as total_questions,
      SUM(qs.correct_answers) as correct_answers,
      ROUND(AVG(qs.accuracy) * 100, 1) as avg_accuracy,
      ROUND(AVG(qs.avg_time_per_question), 1) as avg_time,
      SUM(CASE WHEN qs.accuracy = 1.0 THEN 1 ELSE 0 END) as perfect_sessions
    FROM quiz_sessions qs
    WHERE qs.user_id = ?
    AND qs.status = 'completed'
  `;

  const stats = await db.prepare(statsQuery).bind(userId).first<{
    total_quizzes: number;
    total_questions: number;
    correct_answers: number;
    avg_accuracy: number | null;
    avg_time: number | null;
    perfect_sessions: number;
  }>();

  if (!stats || stats.total_quizzes === 0) {
    return null;
  }

  // 最近 5 次得分
  const recentQuery = `
    SELECT ROUND(accuracy * 100) as score
    FROM quiz_sessions
    WHERE user_id = ?
    AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const recentResults = await db.prepare(recentQuery).bind(userId).all<{ score: number }>();
  const recentScores = recentResults.results?.map(r => r.score) || [];

  // 连续学习天数（简化计算）
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

  return {
    totalQuizzes: stats.total_quizzes,
    totalQuestions: stats.total_questions || 0,
    correctAnswers: stats.correct_answers || 0,
    averageAccuracy: stats.avg_accuracy || 0,
    averageTimePerQuestion: stats.avg_time || 0,
    currentStreak,
    longestStreak,
    perfectSessions: stats.perfect_sessions,
    recentScores,
  };
}
