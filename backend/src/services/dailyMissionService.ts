/**
 * 每日学习任务服务
 * 
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 * 
 * 职责：
 * - 基于用户当前状态，动态生成【今日学习任务】
 * - 行为引导，而非仅仅发分
 * - 让用户知道"今天做什么最划算"
 * 
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results / quiz_answers 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */

import { 
  getUserLearningRankWithAnalysis, 
  LeaderboardMetric,
  LeaderboardRange,
  ANTI_CHEAT_CONFIG,
} from './learningLeaderboardService.js';
import { checkUserPrivileges } from './incentiveLeaderboardService.js';
import { POINT_TASKS } from '../../../shared/domain/points.js';

// ===== 类型定义 =====

export type MissionType = 
  | 'DAILY_QUIZ'           // 每日刷题
  | 'SUBJECT_FOCUS'        // 科目专攻
  | 'ACCURACY_BOOST'       // 正确率提升
  | 'SPEED_CHALLENGE'      // 速度挑战
  | 'STREAK_MAINTAIN'      // 连续学习
  | 'RANK_BREAKTHROUGH'    // 排名突破
  | 'WEAKNESS_FIX'         // 弱项补强
  | 'REVIEW_MISTAKES';     // 错题复习

export type MissionPriority = 'high' | 'medium' | 'low';

export interface MissionReward {
  points: number;
  leaderboardBoost?: boolean;
  streakBonus?: boolean;
  badgeProgress?: string;
}

export interface MissionProgress {
  current: number;
  target: number;
  unit?: string;
}

export interface DailyMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  reason: string;
  priority: MissionPriority;
  reward: MissionReward;
  progress: MissionProgress;
  actionPath: string;  // 跳转路径
  actionLabel: string; // 按钮文字
  completed: boolean;
  expiresAt: string;   // 任务过期时间
}

export interface DailyMissionResponse {
  date: string;
  userId: string;
  missions: DailyMission[];
  completedCount: number;
  totalCount: number;
  bonusUnlocked: boolean;  // 是否解锁额外奖励
  nextRefreshAt: string;   // 下次刷新时间
}

// ===== 任务模板配置 =====

interface MissionTemplate {
  type: MissionType;
  titleTemplate: string;
  descriptionTemplate: string;
  basePoints: number;
  actionPath: string;
  actionLabel: string;
  priority: MissionPriority;
}

const MISSION_TEMPLATES: Record<MissionType, MissionTemplate> = {
  DAILY_QUIZ: {
    type: 'DAILY_QUIZ',
    titleTemplate: '完成 {target} 道题目',
    descriptionTemplate: '每日刷题保持学习节奏',
    basePoints: 10,
    actionPath: '/quiz',
    actionLabel: '开始刷题',
    priority: 'high',
  },
  SUBJECT_FOCUS: {
    type: 'SUBJECT_FOCUS',
    titleTemplate: '完成 {target} 道{subject}题目',
    descriptionTemplate: '针对性提升{subject}能力',
    basePoints: 15,
    actionPath: '/quiz?subject={subjectKey}',
    actionLabel: '专项练习',
    priority: 'medium',
  },
  ACCURACY_BOOST: {
    type: 'ACCURACY_BOOST',
    titleTemplate: '完成一组正确率 ≥{target}% 的练习',
    descriptionTemplate: '提升答题质量，追求高正确率',
    basePoints: 20,
    actionPath: '/quiz',
    actionLabel: '挑战高正确率',
    priority: 'medium',
  },
  SPEED_CHALLENGE: {
    type: 'SPEED_CHALLENGE',
    titleTemplate: '完成一组平均用时 ≤{target}s 的练习',
    descriptionTemplate: '提升答题速度，挑战自我',
    basePoints: 15,
    actionPath: '/quiz',
    actionLabel: '速度挑战',
    priority: 'low',
  },
  STREAK_MAINTAIN: {
    type: 'STREAK_MAINTAIN',
    titleTemplate: '保持连续学习第 {target} 天',
    descriptionTemplate: '坚持学习，保持连续天数',
    basePoints: 25,
    actionPath: '/quiz',
    actionLabel: '继续学习',
    priority: 'high',
  },
  RANK_BREAKTHROUGH: {
    type: 'RANK_BREAKTHROUGH',
    titleTemplate: '冲击排行榜第 {target} 名',
    descriptionTemplate: '再努力一点就能超越前面的人',
    basePoints: 30,
    actionPath: '/leaderboard',
    actionLabel: '查看排名',
    priority: 'high',
  },
  WEAKNESS_FIX: {
    type: 'WEAKNESS_FIX',
    titleTemplate: '补强{weakness}弱项',
    descriptionTemplate: '针对弱项进行专项训练',
    basePoints: 20,
    actionPath: '/quiz?focus=weakness',
    actionLabel: '弱项练习',
    priority: 'medium',
  },
  REVIEW_MISTAKES: {
    type: 'REVIEW_MISTAKES',
    titleTemplate: '复习 {target} 道错题',
    descriptionTemplate: '温故知新，巩固薄弱点',
    basePoints: 15,
    actionPath: '/mistakes',
    actionLabel: '复习错题',
    priority: 'medium',
  },
};

