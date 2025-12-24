import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, Empty, Tag, Spin, Statistic, message, Tooltip, Modal, Collapse, Badge } from 'antd'
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
  EyeOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { SUPPORTED_SUBJECTS, GRADE_LEVELS, DIFFICULTY_LEVELS } from '../stores/quizStore'
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
  const [history, setHistory] = useState<QuizHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalQuestions: 0,
    averageAccuracy: 0,
    totalTime: 0,
  })
  // 详情弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<QuizHistoryItem | null>(null)

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

  // 加载历史记录
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

      const data = await response.json()
      const historyData = data.history || []
      setHistory(historyData)

      // 计算统计数据
      if (historyData.length > 0) {
        const totalSessions = historyData.length
        const totalQuestions = historyData.reduce((sum: number, h: QuizHistoryItem) => sum + (h.totalQuestions || h.score), 0)
        const totalAccuracy = historyData.reduce((sum: number, h: QuizHistoryItem) => sum + h.accuracy, 0)
        const totalTime = historyData.reduce((sum: number, h: QuizHistoryItem) => sum + (h.timeSpent || 0), 0)

        setStats({
          totalSessions,
          totalQuestions,
          averageAccuracy: Math.round(totalAccuracy / totalSessions * 10) / 10,
          totalTime,
        })
      }
    } catch (error) {
      console.error('加载历史失败:', error)
      // 使用模拟数据
      const mockHistory = generateMockHistory()
      setHistory(mockHistory)
      calculateStats(mockHistory)
    } finally {
      setLoading(false)
    }
  }

  // 生成模拟历史数据
  const generateMockHistory = (): QuizHistoryItem[] => {
    return [
      {
        id: '1',
        subject: 'math',
        grade: 'f5',
        difficulty: 'standard',
        score: 8,
        accuracy: 80,
        totalQuestions: 10,
        timeSpent: 900,
        completedAt: '2024-12-23T10:30:00',
      },
      {
        id: '2',
        subject: 'physics',
        grade: 'f5',
        difficulty: 'challenging',
        score: 6,
        accuracy: 60,
        totalQuestions: 10,
        timeSpent: 1200,
        completedAt: '2024-12-22T15:20:00',
      },
      {
        id: '3',
        subject: 'chemistry',
        grade: 'f4',
        difficulty: 'basic',
        score: 9,
        accuracy: 90,
        totalQuestions: 10,
        timeSpent: 600,
        completedAt: '2024-12-21T09:15:00',
      },
      {
        id: '4',
        subject: 'english',
        grade: 'f6',
        difficulty: 'exam',
        score: 5,
        accuracy: 50,
        totalQuestions: 10,
        timeSpent: 1500,
        completedAt: '2024-12-20T14:00:00',
      },
    ]
  }

  const calculateStats = (data: QuizHistoryItem[]) => {
    if (data.length === 0) return

    const totalSessions = data.length
    const totalQuestions = data.reduce((sum, h) => sum + h.totalQuestions, 0)
    const totalAccuracy = data.reduce((sum, h) => sum + h.accuracy, 0)
    const totalTime = data.reduce((sum, h) => sum + h.timeSpent, 0)

    setStats({
      totalSessions,
      totalQuestions,
      averageAccuracy: Math.round(totalAccuracy / totalSessions * 10) / 10,
      totalTime,
    })
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

  // 查看详情
  const handleViewDetail = (record: QuizHistoryItem) => {
    setSelectedRecord(record)
    setDetailModalVisible(true)
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

  // 渲染单条记录卡片
  const renderHistoryCard = (record: QuizHistoryItem) => {
    const subject = allSubjects.find((s) => s.id === record.subject)
    const difficulty = getDifficulty(record.difficulty)
    const accuracyStatus = getAccuracyStatus(record.accuracy)

    return (
      <Card key={record.id} className={styles.historyCard}>
        <div className={styles.cardMain}>
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

          {/* 右侧：时间和操作 */}
          <div className={styles.cardRight}>
            <Text type="secondary" className={styles.dateText}>
              {formatDate(record.completedAt)}
            </Text>
            <div className={styles.cardActions}>
              <Tooltip title="查看详情">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record)}
                  className={styles.detailBtn}
                >
                  详情
                </Button>
              </Tooltip>
              <Tooltip title="分享成绩">
                <Button
                  type="primary"
                  ghost
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={() => handleShare(record)}
                  className={styles.shareBtn}
                >
                  分享
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
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
            <HistoryOutlined /> 刷题记录
          </div>
          <Title level={2} className={styles.pageTitle}>
            <span className="gradient-title">我的刷题历史</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            查看你的刷题记录，追踪学习进度
          </Paragraph>
        </div>
      </div>

      {/* 统计概览 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic
              title="总刷题次数"
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
              开始刷题
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
        <div className={styles.historyList}>
          {history.map(renderHistoryCard)}
        </div>
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

      {/* 详情弹窗 */}
      <Modal
        title={
          <div className={styles.detailModalTitle}>
            <HistoryOutlined /> 刷题详情
            {selectedRecord && (
              <Tag color="blue" style={{ marginLeft: 12 }}>
                {allSubjects.find(s => s.id === selectedRecord.subject)?.name || selectedRecord.subject}
              </Tag>
            )}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedRecord(null)
        }}
        footer={null}
        width={700}
        className={styles.detailModal}
      >
        {selectedRecord && (
          <div className={styles.detailContent}>
            {/* 概览信息 */}
            <div className={styles.detailSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>正确率</span>
                <span 
                  className={styles.summaryValue}
                  style={{ color: selectedRecord.accuracy >= 60 ? '#52c41a' : '#f5222d' }}
                >
                  {selectedRecord.accuracy}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>成绩</span>
                <span className={styles.summaryValue}>
                  {selectedRecord.score}/{selectedRecord.totalQuestions}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>用时</span>
                <span className={styles.summaryValue}>
                  {formatTime(selectedRecord.timeSpent)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>日期</span>
                <span className={styles.summaryValue}>
                  {formatDate(selectedRecord.completedAt)}
                </span>
              </div>
            </div>

            {/* 题目列表 */}
            <div className={styles.questionList}>
              <Title level={5}>答题详情</Title>
              {selectedRecord.questions && selectedRecord.questions.length > 0 ? (
                <Collapse accordion>
                  {selectedRecord.questions.map((q, index) => (
                    <Collapse.Panel
                      key={q.id || index}
                      header={
                        <div className={styles.questionHeader}>
                          <Badge
                            status={q.isCorrect ? 'success' : 'error'}
                            text={
                              <span>
                                <strong>第 {index + 1} 题</strong>
                                {q.isCorrect ? (
                                  <Tag color="success" style={{ marginLeft: 8 }}>正确</Tag>
                                ) : (
                                  <Tag color="error" style={{ marginLeft: 8 }}>错误</Tag>
                                )}
                              </span>
                            }
                          />
                        </div>
                      }
                    >
                      <div className={styles.questionDetail}>
                        <div className={styles.questionText}>
                          <Text strong>题目：</Text>
                          <Text>{q.question}</Text>
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
                                  {isCorrect && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />}
                                  {isUserAnswer && !isCorrect && <CloseCircleOutlined style={{ color: '#f5222d', marginLeft: 8 }} />}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {q.questionType !== 'multiple_choice' && (
                          <div className={styles.answerSection}>
                            <div>
                              <Text type="secondary">你的答案：</Text>
                              <Text>{q.userAnswer || '-'}</Text>
                            </div>
                            <div>
                              <Text type="secondary">正确答案：</Text>
                              <Text strong style={{ color: '#52c41a' }}>{q.correctAnswer}</Text>
                            </div>
                          </div>
                        )}

                        {q.explanation && (
                          <div className={styles.explanationBox}>
                            <Text type="secondary">解析：</Text>
                            <Text>{q.explanation}</Text>
                          </div>
                        )}
                      </div>
                    </Collapse.Panel>
                  ))}
                </Collapse>
              ) : (
                <Empty description="题目详情暂不可用" />
              )}
            </div>
          </div>
        )}
      </Modal>

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

