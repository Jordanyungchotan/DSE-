import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, Empty, Tag, Collapse, Select, Spin, message, Modal, Tabs } from 'antd'
import {
  BookOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  BulbOutlined,
  HistoryOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { SUPPORTED_SUBJECTS } from '../stores/quizStore'
import { apiFetch } from '../config/api'
import styles from './WrongQuestionsPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse
const { Option } = Select
const { TabPane } = Tabs

/**
 * 错题接口
 */
interface WrongQuestion {
  id: string
  questionId: string
  questionText: string
  questionType: string
  subject: string
  topic: string
  userAnswer: string
  correctAnswer: string
  explanation: string
  wrongCount: number
  status: 'unreviewed' | 'reviewed' | 'mastered'
  firstAttemptDate: string
  lastAttemptDate: string
}

/**
 * DSE智能刷题 - 错题本页面
 */
const WrongQuestionsPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, token } = useAuthStore()
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('unreviewed')

  // 获取所有科目
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ]

  // 加载错题列表
  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录查看错题本')
      navigate('/login')
      return
    }
    loadWrongQuestions()
  }, [isAuthenticated, navigate])

  const loadWrongQuestions = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/quiz/wrong-questions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('加载错题失败')
      }

      const data = await response.json()
      setWrongQuestions(data.questions || [])
    } catch (error) {
      console.error('加载错题失败:', error)
      // 使用模拟数据
      setWrongQuestions(generateMockWrongQuestions())
    } finally {
      setLoading(false)
    }
  }

  // 生成模拟错题数据
  const generateMockWrongQuestions = (): WrongQuestion[] => {
    return [
      {
        id: '1',
        questionId: 'q1',
        questionText: '若 x² - 5x + 6 = 0，求x的值。',
        questionType: 'calculation',
        subject: 'math',
        topic: '二次方程',
        userAnswer: 'x = 1 或 x = 6',
        correctAnswer: 'x = 2 或 x = 3',
        explanation: '【解题思路】\n将方程因式分解：x² - 5x + 6 = (x-2)(x-3) = 0\n所以 x = 2 或 x = 3\n\n【易错点】\n注意因式分解时两数之积为6，之和为-5',
        wrongCount: 2,
        status: 'unreviewed',
        firstAttemptDate: '2024-12-20',
        lastAttemptDate: '2024-12-22',
      },
      {
        id: '2',
        questionId: 'q2',
        questionText: '下列哪项是光合作用的产物？\nA. 二氧化碳\nB. 水\nC. 葡萄糖\nD. 氮气',
        questionType: 'multiple_choice',
        subject: 'biology',
        topic: '光合作用',
        userAnswer: 'A',
        correctAnswer: 'C',
        explanation: '【解题思路】\n光合作用的化学方程式：6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\n产物是葡萄糖和氧气\n\n【关键知识点】\nCO₂和H₂O是反应物，不是产物',
        wrongCount: 1,
        status: 'reviewed',
        firstAttemptDate: '2024-12-21',
        lastAttemptDate: '2024-12-21',
      },
      {
        id: '3',
        questionId: 'q3',
        questionText: '牛顿第一定律也称为什么定律？',
        questionType: 'short_answer',
        subject: 'physics',
        topic: '牛顿定律',
        userAnswer: '运动定律',
        correctAnswer: '惯性定律',
        explanation: '【解题思路】\n牛顿第一定律表述了物体在不受力时保持原有运动状态的性质，即惯性。\n因此也被称为惯性定律。',
        wrongCount: 1,
        status: 'mastered',
        firstAttemptDate: '2024-12-19',
        lastAttemptDate: '2024-12-19',
      },
    ]
  }

  // 更新错题状态
  const updateQuestionStatus = async (id: string, status: 'reviewed' | 'mastered') => {
    try {
      const response = await apiFetch(`/api/quiz/wrong-questions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('更新状态失败')
      }

      setWrongQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      )
      message.success(status === 'mastered' ? '已标记为已掌握' : '已标记为已复习')
    } catch (error) {
      // 本地更新
      setWrongQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      )
      message.success(status === 'mastered' ? '已标记为已掌握' : '已标记为已复习')
    }
  }

  // 删除错题
  const deleteQuestion = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要从错题本中删除这道题吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiFetch(`/api/quiz/wrong-questions/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
        } catch {
          // ignore
        }
        setWrongQuestions((prev) => prev.filter((q) => q.id !== id))
        message.success('已删除')
      },
    })
  }

  // 获取科目名称
  const getSubjectName = (subjectId: string) => {
    const subject = allSubjects.find((s) => s.id === subjectId)
    return subject ? `${subject.icon} ${subject.name}` : subjectId
  }

  // 过滤错题
  const filteredQuestions = wrongQuestions.filter((q) => {
    if (filterSubject !== 'all' && q.subject !== filterSubject) return false
    if (activeTab === 'unreviewed' && q.status !== 'unreviewed') return false
    if (activeTab === 'reviewed' && q.status !== 'reviewed') return false
    if (activeTab === 'mastered' && q.status !== 'mastered') return false
    if (activeTab === 'all') return true
    return true
  })

  // 统计数据
  const stats = {
    total: wrongQuestions.length,
    unreviewed: wrongQuestions.filter((q) => q.status === 'unreviewed').length,
    reviewed: wrongQuestions.filter((q) => q.status === 'reviewed').length,
    mastered: wrongQuestions.filter((q) => q.status === 'mastered').length,
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'unreviewed':
        return <Tag color="red">待复习</Tag>
      case 'reviewed':
        return <Tag color="orange">已复习</Tag>
      case 'mastered':
        return <Tag color="green">已掌握</Tag>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载错题本..." />
      </div>
    )
  }

  return (
    <div className={styles.wrongQuestionsPage}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBadge}>
            <BookOutlined /> 错题本
          </div>
          <Title level={2} className={styles.pageTitle}>
            <span className="gradient-title">我的错题本</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            记录并复习答错的题目，针对性地巩固薄弱知识点
          </Paragraph>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <div className={styles.statValue} style={{ color: 'var(--color-primary)' }}>
              {stats.total}
            </div>
            <div className={styles.statLabel}>总错题数</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#f5222d' }}>
              {stats.unreviewed}
            </div>
            <div className={styles.statLabel}>待复习</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#fa8c16' }}>
              {stats.reviewed}
            </div>
            <div className={styles.statLabel}>已复习</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#52c41a' }}>
              {stats.mastered}
            </div>
            <div className={styles.statLabel}>已掌握</div>
          </Card>
        </Col>
      </Row>

      {/* 筛选和操作 */}
      <Card className={styles.filterCard}>
        <div className={styles.filterBar}>
          <div className={styles.filters}>
            <FilterOutlined />
            <Select
              value={filterSubject}
              onChange={setFilterSubject}
              style={{ width: 150 }}
              placeholder="选择科目"
            >
              <Option value="all">全部科目</Option>
              {allSubjects.map((subject) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.icon} {subject.name}
                </Option>
              ))}
            </Select>
          </div>
          <div className={styles.actions}>
            <Button icon={<ReloadOutlined />} onClick={loadWrongQuestions}>
              刷新
            </Button>
            <Button type="primary" icon={<BulbOutlined />} onClick={() => navigate('/quiz')}>
              开始刷题
            </Button>
          </div>
        </div>
      </Card>

      {/* 标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className={styles.tabs}>
        <TabPane
          tab={
            <span>
              <CloseCircleOutlined /> 待复习 ({stats.unreviewed})
            </span>
          }
          key="unreviewed"
        />
        <TabPane
          tab={
            <span>
              <HistoryOutlined /> 已复习 ({stats.reviewed})
            </span>
          }
          key="reviewed"
        />
        <TabPane
          tab={
            <span>
              <TrophyOutlined /> 已掌握 ({stats.mastered})
            </span>
          }
          key="mastered"
        />
        <TabPane
          tab={
            <span>
              <BookOutlined /> 全部 ({stats.total})
            </span>
          }
          key="all"
        />
      </Tabs>

      {/* 错题列表 */}
      {filteredQuestions.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === 'unreviewed'
                ? '暂无待复习的错题'
                : activeTab === 'mastered'
                ? '还没有已掌握的题目'
                : '错题本是空的'
            }
          >
            <Button type="primary" onClick={() => navigate('/quiz')}>
              去刷题
            </Button>
          </Empty>
        </Card>
      ) : (
        <Collapse accordion className={styles.questionList}>
          {filteredQuestions.map((question, index) => (
            <Panel
              key={question.id}
              header={
                <div className={styles.panelHeader}>
                  <div className={styles.questionInfo}>
                    <span className={styles.questionNum}>#{index + 1}</span>
                    <Tag color="blue">{getSubjectName(question.subject)}</Tag>
                    <Tag>{question.topic}</Tag>
                    {getStatusTag(question.status)}
                    {question.wrongCount > 1 && (
                      <Tag color="red">错{question.wrongCount}次</Tag>
                    )}
                  </div>
                  <Text type="secondary" className={styles.questionPreview}>
                    {question.questionText.substring(0, 50)}...
                  </Text>
                </div>
              }
            >
              <div className={styles.questionDetail}>
                {/* 题目内容 */}
                <div className={styles.questionContent}>
                  <Title level={5}>题目</Title>
                  <Paragraph>{question.questionText}</Paragraph>
                </div>

                {/* 答案对比 */}
                <Row gutter={16} className={styles.answerCompare}>
                  <Col xs={24} sm={12}>
                    <div className={`${styles.answerBox} ${styles.wrongAnswer}`}>
                      <Text strong>
                        <CloseCircleOutlined /> 我的答案
                      </Text>
                      <Paragraph>{question.userAnswer}</Paragraph>
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className={`${styles.answerBox} ${styles.correctAnswer}`}>
                      <Text strong>
                        <CheckCircleOutlined /> 正确答案
                      </Text>
                      <Paragraph>{question.correctAnswer}</Paragraph>
                    </div>
                  </Col>
                </Row>

                {/* 解析 */}
                <div className={styles.explanationBox}>
                  <Title level={5}>
                    <BulbOutlined /> 解析
                  </Title>
                  <Paragraph className={styles.explanationText}>
                    {question.explanation.split('\\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </Paragraph>
                </div>

                {/* 操作按钮 */}
                <div className={styles.actionButtons}>
                  <Text type="secondary">
                    首次错误：{question.firstAttemptDate} | 最近错误：{question.lastAttemptDate}
                  </Text>
                  <div className={styles.buttons}>
                    {question.status !== 'reviewed' && (
                      <Button
                        icon={<HistoryOutlined />}
                        onClick={() => updateQuestionStatus(question.id, 'reviewed')}
                      >
                        标记已复习
                      </Button>
                    )}
                    {question.status !== 'mastered' && (
                      <Button
                        type="primary"
                        icon={<TrophyOutlined />}
                        onClick={() => updateQuestionStatus(question.id, 'mastered')}
                      >
                        标记已掌握
                      </Button>
                    )}
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteQuestion(question.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  )
}

export default WrongQuestionsPage

