/**
 * 学习排行榜服务
 * 
 * ⚠️ 数据唯一来源：learning_events
 * ⚠️ 禁止从其他表读取刷题或积分依据
 * 
 * 核心职责：
 * - 计算用户 score（后端唯一计算点）
 * - 返回排名（dense rank，同分并列）
 * - 支持总榜 / 日榜 / 周榜
 * 
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */

// ===== 类型定义 =====

export type LeaderboardRange = 'ALL' | 'WEEK' | 'DAY';
export type LeaderboardSubject = 'ALL' | 'MATH' | 'ENG' | 'CHI' | 'PHYS' | 'CHEM' | 'BIO' | 'ECON' | 'HIST' | 'GEO';

// 兼容旧类型（逐步废弃）
export type LeaderboardMetric = 'QUIZ_COUNT' | 'ACCURACY' | 'SPEED';

// ===== Score 计算配置 =====

/**
 * 【后端唯一 Score 计算规则】
 * 
 * score = total_questions * 1
 *       + correct_questions * 2
 *       + ROUND(duration_minutes * 0.1, 2)
 * 
 * 示例：
 * - 做了 100 题，答对 80 题，用时 60 分钟
 * - score = 100 * 1 + 80 * 2 + 60 * 0.1 = 100 + 160 + 6 = 266
 * 
 * 权重说明：
 * - total_questions * 1：鼓励多做题
 * - correct_questions * 2：奖励正确答案（权重更高）
 * - duration_minutes * 0.1：坚持时间（微小加分）
 */
export const SCORE_CONFIG = {
  WEIGHT_TOTAL_QUESTIONS: 1,      // 每做一题 +1
  WEIGHT_CORRECT_QUESTIONS: 2,    // 每答对一题 +2
  WEIGHT_DURATION_MINUTES: 0.1,   // 每学习一分钟 +0.1
} as const;

// ===== 抗刷配置 =====

export const ANTI_CHEAT_CONFIG = {
  MIN_ACCURACY_THRESHOLD: 0.4,     // 最低有效正确率 40%
  MIN_TIME_PER_QUESTION: 2,        // 最低每题用时 2 秒
} as const;

// ===== 输出接口（UI 直接可用）=====

/**
 * 排行榜条目（精简版，前端直接渲染）
 */
export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  rank: number;          // 后端计算，同分并列（dense rank）
  score: number;         // 后端计算，公式见 SCORE_CONFIG
  isCurrentUser?: boolean;
}

/**
 * 排行榜响应
 */
export interface LeaderboardResponse {
  range: LeaderboardRange;
  subject: LeaderboardSubject;
  entries: LeaderboardEntry[];
  myRank?: LeaderboardEntry & {
    percentile: number;  // 百分位（前 X%）
    gapToNext?: number;  // 与前一名的分差
  };
  totalParticipants: number;
  lastUpdated: string;
  scoreFormula: string;  // 给前端/调试用
}

// ===== 兼容旧接口 =====

export interface LearningLeaderboardEntry extends LeaderboardEntry {
  totalQuestions: number;
  accuracy: number;
  avgTime: number;
  quizCount?: number;
}

export interface MyRankInfo extends LearningLeaderboardEntry {
  percentile: number;
  gapToNext?: { metric: string; value: number };
  strengths: string[];
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
  antiCheatNotice?: string;
}

// ===== 辅助函数 =====

function getTimeRangeCondition(range: LeaderboardRange, alias: string = 'le'): string {
  switch (range) {
    case 'DAY':
      return `AND DATE(${alias}.created_at) = DATE('now')`;
    case 'WEEK':
      return `AND ${alias}.created_at >= DATE('now', '-7 days')`;
    case 'ALL':
    default:
      return '';
  }
}

function getSubjectCondition(subject: LeaderboardSubject, alias: string = 'le'): string {
  if (subject === 'ALL') return '';
  
  const subjectMap: Record<string, string> = {
    'MATH': 'mathematics', 'ENG': 'english', 'CHI': 'chinese',
    'PHYS': 'physics', 'CHEM': 'chemistry', 'BIO': 'biology',
    'ECON': 'economics', 'HIST': 'history', 'GEO': 'geography',
  };
  
  const subjectValue = subjectMap[subject];
  return subjectValue ? `AND LOWER(${alias}.subject) = '${subjectValue}'` : '';
}

