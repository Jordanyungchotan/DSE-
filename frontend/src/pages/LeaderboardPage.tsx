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
  Tooltip,
  Badge,
  Typography,
} from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  AimOutlined,
  UserOutlined,
  ReloadOutlined,
  CrownOutlined,
  RiseOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { 
  useLeaderboardStore,
  METRIC_OPTIONS,
  RANGE_OPTIONS,
  SUBJECT_OPTIONS,
  INCENTIVE_TYPE_OPTIONS,
  LearningLeaderboardEntry,
  IncentiveLeaderboardEntry,
  MyRankInfo,
} from '../stores/leaderboardStore'
import { useAuthStore } from '../stores/authStore'
import styles from './LeaderboardPage.module.css'

const { Text } = Typography

/**
 * 学习排行榜前三名领奖台
 */
const LearningPodium: React.FC<{ 
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
 * 激励排行榜前三名领奖台
 */
const IncentivePodium: React.FC<{ 
  entries: IncentiveLeaderboardEntry[]
  currentUserAvatar?: string
  type: string
}> = ({ entries, currentUserAvatar, type }) => {
  const [first, second, third] = entries

  if (!first) return null

  const renderPodiumUser = (user: IncentiveLeaderboardEntry | undefined, position: 1 | 2 | 3) => {
    if (!user) return <div className={styles.emptyPodium}>-</div>

    const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
    const icons = { 1: '👑', 2: '🥈', 3: '🥉' }
    const heights = { 1: 120, 2: 90, 3: 70 }

    const avatarSrc = user.isCurrentUser && currentUserAvatar ? currentUserAvatar : user.avatarUrl

    return (
      <div className={styles.podiumUser}>
        <div className={styles.podiumAvatar}>
          <Badge count={user.isTopRanker ? <CrownOutlined style={{ color: '#faad14' }} /> : 0}>
            <Avatar 
              key={avatarSrc || 'default'}
              size={position === 1 ? 80 : 64} 
              icon={<UserOutlined />}
              src={avatarSrc}
              style={{ border: `3px solid ${colors[position]}` }}
            />
          </Badge>
          <span className={styles.podiumCrown}>{icons[position]}</span>
        </div>
        <div className={styles.podiumName}>{user.name}</div>
        <div className={styles.podiumScore}>
          <span className={styles.scoreValue}>
            {type === 'POINTS_WEEKLY' ? user.weeklyPoints : user.totalPoints} 积分
          </span>
        </div>
        {user.privileges && user.privileges.length > 0 && (
          <div className={styles.podiumPrivileges}>
            <Tag color="gold" icon={<StarOutlined />}>
              {user.privileges[0]}
            </Tag>
          </div>
        )}
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
 * 我的排名卡片（学习排行榜）
 */
const LearningMyRankCard: React.FC<{ 
  myRank: MyRankInfo | undefined
  totalParticipants: number
}> = ({ myRank, totalParticipants }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <Card className={styles.userRankCard}>
        <div className={styles.noRank}>
          <UserOutlined className={styles.noRankIcon} />
          <p>登录后查看排名</p>
          <Button type="primary" onClick={() => navigate('/login')}>
            登录
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

  const progressPercentage = myRank.percentile || 0

  return (
    <Card className={styles.userRankCard}>
      <div className={styles.cardHeader}>
        <h3><TrophyOutlined /> 我的排名</h3>
        <Tag color="blue">前 {myRank.percentile}%</Tag>
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
          <span>前{progressPercentage}%</span>
        </div>
      </div>

      {/* 与前一名的差距 */}
      {myRank.gapToNext && (
        <div className={styles.gapInfo}>
          <RiseOutlined style={{ color: '#faad14' }} />
          <Text type="secondary">
            距离前一名还差 <Text strong>{myRank.gapToNext.value}</Text> {myRank.gapToNext.metric}
          </Text>
        </div>
      )}

      {/* 优势和劣势分析 */}
      <div className={styles.analysisSection}>
        {myRank.strengths.length > 0 && (
          <div className={styles.strengthsList}>
            <Text type="success" strong>💪 优势：</Text>
            {myRank.strengths.map((s, i) => (
              <Tag key={i} color="green">{s}</Tag>
            ))}
          </div>
        )}
        {myRank.weaknesses.length > 0 && (
          <div className={styles.weaknessesList}>
            <Text type="warning" strong>📈 待提升：</Text>
            {myRank.weaknesses.map((w, i) => (
              <Tag key={i} color="orange">{w}</Tag>
            ))}
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
    leaderboardCategory,
    learningData, 
    incentiveData,
    learningFilters,
    incentiveFilters,
    loading, 
    error,
    setLeaderboardCategory,
    fetchLearningLeaderboard,
    fetchIncentiveLeaderboard,
    fetchUserStats,
    updateLearningFilters,
    updateIncentiveFilters,
  } = useLeaderboardStore()
  
  const { user: currentUser, isAuthenticated } = useAuthStore()

  // 初始加载
  useEffect(() => {
    if (leaderboardCategory === 'learning') {
      fetchLearningLeaderboard()
    } else {
      fetchIncentiveLeaderboard()
    }
    if (isAuthenticated) {
      fetchUserStats()
    }
  }, [])

  const handleRefresh = () => {
    if (leaderboardCategory === 'learning') {
      fetchLearningLeaderboard()
    } else {
      fetchIncentiveLeaderboard()
    }
    message.success('排行榜已刷新')
  }

  // 学习排行榜表格列
  const learningColumns = [
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

  // 激励排行榜表格列
  const incentiveColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number, record: IncentiveLeaderboardEntry) => (
        <div className={styles.rankCell}>
          {rank <= 3 ? (
            <Badge count={record.isTopRanker ? <CrownOutlined style={{ color: '#faad14', fontSize: 10 }} /> : 0}>
              <span className={`${styles.topRank} ${styles[`rank${rank}`]}`}>
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
              </span>
            </Badge>
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
      render: (name: string, record: IncentiveLeaderboardEntry) => {
        const avatarSrc = record.isCurrentUser && currentUser?.avatar ? currentUser.avatar : record.avatarUrl
        return (
          <div className={`${styles.userCell} ${record.isCurrentUser ? styles.currentUser : ''}`}>
            <Avatar key={avatarSrc || 'default'} size={36} icon={<UserOutlined />} src={avatarSrc} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {name}
                {record.isCurrentUser && <Tag color="blue" className={styles.meTag}>我</Tag>}
                {record.isTopRanker && <Tag color="gold" icon={<CrownOutlined />}>VIP</Tag>}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      title: incentiveFilters.type === 'POINTS_WEEKLY' ? '本周积分' : '总积分',
      dataIndex: incentiveFilters.type === 'POINTS_WEEKLY' ? 'weeklyPoints' : 'totalPoints',
      key: 'points',
      width: 120,
      render: (points: number) => (
        <span className={styles.scoreCell}>
          <StarOutlined style={{ color: '#faad14' }} /> {points}
        </span>
      )
    },
    {
      title: '专属特权',
      dataIndex: 'privileges',
      key: 'privileges',
      width: 200,
      render: (privileges: string[] | undefined) => (
        privileges && privileges.length > 0 ? (
          <Tooltip title={privileges.join('、')}>
            <Tag color="gold">{privileges[0]}</Tag>
            {privileges.length > 1 && <Tag>+{privileges.length - 1}</Tag>}
          </Tooltip>
        ) : '-'
      )
    },
  ]

  // 获取当前指标的标签
  const currentMetricLabel = METRIC_OPTIONS.find(m => m.id === learningFilters.metric)?.label || '刷题数量'
  const currentRangeLabel = RANGE_OPTIONS.find(r => r.id === learningFilters.range)?.label || '总榜'

  return (
    <div className={styles.leaderboardPage}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1><TrophyOutlined /> 排行榜</h1>
            <p>
              {leaderboardCategory === 'learning' 
                ? `${currentMetricLabel} · ${currentRangeLabel}`
                : `${INCENTIVE_TYPE_OPTIONS.find(t => t.id === incentiveFilters.type)?.label}`
              }
            </p>
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

      {/* 排行榜类型切换 */}
      <Card className={styles.categoryCard}>
        <Segmented
          value={leaderboardCategory}
          onChange={(value) => setLeaderboardCategory(value as 'learning' | 'incentive')}
          options={[
            { value: 'learning', label: '🎓 学习排行榜', icon: <FireOutlined /> },
            { value: 'incentive', label: '💰 积分排行榜', icon: <StarOutlined /> },
          ]}
          size="large"
          block
        />
      </Card>

      {/* 筛选栏 */}
      <Card className={styles.filterCard}>
        {leaderboardCategory === 'learning' ? (
          <Space wrap size="middle">
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>排行维度：</span>
              <Segmented
                value={learningFilters.metric}
                onChange={(value) => updateLearningFilters({ metric: value as typeof learningFilters.metric })}
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
                value={learningFilters.range}
                onChange={(value) => updateLearningFilters({ range: value as typeof learningFilters.range })}
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
                value={learningFilters.subject}
                onChange={(value) => updateLearningFilters({ subject: value })}
                style={{ width: 120 }}
                options={SUBJECT_OPTIONS.map(opt => ({
                  value: opt.id,
                  label: opt.label,
                }))}
              />
            </div>
          </Space>
        ) : (
          <Space wrap size="middle">
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>排行类型：</span>
              <Segmented
                value={incentiveFilters.type}
                onChange={(value) => updateIncentiveFilters({ type: value as typeof incentiveFilters.type })}
                options={INCENTIVE_TYPE_OPTIONS.map(opt => ({
                  value: opt.id,
                  label: (
                    <span>
                      {opt.icon} {opt.label}
                    </span>
                  ),
                }))}
              />
            </div>
          </Space>
        )}
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
          ) : leaderboardCategory === 'learning' ? (
            // 学习排行榜内容
            !learningData || learningData.entries.length === 0 ? (
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
                <LearningPodium 
                  entries={learningData.entries.slice(0, 3)} 
                  currentUserAvatar={currentUser?.avatar}
                  metric={learningFilters.metric}
                />

                {learningData.antiCheatNotice && (
                  <div className={styles.antiCheatNotice}>
                    <Text type="secondary">🛡️ {learningData.antiCheatNotice}</Text>
                  </div>
                )}

                <Card className={styles.rankingTable}>
                  <Table
                    dataSource={learningData.entries}
                    columns={learningColumns}
                    rowKey="userId"
                    pagination={{
                      total: learningData.totalParticipants,
                      pageSize: 50,
                      showSizeChanger: false,
                      showTotal: (total) => `共 ${total} 名参与者`
                    }}
                    rowClassName={(record) => record.isCurrentUser ? styles.currentUserRow : ''}
                    scroll={{ x: 600 }}
                  />
                </Card>
              </>
            )
          ) : (
            // 激励排行榜内容
            !incentiveData || incentiveData.entries.length === 0 ? (
              <div className={styles.emptyContainer}>
                <Empty 
                  description="暂无排行数据" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <p>赚取积分上榜！</p>
                <Button type="primary" onClick={() => navigate('/points')}>
                  查看积分任务
                </Button>
              </div>
            ) : (
              <>
                <IncentivePodium 
                  entries={incentiveData.entries.slice(0, 3)} 
                  currentUserAvatar={currentUser?.avatar}
                  type={incentiveFilters.type}
                />

                <Card className={styles.rankingTable}>
                  <Table
                    dataSource={incentiveData.entries}
                    columns={incentiveColumns}
                    rowKey="userId"
                    pagination={{
                      total: incentiveData.totalParticipants,
                      pageSize: 50,
                      showSizeChanger: false,
                      showTotal: (total) => `共 ${total} 名参与者`
                    }}
                    rowClassName={(record) => record.isCurrentUser ? styles.currentUserRow : ''}
                    scroll={{ x: 600 }}
                  />
                </Card>
              </>
            )
          )}
        </div>

        {/* 右侧边栏 */}
        <div className={styles.sidebar}>
          {/* 用户排名卡片 */}
          {leaderboardCategory === 'learning' && (
            <LearningMyRankCard 
              myRank={learningData?.myRank}
              totalParticipants={learningData?.totalParticipants || 0}
            />
          )}

          {leaderboardCategory === 'incentive' && incentiveData?.myRank && (
            <Card className={styles.userRankCard}>
              <div className={styles.cardHeader}>
                <h3><StarOutlined /> 我的积分排名</h3>
                <Tag color="gold">前 {incentiveData.myRank.percentile}%</Tag>
              </div>
              <div className={styles.rankDisplay}>
                <div className={styles.rankNumber}>
                  <span className={styles.rank}>#{incentiveData.myRank.rank}</span>
                  <span className={styles.total}>/ {incentiveData.totalParticipants}</span>
                </div>
              </div>
              {incentiveData.myRank.privileges && incentiveData.myRank.privileges.length > 0 && (
                <div className={styles.privilegesList}>
                  <Text strong>🎁 已解锁特权：</Text>
                  {incentiveData.myRank.privileges.map((p, i) => (
                    <Tag key={i} color="gold">{p}</Tag>
                  ))}
                </div>
              )}
              <div className={styles.actionButtons}>
                <Button type="primary" onClick={() => navigate('/points')}>
                  💰 赚取积分
                </Button>
              </div>
            </Card>
          )}

          {/* 排行榜特权说明（激励榜） */}
          {leaderboardCategory === 'incentive' && incentiveData?.topRankerPrivileges && (
            <Card className={styles.privilegesCard} title={<span><CrownOutlined /> 排名特权</span>}>
              {incentiveData.topRankerPrivileges.map((config, index) => (
                <div key={index} className={styles.privilegeItem}>
                  <Text strong>前 {config.rank} 名：</Text>
                  <ul>
                    {config.privileges.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card>
          )}

          {/* 提示信息 */}
          <Card className={styles.tipsCard} title="💡 上榜技巧">
            {leaderboardCategory === 'learning' ? (
              <ul>
                <li>每天坚持刷题，提升排名</li>
                <li>注重正确率，质量优先</li>
                <li>适当提速，但保证准确</li>
                <li>正确率≥40%的刷题才计入排行</li>
              </ul>
            ) : (
              <ul>
                <li>完成每日任务获取积分</li>
                <li>保持高正确率获得额外奖励</li>
                <li>前3名可解锁 VIP 兑换商品</li>
                <li>周榜每周一重置</li>
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage
