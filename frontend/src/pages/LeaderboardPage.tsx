import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  Table, 
  Select, 
  Tabs, 
  Tag, 
  Avatar, 
  Progress, 
  Button, 
  Spin, 
  Empty,
  Tooltip,
  message
} from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  UserOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { 
  useLeaderboardStore, 
  TIME_RANGE_OPTIONS, 
  SPEED_CATEGORIES,
  RankingEntry,
  LeaderboardType
} from '../stores/leaderboardStore'
import { SUPPORTED_SUBJECTS, GRADE_LEVELS, DIFFICULTY_LEVELS } from '../stores/quizStore'
import { useAuthStore } from '../stores/authStore'
import styles from './LeaderboardPage.module.css'

const { Option } = Select
const { TabPane } = Tabs

/**
 * 前三名领奖台组件
 */
const TopThreePodium: React.FC<{ rankings: RankingEntry[] }> = ({ rankings }) => {
  const [first, second, third] = rankings

  if (!first) return null

  const renderPodiumUser = (user: RankingEntry | undefined, position: 1 | 2 | 3) => {
    if (!user) return <div className={styles.emptyPodium}>-</div>

    const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
    const icons = { 1: '👑', 2: '🥈', 3: '🥉' }
    const heights = { 1: 120, 2: 90, 3: 70 }

    return (
      <div className={styles.podiumUser}>
        <div className={styles.podiumAvatar}>
          <Avatar 
            size={position === 1 ? 80 : 64} 
            icon={<UserOutlined />}
            src={user.avatar}
            style={{ border: `3px solid ${colors[position]}` }}
          />
          <span className={styles.podiumCrown}>{icons[position]}</span>
        </div>
        <div className={styles.podiumName}>{user.displayName}</div>
        <div className={styles.podiumScore}>
          <span className={styles.scoreValue}>{user.totalScore}</span>
          <span className={styles.scoreLabel}>分</span>
        </div>
        <div className={styles.podiumStats}>
          <span>正确率 {user.accuracy}%</span>
          <span>·</span>
          <span>{user.avgTimePerQuestion}s/题</span>
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
  userRank: RankingEntry | null
  userPosition?: number
  totalParticipants: number
}> = ({ userRank, userPosition, totalParticipants }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <Card className={styles.userRankCard}>
        <div className={styles.noRank}>
          <UserOutlined className={styles.noRankIcon} />
          <p>登录后查看你的排名</p>
          <Button type="primary" onClick={() => navigate('/login')}>
            立即登录
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
          <p>你还没有上榜记录</p>
          <p className={styles.noRankHint}>完成一次刷题即可加入排名</p>
          <Button type="primary" onClick={() => navigate('/quiz')}>
            🚀 开始刷题
          </Button>
        </div>
      </Card>
    )
  }

  const progressPercentage = userPosition 
    ? ((totalParticipants - userPosition) / totalParticipants) * 100 
    : 0

  const getRankChangeIcon = (change?: number) => {
    if (!change || change === 0) return <MinusOutlined style={{ color: '#999' }} />
    if (change > 0) return <RiseOutlined style={{ color: '#52c41a' }} />
    return <FallOutlined style={{ color: '#f5222d' }} />
  }

  return (
    <Card className={styles.userRankCard}>
      <div className={styles.cardHeader}>
        <h3><TrophyOutlined /> 我的排名</h3>
        <Button type="text" icon={<ShareAltOutlined />} onClick={() => message.info('分享功能开发中')}>
          分享
        </Button>
      </div>

      <div className={styles.rankDisplay}>
        <div className={styles.rankNumber}>
          <span className={styles.rank}>#{userPosition || '-'}</span>
          <span className={styles.total}>/ {totalParticipants}</span>
        </div>
        {userRank.rankChange !== undefined && (
          <div className={`${styles.rankChange} ${userRank.rankChange > 0 ? styles.up : userRank.rankChange < 0 ? styles.down : ''}`}>
            {getRankChangeIcon(userRank.rankChange)}
            <span>{Math.abs(userRank.rankChange || 0)}</span>
          </div>
        )}
      </div>

      <div className={styles.progressSection}>
        <Progress 
          percent={progressPercentage} 
          showInfo={false}
          strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
        />
        <div className={styles.progressLabels}>
          <span>第{userPosition}名</span>
          <span>前{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      <div className={styles.scoreDetails}>
        <div className={styles.scoreItem}>
          <span className={styles.label}>总分</span>
          <span className={styles.value}>{userRank.totalScore}</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>正确率</span>
          <span className={styles.value}>{userRank.accuracy}%</span>
        </div>
        <div className={styles.scoreItem}>
          <span className={styles.label}>平均用时</span>
          <span className={styles.value}>{userRank.avgTimePerQuestion}s</span>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <Button type="primary" onClick={() => navigate('/quiz')}>
          🥊 继续挑战
        </Button>
      </div>
    </Card>
  )
}

/**
 * 排行榜页面
 */
const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { 
    currentLeaderboard, 
    userRank,
    filters, 
    loading, 
    error,
    fetchLeaderboard, 
    updateFilters 
  } = useLeaderboardStore()
  
  const [activeTab, setActiveTab] = useState<'overall' | 'subject' | 'speed'>('overall')

  // Tab到criteria的映射
  const tabToCriteria = (tab: typeof activeTab): 'composite' | 'accuracy' | 'speed' | 'subject' => {
    switch (tab) {
      case 'overall': return 'composite'  // 综合榜 - 按综合得分排序
      case 'subject': return 'subject'     // 科目榜 - 按科目表现排序
      case 'speed': return 'speed'         // 速度榜 - 按答题速度排序
      default: return 'composite'
    }
  }

  // 初始加载
  useEffect(() => {
    fetchLeaderboard({ criteria: tabToCriteria(activeTab) })
  }, [])

  // Tab变化时更新criteria并重新加载
  useEffect(() => {
    const criteria = tabToCriteria(activeTab)
    updateFilters({ criteria })
    fetchLeaderboard({ criteria })
  }, [activeTab])

  // 筛选变化时重新加载
  useEffect(() => {
    fetchLeaderboard({ criteria: tabToCriteria(activeTab) })
  }, [filters.type, filters.grade, filters.difficulty, filters.subject])

  // 获取所有科目
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES
  ]

  // 表格列定义
  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number, record: RankingEntry) => (
        <div className={styles.rankCell}>
          {rank <= 3 ? (
            <span className={`${styles.topRank} ${styles[`rank${rank}`]}`}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </span>
          ) : (
            <span className={styles.normalRank}>{rank}</span>
          )}
          {record.rankChange !== undefined && record.rankChange !== 0 && (
            <Tooltip title={`${record.rankChange > 0 ? '上升' : '下降'} ${Math.abs(record.rankChange)} 名`}>
              <span className={`${styles.changeIndicator} ${record.rankChange > 0 ? styles.up : styles.down}`}>
                {record.rankChange > 0 ? <RiseOutlined /> : <FallOutlined />}
              </span>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: '用户',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: RankingEntry) => (
        <div className={`${styles.userCell} ${record.isCurrentUser ? styles.currentUser : ''}`}>
          <Avatar size={36} icon={<UserOutlined />} src={record.avatar} />
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {record.isAnonymous ? '匿名用户' : name}
              {record.isCurrentUser && <Tag color="blue" className={styles.meTag}>我</Tag>}
            </span>
            {record.grade && (
              <span className={styles.userGrade}>
                {GRADE_LEVELS.find(g => g.id === record.grade)?.name || record.grade}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      title: (
        <Tooltip title="综合评分 = 正确率(40%) + 速度(20%) + 难度加成(20%) + 稳定性(10%) + 活跃度(10%)">
          总分 <QuestionCircleOutlined />
        </Tooltip>
      ),
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
      sorter: (a: RankingEntry, b: RankingEntry) => b.totalScore - a.totalScore,
      render: (score: number) => (
        <span className={styles.scoreCell}>
          <FireOutlined style={{ color: '#fa8c16' }} /> {score}
        </span>
      )
    },
    {
      title: '正确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 100,
      sorter: (a: RankingEntry, b: RankingEntry) => b.accuracy - a.accuracy,
      render: (accuracy: number) => (
        <Progress 
          percent={accuracy} 
          size="small" 
          format={p => `${p}%`}
          strokeColor={accuracy >= 80 ? '#52c41a' : accuracy >= 60 ? '#1890ff' : '#faad14'}
        />
      )
    },
    {
      title: '平均用时',
      dataIndex: 'avgTimePerQuestion',
      key: 'avgTimePerQuestion',
      width: 100,
      sorter: (a: RankingEntry, b: RankingEntry) => a.avgTimePerQuestion - b.avgTimePerQuestion,
      render: (time: number) => {
        const category = time <= 15 ? 'lightning' : time <= 30 ? 'fast' : time <= 60 ? 'average' : 'careful'
        const config = SPEED_CATEGORIES[category]
        return (
          <Tooltip title={config.description}>
            <span className={styles.speedCell}>
              <span>{config.icon}</span>
              <span>{time}s</span>
            </span>
          </Tooltip>
        )
      }
    },
    {
      title: '完成题数',
      dataIndex: 'totalQuestions',
      key: 'totalQuestions',
      width: 100,
      sorter: (a: RankingEntry, b: RankingEntry) => b.totalQuestions - a.totalQuestions,
      render: (count: number) => `${count} 题`
    }
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
            <h1><TrophyOutlined /> DSE刷题排行榜</h1>
            <p>与全港DSE学生一较高下，挑战自我极限！</p>
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
      <div className={styles.filterBar}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          className={styles.tabSelector}
        >
          <TabPane tab={<span>🏆 综合榜</span>} key="overall" />
          <TabPane tab={<span>📚 科目榜</span>} key="subject" />
          <TabPane tab={<span>⚡ 速度榜</span>} key="speed" />
        </Tabs>

        <div className={styles.filters}>
          {/* 时间范围 */}
          <Select
            value={filters.type}
            onChange={(value: LeaderboardType) => updateFilters({ type: value })}
            className={styles.filterSelect}
          >
            {TIME_RANGE_OPTIONS.map(opt => (
              <Option key={opt.id} value={opt.id}>
                {opt.icon} {opt.label}
              </Option>
            ))}
          </Select>

          {/* 年级筛选 */}
          <Select
            value={filters.grade}
            onChange={(value) => updateFilters({ grade: value })}
            className={styles.filterSelect}
            placeholder="选择年级"
          >
            <Option value="all">全部年级</Option>
            {GRADE_LEVELS.map(grade => (
              <Option key={grade.id} value={grade.id}>{grade.name}</Option>
            ))}
          </Select>

          {/* 难度筛选 */}
          <Select
            value={filters.difficulty}
            onChange={(value) => updateFilters({ difficulty: value })}
            className={styles.filterSelect}
            placeholder="选择难度"
          >
            <Option value="all">全部难度</Option>
            {DIFFICULTY_LEVELS.map(diff => (
              <Option key={diff.id} value={diff.id}>{diff.name}</Option>
            ))}
          </Select>

          {/* 科目筛选（仅科目榜显示） */}
          {activeTab === 'subject' && (
            <Select
              value={filters.subject}
              onChange={(value) => updateFilters({ subject: value })}
              className={styles.filterSelect}
              placeholder="选择科目"
            >
              <Option value="all">全部科目</Option>
              {allSubjects.map(sub => (
                <Option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</Option>
              ))}
            </Select>
          )}
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
          ) : !currentLeaderboard || currentLeaderboard.rankings.length === 0 ? (
            <div className={styles.emptyContainer}>
              <Empty 
                description="暂无排行数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <p>成为第一个上榜的用户吧！</p>
              <Button type="primary" onClick={() => navigate('/quiz')}>
                开始刷题
              </Button>
            </div>
          ) : (
            <>
              {/* 前三名领奖台 */}
              <TopThreePodium rankings={currentLeaderboard.rankings.slice(0, 3)} />

              {/* 排行榜表格 */}
              <Card className={styles.rankingTable}>
                <Table
                  dataSource={currentLeaderboard.rankings}
                  columns={columns}
                  rowKey="userId"
                  pagination={{
                    current: currentLeaderboard.pagination.currentPage,
                    total: currentLeaderboard.pagination.totalItems,
                    pageSize: currentLeaderboard.pagination.pageSize,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 名参与者`
                  }}
                  rowClassName={(record) => record.isCurrentUser ? styles.currentUserRow : ''}
                  scroll={{ x: 700 }}
                />
              </Card>
            </>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className={styles.sidebar}>
          {/* 用户排名卡片 */}
          <UserRankCard 
            userRank={userRank}
            userPosition={currentLeaderboard?.userPosition}
            totalParticipants={currentLeaderboard?.totalParticipants || 0}
          />

          {/* 排行榜统计 */}
          {currentLeaderboard?.statistics && (
            <Card className={styles.statsCard} title="📊 排行榜统计">
              <div className={styles.statItem}>
                <span>平均分</span>
                <span>{currentLeaderboard.statistics.averageScore}</span>
              </div>
              <div className={styles.statItem}>
                <span>中位数</span>
                <span>{currentLeaderboard.statistics.medianScore}</span>
              </div>
              <div className={styles.statItem}>
                <span>前10平均</span>
                <span>{currentLeaderboard.statistics.top10Average.toFixed(1)}</span>
              </div>
              <div className={styles.statItem}>
                <span>总参与人数</span>
                <span>{currentLeaderboard.totalParticipants}</span>
              </div>
            </Card>
          )}

          {/* 提示信息 */}
          <Card className={styles.tipsCard} title="💡 小提示">
            <ul>
              <li>排行榜每日凌晨2点更新</li>
              <li>连续7天登录可获得活跃度加成</li>
              <li>挑战更高难度可获得额外加分</li>
              <li>保持稳定发挥可获得稳定性加成</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* 防作弊声明 */}
      <div className={styles.antiCheatNotice}>
        <p>
          🛡️ 本排行榜采用多维度防作弊检测系统，确保公平公正。
          如发现作弊行为，将取消排名资格。
        </p>
      </div>
    </div>
  )
}

export default LeaderboardPage

