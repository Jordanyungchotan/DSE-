/**
 * 积分商城服务（升级版）
 * 
 * 新增功能：
 * - 咨询类商品兑换
 * - 排名解锁商品
 * - 转化追踪
 */

import { checkUserPrivileges } from './incentiveLeaderboardService.js';
import { getUserLearningRankWithAnalysis, type LeaderboardMetric } from './learningLeaderboardService.js';

// ===== 类型定义 =====

export type MallItemType = 'NORMAL' | 'VIP' | 'TOP10' | 'CONSULTATION';
export type ConsultationType = 'COURSE_PLANNING' | 'CAREER_ADVICE' | 'STUDY_PLAN';
export type ConversionStatus = 'REDEEMED' | 'SCHEDULED' | 'COMPLETED' | 'CONVERTED';

export interface MallItem {
  id: string;
  nameZh: string;
  nameEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  category: string;
  requiredPoints: number;
  stock: number;
  imageUrl?: string;
  itemType: MallItemType;
  consultationType?: ConsultationType;
  minRank: number;
  isActive: boolean;
  // 前端展示用
  isLocked?: boolean;
  lockReason?: string;
}

export interface RedemptionResult {
  success: boolean;
  redemptionId?: string;
  message: string;
  consultationInfo?: {
    type: ConsultationType;
    nextSteps: string[];
  };
}

export interface ConversionRecord {
  id: string;
  userId: string;
  redemptionId: string;
  consultationType: ConsultationType;
  status: ConversionStatus;
  scheduledAt?: string;
  completedAt?: string;
  isConverted: boolean;
  conversionAmount?: number;
  convertedAt?: string;
  userRating?: number;
  userFeedback?: string;
}

// ===== 商城商品服务 =====

/**
 * 获取商城商品列表（带排名解锁状态）
 */
export async function getMallItems(
  db: D1Database,
  userId?: string
): Promise<MallItem[]> {
  // 获取用户特权信息
  let userPrivileges = { rank: 0, privileges: [], canAccessVipItems: false };
  if (userId) {
    userPrivileges = await checkUserPrivileges(db, userId);
  }

  const items = await db.prepare(`
    SELECT 
      id,
      name_zh as nameZh,
      name_en as nameEn,
      description_zh as descriptionZh,
      description_en as descriptionEn,
      category,
      required_points as requiredPoints,
      stock,
      image_url as imageUrl,
      item_type as itemType,
      consultation_type as consultationType,
      min_rank as minRank,
      is_active as isActive
    FROM point_mall_items
    WHERE is_active = 1
    ORDER BY sort_order ASC, created_at DESC
  `).all<{
    id: string;
    nameZh: string;
    nameEn: string | null;
    descriptionZh: string | null;
    descriptionEn: string | null;
    category: string;
    requiredPoints: number;
    stock: number;
    imageUrl: string | null;
    itemType: string;
    consultationType: string | null;
    minRank: number;
    isActive: number;
  }>();

  return (items.results || []).map(item => {
    // 判断是否锁定
    let isLocked = false;
    let lockReason: string | undefined;

    if (item.minRank > 0) {
      if (!userId) {
        isLocked = true;
        lockReason = '请先登录';
      } else if (userPrivileges.rank === 0 || userPrivileges.rank > item.minRank) {
        isLocked = true;
        lockReason = `仅限排行榜前 ${item.minRank} 名兑换`;
      }
    }

    if (item.itemType === 'VIP' && !userPrivileges.canAccessVipItems) {
      isLocked = true;
      lockReason = '仅限排行榜前 3 名兑换';
    }

    return {
      id: item.id,
      nameZh: item.nameZh,
      nameEn: item.nameEn || undefined,
      descriptionZh: item.descriptionZh || undefined,
      descriptionEn: item.descriptionEn || undefined,
      category: item.category,
      requiredPoints: item.requiredPoints,
      stock: item.stock,
      imageUrl: item.imageUrl || undefined,
      itemType: (item.itemType || 'NORMAL') as MallItemType,
      consultationType: item.consultationType as ConsultationType | undefined,
      minRank: item.minRank || 0,
      isActive: item.isActive === 1,
      isLocked,
      lockReason,
    };
  });
}

/**
 * 兑换商品（升级版，支持咨询类）
 */
