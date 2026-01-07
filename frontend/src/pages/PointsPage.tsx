import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Button, List, Tag, Progress, Spin, message, Statistic, Row, Col, Empty, Badge } from 'antd'
import { 
  TrophyOutlined, 
  GiftOutlined, 
  HistoryOutlined,
  StarOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  CrownOutlined
} from '@ant-design/icons'
import { ragFetch } from '../config/api'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './PointsPage.module.css'

const { Title, Text } = Typography

interface PointsBalance {
  total: number
  available: number
  level: number
  recentActivity: {
    id: number
    change_points: number
    current_points: number
    type: string
    description: string
    created_at: string
  }[]
}

interface PointsRule {
  id: number
  rule_code: string
  name: string
  description: string | null
  points_value: number
  limit_type: string
  limit_times: number
  canClaim?: boolean
  remainingTimes?: number
}

// 等级配置 - 使用 level number 作为 key，名称从翻译获取
const LEVEL_CONFIG = [
  { level: 1, minPoints: 0, maxPoints: 500, color: '#8c8c8c' },
  { level: 2, minPoints: 500, maxPoints: 2000, color: '#52c41a' },
  { level: 3, minPoints: 2000, maxPoints: 5000, color: '#1890ff' },
  { level: 4, minPoints: 5000, maxPoints: 10000, color: '#722ed1' },
  { level: 5, minPoints: 10000, maxPoints: 999999, color: '#faad14' },
]

