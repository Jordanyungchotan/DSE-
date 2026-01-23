import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, Empty, Tag, Spin, Statistic, message, Tooltip, Badge, Pagination } from 'antd'
import {
  HistoryOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { SUPPORTED_SUBJECTS, GRADE_LEVELS, DIFFICULTY_LEVELS } from '../stores/quizStore'
import { useLanguageStore } from '../stores/languageStore'
import { apiFetch } from '../config/api'
import ShareResult from '../components/ShareResult/ShareResult'
import styles from './QuizHistoryPage.module.css'

const { Title, Text, Paragraph } = Typography

/**
 * 题目接口
 */
interface QuestionItem {
  id: string
  question: string
  questionType: string
  options?: string[]
  correctAnswer: string | number
  userAnswer?: string | number
  isCorrect?: boolean
  explanation?: string
  topicTags?: string[]
}

/**
 * 刷题历史记录接口
 */
interface QuizHistoryItem {
  id: string
  subject: string
  grade: string
  difficulty: string
  score: number
  accuracy: number
  totalQuestions: number
  timeSpent: number
  completedAt: string
  questions?: QuestionItem[]
}

/**
 * DSE智能刷题 - 刷题历史页面
 */
const QuizHistoryPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, token } = useAuthStore()
  const { t } = useLanguageStore()
  const [history, setHistory] = useState<QuizHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalQuestions: 0,
    averageAccuracy: 0,
    totalTime: 0,
  })
  // 展开的记录ID
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5 // 每页显示5条记录

  // 分享状态
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [shareData, setShareData] = useState<{
    subject: string
    subjectName: string
    grade: string
    gradeName: string
    difficulty: string
    difficultyName: string
    questionCount: number
    correctCount: number
    accuracy: number
    score: number
    timeSpent: number
    date: string
  } | null>(null)

  // 获取所有科目
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ]

  /**
   * 加载历史记录
   * 
   * 【数据主干对齐】
   * - 数据来源：后端 /api/quiz/history（从 learning_events 聚合）
   * - 前端职责：只渲染，不计算统计数据
   * - 统计数据由后端返回：stats.totalSessions / totalQuestions / averageAccuracy / totalTime
   */
  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录查看刷题历史')
      navigate('/login')
      return
    }
    loadHistory()
  }, [isAuthenticated, navigate])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/quiz/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载历史失败')
      }

      const result = await response.json()
      
      // 【API 契约】响应格式：{ code, data: { history, stats }, message }
      if (result.code !== 0) {
        throw new Error(result.message || '加载历史失败')
      }
      
      const historyData = result.data?.history || []
      setHistory(historyData)

      // 【数据主干对齐】统计数据由后端计算并返回
      const stats = result.data?.stats
      if (stats) {
        setStats({
          totalSessions: stats.totalSessions || 0,
          totalQuestions: stats.totalQuestions || 0,
          averageAccuracy: stats.averageAccuracy || stats.accuracy || 0,
          totalTime: stats.totalTime || 0,
        })
      } else {
        // 兼容旧 API：若后端未返回 stats，则置为 0
        setStats({
          totalSessions: historyData.length,
          totalQuestions: 0,
          averageAccuracy: 0,
          totalTime: 0,
        })
      }
    } catch (error) {
      console.error('加载历史失败:', error)
      // ⚠️ 【数据主干对齐】不使用 mock 数据，显示空状态
      setHistory([])
      setStats({
        totalSessions: 0,
        totalQuestions: 0,
        averageAccuracy: 0,
        totalTime: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取年级名称
  const getGradeName = (gradeId: string) => {
    const grade = GRADE_LEVELS.find((g) => g.id === gradeId)
    return grade?.name || gradeId
  }

  // 获取难度配置
  const getDifficulty = (difficultyId: string) => {
    return DIFFICULTY_LEVELS.find((d) => d.id === difficultyId)
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      return `${hours}小时${mins % 60}分`
    }
    return `${mins}分${secs}秒`
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 切换展开/收起
  const toggleExpand = (recordId: string) => {
    setExpandedId(expandedId === recordId ? null : recordId)
  }

  // 清理选项前缀
  const cleanOptionPrefix = (option: string): string => {
    return option
      .replace(/^[A-Da-d][.、．。]\s+/, '')
      .replace(/^[（(][A-Da-d][)）]\s*/, '')
      .trim()
  }

  // 分享单条记录
  const handleShare = (record: QuizHistoryItem) => {
    const subject = allSubjects.find((s) => s.id === record.subject)
    const grade = GRADE_LEVELS.find((g) => g.id === record.grade)
    const difficulty = DIFFICULTY_LEVELS.find((d) => d.id === record.difficulty)
    
    setShareData({
      subject: record.subject,
      subjectName: subject?.name || record.subject,
      grade: record.grade,
      gradeName: grade?.name || record.grade,
      difficulty: record.difficulty,
      difficultyName: difficulty?.name || record.difficulty,
      questionCount: record.totalQuestions || 10,
      correctCount: record.score,
      accuracy: record.accuracy,
      score: record.score,
      timeSpent: record.timeSpent,
      date: formatDate(record.completedAt).split(' ')[0], // 只要日期部分
    })
    setShareModalVisible(true)
  }

  // 获取正确率对应的颜色和状态
  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 80) return { color: '#52c41a', status: '优秀', icon: '🏆' }
    if (accuracy >= 60) return { color: '#1890ff', status: '良好', icon: '👍' }
    if (accuracy >= 40) return { color: '#fa8c16', status: '一般', icon: '💪' }
    return { color: '#f5222d', status: '加油', icon: '📚' }
  }

  // 渲染单条记录卡片（可展开）
  const renderHistoryCard = (record: QuizHistoryItem) => {
    const subject = allSubjects.find((s) => s.id === record.subject)
    const difficulty = getDifficulty(record.difficulty)
    const accuracyStatus = getAccuracyStatus(record.accuracy)
    const isExpanded = expandedId === record.id

    return (
      <Card 
        key={record.id} 
        className={`${styles.historyCard} ${isExpanded ? styles.expanded : ''}`}
      >
        {/* 主要信息区域（可点击展开） */}
        <div 
          className={styles.cardMain} 
          onClick={() => toggleExpand(record.id)}
          style={{ cursor: 'pointer' }}
        >
          {/* 左侧：科目和基本信息 */}
          <div className={styles.cardLeft}>
            <div className={styles.subjectIcon}>
              {subject?.icon || '📚'}
            </div>
            <div className={styles.subjectInfo}>
              <Text strong className={styles.subjectName}>
                {subject?.name || record.subject}
              </Text>
              <div className={styles.tagRow}>
                <Tag>{getGradeName(record.grade)}</Tag>
                {difficulty && (
                  <Tag color={difficulty.color}>{difficulty.name}</Tag>
                )}
              </div>
            </div>
          </div>

          {/* 中间：成绩 */}
          <div className={styles.cardCenter}>
            <div className={styles.scoreSection}>
              <div className={styles.scoreMain}>
                <span className={styles.scoreValue} style={{ color: accuracyStatus.color }}>
                  {record.accuracy}%
                </span>
                <span className={styles.scoreLabel}>{accuracyStatus.icon} {accuracyStatus.status}</span>
              </div>
              <div className={styles.scoreDetail}>
                <span>{record.score}/{record.totalQuestions || 10} 题</span>
                <span className={styles.divider}>·</span>
                <span>{formatTime(record.timeSpent)}</span>
              </div>
            </div>
          </div>

          {/* 右侧：时间和展开指示 */}
          <div className={styles.cardRight}>
            <Text type="secondary" className={styles.dateText}>
              {formatDate(record.completedAt)}
            </Text>
            <div className={styles.cardActions}>
              <span className={`${styles.expandIcon} ${isExpanded ? styles.expandedIcon : ''}`}>
                {isExpanded ? '收起 ▲' : '展开 ▼'}
              </span>
              <Tooltip title="分享成绩">
                <Button
                  type="primary"
                  ghost
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation() // 阻止冒泡
                    handleShare(record)
                  }}
                  className={styles.shareBtn}
                >
                  分享
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 展开的题目详情 */}
        {isExpanded && (
          <div className={styles.expandedContent}>
            <div className={styles.questionListHeader}>
              <Title level={5}>答题详情</Title>
            </div>
            
            {record.questions && record.questions.length > 0 ? (
              <div className={styles.questionItems}>
                {record.questions.map((q, index) => (
                  <div key={q.id || index} className={styles.questionItem}>
                    <div className={styles.questionItemHeader}>
                      <Badge
                        status={q.isCorrect ? 'success' : 'error'}
                        text={
                          <span>
                            <strong>第 {index + 1} 题</strong>
                            {q.isCorrect ? (
                              <Tag color="success" style={{ marginLeft: 8 }}>✓ 正确</Tag>
                            ) : (
                              <Tag color="error" style={{ marginLeft: 8 }}>✗ 错误</Tag>
                            )}
                          </span>
                        }
                      />
                    </div>
                    
                    <div className={styles.questionItemContent}>
                      <div className={styles.questionText}>
                        {q.question}
                      </div>

                      {q.questionType === 'multiple_choice' && q.options && (
                        <div className={styles.optionsList}>
                          {q.options.map((opt, optIndex) => {
                            const optionLetter = String.fromCharCode(65 + optIndex)
                            const isCorrect = String(q.correctAnswer).toUpperCase() === optionLetter ||
                                            Number(q.correctAnswer) === optIndex
                            const isUserAnswer = q.userAnswer !== undefined && (
                              String(q.userAnswer).toUpperCase() === optionLetter ||
                              Number(q.userAnswer) === optIndex
                            )
                            
                            return (
                              <div
                                key={optIndex}
                                className={`${styles.optionItem} ${
                                  isCorrect ? styles.correctOption : ''
                                } ${isUserAnswer && !isCorrect ? styles.wrongOption : ''}`}
                              >
                                <span className={styles.optionLetter}>{optionLetter}.</span>
                                <span>{cleanOptionPrefix(opt)}</span>
                                {isCorrect && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 'auto' }} />}
                                {isUserAnswer && !isCorrect && <CloseCircleOutlined style={{ color: '#f5222d', marginLeft: 'auto' }} />}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {q.questionType !== 'multiple_choice' && (
                        <div className={styles.answerCompare}>
                          <div className={styles.answerItem}>
                            <Text type="secondary">你的答案：</Text>
                            <Text className={q.isCorrect ? styles.correctText : styles.wrongText}>
                              {q.userAnswer || '-'}
                            </Text>
                          </div>
                          <div className={styles.answerItem}>
                            <Text type="secondary">正确答案：</Text>
                            <Text strong className={styles.correctText}>{q.correctAnswer}</Text>
                          </div>
                        </div>
                      )}

                      {q.explanation && (
                        <div className={styles.explanationBox}>
                          <Text type="secondary">💡 解析：</Text>
                          <Text>{q.explanation}</Text>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="题目详情暂不可用"
                className={styles.emptyQuestions}
              />
            )}
          </div>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载刷题历史..." />
      </div>
    )
  }

  return (
    <div className={styles.historyPage}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBadge}>
            <HistoryOutlined /> {t('quiz.history.title')}
          </div>
          <Title level={2} className={styles.pageTitle}>
            <span className="gradient-title">{t('quiz.history.title')}</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            {t('quiz.history.title')}
          </Paragraph>
        </div>
      </div>

      {/* 统计概览 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title={t('leaderboard.totalSessions')}
              value={stats.totalSessions}
              prefix={<TrophyOutlined style={{ color: 'var(--color-primary)' }} />}
              valueStyle={{ color: 'var(--color-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总题目数"
              value={stats.totalQuestions}
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="平均正确率"
              value={stats.averageAccuracy}
              suffix="%"
              prefix={
                stats.averageAccuracy >= 60 ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#f5222d' }} />
                )
              }
              valueStyle={{ color: stats.averageAccuracy >= 60 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总学习时长"
              value={formatTime(stats.totalTime)}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontSize: '1.5rem' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card className={styles.actionCard}>
        <div className={styles.actionBar}>
          <Text type="secondary">
            共 {history.length} 条刷题记录
          </Text>
          <div className={styles.actions}>
            <Button icon={<ReloadOutlined />} onClick={loadHistory}>
              刷新
            </Button>
            <Button type="primary" icon={<RightOutlined />} onClick={() => navigate('/quiz')}>
              {t('quiz.config.start')}
            </Button>
          </div>
        </div>
      </Card>

      {/* 历史记录列表 */}
      {history.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无刷题记录"
          >
            <Button type="primary" onClick={() => navigate('/quiz')}>
              开始第一次刷题
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <div className={styles.historyList}>
            {/* 只显示当前页的记录 */}
            {history
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map(renderHistoryCard)}
          </div>
          
          {/* 分页控件 */}
          {history.length > pageSize && (
            <div className={styles.paginationWrapper}>
              <Pagination
                current={currentPage}
                total={history.length}
                pageSize={pageSize}
                onChange={(page) => {
                  setCurrentPage(page)
                  setExpandedId(null) // 换页时收起展开的记录
                  window.scrollTo({ top: 0, behavior: 'smooth' }) // 滚动到顶部
                }}
                showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                showQuickJumper={history.length > pageSize * 3}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      {/* 快速入口 */}
      <Row gutter={[16, 16]} className={styles.quickLinks}>
        <Col xs={24} sm={12}>
          <Card
            className={styles.linkCard}
            onClick={() => navigate('/quiz/wrong-questions')}
            hoverable
          >
            <div className={styles.linkContent}>
              <div className={styles.linkIcon} style={{ background: 'rgba(245, 34, 45, 0.1)', color: '#f5222d' }}>
                <CloseCircleOutlined />
              </div>
              <div>
                <Title level={4}>错题本</Title>
                <Text type="secondary">查看和复习答错的题目</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            className={styles.linkCard}
            onClick={() => navigate('/quiz')}
            hoverable
          >
            <div className={styles.linkContent}>
              <div className={styles.linkIcon} style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>
                <TrophyOutlined />
              </div>
              <div>
                <Title level={4}>继续刷题</Title>
                <Text type="secondary">开始新的刷题练习</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分享弹窗 */}
      {shareData && (
        <ShareResult
          visible={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false)
            setShareData(null)
          }}
          result={shareData}
        />
      )}
    </div>
  )
}

export default QuizHistoryPage