export async function redeemItem(
  db: D1Database,
  userId: string,
  itemId: string
): Promise<RedemptionResult> {
  // 1. 获取商品信息
  const item = await db.prepare(`
    SELECT 
      id, name_zh, required_points, stock, item_type, consultation_type, min_rank, is_active
    FROM point_mall_items
    WHERE id = ?
  `).bind(itemId).first<{
    id: string;
    name_zh: string;
    required_points: number;
    stock: number;
    item_type: string;
    consultation_type: string | null;
    min_rank: number;
    is_active: number;
  }>();

  if (!item || item.is_active !== 1) {
    return { success: false, message: '商品不存在或已下架' };
  }

  // 2. 检查库存
  if (item.stock !== -1 && item.stock <= 0) {
    return { success: false, message: '商品已售罄' };
  }

  // 3. 检查用户积分
  const userSummary = await db.prepare(
    'SELECT total_points FROM user_point_summary WHERE user_id = ?'
  ).bind(userId).first<{ total_points: number }>();

  if (!userSummary || userSummary.total_points < item.required_points) {
    return { success: false, message: '积分不足' };
  }

  // 4. 检查排名限制
  if (item.min_rank > 0 || item.item_type === 'VIP') {
    const privileges = await checkUserPrivileges(db, userId);
    
    if (item.item_type === 'VIP' && !privileges.canAccessVipItems) {
      return { success: false, message: '仅限排行榜前 3 名兑换此商品' };
    }
    
    if (item.min_rank > 0 && (privileges.rank === 0 || privileges.rank > item.min_rank)) {
      return { success: false, message: `仅限排行榜前 ${item.min_rank} 名兑换此商品` };
    }
  }

  // 5. 执行兑换
  const redemptionId = crypto.randomUUID();
  
  try {
    // 扣除积分
    await db.prepare(`
      UPDATE user_point_summary 
      SET total_points = total_points - ? 
      WHERE user_id = ?
    `).bind(item.required_points, userId).run();

    // 记录积分消费事件
    await db.prepare(`
      INSERT INTO point_events (id, user_id, task, points, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(crypto.randomUUID(), userId, 'REDEMPTION', -item.required_points).run();

    // 减少库存（如果有库存限制）
    if (item.stock !== -1) {
      await db.prepare(
        'UPDATE point_mall_items SET stock = stock - 1 WHERE id = ?'
      ).bind(itemId).run();
    }

    // 创建兑换记录
    await db.prepare(`
      INSERT INTO point_redemptions (id, user_id, item_id, points_spent, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(redemptionId, userId, itemId, item.required_points).run();

    // 6. 如果是咨询类商品，创建转化追踪记录
    let consultationInfo: RedemptionResult['consultationInfo'];
    if (item.item_type === 'CONSULTATION' && item.consultation_type) {
      const conversionId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO consultation_conversions (id, user_id, redemption_id, consultation_type, status, created_at)
        VALUES (?, ?, ?, ?, 'REDEEMED', datetime('now'))
      `).bind(conversionId, userId, redemptionId, item.consultation_type).run();

      // 根据咨询类型返回下一步提示
      const nextStepsMap: Record<string, string[]> = {
        'COURSE_PLANNING': [
          '我们会在 24 小时内联系您预约咨询时间',
          '请保持电话/微信畅通',
          '咨询时长约 30-45 分钟',
        ],
        'CAREER_ADVICE': [
          '升学顾问会在 24 小时内与您联系',
          '请准备好您的学业情况和目标学校',
          '咨询时长约 45-60 分钟',
        ],
        'STUDY_PLAN': [
          '专属学习规划师会在 24 小时内联系您',
          '请准备好近期学习表现和目标',
          '将为您定制专属学习计划',
        ],
      };

      consultationInfo = {
        type: item.consultation_type as ConsultationType,
        nextSteps: nextStepsMap[item.consultation_type] || ['兑换成功，请等待后续通知'],
      };
    }

    return {
      success: true,
      redemptionId,
      message: '兑换成功',
      consultationInfo,
    };
  } catch (error) {
    console.error('Redemption error:', error);
    return { success: false, message: '兑换失败，请稍后重试' };
  }
}

/**
 * 获取用户的咨询记录
 */
export async function getUserConsultations(
  db: D1Database,
  userId: string
): Promise<ConversionRecord[]> {
  const records = await db.prepare(`
    SELECT 
      cc.id,
      cc.user_id as userId,
      cc.redemption_id as redemptionId,
      cc.consultation_type as consultationType,
      cc.status,
      cc.scheduled_at as scheduledAt,
      cc.completed_at as completedAt,
      cc.is_converted as isConverted,
      cc.conversion_amount as conversionAmount,
      cc.converted_at as convertedAt,
      cc.user_rating as userRating,
      cc.user_feedback as userFeedback
    FROM consultation_conversions cc
    WHERE cc.user_id = ?
    ORDER BY cc.created_at DESC
  `).bind(userId).all<{
    id: string;
    userId: string;
    redemptionId: string;
    consultationType: string;
    status: string;
    scheduledAt: string | null;
    completedAt: string | null;
    isConverted: number;
    conversionAmount: number | null;
    convertedAt: string | null;
    userRating: number | null;
    userFeedback: string | null;
  }>();

  return (records.results || []).map(r => ({
    id: r.id,
    userId: r.userId,
    redemptionId: r.redemptionId,
    consultationType: r.consultationType as ConsultationType,
    status: r.status as ConversionStatus,
    scheduledAt: r.scheduledAt || undefined,
    completedAt: r.completedAt || undefined,
    isConverted: r.isConverted === 1,
    conversionAmount: r.conversionAmount || undefined,
    convertedAt: r.convertedAt || undefined,
    userRating: r.userRating || undefined,
    userFeedback: r.userFeedback || undefined,
  }));
}

/**
 * 更新咨询状态（管理员用）
 */
export async function updateConsultationStatus(
  db: D1Database,
  conversionId: string,
  updates: {
    status?: ConversionStatus;
    scheduledAt?: string;
    completedAt?: string;
    isConverted?: boolean;
    conversionAmount?: number;
    consultantId?: string;
    consultantNotes?: string;
  }
): Promise<boolean> {
  const setClauses: string[] = ['updated_at = datetime("now")'];
  const values: (string | number)[] = [];

  if (updates.status) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.scheduledAt) {
    setClauses.push('scheduled_at = ?');
    values.push(updates.scheduledAt);
  }
  if (updates.completedAt) {
    setClauses.push('completed_at = ?');
    values.push(updates.completedAt);
  }
  if (updates.isConverted !== undefined) {
    setClauses.push('is_converted = ?');
    values.push(updates.isConverted ? 1 : 0);
    if (updates.isConverted) {
      setClauses.push('converted_at = datetime("now")');
    }
  }
  if (updates.conversionAmount !== undefined) {
    setClauses.push('conversion_amount = ?');
    values.push(updates.conversionAmount);
  }
  if (updates.consultantId) {
    setClauses.push('consultant_id = ?');
    values.push(updates.consultantId);
  }
  if (updates.consultantNotes) {
    setClauses.push('consultant_notes = ?');
    values.push(updates.consultantNotes);
  }

  values.push(conversionId);

  const result = await db.prepare(`
    UPDATE consultation_conversions
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `).bind(...values).run();

  return result.success;
}

/**
 * 获取转化漏斗统计（管理员用）
 */
export async function getConversionFunnelStats(
  db: D1Database,
  days: number = 30
): Promise<{
  period: string;
  totalRedemptions: number;
  scheduledCount: number;
  completedCount: number;
  convertedCount: number;
  totalRevenue: number;
  conversionRate: number;
}[]> {
  const stats = await db.prepare(`
    SELECT 
      DATE(pr.created_at) as period,
      COUNT(DISTINCT pr.id) as totalRedemptions,
      COUNT(DISTINCT CASE WHEN cc.status IN ('SCHEDULED', 'COMPLETED', 'CONVERTED') THEN cc.id END) as scheduledCount,
      COUNT(DISTINCT CASE WHEN cc.status IN ('COMPLETED', 'CONVERTED') THEN cc.id END) as completedCount,
      COUNT(DISTINCT CASE WHEN cc.is_converted = 1 THEN cc.id END) as convertedCount,
      COALESCE(SUM(CASE WHEN cc.is_converted = 1 THEN cc.conversion_amount ELSE 0 END), 0) as totalRevenue
    FROM point_redemptions pr
    JOIN point_mall_items pmi ON pmi.id = pr.item_id
    LEFT JOIN consultation_conversions cc ON cc.redemption_id = pr.id
    WHERE pmi.item_type = 'CONSULTATION'
    AND pr.created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(pr.created_at)
    ORDER BY period DESC
  `).bind(days).all<{
    period: string;
    totalRedemptions: number;
    scheduledCount: number;
    completedCount: number;
    convertedCount: number;
    totalRevenue: number;
  }>();

  return (stats.results || []).map(s => ({
    ...s,
    conversionRate: s.totalRedemptions > 0 
      ? Math.round((s.convertedCount / s.totalRedemptions) * 100) 
      : 0,
  }));
}

// ===== 转化触发机制 =====

export type TriggerType = 
  | 'RANK_RISING'           // 排名连续上升
  | 'CLOSE_TO_TOP'          // 接近前列
  | 'SUBJECT_RISK'          // 科目风险
  | 'STREAK_MILESTONE'      // 连续学习里程碑
  | 'ACCURACY_BREAKTHROUGH' // 正确率突破
  | 'WEAKNESS_CRITICAL';    // 弱项关键期

export interface TriggeredOffer {
  id: string;
  triggerType: TriggerType;
  title: string;
  description: string;
  reason: string;
  urgencyLevel: 'high' | 'medium' | 'low';
  offer: {
    itemId: string;
    itemName: string;
    originalPoints: number;
    discountedPoints: number;
    discountPercent: number;
    expiresAt: string;
  };
  dataInsight: {
    metric: string;
    currentValue: number | string;
    targetValue?: number | string;
    trend?: 'up' | 'down' | 'stable';
  };
}

export interface TriggeredOffersResponse {
  offers: TriggeredOffer[];
  isHighConversionZone: boolean;
  conversionZoneReason?: string;
  userSummary: {
    rank: number | null;
    rankTrend: 'up' | 'down' | 'stable';
    consecutiveRisingDays: number;
    weaknesses: string[];
    strengths: string[];
  };
}

// 触发规则配置
const TRIGGER_RULES = {
  RANK_RISING: {
    minConsecutiveDays: 3,
    discountPercent: 20,
    urgency: 'high' as const,
  },
  CLOSE_TO_TOP: {
    thresholds: [
      { rank: 10, discountPercent: 30, urgency: 'high' as const },
      { rank: 20, discountPercent: 20, urgency: 'medium' as const },
      { rank: 50, discountPercent: 10, urgency: 'low' as const },
    ],
  },
  SUBJECT_RISK: {
    accuracyThreshold: 60, // 低于此正确率视为风险
    discountPercent: 25,
    urgency: 'high' as const,
  },
  STREAK_MILESTONE: {
    milestones: [7, 14, 30],
    discountPercent: 15,
    urgency: 'medium' as const,
  },
};

/**
 * 获取用户的个性化转化触发推荐
 */
export async function getTriggeredOffers(
  db: D1Database,
  userId: string
): Promise<TriggeredOffersResponse> {
  const offers: TriggeredOffer[] = [];
  let isHighConversionZone = false;
  let conversionZoneReason: string | undefined;

  // 1. 获取用户当前学习状态
  const [quizRank, privileges, rankHistory, streakInfo, weakSubjects] = await Promise.all([
    getUserLearningRankWithAnalysis(db, userId, { metric: 'QUIZ_COUNT', range: 'ALL' }),
    checkUserPrivileges(db, userId),
    getRankHistory(db, userId, 7), // 最近7天排名历史
    getUserStreakInfo(db, userId),
    getWeakSubjects(db, userId),
  ]);

  // 2. 计算排名趋势
  const rankTrend = calculateRankTrend(rankHistory);
  const consecutiveRisingDays = countConsecutiveRisingDays(rankHistory);

  // 用户摘要
  const userSummary = {
    rank: quizRank?.rank || null,
    rankTrend,
    consecutiveRisingDays,
    weaknesses: quizRank?.weaknesses || [],
    strengths: quizRank?.strengths || [],
  };

  // 3. 获取可用的咨询商品
  const consultationItems = await getConsultationItems(db);

  // ===== 触发规则检测 =====

  // 规则 1: 排名连续上升
  if (consecutiveRisingDays >= TRIGGER_RULES.RANK_RISING.minConsecutiveDays) {
    isHighConversionZone = true;
    conversionZoneReason = `排名连续 ${consecutiveRisingDays} 天上升`;

    const targetItem = consultationItems.find(i => i.consultationType === 'COURSE_PLANNING');
    if (targetItem) {
      offers.push(createTriggeredOffer(
        'RANK_RISING',
        `你的排名连续 ${consecutiveRisingDays} 天上升！`,
        '势头正好，一次专业规划可能让你更快突破瓶颈',
        `排名从第 ${rankHistory[rankHistory.length - 1]?.rank || '?'} 上升到第 ${quizRank?.rank || '?'}`,
        targetItem,
        TRIGGER_RULES.RANK_RISING.discountPercent,
        TRIGGER_RULES.RANK_RISING.urgency,
        {
          metric: '排名变化',
          currentValue: quizRank?.rank || 0,
          trend: 'up',
        }
      ));
    }
  }

  // 规则 2: 接近前列
  if (quizRank?.rank) {
    for (const threshold of TRIGGER_RULES.CLOSE_TO_TOP.thresholds) {
      if (quizRank.rank <= threshold.rank + 5 && quizRank.rank > threshold.rank) {
        isHighConversionZone = true;
        conversionZoneReason = conversionZoneReason || `距离前 ${threshold.rank} 名仅差 ${quizRank.rank - threshold.rank} 名`;

        const targetItem = consultationItems.find(i => i.consultationType === 'CAREER_ADVICE');
        if (targetItem) {
          offers.push(createTriggeredOffer(
            'CLOSE_TO_TOP',
            `你距离前 ${threshold.rank} 名仅差 ${quizRank.rank - threshold.rank} 名！`,
            '专业顾问帮你分析如何突破最后几名',
            '现在是冲刺的最佳时机',
            targetItem,
            threshold.discountPercent,
            threshold.urgency,
            {
              metric: '当前排名',
              currentValue: quizRank.rank,
              targetValue: threshold.rank,
              trend: rankTrend,
            }
          ));
        }
        break; // 只推送最接近的一个
      }
    }
  }

  // 规则 3: 科目风险
  if (weakSubjects.length > 0) {
    const criticalSubject = weakSubjects[0];
    if (criticalSubject.accuracy < TRIGGER_RULES.SUBJECT_RISK.accuracyThreshold) {
      const targetItem = consultationItems.find(i => i.consultationType === 'STUDY_PLAN');
      if (targetItem) {
        offers.push(createTriggeredOffer(
          'SUBJECT_RISK',
          `你的${criticalSubject.name}正处在关键分水岭`,
          '一次针对性规划可能直接改变升学结果',
          `当前正确率仅 ${criticalSubject.accuracy}%，需要重点关注`,
          targetItem,
          TRIGGER_RULES.SUBJECT_RISK.discountPercent,
          TRIGGER_RULES.SUBJECT_RISK.urgency,
          {
            metric: `${criticalSubject.name}正确率`,
            currentValue: `${criticalSubject.accuracy}%`,
            targetValue: '80%',
            trend: 'down',
          }
        ));
      }
    }
  }

  // 规则 4: 连续学习里程碑
  for (const milestone of TRIGGER_RULES.STREAK_MILESTONE.milestones) {
    if (streakInfo.currentStreak === milestone) {
      const targetItem = consultationItems.find(i => i.consultationType === 'COURSE_PLANNING');
      if (targetItem) {
        offers.push(createTriggeredOffer(
          'STREAK_MILESTONE',
          `恭喜！你已连续学习 ${milestone} 天 🎉`,
          '坚持就是胜利，让专家帮你制定下一阶段计划',
          `连续学习 ${milestone} 天是一个重要里程碑`,
          targetItem,
          TRIGGER_RULES.STREAK_MILESTONE.discountPercent,
          TRIGGER_RULES.STREAK_MILESTONE.urgency,
          {
            metric: '连续学习天数',
            currentValue: milestone,
            trend: 'up',
          }
        ));
      }
      break;
    }
  }

  // 规则 5: 弱项关键期（基于 weaknesses 分析）
  if (userSummary.weaknesses.length > 0 && quizRank?.gapToNext && quizRank.gapToNext.value <= 5) {
    const weakness = userSummary.weaknesses[0];
    const targetItem = consultationItems.find(i => i.consultationType === 'STUDY_PLAN');
    if (targetItem && !offers.some(o => o.triggerType === 'SUBJECT_RISK')) {
      offers.push(createTriggeredOffer(
        'WEAKNESS_CRITICAL',
        `「${weakness}」正在拖累你的排名`,
        '精准补强可能让你立即超越前面的人',
        `系统分析显示：${weakness}`,
        targetItem,
        20,
        'high',
        {
          metric: '弱项分析',
          currentValue: weakness,
          trend: 'stable',
        }
      ));
    }
  }

  // 4. 按紧急程度和折扣力度排序
  offers.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    }
    return b.offer.discountPercent - a.offer.discountPercent;
  });

  // 最多返回 3 个推荐
  return {
    offers: offers.slice(0, 3),
    isHighConversionZone,
    conversionZoneReason,
    userSummary,
  };
}

// ===== 辅助函数 =====

function createTriggeredOffer(
  triggerType: TriggerType,
  title: string,
  description: string,
  reason: string,
  item: { id: string; nameZh: string; requiredPoints: number },
  discountPercent: number,
  urgencyLevel: 'high' | 'medium' | 'low',
  dataInsight: TriggeredOffer['dataInsight']
): TriggeredOffer {
  const discountedPoints = Math.round(item.requiredPoints * (1 - discountPercent / 100));
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3); // 3天有效期

  return {
    id: `${triggerType}_${Date.now()}`,
    triggerType,
    title,
    description,
    reason,
    urgencyLevel,
    offer: {
      itemId: item.id,
      itemName: item.nameZh,
      originalPoints: item.requiredPoints,
      discountedPoints,
      discountPercent,
      expiresAt: expiresAt.toISOString(),
    },
    dataInsight,
  };
}

async function getRankHistory(
  db: D1Database,
  userId: string,
  days: number
): Promise<{ date: string; rank: number }[]> {
  // 简化实现：从 quiz_sessions 推算历史排名变化
  // 实际生产中应有专门的排名快照表
  const history = await db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as quiz_count
    FROM quiz_sessions
    WHERE user_id = ?
    AND status = 'completed'
    AND created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).bind(userId, days).all<{ date: string; quiz_count: number }>();

  // 模拟排名计算（实际应从快照获取）
  let baseRank = 50;
  return (history.results || []).map((h, idx) => {
    // 假设每做一道题排名提升一点
    baseRank = Math.max(1, baseRank - Math.min(h.quiz_count, 5));
    return { date: h.date, rank: baseRank + idx };
  });
}

function calculateRankTrend(history: { date: string; rank: number }[]): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-3);
  const first = recent[0]?.rank || 0;
  const last = recent[recent.length - 1]?.rank || 0;

  if (last < first) return 'up'; // 排名数字越小越好
  if (last > first) return 'down';
  return 'stable';
}

function countConsecutiveRisingDays(history: { date: string; rank: number }[]): number {
  if (history.length < 2) return 0;
  
  let count = 0;
  for (let i = history.length - 1; i > 0; i--) {
    if (history[i].rank < history[i - 1].rank) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

async function getUserStreakInfo(
  db: D1Database,
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
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
  const today = new Date().toISOString().split('T')[0];
  
  if (streakResults.results) {
    for (let i = 0; i < streakResults.results.length; i++) {
      const date = streakResults.results[i].quiz_date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (date === expected || (i === 0 && date === today)) {
        currentStreak++;
      } else {
        break;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return { currentStreak, longestStreak };
}

async function getWeakSubjects(
  db: D1Database,
  userId: string
): Promise<{ name: string; accuracy: number }[]> {
  const result = await db.prepare(`
    SELECT 
      subject as name,
      ROUND(AVG(accuracy) * 100, 1) as accuracy
    FROM quiz_sessions
    WHERE user_id = ?
    AND status = 'completed'
    AND subject IS NOT NULL
    GROUP BY subject
    HAVING COUNT(*) >= 3
    ORDER BY accuracy ASC
    LIMIT 3
  `).bind(userId).all<{ name: string; accuracy: number }>();

  return result.results || [];
}

async function getConsultationItems(
  db: D1Database
): Promise<{ id: string; nameZh: string; requiredPoints: number; consultationType: string }[]> {
  const items = await db.prepare(`
    SELECT id, name_zh as nameZh, required_points as requiredPoints, consultation_type as consultationType
    FROM point_mall_items
    WHERE item_type = 'CONSULTATION'
    AND is_active = 1
  `).all<{ id: string; nameZh: string; requiredPoints: number; consultationType: string }>();

  return items.results || [];
}

/**
 * 检查用户是否在高转化区间
 */
export async function isInHighConversionZone(
  db: D1Database,
  userId: string
): Promise<{ isHigh: boolean; reason?: string }> {
  const { isHighConversionZone, conversionZoneReason } = await getTriggeredOffers(db, userId);
  return { isHigh: isHighConversionZone, reason: conversionZoneReason };
}
