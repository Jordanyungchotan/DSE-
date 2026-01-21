import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  Table, 
  Select,
  Tag, 
  Avatar, 
  Progress, 
  Button, 
  Spin, 
  Empty,
  message,
  Segmented,
  Space,
} from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  AimOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { 
  useLeaderboardStore,
  METRIC_OPTIONS,
  RANGE_OPTIONS,
  SUBJECT_OPTIONS,
  LearningLeaderboardEntry,
} from '../stores/leaderboardStore'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './LeaderboardPage.module.css'

/**
 * 前三名领奖台组件
 */
const TopThreePodium: React.FC<{ 
  entries: LearningLeaderboardEntry[]
  currentUserAvatar?: string
  metric: string
}> = ({ entries, currentUserAvatar, metric }) => {
  const [first, second, third] = entries

  if (!first) return null

  const renderPodiumUser = (user: LearningLeaderboardEntry | undefined, position: 1 | 2 | 3) => {
    if (!user) return <div className={styles.emptyPodium}>-</div>

    const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
    const icons = { 1: '👑', 2: '🥈', 3: '🥉' }
    const heights = { 1: 120, 2: 90, 3: 70 }

    const avatarSrc = user.isCurrentUser && currentUserAvatar ? currentUserAvatar : user.avatarUrl

    // 根据指标显示不同的数值
    const getMetricValue = () => {
      switch (metric) {
        case 'ACCURACY':
          return `${user.accuracy?.toFixed(1) || 0}%`
        case 'SPEED':
          return `${user.avgTime?.toFixed(1) || 0}s`
        case 'QUIZ_COUNT':
        default:
          return `${user.quizCount}次`
      }
    }

    return (
      <div className={styles.podiumUser}>
        <div className={styles.podiumAvatar}>
          <Avatar 
            key={avatarSrc || 'default'}
            size={position === 1 ? 80 : 64} 
            icon={<UserOutlined />}
            src={avatarSrc}
            style={{ border: `3px solid ${colors[position]}` }}
          />
          <span className={styles.podiumCrown}>{icons[position]}</span>
        </div>
        <div className={styles.podiumName}>{user.name}</div>
        <div className={styles.podiumScore}>
          <span className={styles.scoreValue}>{getMetricValue()}</span>
        </div>
        <div className={styles.podiumStats}>
          <span>刷题 {user.quizCount} 次</span>
          {user.accuracy !== undefined && (
            <>
              <span>·</span>
              <span>正确率 {user.accuracy.toFixed(1)}%</span>
            </>
          )}
        </div>
        <div 
          className={styles.podiumBase} 
          style={{ height: heights[position], backgroundColor: colors[position] }}
        >
          <span className={styles.podiumRank}>{position}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.podiumContainer}>
      {renderPodiumUser(second, 2)}
      {renderPodiumUser(first, 1)}
      {renderPodiumUser(third, 3)}
    </div>
  )
}

/**
 * 用户排名卡片组件
 */