function getAntiCheatCondition(alias: string = 'le'): string {
  return `
    AND ${alias}.accuracy >= ${ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD}
    AND ${alias}.duration_seconds >= ${alias}.question_count * ${ANTI_CHEAT_CONFIG.MIN_TIME_PER_QUESTION}
  `;
}

/**
 * 计算 Dense Rank（同分并列）
 * 
 * 输入：[100, 90, 90, 80]
 * 输出：[1, 2, 2, 3]（不是 [1, 2, 2, 4]）
 */
function calculateDenseRank(entries: { score: number }[]): number[] {
  if (entries.length === 0) return [];
  
  const ranks: number[] = [];
  let currentRank = 1;
  
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].score < entries[i - 1].score) {
      currentRank++;
    }
    ranks.push(currentRank);
  }
  
  return ranks;
}

// ===== 主服务函数 =====

/**
 * 获取学习排行榜（简洁版，UI 直接可用）
 * 
 * 【核心规则】
 * 1. 数据源：learning_events（唯一）
 * 2. Score 公式：total_questions * 1 + correct_questions * 2 + duration_minutes * 0.1
 * 3. 排名：Dense Rank（同分并列）
 * 4. 抗刷：正确率 >= 40%，每题用时 >= 2秒
 */
export async function getLeaderboard(
  db: D1Database,
  options: {
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    limit?: number;
    currentUserId?: string;
  } = {}
): Promise<LeaderboardResponse> {
  const {
    range = 'ALL',
    subject = 'ALL',
    limit = 50,
    currentUserId,
  } = options;

  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);
  const antiCheatCondition = getAntiCheatCondition();

  // 【关键 SQL】Score 计算在 SQL 层完成
  // score = total_questions * 1 + correct_questions * 2 + duration_minutes * 0.1
  const { WEIGHT_TOTAL_QUESTIONS, WEIGHT_CORRECT_QUESTIONS, WEIGHT_DURATION_MINUTES } = SCORE_CONFIG;
  
  const query = `
    SELECT 
      le.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
      SUM(le.question_count) as total_questions,
      SUM(le.correct_count) as correct_questions,
      SUM(le.duration_seconds) as total_duration_seconds,
      ROUND(
        SUM(le.question_count) * ${WEIGHT_TOTAL_QUESTIONS}
        + SUM(le.correct_count) * ${WEIGHT_CORRECT_QUESTIONS}
        + (SUM(le.duration_seconds) / 60.0) * ${WEIGHT_DURATION_MINUTES}
      , 2) as score
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.event_type = 'QUIZ'
    AND le.question_count > 0
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
    HAVING total_questions > 0
    ORDER BY score DESC, total_questions DESC, correct_questions DESC
    LIMIT ?
  `;

  const results = await db
    .prepare(query)
    .bind(limit)
    .all<{
      user_id: string;
      name: string | null;
      avatar_url: string | null;
      total_questions: number;
      correct_questions: number;
      total_duration_seconds: number;
      score: number;
    }>();

  // 获取总参与人数
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

  // 计算 Dense Rank
  const rawEntries = results.results || [];
  const ranks = calculateDenseRank(rawEntries.map(r => ({ score: r.score })));

  // 构建结果
  const entries: LeaderboardEntry[] = rawEntries.map((row, index) => ({
    userId: row.user_id,
    name: row.name || 'Anonymous',
    avatarUrl: row.avatar_url || undefined,
    rank: ranks[index],
    score: row.score,
    isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
  }));

  // 获取当前用户排名
  let myRank: LeaderboardResponse['myRank'];
  if (currentUserId) {
    const userInEntries = entries.find(e => e.userId === currentUserId);
    if (userInEntries) {
      const percentile = Math.round((1 - (userInEntries.rank - 1) / Math.max(totalParticipants, 1)) * 100);
      const prevEntry = entries.find(e => e.rank === userInEntries.rank - 1);
      myRank = {
        ...userInEntries,
        percentile,
        gapToNext: prevEntry ? Math.round((prevEntry.score - userInEntries.score) * 100) / 100 : undefined,
      };
    } else {
      // 用户不在前 N 名，单独查询
      myRank = await getUserRank(db, currentUserId, { range, subject, totalParticipants });
    }
  }

  return {
    range,
    subject,
    entries,
    myRank,
    totalParticipants,
    lastUpdated: new Date().toISOString(),
    scoreFormula: `score = questions × ${WEIGHT_TOTAL_QUESTIONS} + correct × ${WEIGHT_CORRECT_QUESTIONS} + minutes × ${WEIGHT_DURATION_MINUTES}`,
  };
}

