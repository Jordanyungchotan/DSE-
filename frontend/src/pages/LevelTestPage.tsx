import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, Button, message, Typography, Radio, Input, Progress, 
  Modal, Tag, Tooltip, Spin, Space, Divider 
} from 'antd'
import { 
  ClockCircleOutlined, 
  LeftOutlined, 
  RightOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import styles from './LevelTestPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Question {
  id: string
  questionIndex: number
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: number
  maxScore: number
  knowledgePoints: string[]
  topic?: string
  isMarked: boolean
  userAnswer?: string
}

interface TestData {
  testId: string
  grade: string
  subject: string
  testType: string
  status: string
  timeLimit: number
  startedAt: string
  questions: Question[]
}

export default function LevelTestPage() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [testData, setTestData] = useState<TestData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  
  const autosaveIntervalRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const questionStartTimeRef = useRef<number>(Date.now())

  // 加载测试数据
  useEffect(() => {
    const loadTest = async () => {
      if (!testId) return
      
      try {
        const res = await apiFetch(`/api/level-test/${testId}/questions`)
        const response = await res.json() as TestData & { error?: string }
        
        if (response.testId) {
          setTestData(response)
          
          // 初始化时间
          const startTime = new Date(response.startedAt).getTime()
          const elapsed = Math.floor((Date.now() - startTime) / 1000)
          const remaining = Math.max(0, response.timeLimit - elapsed)
          setTimeRemaining(remaining)
          
          // 恢复已保存的答案
          const savedAnswers: Record<string, string> = {}
          const savedMarked = new Set<number>()
          response.questions.forEach((q: Question) => {
            if (q.userAnswer) {
              savedAnswers[q.id] = q.userAnswer
            }
            if (q.isMarked) {
              savedMarked.add(q.questionIndex)
            }
          })
          setAnswers(savedAnswers)
          setMarkedQuestions(savedMarked)
        } else {
          message.error('加载测试失败')
          navigate('/level-test')
        }
      } catch (error) {
        console.error('Load test error:', error)
        message.error('加载测试失败')
        navigate('/level-test')
      } finally {
        setLoading(false)
      }
    }
    
    loadTest()
  }, [testId, navigate])

  // 倒计时
  useEffect(() => {
    if (timeRemaining <= 0) return
    
    timerIntervalRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // 时间到，自动提交
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timeRemaining > 0])

  // 自动保存
  useEffect(() => {
    autosaveIntervalRef.current = window.setInterval(() => {
      autoSave()
    }, 30000) // 每30秒保存
    
    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current)
      }
    }
  }, [answers, markedQuestions])

  const autoSave = useCallback(async () => {
    if (!testId || !testData) return
    
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }))
      
      await apiFetch(`/api/level-test/${testId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersArray,
          currentIndex,
          timeRemaining,
          markedQuestions: Array.from(markedQuestions)
        })
      })
      
      setLastSaveTime(new Date())
    } catch (error) {
      console.error('Autosave error:', error)
    }
  }, [testId, testData, answers, currentIndex, timeRemaining, markedQuestions])

  const handleAutoSubmit = async () => {
    message.warning('时间到！正在自动提交...')
    await handleSubmit()
  }

  const handleSubmit = async () => {
    if (!testId || !testData) return
    
    setSubmitting(true)
    setShowSubmitModal(false)
    
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
        timeSpent: 0
      }))
      
      const totalTimeSpent = testData.timeLimit - timeRemaining
      
      const res = await apiFetch(`/api/level-test/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersArray,
          totalTimeSpent
        })
      })
      const response = await res.json() as { success?: boolean; error?: string }
      
      if (response.success) {
        message.success('测试已提交！')
        navigate(`/level-test/${testId}/report`)
      } else {
        message.error(response.error || '提交失败')
      }
    } catch (error) {
      console.error('Submit error:', error)
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const toggleMark = (index: number) => {
    setMarkedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const goToQuestion = (index: number) => {
    questionStartTimeRef.current = Date.now()
    setCurrentIndex(index)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green'
      case 'medium': return 'orange'
      case 'hard': return 'red'
      default: return 'default'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '基础'
      case 'medium': return '中等'
      case 'hard': return '进阶'
      default: return difficulty
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'choice': return '选择题'
      case 'short': return '短答题'
      case 'long': return '论述题'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载测试中..." />
      </div>
    )
  }

  if (!testData) {
    return (
      <div className={styles.errorContainer}>
        <Text>测试不存在或已过期</Text>
        <Button onClick={() => navigate('/level-test')}>返回</Button>
      </div>
    )
  }

  const currentQuestion = testData.questions[currentIndex]
  const answeredCount = Object.keys(answers).filter(id => 
    answers[id] && answers[id].trim() !== ''
  ).length
  const progress = Math.round((answeredCount / testData.questions.length) * 100)

  return (
    <div className={styles.container}>
      {/* 顶部状态栏 */}
      <div className={styles.topBar}>
        <div className={styles.testInfo}>
          <Tag color="blue">{testData.grade}</Tag>
          <Tag color="purple">{testData.subject}</Tag>
          <span className={styles.questionCount}>
            {currentIndex + 1} / {testData.questions.length}
          </span>
        </div>
        
        <div className={`${styles.timer} ${timeRemaining < 300 ? styles.timerWarning : ''}`}>
          <ClockCircleOutlined />
          <span>{formatTime(timeRemaining)}</span>
        </div>
        
        <div className={styles.actions}>
          {lastSaveTime && (
            <Tooltip title={`上次保存: ${lastSaveTime.toLocaleTimeString()}`}>
              <SaveOutlined className={styles.saveIcon} />
            </Tooltip>
          )}
          <Button 
            type="primary" 
            onClick={() => setShowSubmitModal(true)}
            icon={<SendOutlined />}
          >
            提交测试
          </Button>
        </div>
      </div>

      {/* 进度条 */}
      <Progress 
        percent={progress} 
        showInfo={false} 
        strokeColor="var(--accent-primary)"
        className={styles.progressBar}
      />

      <div className={styles.mainContent}>
        {/* 答题卡 */}
        <Card className={styles.answerCard}>
          <Title level={5}>答题卡</Title>
          <div className={styles.questionGrid}>
            {testData.questions.map((q, idx) => {
              const isAnswered = answers[q.id] && answers[q.id].trim() !== ''
              const isMarked = markedQuestions.has(idx)
              const isCurrent = idx === currentIndex
              
              return (
                <Tooltip 
                  key={q.id} 
                  title={`${getQuestionTypeLabel(q.questionType)} - ${getDifficultyLabel(q.difficulty)}`}
                >
                  <div
                    className={`
                      ${styles.questionDot}
                      ${isCurrent ? styles.current : ''}
                      ${isAnswered ? styles.answered : ''}
                      ${isMarked ? styles.marked : ''}
                    `}
                    onClick={() => goToQuestion(idx)}
                  >
                    {idx + 1}
                    {isMarked && <FlagOutlined className={styles.flagIcon} />}
                  </div>
                </Tooltip>
              )
            })}
          </div>
          
          <Divider />
          
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.answeredDot}`}></span>
              <Text type="secondary">已答</Text>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.markedDot}`}></span>
              <Text type="secondary">标记</Text>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.currentDot}`}></span>
              <Text type="secondary">当前</Text>
            </div>
          </div>
          
          <div className={styles.stats}>
            <Text>已答: {answeredCount}/{testData.questions.length}</Text>
            <Text>标记: {markedQuestions.size}</Text>
          </div>
        </Card>

        {/* 题目区域 */}
        <Card className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <div className={styles.questionMeta}>
              <Tag color={getDifficultyColor(currentQuestion.difficulty)}>
                {getDifficultyLabel(currentQuestion.difficulty)}
              </Tag>
              <Tag>{getQuestionTypeLabel(currentQuestion.questionType)}</Tag>
              <Tag color="cyan">{currentQuestion.maxScore}分</Tag>
            </div>
            <Button
              type={markedQuestions.has(currentIndex) ? 'primary' : 'default'}
              icon={<FlagOutlined />}
              onClick={() => toggleMark(currentIndex)}
            >
              {markedQuestions.has(currentIndex) ? '已标记' : '标记'}
            </Button>
          </div>

          <div className={styles.questionContent}>
            <Title level={4} className={styles.questionNumber}>
              第 {currentIndex + 1} 题
            </Title>
            <Paragraph className={styles.questionText}>
              {currentQuestion.questionText}
            </Paragraph>
          </div>

          {/* 答题区域 */}
          <div className={styles.answerArea}>
            {currentQuestion.questionType === 'choice' && currentQuestion.options && (
              <Radio.Group
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                className={styles.optionsGroup}
              >
                {currentQuestion.options.map((option, idx) => (
                  <Radio 
                    key={idx} 
                    value={String.fromCharCode(65 + idx)}
                    className={styles.optionItem}
                  >
                    {option}
                  </Radio>
                ))}
              </Radio.Group>
            )}

            {currentQuestion.questionType === 'short' && (
              <TextArea
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="请输入答案..."
                rows={4}
                className={styles.textInput}
              />
            )}

            {currentQuestion.questionType === 'long' && (
              <TextArea
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="请详细作答..."
                rows={10}
                className={styles.textInput}
                showCount
                maxLength={2000}
              />
            )}
          </div>

          {/* 知识点提示 */}
          {currentQuestion.knowledgePoints.length > 0 && (
            <div className={styles.knowledgeHint}>
              <Text type="secondary">相关知识点：</Text>
              {currentQuestion.knowledgePoints.map((kp, idx) => (
                <Tag key={idx} color="default">{kp}</Tag>
              ))}
            </div>
          )}

          {/* 导航按钮 */}
          <div className={styles.navigation}>
            <Button
              icon={<LeftOutlined />}
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
            >
              上一题
            </Button>
            
            <Space>
              {currentIndex < testData.questions.length - 1 ? (
                <Button
                  type="primary"
                  onClick={() => goToQuestion(currentIndex + 1)}
                >
                  下一题 <RightOutlined />
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => setShowSubmitModal(true)}
                  icon={<SendOutlined />}
                >
                  提交测试
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </div>

      {/* 提交确认弹窗 */}
      <Modal
        title="确认提交"
        open={showSubmitModal}
        onCancel={() => setShowSubmitModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowSubmitModal(false)}>
            继续答题
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => handleSubmit()}
            loading={submitting}
          >
            确认提交
          </Button>
        ]}
      >
        <div className={styles.submitModal}>
          <div className={styles.submitStats}>
            <div className={styles.submitStatItem}>
              <CheckCircleOutlined className={styles.iconGreen} />
              <Text>已答题目: {answeredCount}/{testData.questions.length}</Text>
            </div>
            {testData.questions.length - answeredCount > 0 && (
              <div className={styles.submitStatItem}>
                <ExclamationCircleOutlined className={styles.iconOrange} />
                <Text type="warning">
                  未答题目: {testData.questions.length - answeredCount}
                </Text>
              </div>
            )}
            {markedQuestions.size > 0 && (
              <div className={styles.submitStatItem}>
                <FlagOutlined className={styles.iconBlue} />
                <Text>标记待检查: {markedQuestions.size}</Text>
              </div>
            )}
          </div>
          
          {testData.questions.length - answeredCount > 0 && (
            <Paragraph type="warning" className={styles.submitWarning}>
              您还有 {testData.questions.length - answeredCount} 道题未作答，确定要提交吗？
            </Paragraph>
          )}
        </div>
      </Modal>
    </div>
  )
}