const UserRankCard: React.FC<{ 
  myRank: LearningLeaderboardEntry | undefined
  totalParticipants: number
  userStats: {
    totalQuizzes?: number
    averageAccuracy?: number
    currentStreak?: number
  } | null
}> = ({ myRank, totalParticipants, userStats }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { t } = useLanguageStore()

  if (!isAuthenticated) {
    return (
      <Card className={styles.userRankCard}>
        <div className={styles.noRank}>
          <UserOutlined className={styles.noRankIcon} />
          <p>{t('auth.loginToViewRank')}</p>
          <Button type="primary" onClick={() => navigate('/login')}>
            {t('auth.login')}
          </Button>
        </div>
      </Card>
    )
  }

  if (!myRank) {
    return (
      <Card className={styles.userRankCard}>
        <div className={styles.noRank}>
          <TrophyOutlined className={styles.noRankIcon} />
          <p>暂无排名</p>
          <p className={styles.noRankHint}>完成刷题后即可上榜</p>
          <Button type="primary" onClick={() => navigate('/quiz')}>
            🚀 开始刷题
          </Button>
        </div>
      </Card>
    )
  }

  const progressPercentage = myRank.rank 
    ? ((totalParticipants - myRank.rank) / totalParticipants) * 100 
    : 0

  return (
    <Card className={styles.userRankCard}>
      <div className={styles.cardHeader}>
        <h3><TrophyOutlined /> 我的排名</h3>
      </div>

      <div className={styles.rankDisplay}>
        <div className={styles.rankNumber}>
          <span className={styles.rank}>#{myRank.rank || '-'}</span>
          <span className={styles.total}>/ {totalParticipants}</span>
        </div>
      </div>

      <div className={styles.progressSection}>
        <Progress 
          percent={progressPercentage} 
          showInfo={false}
          strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
        />
        <div className={styles.progressLabels}>
          <span>第{myRank.rank}名</span>
          <span>前{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      <div className={styles.scoreDetails}>
        <div className={styles.scoreItem}>
          <span className={styles.label}>刷题数</span>
          <span className={styles.value}>{myRank.quizCount}</span>
        </div>
        {myRank.accuracy !== undefined && (
          <div className={styles.scoreItem}>
            <span className={styles.label}>正确率</span>
            <span className={styles.value}>{myRank.accuracy.toFixed(1)}%</span>
          </div>
        )}
        {userStats?.currentStreak !== undefined && (
          <div className={styles.scoreItem}>
            <span className={styles.label}>连续天数</span>
            <span className={styles.value}>{userStats.currentStreak}天</span>
          </div>
        )}
      </div>

      <div className={styles.actionButtons}>
        <Button type="primary" onClick={() => navigate('/quiz')}>
          🏆 继续刷题
        </Button>
      </div>
    </Card>
  )
}

/**
 * 学习排行榜页面
 */
const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { 
    leaderboardData, 
    userStats,
    filters,
    loading, 
    error,
    fetchLeaderboard,
    fetchUserStats,
    updateFilters,
  } = useLeaderboardStore()
  
  const { user: currentUser, isAuthenticated } = useAuthStore()

  // 初始加载
  useEffect(() => {
    fetchLeaderboard()
    if (isAuthenticated) {
      fetchUserStats()
    }
  }, [fetchLeaderboard, fetchUserStats, isAuthenticated])

  // 获取指标图标
  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'ACCURACY':
        return <AimOutlined style={{ color: '#52c41a' }} />
      case 'SPEED':
        return <ThunderboltOutlined style={{ color: '#faad14' }} />
      case 'QUIZ_COUNT':
      default:
        return <FireOutlined style={{ color: '#ff7a45' }} />
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <div className={styles.rankCell}>
          {rank <= 3 ? (
            <span className={`${styles.topRank} ${styles[`rank${rank}`]}`}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          ) : (
            <span className={styles.normalRank}>{rank}</span>
          )}
        </div>
      )
    },
    {
      title: '用户',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: LearningLeaderboardEntry) => {
        const avatarSrc = record.isCurrentUser && currentUser?.avatar ? currentUser.avatar : record.avatarUrl
        return (
          <div className={`${styles.userCell} ${record.isCurrentUser ? styles.currentUser : ''}`}>
            <Avatar key={avatarSrc || 'default'} size={36} icon={<UserOutlined />} src={avatarSrc} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {name}
                {record.isCurrentUser && <Tag color="blue" className={styles.meTag}>我</Tag>}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      title: '刷题数',
      dataIndex: 'quizCount',
      key: 'quizCount',
      width: 100,
      render: (count: number) => (
        <span className={styles.scoreCell}>
          <FireOutlined style={{ color: '#ff7a45' }} /> {count}
        </span>
      )
    },
    {
      title: '正确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 100,
      render: (accuracy: number | undefined) => (
        accuracy !== undefined ? (
          <span className={styles.scoreCell}>
            <AimOutlined style={{ color: '#52c41a' }} /> {accuracy.toFixed(1)}%
          </span>
        ) : '-'
      )
    },
    {
      title: '平均用时',
      dataIndex: 'avgTime',
      key: 'avgTime',
      width: 100,
      render: (avgTime: number | undefined) => (
        avgTime !== undefined ? (
          <span className={styles.scoreCell}>
            <ClockCircleOutlined style={{ color: '#1890ff' }} /> {avgTime.toFixed(1)}s
          </span>
        ) : '-'
      )
    },
  ]

  const handleRefresh = () => {
    fetchLeaderboard()
    message.success('排行榜已刷新')
  }

  // 获取当前指标的标签
  const currentMetricLabel = METRIC_OPTIONS.find(m => m.id === filters.metric)?.label || '刷题数量'
  const currentRangeLabel = RANGE_OPTIONS.find(r => r.id === filters.range)?.label || '总榜'

  return (
    <div className={styles.leaderboardPage}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1><TrophyOutlined /> 学习排行榜</h1>
            <p>{currentMetricLabel} · {currentRangeLabel}</p>
          </div>
          <div className={styles.headerRight}>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
            <Button type="primary" onClick={() => navigate('/quiz')}>
              <ThunderboltOutlined /> 开始刷题
            </Button>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <Card className={styles.filterCard}>
        <Space wrap size="middle">
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>排行维度：</span>
            <Segmented
              value={filters.metric}
              onChange={(value) => updateFilters({ metric: value as typeof filters.metric })}
              options={METRIC_OPTIONS.map(opt => ({
                value: opt.id,
                label: (
                  <span>
                    {opt.icon} {opt.label}
                  </span>
                ),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>时间范围：</span>
            <Segmented
              value={filters.range}
              onChange={(value) => updateFilters({ range: value as typeof filters.range })}
              options={RANGE_OPTIONS.map(opt => ({
                value: opt.id,
                label: (
                  <span>
                    {opt.icon} {opt.label}
                  </span>
                ),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>科目：</span>
            <Select
              value={filters.subject}
              onChange={(value) => updateFilters({ subject: value })}
              style={{ width: 120 }}
              options={SUBJECT_OPTIONS.map(opt => ({
                value: opt.id,
                label: opt.label,
              }))}
            />
          </div>
        </Space>
      </Card>

      {/* 主内容区 */}
      <div className={styles.mainContent}>
        {/* 左侧排行榜 */}
        <div className={styles.rankingSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Spin size="large" tip="加载排行榜中..." />
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <Empty description={error} />
              <Button onClick={handleRefresh}>重试</Button>
            </div>
          ) : !leaderboardData || leaderboardData.entries.length === 0 ? (
            <div className={styles.emptyContainer}>
              <Empty 
                description="暂无排行数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <p>成为第一个上榜的人！</p>
              <Button type="primary" onClick={() => navigate('/quiz')}>
                开始刷题
              </Button>
            </div>
          ) : (
            <>
              {/* 前三名领奖台 */}
              <TopThreePodium 
                entries={leaderboardData.entries.slice(0, 3)} 
                currentUserAvatar={currentUser?.avatar}
                metric={filters.metric}
              />

              {/* 排行榜表格 */}
              <Card className={styles.rankingTable}>
                <Table
                  dataSource={leaderboardData.entries}
                  columns={columns}
                  rowKey="userId"
                  pagination={{
                    total: leaderboardData.totalParticipants,
                    pageSize: 50,
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 名参与者`
                  }}
                  rowClassName={(record) => record.isCurrentUser ? styles.currentUserRow : ''}
                  scroll={{ x: 600 }}
                />
              </Card>
            </>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className={styles.sidebar}>
          {/* 用户排名卡片 */}
          <UserRankCard 
            myRank={leaderboardData?.myRank}
            totalParticipants={leaderboardData?.totalParticipants || 0}
            userStats={userStats}
          />

          {/* 排行榜统计 */}
          {leaderboardData && leaderboardData.entries.length > 0 && (
            <Card className={styles.statsCard} title={<span>{getMetricIcon(filters.metric)} 榜单统计</span>}>
              <div className={styles.statItem}>
                <span>总参与人数</span>
                <span>{leaderboardData.totalParticipants}</span>
              </div>
              <div className={styles.statItem}>
                <span>第一名 {currentMetricLabel}</span>
                <span>
                  {filters.metric === 'ACCURACY' && `${leaderboardData.entries[0]?.accuracy?.toFixed(1) || 0}%`}
                  {filters.metric === 'SPEED' && `${leaderboardData.entries[0]?.avgTime?.toFixed(1) || 0}s`}
                  {filters.metric === 'QUIZ_COUNT' && `${leaderboardData.entries[0]?.quizCount || 0}次`}
                </span>
              </div>
              <div className={styles.statItem}>
                <span>最后更新</span>
                <span>{new Date(leaderboardData.lastUpdated).toLocaleString()}</span>
              </div>
            </Card>
          )}

          {/* 提示信息 */}
          <Card className={styles.tipsCard} title="💡 上榜技巧">
            <ul>
              <li>每天坚持刷题，提升排名</li>
              <li>注重正确率，质量优先</li>
              <li>适当提速，但保证准确</li>
              <li>排名支持并列（同分同名次）</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* 说明 */}
      <div className={styles.antiCheatNotice}>
        <p>
          🎯 本排行榜基于真实学习行为计算，鼓励持续学习进步。
        </p>
      </div>
    </div>
  )
}

export default LeaderboardPage