/**
 * 获取用户排名
 */
async function getUserRank(
  db: D1Database,
  userId: string,
  options: {
    range?: LeaderboardRange;
    subject?: LeaderboardSubject;
    totalParticipants?: number;
  }
): Promise<LeaderboardResponse['myRank'] | undefined> {
  const { range = 'ALL', subject = 'ALL', totalParticipants = 0 } = options;

  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);
  const antiCheatCondition = getAntiCheatCondition();

  const { WEIGHT_TOTAL_QUESTIONS, WEIGHT_CORRECT_QUESTIONS, WEIGHT_DURATION_MINUTES } = SCORE_CONFIG;

  // 获取用户分数
  const userQuery = `
    SELECT 
      le.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
      ROUND(
        SUM(le.question_count) * ${WEIGHT_TOTAL_QUESTIONS}
        + SUM(le.correct_count) * ${WEIGHT_CORRECT_QUESTIONS}
        + (SUM(le.duration_seconds) / 60.0) * ${WEIGHT_DURATION_MINUTES}
      , 2) as score
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
    AND le.question_count > 0
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
  `;

  const userResult = await db.prepare(userQuery).bind(userId).first<{
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    score: number;
  }>();

  if (!userResult) {
    return undefined;
  }

  // 计算排名（比该用户分数高的人数 + 1）
  const rankQuery = `
    SELECT COUNT(DISTINCT le.user_id) as higher_count
    FROM learning_events le
    WHERE le.event_type = 'QUIZ'
    AND le.question_count > 0
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
    HAVING ROUND(
      SUM(le.question_count) * ${WEIGHT_TOTAL_QUESTIONS}
      + SUM(le.correct_count) * ${WEIGHT_CORRECT_QUESTIONS}
      + (SUM(le.duration_seconds) / 60.0) * ${WEIGHT_DURATION_MINUTES}
    , 2) > ${userResult.score}
  `;

  const rankResult = await db.prepare(rankQuery).all<{ higher_count: number }>();
  const rank = (rankResult.results?.length || 0) + 1;

  const percentile = Math.round((1 - (rank - 1) / Math.max(totalParticipants, 1)) * 100);

  return {
    userId: userResult.user_id,
    name: userResult.name || 'Anonymous',
    avatarUrl: userResult.avatar_url || undefined,
    rank,
    score: userResult.score,
    isCurrentUser: true,
    percentile,
  };
}

// ===== 兼容旧接口（逐步废弃）=====

/**
 * 获取学习排行榜（兼容旧接口）
 * @deprecated 使用 getLeaderboard 替代
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
  const antiCheatCondition = getAntiCheatCondition();

  const { WEIGHT_TOTAL_QUESTIONS, WEIGHT_CORRECT_QUESTIONS, WEIGHT_DURATION_MINUTES } = SCORE_CONFIG;

  // 决定排序
  let orderBy: string;
  switch (metric) {
    case 'ACCURACY':
      orderBy = 'accuracy DESC, total_questions DESC';
      break;
    case 'SPEED':
      orderBy = 'avg_time ASC, accuracy DESC';
      break;
    case 'QUIZ_COUNT':
    default:
      orderBy = 'score DESC, total_questions DESC';
      break;
  }

  const query = `
    SELECT 
      le.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
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
      ROUND(
        SUM(le.question_count) * ${WEIGHT_TOTAL_QUESTIONS}
        + SUM(le.correct_count) * ${WEIGHT_CORRECT_QUESTIONS}
        + (SUM(le.duration_seconds) / 60.0) * ${WEIGHT_DURATION_MINUTES}
      , 2) as score
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

  const results = await db.prepare(query).bind(limit).all<{
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    total_questions: number;
    total_correct: number;
    quiz_count: number;
    accuracy: number;
    avg_time: number;
    score: number;
  }>();

  // 获取总参与人数
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

  // 计算 Dense Rank
  const rawEntries = results.results || [];
  const ranks = calculateDenseRank(rawEntries.map(r => ({ score: r.score })));

  // 构建结果
  const entries: LearningLeaderboardEntry[] = rawEntries.map((row, index) => ({
    userId: row.user_id,
    name: row.name || 'Anonymous',
    avatarUrl: row.avatar_url || undefined,
    rank: ranks[index],
    score: row.score,
    totalQuestions: row.total_questions,
    accuracy: row.accuracy,
    avgTime: row.avg_time,
    quizCount: row.quiz_count,
    isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
  }));

  // 获取当前用户信息
  let myRank: MyRankInfo | undefined;
  if (currentUserId) {
    const userEntry = entries.find(e => e.userId === currentUserId);
    if (userEntry) {
      const percentile = Math.round((1 - (userEntry.rank - 1) / Math.max(totalParticipants, 1)) * 100);
      myRank = {
        ...userEntry,
        percentile,
        strengths: [],
        weaknesses: [],
      };
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
 * 获取用户学习排名（兼容旧接口）
 * @deprecated 使用 getLeaderboard 替代
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
  const { range = 'ALL', subject = 'ALL', totalParticipants = 0 } = options;

  const result = await getLeaderboardUserStats(db, userId, { range, subject });
  if (!result) return null;

  const userRank = await getUserRank(db, userId, { range, subject, totalParticipants });
  if (!userRank) return null;

  return {
    userId: result.userId,
    name: result.name,
    avatarUrl: result.avatarUrl,
    rank: userRank.rank,
    score: userRank.score,
    totalQuestions: result.totalQuestions,
    accuracy: result.accuracy,
    avgTime: result.avgTime,
    quizCount: result.quizCount,
    isCurrentUser: true,
    percentile: userRank.percentile || 0,
    strengths: [],
    weaknesses: [],
  };
}

/**
 * 获取用户学习统计
 */