// ===== 科目映射 =====

const SUBJECT_NAMES: Record<string, string> = {
  'MATH': '数学',
  'ENG': '英语',
  'CHI': '中文',
  'PHYS': '物理',
  'CHEM': '化学',
  'BIO': '生物',
  'ECON': '经济',
  'HIST': '历史',
  'GEO': '地理',
};

// ===== 辅助函数 =====

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getMidnightUTC(): string {
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.toISOString();
}

function generateMissionId(type: MissionType, suffix?: string): string {
  const date = getTodayDateString();
  return `${type}_${date}${suffix ? '_' + suffix : ''}`;
}

// ===== 核心任务生成逻辑 =====

/**
 * 获取用户今日学习任务
 * 
 * 【重要】此函数必须健壮，即使用户没有任何学习数据也能正常返回
 * 整个函数被 try-catch 包裹，确保任何情况下都返回有效响应
 */
export async function getDailyMissions(
  db: D1Database,
  userId: string
): Promise<DailyMissionResponse> {
  const today = getTodayDateString();
  
  // 最外层 try-catch，确保任何情况下都返回有效响应
  try {
    return await generateDailyMissionsInternal(db, userId, today);
  } catch (error) {
    console.error('getDailyMissions 顶层错误，返回默认任务:', error);
    // 返回一个安全的默认响应
    return createFallbackResponse(userId, today);
  }
}

/**
 * 创建一个安全的默认响应（当一切都失败时使用）
 */
function createFallbackResponse(userId: string, today: string): DailyMissionResponse {
  return {
    date: today,
    userId,
    missions: [createNewUserMission()],
    completedCount: 0,
    totalCount: 1,
    bonusUnlocked: false,
    nextRefreshAt: getMidnightUTC(),
  };
}

/**
 * 内部任务生成逻辑
 */
