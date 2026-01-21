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
import { apiFetch } from '../config/api'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import type { DailyTaskStatus, PointTaskKey } from '@/shared/domain'
import { getPointTaskDisplayName, POINT_TASKS } from '@/shared/domain'
import styles from './PointsPage.module.css'

const { Title, Text } = Typography

// 后端返回的每日任务状态（UI 可直接渲染）
interface DailyTasksResponse {
  code: number
  data: {
    tasks: DailyTaskStatus[]
    date: string
  }
  message: string
}

// 后端返回的积分摘要
interface PointsSummaryResponse {
  code: number
  data: {
    totalPoints: number
    taskCounts: Record<string, number>
    todayCounts: Record<string, number>
  }
  message: string
}

// 后端返回的积分历史
interface PointHistoryResponse {
  code: number
  data: {
    history: PointHistory[]
  }
  message: string
}

interface PointHistory {
  id: string
  userId: string
  task: string
  points: number
  createdAt: string
}

// 等级配置
const LEVEL_CONFIG = [
  { level: 1, minPoints: 0, maxPoints: 500, color: '#8c8c8c' },
  { level: 2, minPoints: 500, maxPoints: 2000, color: '#52c41a' },
  { level: 3, minPoints: 2000, maxPoints: 5000, color: '#1890ff' },
  { level: 4, minPoints: 5000, maxPoints: 10000, color: '#722ed1' },
  { level: 5, minPoints: 10000, maxPoints: 999999, color: '#faad14' },
]

