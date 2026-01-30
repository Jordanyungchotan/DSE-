import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Typography, Spin, message, Progress, Tag, Empty, Row, Col, Tabs } from 'antd'
import { 
  TrophyOutlined, 
  LockOutlined,
  CheckCircleOutlined,
  StarOutlined,
  FireOutlined,
  CrownOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './AchievementsPage.module.css'

const { Title, Text } = Typography

// ===== 类型定义 =====

interface AchievementProgress {
  achievementId: string
  currentValue: number
  targetValue: number
  percentage: number
  isUnlocked: boolean
}

interface UnlockedAchievement {
  achievementId: string
  name: string
  description: string
  icon: string
  rarity: string
  unlockedAt: string
  pointsAwarded: number
}

interface LockedAchievement {
  achievementId: string
  name: string
  description: string
  icon: string
  rarity: string
  progress: AchievementProgress
  hidden: boolean
}

interface AchievementsResponse {
  code: number
  data: {
    unlocked: UnlockedAchievement[]
    locked: LockedAchievement[]
    totalUnlocked: number
    totalAchievements: number
  }
  message: string
}

// ===== 稀有度配置 =====

const RARITY_CONFIG: Record<string, { color: string; label: string; bgColor: string }> = {
  COMMON: { color: '#8c8c8c', label: '普通', bgColor: '#f5f5f5' },
  UNCOMMON: { color: '#52c41a', label: '稀有', bgColor: '#f6ffed' },
  RARE: { color: '#1890ff', label: '精良', bgColor: '#e6f7ff' },
  EPIC: { color: '#722ed1', label: '史诗', bgColor: '#f9f0ff' },
  LEGENDARY: { color: '#fa8c16', label: '传说', bgColor: '#fff7e6' },
}

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { t } = useLanguageStore()
  
  const [loading, setLoading] = useState(true)
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([])
  const [locked, setLocked] = useState<LockedAchievement[]>([])
  const [totalUnlocked, setTotalUnlocked] = useState(0)
  const [totalAchievements, setTotalAchievements] = useState(0)
  const [activeTab, setActiveTab] = useState('unlocked')

  const fetchAchievements = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const response = await apiFetch('/api/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data: AchievementsResponse = await response.json()
        if (data.code === 0) {
          setUnlocked(data.data.unlocked || [])
          setLocked(data.data.locked || [])
          setTotalUnlocked(data.data.totalUnlocked || 0)
          setTotalAchievements(data.data.totalAchievements || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error)
      message.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  const getRarityConfig = (rarity: string) => {
    return RARITY_CONFIG[rarity] || RARITY_CONFIG.COMMON
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
            <button onClick={() => navigate('/login')} className={styles.loginBtn}>
              {t('auth.login')}
            </button>
          </Empty>
        </Card>
      </div>
    )
  }

  const progressPercent = totalAchievements > 0 
    ? Math.round((totalUnlocked / totalAchievements) * 100) 
    : 0

  return (
    <div className={styles.container}>
      {/* 返回按钮 */}
      <div className={styles.backButton} onClick={() => navigate('/points')}>
        <ArrowLeftOutlined /> 返回积分中心
      </div>

      {/* 头部统计卡片 */}
      <Card className={styles.headerCard}>
        <div className={styles.headerContent}>
          <div className={styles.trophyIcon}>
            <TrophyOutlined />
          </div>
          <div className={styles.headerInfo}>
            <Title level={3} className={styles.headerTitle}>我的成就</Title>
            <Text className={styles.headerSubtitle}>
              已解锁 <Text strong style={{ color: '#faad14' }}>{totalUnlocked}</Text> / {totalAchievements} 个成就
            </Text>
          </div>
        </div>
        <Progress 
          percent={progressPercent} 
          strokeColor={{ '0%': '#faad14', '100%': '#fa8c16' }}
          trailColor="#f0f0f0"
          showInfo={true}
          format={() => `${progressPercent}%`}
        />
      </Card>

      {/* 成就列表 */}
      <Card className={styles.listCard}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'unlocked',
              label: (
                <span>
                  <CheckCircleOutlined /> 已解锁 ({totalUnlocked})
                </span>
              ),
              children: (
                <div className={styles.achievementList}>
                  {unlocked.length > 0 ? (
                    <Row gutter={[12, 12]}>
                      {unlocked.map(achievement => {
                        const rarityConfig = getRarityConfig(achievement.rarity)
                        return (
                          <Col xs={24} sm={12} key={achievement.achievementId}>
                            <div 
                              className={styles.achievementCard}
                              style={{ 
                                borderColor: rarityConfig.color,
                                background: rarityConfig.bgColor 
                              }}
                            >
                              <div className={styles.achievementIcon}>
                                {achievement.icon || '🏆'}
                              </div>
                              <div className={styles.achievementInfo}>
                                <div className={styles.achievementName}>
                                  {achievement.name}
                                  <Tag 
                                    color={rarityConfig.color} 
                                    className={styles.rarityTag}
                                  >
                                    {rarityConfig.label}
                                  </Tag>
                                </div>
                                <div className={styles.achievementDesc}>
                                  {achievement.description}
                                </div>
                                <div className={styles.achievementMeta}>
                                  <span className={styles.achievementPoints}>
                                    <StarOutlined /> +{achievement.pointsAwarded} 积分
                                  </span>
                                  <span className={styles.achievementDate}>
                                    {formatDate(achievement.unlockedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Col>
                        )
                      })}
                    </Row>
                  ) : (
                    <Empty 
                      description="暂无已解锁成就"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <Text type="secondary">完成学习任务解锁成就</Text>
                    </Empty>
                  )}
                </div>
              ),
            },
            {
              key: 'locked',
              label: (
                <span>
                  <LockOutlined /> 未解锁 ({locked.length})
                </span>
              ),
              children: (
                <div className={styles.achievementList}>
                  {locked.length > 0 ? (
                    <Row gutter={[12, 12]}>
                      {locked.map(achievement => {
                        const rarityConfig = getRarityConfig(achievement.rarity)
                        const progress = achievement.progress
                        return (
                          <Col xs={24} sm={12} key={achievement.achievementId}>
                            <div 
                              className={`${styles.achievementCard} ${styles.lockedCard}`}
                              style={{ borderColor: '#d9d9d9' }}
                            >
                              <div className={styles.achievementIcon} style={{ opacity: 0.5 }}>
                                {achievement.hidden ? '❓' : (achievement.icon || '🔒')}
                              </div>
                              <div className={styles.achievementInfo}>
                                <div className={styles.achievementName}>
                                  {achievement.name}
                                  <Tag className={styles.rarityTag} style={{ opacity: 0.6 }}>
                                    {rarityConfig.label}
                                  </Tag>
                                </div>
                                <div className={styles.achievementDesc}>
                                  {achievement.description}
                                </div>
                                {!achievement.hidden && progress && (
                                  <div className={styles.progressSection}>
                                    <Progress 
                                      percent={progress.percentage} 
                                      size="small"
                                      strokeColor={rarityConfig.color}
                                      format={() => `${progress.currentValue}/${progress.targetValue}`}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </Col>
                        )
                      })}
                    </Row>
                  ) : (
                    <Empty 
                      description="所有成就已解锁！"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      <CrownOutlined style={{ fontSize: 32, color: '#faad14' }} />
                    </Empty>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 成就提示 */}
      <Card className={styles.tipsCard}>
        <Title level={5}>
          <FireOutlined style={{ color: '#fa8c16' }} /> 如何获得更多成就？
        </Title>
        <ul className={styles.tipsList}>
          <li>📅 坚持每日学习，解锁连续学习成就</li>
          <li>📚 完成更多刷题，解锁刷题量成就</li>
          <li>🎯 提高正确率，解锁表现优秀成就</li>
          <li>🔥 挑战高难度题目，解锁隐藏成就</li>
        </ul>
      </Card>
    </div>
  )
}