async function getLeaderboardUserStats(
  db: D1Database,
  userId: string,
  options: { range?: LeaderboardRange; subject?: LeaderboardSubject }
): Promise<{
  userId: string;
  name: string;
  avatarUrl?: string;
  totalQuestions: number;
  accuracy: number;
  avgTime: number;
  quizCount: number;
} | null> {
  const { range = 'ALL', subject = 'ALL' } = options;
  const timeCondition = getTimeRangeCondition(range);
  const subjectCondition = getSubjectCondition(subject);
  const antiCheatCondition = getAntiCheatCondition();

  const query = `
    SELECT 
      le.user_id,
      u.nickname as name,
      u.avatar as avatar_url,
      SUM(le.question_count) as total_questions,
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
      ) as avg_time
    FROM learning_events le
    JOIN users u ON u.id = le.user_id
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
    ${timeCondition}
    ${subjectCondition}
    ${antiCheatCondition}
    GROUP BY le.user_id
  `;

  const result = await db.prepare(query).bind(userId).first<{
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    total_questions: number;
    quiz_count: number;
    accuracy: number;
    avg_time: number;
  }>();

  if (!result) return null;

  return {
    userId: result.user_id,
    name: result.name || 'Anonymous',
    avatarUrl: result.avatar_url || undefined,
    totalQuestions: result.total_questions,
    accuracy: result.accuracy,
    avgTime: result.avg_time,
    quizCount: result.quiz_count,
  };
}

/**
 * 获取用户学习排名（简化版）
 * @deprecated 使用 getLeaderboard 替代
 */
export async function getUserLearningRank(
  db: D1Database,
  userId: string,
  options: { metric?: LeaderboardMetric; range?: LeaderboardRange; subject?: LeaderboardSubject }
): Promise<LearningLeaderboardEntry | null> {
  const result = await getUserLearningRankWithAnalysis(db, userId, options);
  return result;
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
  effectiveQuizzes: number;
  filteredQuizzes: number;
} | null> {
  const antiCheatCondition = getAntiCheatCondition();

  // 基础统计（所有刷题）
  const allStatsQuery = `
    SELECT COUNT(DISTINCT le.id) as total_quizzes
    FROM learning_events le
    WHERE le.user_id = ?
    AND le.event_type = 'QUIZ'
  `;
  const allStats = await db.prepare(allStatsQuery).bind(userId).first<{ total_quizzes: number }>();

  // 有效统计（抗刷过滤后）
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT le.id) as effective_quizzes,
      SUM(le.question_count) as total_questions,
      SUM(le.correct_count) as correct_answers,
      ROUND(
        CASE 
          WHEN SUM(le.question_count) > 0 
          THEN SUM(le.correct_count) * 100.0 / SUM(le.question_count)
          ELSE 0 
        END, 1
      ) as avg_accuracy,
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
    ${antiCheatCondition}
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
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    ${antiCheatCondition}
    ORDER BY created_at DESC
    LIMIT 5
  `;
  const recentResults = await db.prepare(recentQuery).bind(userId).all<{ score: number }>();
  const recentScores = recentResults.results?.map(r => r.score) || [];

  // 连续学习天数
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
