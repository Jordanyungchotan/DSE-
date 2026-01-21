import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  Table, 
  Tag, 
  Avatar, 
  Progress, 
  Button, 
  Spin, 
  Empty,
  message
} from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useLeaderboardStore } from '../stores/leaderboardStore'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import type { LeaderboardEntry } from '@/shared/domain'
import styles from './LeaderboardPage.module.css'

/**
 * 前三名领奖台组件（简化版，使用后端数据）
 */
const TopThreePodium: React.FC<{ rankings: LeaderboardEntry[], currentUserAvatar?: string }> = ({ rankings, currentUserAvatar }) => {
  const [first, second, third] = rankings

  if (!first) return null

  const renderPodiumUser = (user: LeaderboardEntry | undefined, position: 1 | 2 | 3) => {
    if (!user) return <div className={styles.emptyPodium}>-</div>

    const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
    const icons = { 1: '👑', 2: '🥈', 3: '🥉' }
    const heights = { 1: 120, 2: 90, 3: 70 }

    // 如果是当前用户，使用 auth store 中的头像
    const avatarSrc = user.isCurrentUser && currentUserAvatar ? currentUserAvatar : user.avatarUrl

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
          <span className={styles.scoreValue}>{user.score}</span>
          <span className={styles.scoreLabel}>积分</span>
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
  userRank: LeaderboardEntry | null
  totalParticipants: number
}> = ({ userRank, totalParticipants }) => {
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

  if (!userRank) {
    return (
      <Card className={styles.userRankCard}>
        <div className={styles.noRank}>
          <TrophyOutlined className={styles.noRankIcon} />
          <p>{t('leaderboard.notRanked')}</p>
          <p className={styles.noRankHint}>{t('leaderboard.completeToJoin')}</p>
          <Button type="primary" onClick={() => navigate('/points')}>
            🚀 开始获取积分
          </Button>
        </div>
      </Card>
    )
  }

  const progressPercentage = userRank.rank 
    ? ((totalParticipants - userRank.rank) / totalParticipants) * 100 
    : 0

  return (
    <Card className={styles.userRankCard}>
      <div className={styles.cardHeader}>
        <h3><TrophyOutlined /> 我的排名</h3>
      </div>

      <div className={styles.rankDisplay}>
        <div className={styles.rankNumber}>
          <span className={styles.rank}>#{userRank.rank || '-'}</span>
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
          <span>第{userRank.rank}名</span>
          <span>前{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      <div className={styles.scoreDetails}>
        <div className={styles.scoreItem}>
          <span className={styles.label}>总积分</span>
          <span className={styles.value}>{userRank.score}</span>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <Button type="primary" onClick={() => navigate('/points')}>
          🏆 查看积分
        </Button>
      </div>
    </Card>
  )
}

/**
 * 积分排行榜页面（简化版，直接使用后端数据）
 */
const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const { 
    leaderboardData, 
    currentUserRank,
    loading, 
    error,
    fetchLeaderboard, 
  } = useLeaderboardStore()
  
  // 获取当前用户信息
  const { user: currentUser } = useAuthStore()

  // 初始加载
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // 表格列定义（简化版，只显示后端返回的数据）
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
      render: (name: string, record: LeaderboardEntry) => {
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
      title: '积分',
      dataIndex: 'score',
      key: 'score',
      width: 120,
      render: (score: number) => (
        <span className={styles.scoreCell}>
          <FireOutlined style={{ color: '#fa8c16' }} /> {score}
        </span>
      )
    },
  ]

  const handleRefresh = () => {
    fetchLeaderboard()
    message.success('排行榜已刷新')
  }

  return (
    <div className={styles.leaderboardPage}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1><TrophyOutlined /> {t('leaderboard.title')}</h1>
            <p>积分排行榜</p>
          </div>
          <div className={styles.headerRight}>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
            <Button type="primary" onClick={() => navigate('/points')}>
              <ThunderboltOutlined /> 获取积分
            </Button>
          </div>
        </div>
      </div>

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
          ) : !leaderboardData || leaderboardData.rankings.length === 0 ? (
            <div className={styles.emptyContainer}>
              <Empty 
                description="暂无排行数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <p>{t('leaderboard.beFirstToRank')}</p>
              <Button type="primary" onClick={() => navigate('/points')}>
                开始获取积分
              </Button>
            </div>
          ) : (
            <>
              {/* 前三名领奖台 */}
              <TopThreePodium 
                rankings={leaderboardData.rankings.slice(0, 3)} 
                currentUserAvatar={currentUser?.avatar}
              />

              {/* 排行榜表格 */}
              <Card className={styles.rankingTable}>
                <Table
                  dataSource={leaderboardData.rankings}
                  columns={columns}
                  rowKey="userId"
                  pagination={{
                    total: leaderboardData.totalParticipants,
                    pageSize: 50,
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 名参与者`
                  }}
                  rowClassName={(record) => record.isCurrentUser ? styles.currentUserRow : ''}
                  scroll={{ x: 400 }}
                />
              </Card>
            </>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className={styles.sidebar}>
          {/* 用户排名卡片 */}
          <UserRankCard 
            userRank={currentUserRank}
            totalParticipants={leaderboardData?.totalParticipants || 0}
          />

          {/* 排行榜统计 */}
          {leaderboardData && leaderboardData.rankings.length > 0 && (
            <Card className={styles.statsCard} title="📊 排行榜统计">
              <div className={styles.statItem}>
                <span>总参与人数</span>
                <span>{leaderboardData.totalParticipants}</span>
              </div>
              <div className={styles.statItem}>
                <span>最高积分</span>
                <span>{leaderboardData.rankings[0]?.score || 0}</span>
              </div>
              <div className={styles.statItem}>
                <span>最后更新</span>
                <span>{new Date(leaderboardData.lastUpdated).toLocaleString()}</span>
              </div>
            </Card>
          )}

          {/* 提示信息 */}
          <Card className={styles.tipsCard} title="💡 小提示">
            <ul>
              <li>完成每日任务获取积分</li>
              <li>做题、分析都可以获得积分</li>
              <li>积分越高，排名越靠前</li>
              <li>排名支持并列（同分同名次）</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* 防作弊声明 */}
      <div className={styles.antiCheatNotice}>
        <p>
          🛡️ 本排行榜基于积分系统计算，确保公平公正。
        </p>
      </div>
    </div>
  )
}

export default LeaderboardPage