export default function PointsPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { t, currentLanguage } = useLanguageStore()
  
  const [loading, setLoading] = useState(true)
  const [totalPoints, setTotalPoints] = useState(0)
  const [dailyTasks, setDailyTasks] = useState<DailyTaskStatus[]>([])
  const [history, setHistory] = useState<PointHistory[]>([])
  const [checkingIn, setCheckingIn] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      // 使用新的 API 获取数据
      const [summaryRes, dailyTasksRes, historyRes] = await Promise.all([
        apiFetch('/api/points/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiFetch(`/api/points/daily-tasks?lang=${currentLanguage}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiFetch('/api/points/history?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (summaryRes.ok) {
        const summaryData: PointsSummaryResponse = await summaryRes.json()
        if (summaryData.code === 0) {
          setTotalPoints(summaryData.data.totalPoints)
        }
      }
      
      if (dailyTasksRes.ok) {
        const dailyTasksData: DailyTasksResponse = await dailyTasksRes.json()
        if (dailyTasksData.code === 0) {
          setDailyTasks(dailyTasksData.data.tasks)
        }
      }
      
      if (historyRes.ok) {
        const historyData: PointHistoryResponse = await historyRes.json()
        if (historyData.code === 0) {
          setHistory(historyData.data.history || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch points data:', error)
      message.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [token, t, currentLanguage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 每日签到（通过后端积分系统）
  const handleDailyCheckin = async () => {
    if (!token) {
      message.warning(t('auth.loginRequired'))
      navigate('/login')
      return
    }

    setCheckingIn(true)
    try {
      // 签到逻辑由后端处理，这里只是展示
      message.info(t('points.checkinProcessing'))
      await fetchData()
    } catch (error) {
      console.error('Check-in failed:', error)
      message.error(t('common.error'))
    } finally {
      setCheckingIn(false)
    }
  }

  const getUserLevel = (points: number) => {
    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
      if (points >= LEVEL_CONFIG[i].minPoints) {
        return LEVEL_CONFIG[i]
      }
    }
    return LEVEL_CONFIG[0]
  }

  const getLevelProgress = (points: number) => {
    const config = getUserLevel(points)
    const nextConfig = LEVEL_CONFIG.find(l => l.level === config.level + 1)
    if (!nextConfig) return 100
    
    const progress = ((points - config.minPoints) / (nextConfig.minPoints - config.minPoints)) * 100
    return Math.min(100, Math.max(0, progress))
  }

  const getPointsToNextLevel = (points: number) => {
    const config = getUserLevel(points)
    const nextConfig = LEVEL_CONFIG.find(l => l.level === config.level + 1)
    if (!nextConfig) return 0
    return Math.max(0, nextConfig.minPoints - points)
  }

  const getLevelName = (level: number) => {
    const key = `points.levelNames.${level}` as const
    return t(key) || `Lv.${level}`
  }

  // 检查今日是否已签到（从后端返回的 dailyTasks 中获取）
  const hasCheckedInToday = () => {
    const loginTask = dailyTasks.find(t => t.taskKey === 'DAILY_LOGIN')
    return loginTask?.completed ?? false
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

  if (!token) {
    return (
      <div className={styles.container}>
        <Card className={styles.mainCard}>
          <Empty description={t('auth.loginRequired')}>
            <Button type="primary" onClick={() => navigate('/login')}>
              {t('auth.login')}
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  const levelConfig = getUserLevel(totalPoints)
  const checkedIn = hasCheckedInToday()

  // 任务列表（直接使用后端返回的 dailyTasks，UI 可直接渲染）
  // 不再在前端做任何计算

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
              Lv.{levelConfig.level} {getLevelName(levelConfig.level)}
            </Text>
            <Title level={2} className={styles.pointsValue}>
              <TrophyOutlined /> {totalPoints} <span className={styles.pointsUnit}>{t('points.pointsUnit')}</span>
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
            <Text>{t('points.toNextLevel')} <Text strong>{getPointsToNextLevel(totalPoints)}</Text> {t('points.pointsUnit')}</Text>
          </div>
          <Progress 
            percent={getLevelProgress(totalPoints)} 
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
            disabled={checkedIn}
            className={`${styles.checkinBtn} ${checkedIn ? styles.checkedIn : ''}`}
          >
            {checkedIn ? t('points.checkedIn') : t('points.checkinButton')}
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
                  value={totalPoints} 
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title={t('points.availablePoints')} 
                  value={totalPoints}
                  prefix={<GiftOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 获取积分方式（直接使用后端返回的 dailyTasks） */}
        <Col xs={24} md={12}>
          <Card title={<><RiseOutlined /> {t('points.earnPoints')}</>} className={styles.earnCard}>
            <List
              size="small"
              dataSource={dailyTasks.slice(0, 5)}
              renderItem={task => {
                const remaining = task.dailyLimit - task.todayCount
                return (
                  <List.Item className={`${styles.ruleItem} ${task.completed ? styles.ruleCompleted : ''}`}>
                    <div className={styles.ruleName}>
                      {task.completed ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      ) : (
                        <FireOutlined style={{ color: '#faad14', marginRight: 8 }} />
                      )}
                      <span style={task.completed ? { color: '#8c8c8c' } : undefined}>{task.label}</span>
                    </div>
                    <div className={styles.rulePoints}>
                      {task.completed ? (
                        <Tag color="success">{t('points.completed')}</Tag>
                      ) : (
                        <>
                          <Tag color="gold">+{task.pointsPerTime}</Tag>
                          {remaining > 0 && (
                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                              ({remaining}{t('points.rules.times')})
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
      >
        {history.length > 0 ? (
          <List
            dataSource={history}
            renderItem={item => (
              <List.Item className={styles.historyItem}>
                <div className={styles.historyLeft}>
                  <Badge 
                    status={item.points > 0 ? 'success' : 'error'} 
                  />
                  <div>
                    <Text>{getPointTaskDisplayName(item.task as PointTaskKey, currentLanguage)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </div>
                </div>
                <div className={styles.historyPoints}>
                  <Text 
                    strong 
                    style={{ color: item.points > 0 ? '#52c41a' : '#ff4d4f' }}
                  >
                    {item.points > 0 ? '+' : ''}{item.points}
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
              <Text type="secondary" style={{ fontSize: 12 }}>+{POINT_TASKS.COMPLETE_QUIZ.points}</Text>
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
              <Text type="secondary" style={{ fontSize: 12 }}>+{POINT_TASKS.COMPLETE_LEVEL_TEST.points}</Text>
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