export default function PointsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useLanguageStore()
  
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<PointsBalance | null>(null)
  const [rules, setRules] = useState<PointsRule[]>([])
  const [checkingIn, setCheckingIn] = useState(false)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)

  const userId = user?.id || 'anonymous'

  const fetchData = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [balanceRes, rulesRes] = await Promise.all([
        ragFetch(`/api/points/balance?user_id=${userId}`),
        ragFetch(`/api/points/rules?user_id=${userId}`)
      ])

      const balanceData = await balanceRes.json()
      const rulesData = await rulesRes.json()

      if (balanceData.success) {
        setBalance(balanceData.data)
      }
      if (rulesData.success) {
        setRules(rulesData.data)
        // 检查每日签到是否已领取
        const loginRule = rulesData.data.find((r: PointsRule) => r.rule_code === 'DAILY_LOGIN')
        if (loginRule && loginRule.remainingTimes === 0) {
          setHasCheckedIn(true)
        } else {
          setHasCheckedIn(false)
        }
      }
    } catch (error) {
      console.error('Failed to fetch points data:', error)
      message.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDailyCheckin = async () => {
    setCheckingIn(true)
    try {
      const res = await ragFetch('/api/daily-checkin', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      })
      const data = await res.json()

      if (data.success) {
        message.success(`${t('points.checkinSuccess')} ${data.points_earned} ${t('points.pointsUnit')}`)
        setHasCheckedIn(true)
        fetchData() // 刷新数据
      } else if (data.already_checked_in) {
        message.info(t('points.alreadyCheckedIn'))
        setHasCheckedIn(true)
      } else {
        message.error(data.error || t('common.error'))
      }
    } catch (error) {
      console.error('Check-in failed:', error)
      message.error(t('common.error'))
    } finally {
      setCheckingIn(false)
    }
  }

  const getLevelConfig = (level: number) => {
    return LEVEL_CONFIG.find(l => l.level === level) || LEVEL_CONFIG[0]
  }

  const getLevelProgress = () => {
    if (!balance) return 0
    const config = getLevelConfig(balance.level)
    const nextConfig = LEVEL_CONFIG.find(l => l.level === balance.level + 1)
    if (!nextConfig) return 100
    
    const progress = ((balance.total - config.minPoints) / (nextConfig.minPoints - config.minPoints)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  const getPointsToNextLevel = () => {
    if (!balance) return 0
    const nextConfig = LEVEL_CONFIG.find(l => l.level === balance.level + 1)
    if (!nextConfig) return 0
    return Math.max(0, nextConfig.minPoints - balance.total)
  }

  // 获取等级名称（从翻译）
  const getLevelName = (level: number) => {
    const key = `points.levelNames.${level}` as const
    return t(key) || `Lv.${level}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <Spin size="large" />
          <Text className={styles.loadingText}>{t('common.loading')}</Text>
        </div>
      </div>
    )
  }

  const levelConfig = balance ? getLevelConfig(balance.level) : LEVEL_CONFIG[0]

  return (
    <div className={styles.container}>
      {/* 头部积分卡片 */}
      <Card className={styles.mainCard}>
        <div className={styles.header}>
          <div className={styles.levelBadge} style={{ borderColor: levelConfig.color }}>
            <CrownOutlined style={{ color: levelConfig.color, fontSize: 32 }} />
          </div>
          <div className={styles.headerInfo}>
            <Text className={styles.levelName} style={{ color: levelConfig.color }}>
              Lv.{balance?.level || 1} {getLevelName(balance?.level || 1)}
            </Text>
            <Title level={2} className={styles.pointsValue}>
              <TrophyOutlined /> {balance?.total || 0} <span className={styles.pointsUnit}>{t('points.pointsUnit')}</span>
            </Title>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<GiftOutlined />}
            onClick={() => navigate('/points/mall')}
            className={styles.mallBtn}
          >
            {t('nav.pointsMall')}
          </Button>
        </div>

        {/* 等级进度条 */}
        <div className={styles.levelProgress}>
          <div className={styles.progressHeader}>
            <Text>{t('points.toNextLevel')} <Text strong>{getPointsToNextLevel()}</Text> {t('points.pointsUnit')}</Text>
          </div>
          <Progress 
            percent={getLevelProgress()} 
            strokeColor={levelConfig.color}
            showInfo={false}
          />
        </div>

        {/* 每日签到 */}
        <div className={styles.checkinSection}>
          <Button 
            type="primary" 
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleDailyCheckin}
            loading={checkingIn}
            disabled={hasCheckedIn}
            className={`${styles.checkinBtn} ${hasCheckedIn ? styles.checkedIn : ''}`}
          >
            {hasCheckedIn ? t('points.checkedIn') : t('points.checkinButton')}
          </Button>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 积分统计 */}
        <Col xs={24} md={12}>
          <Card title={<><StarOutlined /> {t('points.statistics')}</>} className={styles.statsCard}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title={t('points.totalPoints')} 
                  value={balance?.total || 0} 
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title={t('points.availablePoints')} 
                  value={balance?.available || 0}
                  prefix={<GiftOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 获取积分方式 */}
        <Col xs={24} md={12}>
          <Card title={<><RiseOutlined /> {t('points.earnPoints')}</>} className={styles.earnCard}>
            <List
              size="small"
              dataSource={rules.slice(0, 5)}
              renderItem={rule => {
                const isCompleted = rule.remainingTimes === 0
                return (
                  <List.Item className={`${styles.ruleItem} ${isCompleted ? styles.ruleCompleted : ''}`}>
                    <div className={styles.ruleName}>
                      {isCompleted ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      ) : (
                        <FireOutlined style={{ color: '#faad14', marginRight: 8 }} />
                      )}
                      <span style={isCompleted ? { color: '#8c8c8c' } : undefined}>{rule.name}</span>
                    </div>
                    <div className={styles.rulePoints}>
                      {isCompleted ? (
                        <Tag color="success">{t('points.completed')}</Tag>
                      ) : (
                        <>
                          <Tag color="gold">+{rule.points_value}</Tag>
                          {rule.remainingTimes !== undefined && (
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                              ({rule.remainingTimes}{t('points.rules.times')})
                            </Text>
                          )}
                        </>
                      )}
                    </div>
                  </List.Item>
                )
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近积分记录 */}
      <Card 
        title={<><HistoryOutlined /> {t('points.recentActivity')}</>} 
        className={styles.historyCard}
        extra={<Button type="link" onClick={() => navigate('/points/history')}>{t('points.viewAll')}</Button>}
      >
        {balance?.recentActivity && balance.recentActivity.length > 0 ? (
          <List
            dataSource={balance.recentActivity}
            renderItem={item => (
              <List.Item className={styles.historyItem}>
                <div className={styles.historyLeft}>
                  <Badge 
                    status={item.change_points > 0 ? 'success' : 'error'} 
                  />
                  <div>
                    <Text>{item.description}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {new Date(item.created_at).toLocaleString()}
                    </Text>
                  </div>
                </div>
                <div className={styles.historyPoints}>
                  <Text 
                    strong 
                    style={{ color: item.change_points > 0 ? '#52c41a' : '#ff4d4f' }}
                  >
                    {item.change_points > 0 ? '+' : ''}{item.change_points}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t('points.noRecords')} />
        )}
      </Card>

      {/* 快捷入口 */}
      <Card className={styles.quickActions}>
        <Row gutter={16}>
          <Col span={8}>
            <Button 
              block 
              size="large"
              onClick={() => navigate('/quiz')}
              className={styles.actionBtn}
            >
              <FireOutlined style={{ fontSize: 24, color: '#ff7a45' }} />
              <div>{t('points.goPractice')}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('points.perTime')}+30</Text>
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              block 
              size="large"
              onClick={() => navigate('/level-test')}
              className={styles.actionBtn}
            >
              <TrophyOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              <div>{t('points.goTest')}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('points.perTime')}+50</Text>
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              block 
              size="large"
              onClick={() => navigate('/points/mall')}
              className={styles.actionBtn}
            >
              <GiftOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <div>{t('points.goMall')}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('points.exchangeGifts')}</Text>
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