async function generateDailyMissionsInternal(
  db: D1Database,
  userId: string,
  today: string
): Promise<DailyMissionResponse> {
  const missions: DailyMission[] = [];

  // 默认值（用户无数据时使用）
  let quizCountRank: Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null = null;
  let accuracyRank: Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null = null;
  let todayStats = { todayQuizCount: 0, todayAccuracy: 0, todayAvgTime: 0 };
  let userStreak = { currentStreak: 0, longestStreak: 0 };
  let mistakeCount = 0;

  // 1. 获取用户当前学习状态（使用 Promise.allSettled 确保不会因为单个查询失败导致整体失败）
  try {
    const results = await Promise.allSettled([
      safeGetUserLearningRank(db, userId, 'QUIZ_COUNT'),
      safeGetUserLearningRank(db, userId, 'ACCURACY'),
      safeTodayQuizStats(db, userId),
      safeUserStreak(db, userId),
      safeMistakeCount(db, userId),
    ]);

    // 安全地提取结果
    if (results[0].status === 'fulfilled') quizCountRank = results[0].value;
    if (results[1].status === 'fulfilled') accuracyRank = results[1].value;
    if (results[2].status === 'fulfilled' && results[2].value) todayStats = results[2].value;
    if (results[3].status === 'fulfilled' && results[3].value) userStreak = results[3].value;
    if (results[4].status === 'fulfilled') mistakeCount = results[4].value;
  } catch (error) {
    console.error('获取用户学习状态失败，使用默认值:', error);
  }

  // 2. 获取用户积分特权（可选，失败不影响任务生成）
  try {
    await checkUserPrivileges(db, userId);
  } catch (error) {
    // 忽略错误，不影响任务生成
  }

  // ===== 任务生成规则 =====

  // 规则 1: 每日基础刷题任务（必选，即使没有数据也显示）
  try {
    const dailyQuizTarget = calculateDailyQuizTarget(quizCountRank, todayStats);
    missions.push(createDailyQuizMission(dailyQuizTarget, todayStats.todayQuizCount));
  } catch (error) {
    console.error('创建每日刷题任务失败:', error);
    missions.push(createNewUserMission()); // 使用新手任务作为后备
  }

  // 规则 2: 连续学习任务（如果有连续天数）
  try {
    if (userStreak.currentStreak > 0) {
      missions.push(createStreakMission(userStreak.currentStreak + 1, todayStats.todayQuizCount > 0));
    }
  } catch (error) {
    console.error('创建连续学习任务失败:', error);
  }

  // 规则 3: 排名突破任务（如果接近临界点）
  try {
    const rankBreakthrough = findRankBreakthroughOpportunity(quizCountRank, accuracyRank);
    if (rankBreakthrough) {
      missions.push(createRankBreakthroughMission(rankBreakthrough));
    }
  } catch (error) {
    console.error('创建排名突破任务失败:', error);
  }

  // 规则 4: 弱项补强任务（基于 weaknesses 分析）
  try {
    if (quizCountRank?.weaknesses && quizCountRank.weaknesses.length > 0) {
      const weaknessMission = createWeaknessMission(quizCountRank.weaknesses[0]);
      if (weaknessMission) {
        missions.push(weaknessMission);
      }
    }
  } catch (error) {
    console.error('创建弱项补强任务失败:', error);
  }

  // 规则 5: 正确率提升任务（如果正确率偏低）
  try {
    if (accuracyRank && accuracyRank.accuracy !== undefined && accuracyRank.accuracy < 70) {
      missions.push(createAccuracyBoostMission(accuracyRank.accuracy));
    }
  } catch (error) {
    console.error('创建正确率提升任务失败:', error);
  }

  // 规则 6: 错题复习任务（如果有错题）
  try {
    if (mistakeCount > 0) {
      const reviewTarget = Math.min(mistakeCount, 10);
      const reviewedToday = await safeReviewedMistakesToday(db, userId);
      missions.push(createReviewMistakesMission(reviewTarget, reviewedToday));
    }
  } catch (error) {
    console.error('创建错题复习任务失败:', error);
  }

  // 规则 7: 科目专攻任务（基于最薄弱科目）
  try {
    const weakestSubject = await safeFindWeakestSubject(db, userId);
    if (weakestSubject) {
      const subjectProgress = await safeSubjectProgressToday(db, userId, weakestSubject.key);
      missions.push(createSubjectFocusMission(weakestSubject.key, weakestSubject.name, subjectProgress));
    }
  } catch (error) {
    console.error('创建科目专攻任务失败:', error);
  }

  // 如果没有生成任何任务，至少添加一个新手任务
  if (missions.length === 0) {
    missions.push(createNewUserMission());
  }

  // 4. 排序（按优先级和完成状态）
  missions.sort((a, b) => {
    // 未完成优先
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 高优先级优先
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // 5. 限制任务数量（最多 5 个）
  const finalMissions = missions.slice(0, 5);
  const completedCount = finalMissions.filter(m => m.completed).length;

  return {
    date: today,
    userId,
    missions: finalMissions,
    completedCount,
    totalCount: finalMissions.length,
    bonusUnlocked: completedCount >= 3, // 完成 3 个任务解锁额外奖励
    nextRefreshAt: getMidnightUTC(),
  };
}

// ===== 安全包装函数（捕获所有可能的错误）=====

async function safeGetUserLearningRank(
  db: D1Database,
  userId: string,
  metric: LeaderboardMetric
): Promise<Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null> {
  try {
    return await getUserLearningRankWithAnalysis(db, userId, { metric, range: 'ALL' });
  } catch (error) {
    console.error(`safeGetUserLearningRank(${metric}) 失败:`, error);
    return null;
  }
}

async function safeTodayQuizStats(
  db: D1Database,
  userId: string
): Promise<{ todayQuizCount: number; todayAccuracy: number; todayAvgTime: number }> {
  try {
    return await getTodayQuizStats(db, userId);
  } catch (error) {
    console.error('safeTodayQuizStats 失败:', error);
    return { todayQuizCount: 0, todayAccuracy: 0, todayAvgTime: 0 };
  }
}

async function safeUserStreak(
  db: D1Database,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    return await getUserStreak(db, userId);
  } catch (error) {
    console.error('safeUserStreak 失败:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

async function safeMistakeCount(db: D1Database, userId: string): Promise<number> {
  try {
    return await getMistakeCount(db, userId);
  } catch (error) {
    console.error('safeMistakeCount 失败:', error);
    return 0;
  }
}

async function safeReviewedMistakesToday(db: D1Database, userId: string): Promise<number> {
  try {
    return await getReviewedMistakesToday(db, userId);
  } catch (error) {
    console.error('safeReviewedMistakesToday 失败:', error);
    return 0;
  }
}

async function safeFindWeakestSubject(
  db: D1Database,
  userId: string
): Promise<{ key: string; name: string } | null> {
  try {
    return await findWeakestSubject(db, userId);
  } catch (error) {
    console.error('safeFindWeakestSubject 失败:', error);
    return null;
  }
}

async function safeSubjectProgressToday(
  db: D1Database,
  userId: string,
  subjectKey: string
): Promise<number> {
  try {
    return await getSubjectProgressToday(db, userId, subjectKey);
  } catch (error) {
    console.error('safeSubjectProgressToday 失败:', error);
    return 0;
  }
}

/**
 * 为新用户创建欢迎任务
 */
function createNewUserMission(): DailyMission {
  return {
    id: generateMissionId('DAILY_QUIZ', 'welcome'),
    type: 'DAILY_QUIZ',
    title: '完成第一次刷题',
    description: '开始你的学习之旅',
    reason: '欢迎！完成第一道题目开始学习吧！',
    priority: 'high',
    reward: {
      points: 20,
      leaderboardBoost: true,
    },
    progress: {
      current: 0,
      target: 1,
      unit: '道',
    },
    actionPath: '/quiz',
    actionLabel: '开始刷题',
    completed: false,
    expiresAt: getMidnightUTC(),
  };
}

// ===== 数据获取函数 =====

async function getTodayQuizStats(
  db: D1Database,
  userId: string
): Promise<{
  todayQuizCount: number;
  todayAccuracy: number;
  todayAvgTime: number;
}> {
  // 【关键】从 learning_events 事实表读取
  const result = await db.prepare(`
    SELECT 
      COUNT(DISTINCT id) as quiz_count,
      ROUND(AVG(accuracy) * 100, 1) as accuracy,
      ROUND(
        CASE 
          WHEN SUM(question_count) > 0 
          THEN SUM(duration_seconds) * 1.0 / SUM(question_count)
          ELSE 0 
        END, 1
      ) as avg_time
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND DATE(created_at) = DATE('now')
    AND accuracy >= ?
  `).bind(userId, ANTI_CHEAT_CONFIG.MIN_ACCURACY_THRESHOLD).first<{
    quiz_count: number;
    accuracy: number | null;
    avg_time: number | null;
  }>();

  return {
    todayQuizCount: result?.quiz_count || 0,
    todayAccuracy: result?.accuracy || 0,
    todayAvgTime: result?.avg_time || 0,
  };
}

async function getUserStreak(
  db: D1Database,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  // 【关键】从 learning_events 事实表读取
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
  const today = getTodayDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (streakResults.results) {
    for (let i = 0; i < streakResults.results.length; i++) {
      const date = streakResults.results[i].quiz_date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      // 如果今天还没刷题，从昨天开始计算
      if (i === 0 && date !== today && date !== yesterdayStr) {
        break;
      }
      
      if (date === expected || (i === 0 && (date === today || date === yesterdayStr))) {
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        break;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { currentStreak, longestStreak };
}

async function getMistakeCount(db: D1Database, userId: string): Promise<number> {
  // 【关键】从 question_attempts 事实表读取
  // 统计该用户所有做错的题目（去重）
  const result = await db.prepare(`
    SELECT COUNT(DISTINCT question_id) as count
    FROM question_attempts
    WHERE user_id = ? AND is_correct = 0
  `).bind(userId).first<{ count: number }>();
  return result?.count || 0;
}

async function getReviewedMistakesToday(db: D1Database, userId: string): Promise<number> {
  // 【关键】从 question_attempts 事实表读取
  // 复习 = 今天重新做了之前做错的题目且答对了
  const result = await db.prepare(`
    SELECT COUNT(DISTINCT qa_today.question_id) as count
    FROM question_attempts qa_today
    WHERE qa_today.user_id = ?
    AND DATE(qa_today.created_at) = DATE('now')
    AND qa_today.is_correct = 1
    AND EXISTS (
      SELECT 1 FROM question_attempts qa_old
      WHERE qa_old.user_id = qa_today.user_id
      AND qa_old.question_id = qa_today.question_id
      AND qa_old.is_correct = 0
      AND qa_old.created_at < qa_today.created_at
    )
  `).bind(userId).first<{ count: number }>();
  return result?.count || 0;
}

async function findWeakestSubject(
  db: D1Database,
  userId: string
): Promise<{ key: string; name: string } | null> {
  // 【关键】从 learning_events 事实表读取
  const result = await db.prepare(`
    SELECT 
      subject,
      AVG(accuracy) as avg_accuracy,
      COUNT(*) as quiz_count
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND subject IS NOT NULL
    GROUP BY subject
    HAVING quiz_count >= 3
    ORDER BY avg_accuracy ASC
    LIMIT 1
  `).bind(userId).first<{ subject: string; avg_accuracy: number }>();

  if (!result) return null;

  // 映射科目名称
  const subjectKey = Object.entries(SUBJECT_NAMES).find(
    ([, name]) => name === result.subject || result.subject.toLowerCase().includes(name.toLowerCase())
  )?.[0];

  if (subjectKey) {
    return { key: subjectKey, name: SUBJECT_NAMES[subjectKey] };
  }
  return null;
}

async function getSubjectProgressToday(
  db: D1Database,
  userId: string,
  subjectKey: string
): Promise<number> {
  const subjectName = SUBJECT_NAMES[subjectKey];
  if (!subjectName) return 0;

  // 【关键】从 learning_events 事实表读取
  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM learning_events
    WHERE user_id = ?
    AND event_type = 'QUIZ'
    AND DATE(created_at) = DATE('now')
    AND (subject = ? OR subject LIKE ?)
  `).bind(userId, subjectName, `%${subjectName}%`).first<{ count: number }>();

  return result?.count || 0;
}

// ===== 任务创建函数 =====

function calculateDailyQuizTarget(
  rankInfo: Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null,
  todayStats: { todayQuizCount: number }
): number {
  // 基础目标：5 道题
  let target = 5;

  // 如果用户有排名且接近前 20，增加目标
  if (rankInfo && rankInfo.rank <= 30 && rankInfo.rank > 10) {
    target = 10;
  }

  // 如果用户在前 10，设置更高目标
  if (rankInfo && rankInfo.rank <= 10) {
    target = 15;
  }

  // 如果今天已完成较多，适当增加
  if (todayStats.todayQuizCount >= target) {
    target = Math.max(target, todayStats.todayQuizCount + 3);
  }

  return Math.min(target, 20); // 上限 20
}

function createDailyQuizMission(target: number, current: number): DailyMission {
  const template = MISSION_TEMPLATES.DAILY_QUIZ;
  const completed = current >= target;

  return {
    id: generateMissionId('DAILY_QUIZ'),
    type: 'DAILY_QUIZ',
    title: template.titleTemplate.replace('{target}', String(target)),
    description: template.descriptionTemplate,
    reason: current === 0 
      ? '今天还没开始刷题，来一组吧！' 
      : `已完成 ${current} 道，再刷 ${Math.max(0, target - current)} 道！`,
    priority: 'high',
    reward: {
      points: template.basePoints,
      leaderboardBoost: true,
    },
    progress: {
      current,
      target,
      unit: '道',
    },
    actionPath: template.actionPath,
    actionLabel: completed ? '继续刷题' : template.actionLabel,
    completed,
    expiresAt: getMidnightUTC(),
  };
}

function createStreakMission(targetDay: number, hasQuizzedToday: boolean): DailyMission {
  const template = MISSION_TEMPLATES.STREAK_MAINTAIN;

  return {
    id: generateMissionId('STREAK_MAINTAIN'),
    type: 'STREAK_MAINTAIN',
    title: template.titleTemplate.replace('{target}', String(targetDay)),
    description: template.descriptionTemplate,
    reason: hasQuizzedToday 
      ? `太棒了！已保持连续 ${targetDay} 天学习！`
      : `再刷一道题就能保持连续 ${targetDay} 天！`,
    priority: 'high',
    reward: {
      points: template.basePoints + (targetDay > 7 ? 10 : 0),
      streakBonus: true,
    },
    progress: {
      current: hasQuizzedToday ? 1 : 0,
      target: 1,
      unit: '天',
    },
    actionPath: template.actionPath,
    actionLabel: hasQuizzedToday ? '继续学习' : template.actionLabel,
    completed: hasQuizzedToday,
    expiresAt: getMidnightUTC(),
  };
}

function findRankBreakthroughOpportunity(
  quizRank: Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null,
  accuracyRank: Awaited<ReturnType<typeof getUserLearningRankWithAnalysis>> | null
): { rank: number; gap: number; metric: string } | null {
  // 检查刷题数量排名
  if (quizRank && quizRank.rank > 1 && quizRank.gapToNext) {
    // 接近临界点（差距小于 5）
    if (quizRank.gapToNext.value <= 5) {
      return {
        rank: quizRank.rank - 1,
        gap: quizRank.gapToNext.value,
        metric: 'quizCount',
      };
    }
  }

  // 检查正确率排名
  if (accuracyRank && accuracyRank.rank > 1 && accuracyRank.gapToNext) {
    // 正确率差距小于 2%
    if (accuracyRank.gapToNext.value <= 2) {
      return {
        rank: accuracyRank.rank - 1,
        gap: accuracyRank.gapToNext.value,
        metric: 'accuracy',
      };
    }
  }

  return null;
}

function createRankBreakthroughMission(
  breakthrough: { rank: number; gap: number; metric: string }
): DailyMission {
  const template = MISSION_TEMPLATES.RANK_BREAKTHROUGH;
  const metricLabel = breakthrough.metric === 'quizCount' ? '刷题' : '正确率';

  return {
    id: generateMissionId('RANK_BREAKTHROUGH', breakthrough.metric),
    type: 'RANK_BREAKTHROUGH',
    title: template.titleTemplate.replace('{target}', String(breakthrough.rank)),
    description: template.descriptionTemplate,
    reason: `你在${metricLabel}榜上只差 ${breakthrough.gap} ${breakthrough.metric === 'quizCount' ? '道题' : '%'} 就能超越前面！`,
    priority: 'high',
    reward: {
      points: template.basePoints,
      leaderboardBoost: true,
    },
    progress: {
      current: 0,
      target: breakthrough.gap,
      unit: breakthrough.metric === 'quizCount' ? '道' : '%',
    },
    actionPath: '/quiz',
    actionLabel: '冲刺排名',
    completed: false,
    expiresAt: getMidnightUTC(),
  };
}

function createWeaknessMission(weakness: string): DailyMission | null {
  const template = MISSION_TEMPLATES.WEAKNESS_FIX;

  // 解析弱项内容
  let actionPath = '/quiz';
  let title = template.titleTemplate.replace('{weakness}', weakness);
  let reason = `系统分析显示：${weakness}`;

  if (weakness.includes('正确率')) {
    actionPath = '/quiz?focus=accuracy';
    reason = '提升正确率是当前最有效的进步方式';
  } else if (weakness.includes('刷题量')) {
    actionPath = '/quiz';
    reason = '增加练习量能帮助巩固知识';
  } else if (weakness.includes('速度')) {
    actionPath = '/quiz?mode=timed';
    reason = '适当加快答题速度可以提升效率';
  }

  return {
    id: generateMissionId('WEAKNESS_FIX'),
    type: 'WEAKNESS_FIX',
    title,
    description: template.descriptionTemplate,
    reason,
    priority: 'medium',
    reward: {
      points: template.basePoints,
    },
    progress: {
      current: 0,
      target: 5,
      unit: '道',
    },
    actionPath,
    actionLabel: template.actionLabel,
    completed: false,
    expiresAt: getMidnightUTC(),
  };
}

function createAccuracyBoostMission(currentAccuracy: number): DailyMission {
  const template = MISSION_TEMPLATES.ACCURACY_BOOST;
  const target = Math.min(Math.round(currentAccuracy + 10), 90);

  return {
    id: generateMissionId('ACCURACY_BOOST'),
    type: 'ACCURACY_BOOST',
    title: template.titleTemplate.replace('{target}', String(target)),
    description: template.descriptionTemplate,
    reason: `当前平均正确率 ${currentAccuracy}%，提升到 ${target}% 能显著提高排名`,
    priority: 'medium',
    reward: {
      points: template.basePoints,
      leaderboardBoost: true,
    },
    progress: {
      current: Math.round(currentAccuracy),
      target,
      unit: '%',
    },
    actionPath: template.actionPath,
    actionLabel: template.actionLabel,
    completed: currentAccuracy >= target,
    expiresAt: getMidnightUTC(),
  };
}

function createReviewMistakesMission(target: number, reviewed: number): DailyMission {
  const template = MISSION_TEMPLATES.REVIEW_MISTAKES;

  return {
    id: generateMissionId('REVIEW_MISTAKES'),
    type: 'REVIEW_MISTAKES',
    title: template.titleTemplate.replace('{target}', String(target)),
    description: template.descriptionTemplate,
    reason: reviewed === 0 
      ? `有 ${target} 道错题等待复习`
      : `已复习 ${reviewed} 道，再复习 ${Math.max(0, target - reviewed)} 道`,
    priority: 'medium',
    reward: {
      points: template.basePoints,
    },
    progress: {
      current: reviewed,
      target,
      unit: '道',
    },
    actionPath: template.actionPath,
    actionLabel: template.actionLabel,
    completed: reviewed >= target,
    expiresAt: getMidnightUTC(),
  };
}

function createSubjectFocusMission(
  subjectKey: string,
  subjectName: string,
  progress: number
): DailyMission {
  const template = MISSION_TEMPLATES.SUBJECT_FOCUS;
  const target = 5;

  return {
    id: generateMissionId('SUBJECT_FOCUS', subjectKey),
    type: 'SUBJECT_FOCUS',
    title: template.titleTemplate
      .replace('{target}', String(target))
      .replace('{subject}', subjectName),
    description: template.descriptionTemplate.replace('{subject}', subjectName),
    reason: `${subjectName}是你的薄弱科目，针对性练习最有效`,
    priority: 'medium',
    reward: {
      points: template.basePoints,
      leaderboardBoost: true,
    },
    progress: {
      current: progress,
      target,
      unit: '道',
    },
    actionPath: template.actionPath.replace('{subjectKey}', subjectKey),
    actionLabel: template.actionLabel,
    completed: progress >= target,
    expiresAt: getMidnightUTC(),
  };
}

// ===== 任务完成检测 =====

/**
 * 检查并更新任务进度
 */
export async function checkMissionProgress(
  db: D1Database,
  userId: string,
  eventType: 'QUIZ_COMPLETE' | 'MISTAKE_REVIEW',
  eventData: {
    quizCount?: number;
    accuracy?: number;
    subject?: string;
    reviewCount?: number;
  }
): Promise<{
  completedMissions: string[];
  newlyCompleted: string[];
  totalPoints: number;
}> {
  const missions = await getDailyMissions(db, userId);
  const completedMissions: string[] = [];
  const newlyCompleted: string[] = [];
  let totalPoints = 0;

  for (const mission of missions.missions) {
    if (mission.completed) {
      completedMissions.push(mission.id);
      continue;
    }

    let isNewlyCompleted = false;

    switch (mission.type) {
      case 'DAILY_QUIZ':
      case 'SUBJECT_FOCUS':
        if (eventType === 'QUIZ_COMPLETE' && eventData.quizCount) {
          // 检查是否达到目标
          if (mission.progress.current + 1 >= mission.progress.target) {
            isNewlyCompleted = true;
          }
        }
        break;
      case 'REVIEW_MISTAKES':
        if (eventType === 'MISTAKE_REVIEW' && eventData.reviewCount) {
          if (mission.progress.current + eventData.reviewCount >= mission.progress.target) {
            isNewlyCompleted = true;
          }
        }
        break;
      // 其他任务类型...
    }

    if (isNewlyCompleted) {
      newlyCompleted.push(mission.id);
      completedMissions.push(mission.id);
      totalPoints += mission.reward.points;
    }
  }

  return {
    completedMissions,
    newlyCompleted,
    totalPoints,
  };
}
