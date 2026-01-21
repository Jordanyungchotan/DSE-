import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  List, 
  Progress, 
  Tag, 
  Button, 
  Spin, 
  Empty,
  Badge,
  Tooltip,
} from 'antd'
import {
  FireOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  AimOutlined,
  BookOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../../config/api'
import { useAuthStore } from '../../stores/authStore'
import styles from './DailyMission.module.css'

// ===== 类型定义 =====

interface MissionReward {
  points: number;
  leaderboardBoost?: boolean;
  streakBonus?: boolean;
  badgeProgress?: string;
}

interface MissionProgress {
  current: number;
  target: number;
  unit?: string;
}

interface DailyMission {
  id: string;
  type: string;
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  reward: MissionReward;
  progress: MissionProgress;
  actionPath: string;
  actionLabel: string;
  completed: boolean;
  expiresAt: string;
}

interface DailyMissionResponse {
  date: string;
  userId: string;
  missions: DailyMission[];
  completedCount: number;
  totalCount: number;
  bonusUnlocked: boolean;
  nextRefreshAt: string;
}

// ===== 任务类型图标映射 =====

const MISSION_ICONS: Record<string, React.ReactNode> = {
  DAILY_QUIZ: <FireOutlined />,
  SUBJECT_FOCUS: <BookOutlined />,
  ACCURACY_BOOST: <AimOutlined />,
  SPEED_CHALLENGE: <ThunderboltOutlined />,
  STREAK_MAINTAIN: <TrophyOutlined />,
  RANK_BREAKTHROUGH: <RocketOutlined />,
  WEAKNESS_FIX: <AimOutlined />,
  REVIEW_MISTAKES: <BookOutlined />,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ff4d4f',
  medium: '#faad14',
  low: '#52c41a',
};

// ===== 组件属性 =====

interface DailyMissionProps {
  compact?: boolean; // 紧凑模式（首页使用）
  maxItems?: number; // 最多显示数量
  onMissionClick?: (mission: DailyMission) => void;
}

/**
 * 每日学习任务组件
 */
const DailyMissionComponent: React.FC<DailyMissionProps> = ({
  compact = false,
  maxItems = 5,
  onMissionClick,
}) => {
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [missionData, setMissionData] = useState<DailyMissionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 获取任务数据
  const fetchMissions = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await apiFetch('/api/learning/daily-mission', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('获取任务失败')
      }

      const result = await response.json()
      if (result.code === 0) {
        setMissionData(result.data)
      } else {
        throw new Error(result.message || '获取任务失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated) {
      fetchMissions()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, fetchMissions])

  // 处理任务点击
  const handleMissionClick = (mission: DailyMission) => {
    if (onMissionClick) {
      onMissionClick(mission)
    } else {
      navigate(mission.actionPath)
    }
  }

  // 计算剩余时间
  const getTimeRemaining = () => {
    if (!missionData?.nextRefreshAt) return null
    const now = new Date()
    const refresh = new Date(missionData.nextRefreshAt)
    const diff = refresh.getTime() - now.getTime()
    
    if (diff <= 0) return '即将刷新'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}小时${minutes}分钟后刷新`
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <Card className={`${styles.missionCard} ${compact ? styles.compact : ''}`}>
        <div className={styles.loginPrompt}>
          <TrophyOutlined className={styles.loginIcon} />
          <p>登录后查看今日学习任务</p>
          <Button type="primary" onClick={() => navigate('/login')}>
            立即登录
          </Button>
        </div>
      </Card>
    )
  }

  // 加载状态
  if (loading) {
    return (
      <Card className={`${styles.missionCard} ${compact ? styles.compact : ''}`}>
        <div className={styles.loadingContainer}>
          <Spin tip="加载任务中..." />
        </div>
      </Card>
    )
  }

  // 错误状态
  if (error) {
    return (
      <Card className={`${styles.missionCard} ${compact ? styles.compact : ''}`}>
        <Empty description={error}>
          <Button onClick={fetchMissions}>重试</Button>
        </Empty>
      </Card>
    )
  }

  // 无任务状态
  if (!missionData || missionData.missions.length === 0) {
    return (
      <Card className={`${styles.missionCard} ${compact ? styles.compact : ''}`}>
        <Empty 
          description="暂无学习任务" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/quiz')}>
            开始刷题
          </Button>
        </Empty>
      </Card>
    )
  }

  const displayMissions = missionData.missions.slice(0, maxItems)
  const progressPercent = Math.round((missionData.completedCount / missionData.totalCount) * 100)

  return (
    <Card 
      className={`${styles.missionCard} ${compact ? styles.compact : ''}`}
      title={
        <div className={styles.cardTitle}>
          <span>
            <FireOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            🎯 今日学习任务
          </span>
          <Tag color={missionData.bonusUnlocked ? 'gold' : 'default'}>
            {missionData.completedCount}/{missionData.totalCount}
          </Tag>
        </div>
      }
      extra={
        !compact && (
          <Tooltip title={getTimeRemaining()}>
            <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        )
      }
    >
      {/* 整体进度条 */}
      <div className={styles.overallProgress}>
        <Progress 
          percent={progressPercent} 
          size="small"
          status={missionData.bonusUnlocked ? 'success' : 'active'}
          format={() => missionData.bonusUnlocked ? '🎁 已解锁额外奖励' : `${progressPercent}%`}
        />
      </div>

      {/* 任务列表 */}
      <List
        className={styles.missionList}
        dataSource={displayMissions}
        renderItem={(mission) => (
          <List.Item 
            className={`${styles.missionItem} ${mission.completed ? styles.completed : ''}`}
            onClick={() => handleMissionClick(mission)}
          >
            <div className={styles.missionContent}>
              <div className={styles.missionHeader}>
                <Badge 
                  dot={!mission.completed} 
                  color={PRIORITY_COLORS[mission.priority]}
                >
                  <span className={styles.missionIcon}>
                    {MISSION_ICONS[mission.type] || <FireOutlined />}
                  </span>
                </Badge>
                <span className={styles.missionTitle}>
                  {mission.completed && <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />}
                  {mission.title}
                </span>
              </div>
              
              <div className={styles.missionReason}>
                {mission.reason}
              </div>

              <div className={styles.missionMeta}>
                <div className={styles.missionProgress}>
                  <Progress 
                    percent={Math.round((mission.progress.current / mission.progress.target) * 100)}
                    size="small"
                    showInfo={false}
                    status={mission.completed ? 'success' : 'active'}
                    strokeColor={mission.completed ? '#52c41a' : '#1890ff'}
                  />
                  <span className={styles.progressText}>
                    {mission.progress.current}/{mission.progress.target}{mission.progress.unit || ''}
                  </span>
                </div>

                <div className={styles.missionReward}>
                  <GiftOutlined style={{ marginRight: 4 }} />
                  +{mission.reward.points}积分
                  {mission.reward.leaderboardBoost && (
                    <Tooltip title="完成后提升排名">
                      <TrophyOutlined style={{ marginLeft: 4, color: '#faad14' }} />
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.missionAction}>
              {mission.completed ? (
                <Tag color="success">已完成</Tag>
              ) : (
                <Button 
                  type="link" 
                  size="small"
                  icon={<RightOutlined />}
                >
                  {mission.actionLabel}
                </Button>
              )}
            </div>
          </List.Item>
        )}
      />

      {/* 查看全部按钮（紧凑模式） */}
      {compact && missionData.missions.length > maxItems && (
        <div className={styles.viewAll}>
          <Button type="link" onClick={() => navigate('/learning')}>
            查看全部任务 ({missionData.missions.length})
          </Button>
        </div>
      )}

      {/* 额外奖励提示 */}
      {!missionData.bonusUnlocked && (
        <div className={styles.bonusTip}>
          <GiftOutlined style={{ marginRight: 4 }} />
          完成 3 个任务解锁额外奖励
        </div>
      )}

      {missionData.bonusUnlocked && (
        <div className={styles.bonusUnlocked}>
          <GiftOutlined style={{ marginRight: 4 }} />
          🎉 额外奖励已解锁！继续努力获得更多积分
        </div>
      )}
    </Card>
  )
}

export default DailyMissionComponent
