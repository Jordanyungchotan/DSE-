/**
 * 积分商城服务（升级版）
 *
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 *
 * 新增功能：
 * - 咨询类商品兑换
 * - 排名解锁商品
 * - 转化追踪
 *
 * 禁止数据源：
 * - ❌ quiz_sessions / quiz_results 表
 * - ❌ 前端统计结果
 * - ❌ session / store 中的临时值
 */
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
/**
 * 获取商城商品列表（带排名解锁状态）
 */
export declare function getMallItems(db: D1Database, userId?: string): Promise<MallItem[]>;
/**
 * 兑换商品（升级版，支持咨询类）
 */
export declare function redeemItem(db: D1Database, userId: string, itemId: string): Promise<RedemptionResult>;
/**
 * 获取用户的咨询记录
 */
export declare function getUserConsultations(db: D1Database, userId: string): Promise<ConversionRecord[]>;
/**
 * 更新咨询状态（管理员用）
 */
export declare function updateConsultationStatus(db: D1Database, conversionId: string, updates: {
    status?: ConversionStatus;
    scheduledAt?: string;
    completedAt?: string;
    isConverted?: boolean;
    conversionAmount?: number;
    consultantId?: string;
    consultantNotes?: string;
}): Promise<boolean>;
/**
 * 获取转化漏斗统计（管理员用）
 */
export declare function getConversionFunnelStats(db: D1Database, days?: number): Promise<{
    period: string;
    totalRedemptions: number;
    scheduledCount: number;
    completedCount: number;
    convertedCount: number;
    totalRevenue: number;
    conversionRate: number;
}[]>;
export type TriggerType = 'RANK_RISING' | 'CLOSE_TO_TOP' | 'SUBJECT_RISK' | 'STREAK_MILESTONE' | 'ACCURACY_BREAKTHROUGH' | 'WEAKNESS_CRITICAL';
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
/**
 * 获取用户的个性化转化触发推荐
 */
export declare function getTriggeredOffers(db: D1Database, userId: string): Promise<TriggeredOffersResponse>;
/**
 * 检查用户是否在高转化区间
 */
export declare function isInHighConversionZone(db: D1Database, userId: string): Promise<{
    isHigh: boolean;
    reason?: string;
}>;
//# sourceMappingURL=pointsMallService.d.ts.map