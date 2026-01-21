import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Tag,
  Button,
  Spin,
  Badge,
  Statistic,
} from 'antd'

const { Countdown } = Statistic
import {
  FireOutlined,
  RocketOutlined,
  TrophyOutlined,
  WarningOutlined,
  GiftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../../config/api'
import { useAuthStore } from '../../stores/authStore'
import styles from './TriggeredOffers.module.css'

// ===== 类型定义 =====

interface TriggeredOffer {
  id: string;
  triggerType: string;
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

interface TriggeredOffersResponse {
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

// ===== 图标映射 =====

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  RANK_RISING: <RocketOutlined />,
  CLOSE_TO_TOP: <TrophyOutlined />,
  SUBJECT_RISK: <WarningOutlined />,
  STREAK_MILESTONE: <FireOutlined />,
  ACCURACY_BREAKTHROUGH: <ThunderboltOutlined />,
  WEAKNESS_CRITICAL: <BulbOutlined />,
};

const URGENCY_COLORS: Record<string, string> = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

// ===== 组件属性 =====

interface TriggeredOffersProps {
  onRedeem?: (itemId: string) => void;
  showSummary?: boolean;
}

/**
 * 转化触发推荐组件
 */
const TriggeredOffersComponent: React.FC<TriggeredOffersProps> = ({
  onRedeem,
  showSummary = true,
}) => {
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TriggeredOffersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 获取推荐数据
  const fetchOffers = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await apiFetch('/api/points/mall/offers', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('获取推荐失败')
      }

      const result = await response.json()
      if (result.code === 0) {
        setData(result.data)
      } else {
        throw new Error(result.message || '获取推荐失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOffers()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, fetchOffers])

  // 处理兑换点击
  const handleRedeem = (offer: TriggeredOffer) => {
    if (onRedeem) {
      onRedeem(offer.offer.itemId)
    } else {
      navigate(`/points/mall?item=${offer.offer.itemId}&discount=${offer.offer.discountPercent}`)
    }
  }

  // 计算倒计时
  const getDeadline = (expiresAt: string) => {
    return new Date(expiresAt).getTime()
  }

  // 获取趋势图标
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUpOutlined style={{ color: '#52c41a' }} />
      case 'down': return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
      default: return null
    }
  }

  // 未登录状态
  if (!isAuthenticated) {
    return null
  }

  // 加载状态
  if (loading) {
    return (
      <Card className={styles.offersCard}>
        <div className={styles.loadingContainer}>
          <Spin tip="分析推荐中..." />
        </div>
      </Card>
    )
  }

  // 错误状态
  if (error) {
    return null // 静默失败，不影响用户体验
  }

  // 无推荐
  if (!data || data.offers.length === 0) {
    return null // 没有推荐时不显示
  }

  return (
    <div className={styles.offersContainer}>
      {/* 高转化区间提示 */}
      {data.isHighConversionZone && (
        <div className={styles.conversionZoneBanner}>
          <ThunderboltOutlined className={styles.bannerIcon} />
          <span>你已进入咨询高转化区间：{data.conversionZoneReason}</span>
        </div>
      )}

      {/* 用户摘要（可选） */}
      {showSummary && data.userSummary.rank && (
        <div className={styles.userSummary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>当前排名</span>
            <span className={styles.summaryValue}>
              #{data.userSummary.rank}
              {getTrendIcon(data.userSummary.rankTrend)}
            </span>
          </div>
          {data.userSummary.consecutiveRisingDays > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>连续上升</span>
              <span className={styles.summaryValue}>
                {data.userSummary.consecutiveRisingDays} 天 🔥
              </span>
            </div>
          )}
        </div>
      )}

      {/* 推荐卡片 */}
      <div className={styles.offersHeader}>
        <h3>
          <GiftOutlined style={{ marginRight: 8, color: '#faad14' }} />
          🎯 为你推荐
        </h3>
        <Tag color="gold">限时优惠</Tag>
      </div>

      <div className={styles.offersList}>
        {data.offers.map((offer) => (
          <Card
            key={offer.id}
            className={`${styles.offerCard} ${styles[`urgency${offer.urgencyLevel.charAt(0).toUpperCase()}${offer.urgencyLevel.slice(1)}`]}`}
            hoverable
          >
            <div className={styles.offerHeader}>
              <Badge
                dot
                color={URGENCY_COLORS[offer.urgencyLevel]}
              >
                <span className={styles.offerIcon}>
                  {TRIGGER_ICONS[offer.triggerType] || <GiftOutlined />}
                </span>
              </Badge>
              <div className={styles.offerTitle}>
                <h4>{offer.title}</h4>
                <p className={styles.offerReason}>{offer.reason}</p>
              </div>
            </div>

            <p className={styles.offerDescription}>{offer.description}</p>

            {/* 数据洞察 */}
            <div className={styles.dataInsight}>
              <span className={styles.insightLabel}>{offer.dataInsight.metric}：</span>
              <span className={styles.insightValue}>
                {offer.dataInsight.currentValue}
                {getTrendIcon(offer.dataInsight.trend)}
              </span>
              {offer.dataInsight.targetValue && (
                <span className={styles.insightTarget}>
                  → 目标: {offer.dataInsight.targetValue}
                </span>
              )}
            </div>

            {/* 优惠信息 */}
            <div className={styles.offerInfo}>
              <div className={styles.priceSection}>
                <span className={styles.originalPrice}>
                  原价 {offer.offer.originalPoints} 积分
                </span>
                <span className={styles.discountedPrice}>
                  {offer.offer.discountedPoints} 积分
                </span>
                <Tag color="red" className={styles.discountTag}>
                  -{offer.offer.discountPercent}%
                </Tag>
              </div>

              <div className={styles.countdown}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                <Countdown
                  value={getDeadline(offer.offer.expiresAt)}
                  format="D天H时m分"
                  valueStyle={{ fontSize: 12, color: '#ff4d4f' }}
                />
              </div>
            </div>

            <Button
              type="primary"
              block
              className={styles.redeemBtn}
              onClick={() => handleRedeem(offer)}
            >
              立即兑换 {offer.offer.itemName}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default TriggeredOffersComponent
