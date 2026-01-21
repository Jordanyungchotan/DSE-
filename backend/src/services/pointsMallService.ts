/**
 * 积分商城服务（升级版）
 * 
 * 新增功能：
 * - 咨询类商品兑换
 * - 排名解锁商品
 * - 转化追踪
 */

import { checkUserPrivileges } from './incentiveLeaderboardService.js';

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
