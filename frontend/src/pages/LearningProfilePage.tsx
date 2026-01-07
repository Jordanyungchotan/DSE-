import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Progress, Statistic, Tag, Spin, Empty, Button, Tabs, Tooltip } from 'antd'
import {
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  BookOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  RocketOutlined,
  AimOutlined,
  LineChartOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { SUPPORTED_SUBJECTS } from '../stores/quizStore'
import { useLanguageStore } from '../stores/languageStore'
import { apiFetch } from '../config/api'
import LearningReport from '../components/LearningReport/LearningReport'
import LearningChart from '../components/LearningChart/LearningChart'
import SmartRecommendation from '../components/SmartRecommendation/SmartRecommendation'
import styles from './LearningProfilePage.module.css'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

/**
 * 学习档案数据接口
 */
interface LearningProfile {
  // 总体统计
  totalQuizzes: number
  totalQuestions: number
  correctAnswers: number
  totalTimeSpent: number // 分钟
  currentStreak: number // 连续学习天数
  longestStreak: number
  lastStudyDate: string
  
  // 科目掌握度
  subjectMastery: Array<{
    subjectId: string
    subjectName: string
    totalQuestions: number
    correctAnswers: number
    accuracy: number
    recentTrend: 'up' | 'down' | 'stable'
    lastPracticed: string
  }>
  
  // 知识点掌握度
  topicMastery: Array<{
    topic: string
    subject: string
    mastery: number // 0-100
    questionsAttempted: number
    lastAttempted: string
  }>
  
  // 成就列表
  achievements: Array<{
    id: string
    name: string
    description: string
    icon: string
    unlockedAt: string | null
    progress: number // 0-100
  }>
  
  // 学习目标
  goals: Array<{
    id: string
    title: string
    target: number
    current: number
    deadline: string
    type: 'daily' | 'weekly' | 'monthly'
  }>
  
  // 最近活动
  recentActivity: Array<{
    date: string
    quizCount: number
    questionsAnswered: number
    accuracy: number
  }>
}

/**
 * DSE智能刷题 - 学习档案页面
 */
const LearningProfilePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user, token } = useAuthStore()
  const { t } = useLanguageStore()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<LearningProfile | null>(null)
  const [activeTab, setActiveTab] = useState('recommendations')

  // 获取所有科目
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ]

  // 加载学习档案
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadProfile()
  }, [isAuthenticated, navigate])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/quiz/learning-profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载学习档案失败')
      }

      const data = await response.json()
      setProfile(data)
    } catch (error) {
      console.error('加载学习档案失败:', error)
      // 使用模拟数据
      setProfile(generateMockProfile())
    } finally {
      setLoading(false)
    }
  }

  // 生成模拟数据
  const generateMockProfile = (): LearningProfile => {
    return {
      totalQuizzes: 47,
      totalQuestions: 523,
      correctAnswers: 389,
      totalTimeSpent: 1250, // 分钟
      currentStreak: 5,
      longestStreak: 12,
      lastStudyDate: new Date().toISOString().split('T')[0],
      subjectMastery: [
        { subjectId: 'math', subjectName: '数学', totalQuestions: 180, correctAnswers: 142, accuracy: 78.9, recentTrend: 'up', lastPracticed: '2024-12-23' },
        { subjectId: 'physics', subjectName: '物理', totalQuestions: 120, correctAnswers: 89, accuracy: 74.2, recentTrend: 'stable', lastPracticed: '2024-12-22' },
        { subjectId: 'chemistry', subjectName: '化学', totalQuestions: 95, correctAnswers: 71, accuracy: 74.7, recentTrend: 'up', lastPracticed: '2024-12-21' },
        { subjectId: 'english', subjectName: '英国语文', totalQuestions: 68, correctAnswers: 52, accuracy: 76.5, recentTrend: 'down', lastPracticed: '2024-12-20' },
        { subjectId: 'chinese', subjectName: '中国语文', totalQuestions: 60, correctAnswers: 35, accuracy: 58.3, recentTrend: 'stable', lastPracticed: '2024-12-19' },
      ],
      topicMastery: [
        { topic: '二次方程', subject: 'math', mastery: 85, questionsAttempted: 32, lastAttempted: '2024-12-23' },
        { topic: '三角函数', subject: 'math', mastery: 72, questionsAttempted: 28, lastAttempted: '2024-12-22' },
        { topic: '牛顿力学', subject: 'physics', mastery: 78, questionsAttempted: 25, lastAttempted: '2024-12-21' },
        { topic: '化学平衡', subject: 'chemistry', mastery: 65, questionsAttempted: 20, lastAttempted: '2024-12-20' },
        { topic: '有机化学', subject: 'chemistry', mastery: 58, questionsAttempted: 18, lastAttempted: '2024-12-19' },
        { topic: '电磁感应', subject: 'physics', mastery: 45, questionsAttempted: 15, lastAttempted: '2024-12-18' },
      ],
      achievements: [
        { id: '1', name: '初露锋芒', description: '完成第一次刷题', icon: '🌟', unlockedAt: '2024-12-15', progress: 100 },
        { id: '2', name: '勤学不倦', description: '连续学习7天', icon: '🔥', unlockedAt: null, progress: 71 },
        { id: '3', name: '百题斩', description: '完成100道题目', icon: '💯', unlockedAt: '2024-12-18', progress: 100 },
        { id: '4', name: '千题王', description: '完成1000道题目', icon: '👑', unlockedAt: null, progress: 52 },
        { id: '5', name: '精准狙击', description: '单次练习正确率100%', icon: '🎯', unlockedAt: '2024-12-20', progress: 100 },
        { id: '6', name: '全科达人', description: '所有科目正确率达到80%', icon: '📚', unlockedAt: null, progress: 40 },
        { id: '7', name: '速度之星', description: '平均答题时间低于1分钟', icon: '⚡', unlockedAt: null, progress: 65 },
        { id: '8', name: '挑战者', description: '完成50道考试难度题目', icon: '🏆', unlockedAt: null, progress: 28 },
      ],
      goals: [
        { id: '1', title: '每日刷题', target: 20, current: 15, deadline: new Date().toISOString(), type: 'daily' },
        { id: '2', title: '本周目标', target: 100, current: 67, deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), type: 'weekly' },
        { id: '3', title: '月度挑战', target: 500, current: 312, deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'monthly' },
      ],
      recentActivity: [
        { date: '2024-12-23', quizCount: 3, questionsAnswered: 35, accuracy: 82.9 },
        { date: '2024-12-22', quizCount: 2, questionsAnswered: 25, accuracy: 76.0 },
        { date: '2024-12-21', quizCount: 4, questionsAnswered: 42, accuracy: 78.6 },
        { date: '2024-12-20', quizCount: 2, questionsAnswered: 20, accuracy: 85.0 },
        { date: '2024-12-19', quizCount: 3, questionsAnswered: 30, accuracy: 73.3 },
        { date: '2024-12-18', quizCount: 1, questionsAnswered: 15, accuracy: 80.0 },
        { date: '2024-12-17', quizCount: 2, questionsAnswered: 22, accuracy: 68.2 },
      ],
    }
  }

  // 获取科目图标
  const getSubjectIcon = (subjectId: string) => {
    const subject = allSubjects.find((s) => s.id === subjectId)
    return subject?.icon || '📖'
  }

  // 获取掌握度颜色
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return '#52c41a'
    if (mastery >= 60) return '#1890ff'
    if (mastery >= 40) return '#fa8c16'
    return '#f5222d'
  }

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <RiseOutlined style={{ color: '#52c41a' }} />
      case 'down':
        return <RiseOutlined style={{ color: '#f5222d', transform: 'rotate(180deg)' }} />
      default:
        return <span style={{ color: '#999' }}>—</span>
    }
  }

  // 格式化时间
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载学习档案..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.emptyContainer}>
        <Empty description="暂无学习数据" />
        <Button type="primary" onClick={() => navigate('/quiz')}>
          {t('quiz.config.start')}
        </Button>
      </div>
    )
  }

  const overallAccuracy = profile.totalQuestions > 0
    ? ((profile.correctAnswers / profile.totalQuestions) * 100).toFixed(1)
    : 0

  return (
    <div className={styles.profilePage}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBadge}>
            <LineChartOutlined /> {t('nav.learningProfile')}
          </div>
          <Title level={2} className={styles.pageTitle}>
            <span className="gradient-title">{user?.name || t('nav.learningProfile')}</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            {t('nav.learningProfile')}
          </Paragraph>
        </div>
      </div>

      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总练习次数"
              value={profile.totalQuizzes}
              prefix={<BookOutlined />}
              valueStyle={{ color: 'var(--color-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总答题数"
              value={profile.totalQuestions}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总正确率"
              value={overallAccuracy}
              suffix="%"
              prefix={<AimOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="学习时长"
              value={formatTime(profile.totalTimeSpent)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1', fontSize: '20px' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 连续学习和成就预览 */}
      <Row gutter={[16, 16]} className={styles.highlightRow}>
        <Col xs={24} sm={12}>
          <Card className={`${styles.highlightCard} ${styles.streakCard}`}>
            <div className={styles.streakContent}>
              <div className={styles.streakIcon}>
                <FireOutlined />
              </div>
              <div className={styles.streakInfo}>
                <Text className={styles.streakLabel}>连续学习</Text>
                <div className={styles.streakValue}>
                  <span className={styles.streakNumber}>{profile.currentStreak}</span>
                  <span className={styles.streakUnit}>天</span>
                </div>
                <Text type="secondary">最长记录: {profile.longestStreak}天</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={`${styles.highlightCard} ${styles.achievementPreview}`}>
            <div className={styles.achievementHeader}>
              <TrophyOutlined /> 成就进度
              <Tag color="gold">{profile.achievements.filter((a) => a.unlockedAt).length}/{profile.achievements.length}</Tag>
            </div>
            <div className={styles.achievementIcons}>
              {profile.achievements.slice(0, 6).map((achievement) => (
                <Tooltip key={achievement.id} title={`${achievement.name}${achievement.unlockedAt ? ' ✓' : ''}`}>
                  <div className={`${styles.achievementIcon} ${achievement.unlockedAt ? styles.unlocked : ''}`}>
                    {achievement.icon}
                  </div>
                </Tooltip>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className={styles.tabs}>
        <TabPane tab={<span><BulbOutlined /> 智能推荐</span>} key="recommendations">
          <SmartRecommendation
            subjectMastery={profile.subjectMastery}
            topicMastery={profile.topicMastery}
            wrongQuestions={[]}
            totalQuizzes={profile.totalQuizzes}
          />
        </TabPane>

        <TabPane tab={<span><LineChartOutlined /> 数据统计</span>} key="charts">
          <LearningChart
            recentActivity={profile.recentActivity}
            subjectMastery={profile.subjectMastery}
          />
        </TabPane>

        <TabPane tab={<span><BookOutlined /> 科目掌握</span>} key="subjects">
          <div className={styles.subjectGrid}>
            {profile.subjectMastery.map((subject) => (
              <Card key={subject.subjectId} className={styles.subjectCard}>
                <div className={styles.subjectHeader}>
                  <span className={styles.subjectIcon}>{getSubjectIcon(subject.subjectId)}</span>
                  <span className={styles.subjectName}>{subject.subjectName}</span>
                  {getTrendIcon(subject.recentTrend)}
                </div>
                <div className={styles.subjectProgress}>
                  <Progress
                    percent={subject.accuracy}
                    strokeColor={getMasteryColor(subject.accuracy)}
                    format={(percent) => `${percent?.toFixed(1)}%`}
                  />
                </div>
                <div className={styles.subjectStats}>
                  <Text type="secondary">
                    答题: {subject.totalQuestions} | 正确: {subject.correctAnswers}
                  </Text>
                </div>
              </Card>
            ))}
          </div>
        </TabPane>

        <TabPane tab={<span><StarOutlined /> 知识点</span>} key="topics">
          <div className={styles.topicList}>
            {profile.topicMastery.map((topic, index) => (
              <Card key={index} className={styles.topicCard}>
                <div className={styles.topicHeader}>
                  <div>
                    <Text strong>{topic.topic}</Text>
                    <Tag style={{ marginLeft: 8 }}>{topic.subject}</Tag>
                  </div>
                  <Text type="secondary">练习{topic.questionsAttempted}题</Text>
                </div>
                <Progress
                  percent={topic.mastery}
                  strokeColor={getMasteryColor(topic.mastery)}
                  size="small"
                />
              </Card>
            ))}
          </div>
        </TabPane>

        <TabPane tab={<span><TrophyOutlined /> 成就</span>} key="achievements">
          <Row gutter={[16, 16]} className={styles.achievementGrid}>
            {profile.achievements.map((achievement) => (
              <Col xs={12} sm={8} md={6} key={achievement.id}>
                <Card
                  className={`${styles.achievementCard} ${achievement.unlockedAt ? styles.unlocked : styles.locked}`}
                >
                  <div className={styles.achievementBigIcon}>{achievement.icon}</div>
                  <Text strong className={styles.achievementName}>{achievement.name}</Text>
                  <Text type="secondary" className={styles.achievementDesc}>
                    {achievement.description}
                  </Text>
                  {!achievement.unlockedAt && (
                    <Progress
                      percent={achievement.progress}
                      size="small"
                      showInfo={false}
                      strokeColor="#faad14"
                    />
                  )}
                  {achievement.unlockedAt && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>已解锁</Tag>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        <TabPane tab={<span><AimOutlined /> 学习目标</span>} key="goals">
          <div className={styles.goalsList}>
            {profile.goals.map((goal) => (
              <Card key={goal.id} className={styles.goalCard}>
                <div className={styles.goalHeader}>
                  <div className={styles.goalTitle}>
                    {goal.type === 'daily' && <ThunderboltOutlined style={{ color: '#fa8c16' }} />}
                    {goal.type === 'weekly' && <RocketOutlined style={{ color: '#1890ff' }} />}
                    {goal.type === 'monthly' && <CrownOutlined style={{ color: '#722ed1' }} />}
                    <Text strong style={{ marginLeft: 8 }}>{goal.title}</Text>
                  </div>
                  <Tag>
                    {goal.type === 'daily' ? '每日' : goal.type === 'weekly' ? '每周' : '月度'}
                  </Tag>
                </div>
                <Progress
                  percent={Math.round((goal.current / goal.target) * 100)}
                  format={() => `${goal.current}/${goal.target}`}
                  strokeColor={goal.current >= goal.target ? '#52c41a' : '#1890ff'}
                />
              </Card>
            ))}
            <Card className={styles.addGoalCard}>
              <Button type="dashed" block icon={<AimOutlined />}>
                添加新目标
              </Button>
            </Card>
          </div>
        </TabPane>

        <TabPane tab={<span><ClockCircleOutlined /> 最近活动</span>} key="activity">
          <div className={styles.activityList}>
            {profile.recentActivity.map((activity, index) => (
              <Card key={index} className={styles.activityCard}>
                <div className={styles.activityDate}>
                  <Text strong>{activity.date}</Text>
                </div>
                <div className={styles.activityStats}>
                  <Statistic
                    title="练习次数"
                    value={activity.quizCount}
                    valueStyle={{ fontSize: '18px' }}
                  />
                  <Statistic
                    title="答题数"
                    value={activity.questionsAnswered}
                    valueStyle={{ fontSize: '18px' }}
                  />
                  <Statistic
                    title="正确率"
                    value={activity.accuracy}
                    suffix="%"
                    valueStyle={{ fontSize: '18px', color: getMasteryColor(activity.accuracy) }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </TabPane>

        <TabPane tab={<span><LineChartOutlined /> 学习报告</span>} key="report">
          <LearningReport />
        </TabPane>
      </Tabs>

      {/* 快捷操作 */}
      <div className={styles.quickActions}>
        <Button type="primary" size="large" icon={<RocketOutlined />} onClick={() => navigate('/quiz')}>
          继续刷题
        </Button>
        <Button size="large" icon={<BookOutlined />} onClick={() => navigate('/quiz/wrong-questions')}>
          复习错题
        </Button>
      </div>
    </div>
  )
}

export default LearningProfilePage

