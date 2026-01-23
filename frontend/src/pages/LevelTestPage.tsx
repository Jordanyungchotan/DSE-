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
import { apiFetch, ragFetch } from '../config/api'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import MathText from '../components/MathText'
import styles from './LevelTestPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 映射RAG题型到前端题型
function mapQuestionType(type: string): 'choice' | 'short' | 'long' {
  const typeMap: Record<string, 'choice' | 'short' | 'long'> = {
    'multiple_choice': 'choice',
    'short_answer': 'short',
    'long_answer': 'long',
  }
  return typeMap[type] || 'choice'
}

// 根据题型获取分值
function getMaxScore(type: string): number {
  const scoreMap: Record<string, number> = {
    'multiple_choice': 2,
    'short_answer': 4,
    'long_answer': 8,
    'choice': 2,
    'short': 4,
    'long': 8,
  }
  return scoreMap[type] || 2
}

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
  imageUrl?: string // AI生成的题目图片
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
  const { t } = useLanguageStore()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gradingStatus, setGradingStatus] = useState<string>('')
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
        // 首先尝试从localStorage读取RAG服务生成的测试数据
        const cachedData = localStorage.getItem(`level_test_${testId}`)
        let response: TestData & { error?: string; source?: string }
        
        if (cachedData) {
          console.log('[LevelTest] 从缓存加载测试数据')
          const parsed = JSON.parse(cachedData)
          response = {
            testId: parsed.testId,
            grade: parsed.grade || '',
            subject: parsed.subject || '',
            testType: parsed.testType || 'full',
            status: 'active',
            questions: parsed.questions.map((q: Record<string, unknown>, idx: number) => ({
              id: q.id || `q_${idx}`,
              questionIndex: idx,
              questionText: q.question || q.questionText || q.stem || '',
              questionType: mapQuestionType(q.questionType as string),
              options: q.options as string[] | undefined,
              difficulty: q.difficulty as 'easy' | 'medium' | 'hard' || 'medium',
              estimatedTime: (q.estimatedTime as number) || 60,
              maxScore: getMaxScore(q.questionType as string),
              knowledgePoints: (q.topicTags as string[]) || [],
              topic: Array.isArray(q.topicTags) ? (q.topicTags as string[])[0] : undefined,
              isMarked: false,
              userAnswer: undefined,
              imageUrl: q.imageUrl as string | undefined, // AI生成的图片
            })),
            startedAt: parsed.startedAt,
            timeLimit: parsed.timeLimit,
            source: parsed.source,
          }
        } else {
          // 回退到后端API
          const res = await apiFetch(`/api/level-test/${testId}/questions`)
          response = await res.json() as TestData & { error?: string }
        }
        
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
          message.error(t('levelTest.setup.generateFailed'))
          navigate('/level-test')
        }
      } catch (error) {
        console.error('Load test error:', error)
        message.error(t('levelTest.setup.generateFailed'))
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
    message.warning(t('levelTest.timeUp'))
    await handleSubmit()
  }

  const handleSubmit = async () => {
    if (!testId || !testData) return
    
    setSubmitting(true)
    setShowSubmitModal(false)
    setGradingStatus(t('levelTest.submit.submitting'))
    
    try {
      const totalTimeSpent = testData.timeLimit - timeRemaining
      
      // 检查测试来源
      const cachedData = localStorage.getItem(`level_test_${testId}`)
      const isRagTest = cachedData && JSON.parse(cachedData).source === 'rag'
      
      if (isRagTest) {
        // RAG服务生成的测试：本地评分
        setGradingStatus(t('levelTest.submit.grading'))
        
        const parsedCache = JSON.parse(cachedData)
        const questions = parsedCache.questions || []
        
        let correctCount = 0
        let totalScore = 0
        let maxScore = 0
        
        const gradedQuestions = testData.questions.map((q, idx) => {
          const originalQ = questions[idx] || {}
          const userAnswer = answers[q.id]
          const correctAnswer = originalQ.correctAnswer || originalQ.correct_answer
          
          // 计算分数
          let questionScore = 0
          const qMaxScore = q.maxScore || getMaxScore(q.questionType)
          maxScore += qMaxScore
          
          if (q.questionType === 'choice') {
            // 选择题：完全匹配
            const isCorrect = userAnswer?.toUpperCase() === correctAnswer?.toUpperCase()
            if (isCorrect) {
              correctCount++
              questionScore = qMaxScore
            }
          } else {
            // 简答题/论述题：有答案就给部分分
            if (userAnswer && userAnswer.trim().length > 10) {
              questionScore = Math.round(qMaxScore * 0.6) // 给60%的分
            } else if (userAnswer && userAnswer.trim().length > 0) {
              questionScore = Math.round(qMaxScore * 0.3) // 给30%的分
            }
          }
          
          totalScore += questionScore
          
          return {
            ...q,
            userAnswer,
            correctAnswer,
            explanation: originalQ.explanation,
            score: questionScore,
            maxScore: qMaxScore,
            isCorrect: q.questionType === 'choice' ? userAnswer?.toUpperCase() === correctAnswer?.toUpperCase() : null,
          }
        })
        
        // 计算DSE预测等级
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
        let predictedGrade = '1'
        if (percentage >= 90) predictedGrade = '5**'
        else if (percentage >= 80) predictedGrade = '5*'
        else if (percentage >= 70) predictedGrade = '5'
        else if (percentage >= 60) predictedGrade = '4'
        else if (percentage >= 50) predictedGrade = '3'
        else if (percentage >= 40) predictedGrade = '2'
        
        // 保存报告到localStorage
        const report = {
          testId,
          grade: parsedCache.grade,
          subject: parsedCache.subject,
          testType: parsedCache.testType,
          totalQuestions: testData.questions.length,
          correctCount,
          totalScore,
          maxScore,
          percentage: Math.round(percentage),
          predictedGrade,
          timeSpent: totalTimeSpent,
          completedAt: new Date().toISOString(),
          questions: gradedQuestions,
        }
        
        localStorage.setItem(`level_test_report_${testId}`, JSON.stringify(report))
        
        // 清理测试缓存
        localStorage.removeItem(`level_test_${testId}`)
        
        // 发放积分 - 依赖 Authorization header，不传 user_id
        const isAuthenticated = useAuthStore.getState().isAuthenticated
        if (isAuthenticated) {
          try {
            // ⚠️ 不传 user_id，后端从 JWT 获取
            const response = await ragFetch('/api/test/complete', {
              method: 'POST',
              body: JSON.stringify({
                test_id: testId,
                total_questions: testData.questions.length,
                correct_count: correctCount,
                score: Math.round(percentage),
                time_spent: totalTimeSpent
              })
            })
            
            if (response.status === 401) {
              console.warn('[LevelTest] 401 - 用户未登录，无法记录积分')
            } else {
              const result = await response.json()
              if (result.code === 0 || result.success) {
                console.log('[LevelTest] ✅ Points awarded:', result)
              }
            }
          } catch (e) {
            console.warn('[LevelTest] Points award failed:', e)
          }
        } else {
          console.warn('[LevelTest] 未登录，跳过积分发放')
        }
        
        setGradingStatus(t('levelTest.submit.completed'))
        message.success(t('levelTest.submit.success'))
        setTimeout(() => {
          navigate(`/level-test/${testId}/report`)
        }, 1000)
      } else {
        // 原有后端测试
        const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
          timeSpent: 0
        }))
        
        setGradingStatus(t('levelTest.submit.grading'))
        
        const progressMessages = [
          t('levelTest.submit.gradingMC'),
          t('levelTest.submit.gradingSA'),
          t('levelTest.submit.gradingLA'),
          t('levelTest.submit.generatingReport'),
          t('levelTest.submit.almostDone')
        ]
        let msgIndex = 0
        const progressInterval = setInterval(() => {
          if (msgIndex < progressMessages.length) {
            setGradingStatus(progressMessages[msgIndex])
            msgIndex++
          }
        }, 3000)
        
        const res = await apiFetch(`/api/level-test/${testId}/submit`, {
          method: 'POST',
          body: JSON.stringify({
            answers: answersArray,
            totalTimeSpent
          })
        })
        
        clearInterval(progressInterval)
        const response = await res.json() as { success?: boolean; error?: string }
        
        if (response.success) {
          setGradingStatus(t('levelTest.submit.completed'))
          message.success(t('levelTest.submit.success'))
          setTimeout(() => {
            navigate(`/level-test/${testId}/report`)
          }, 1000)
        } else {
          setGradingStatus('')
          message.error(response.error || t('levelTest.submit.failed'))
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      setGradingStatus('')
      message.error(t('levelTest.submit.failed'))
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
      case 'easy': return t('quiz.difficulties.basic')
      case 'medium': return t('quiz.difficulties.standard')
      case 'hard': return t('quiz.difficulties.challenging')
      default: return difficulty
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'choice': return t('levelTest.questionTypes.choice')
      case 'short': return t('levelTest.questionTypes.short')
      case 'long': return t('levelTest.questionTypes.long')
      default: return type
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip={t('common.loading')} />
      </div>
    )
  }

  if (!testData) {
    return (
      <div className={styles.errorContainer}>
        <Text>{t('levelTest.testNotFound')}</Text>
        <Button onClick={() => navigate('/level-test')}>{t('common.back')}</Button>
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
      {/* 批改中遮罩层 */}
      {submitting && (
        <div className={styles.gradingOverlay}>
          <div className={styles.gradingContent}>
            <Spin size="large" />
            <Title level={3} className={styles.gradingTitle}>{t('levelTest.submit.grading')}</Title>
            <Text className={styles.gradingStatus}>{gradingStatus}</Text>
            <div className={styles.gradingTips}>
              <Text type="secondary">{t('levelTest.gradingTips.wait')}</Text>
              <Text type="secondary">{t('levelTest.gradingTips.ai')}</Text>
            </div>
            <Progress 
              type="circle" 
              percent={gradingStatus.includes('完成') ? 100 : undefined} 
              status={gradingStatus.includes('完成') ? 'success' : 'active'}
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
            />
          </div>
        </div>
      )}

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
            {t('levelTest.progress.submitTest')}
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
          <Title level={5}>{t('levelTest.progress.questionCard')}</Title>
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
              <Text type="secondary">{t('levelTest.progress.answered')}</Text>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.markedDot}`}></span>
              <Text type="secondary">{t('levelTest.progress.marked')}</Text>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.currentDot}`}></span>
              <Text type="secondary">{t('levelTest.progress.current')}</Text>
            </div>
          </div>
          
          <div className={styles.stats}>
            <Text>{t('levelTest.progress.answered')}: {answeredCount}/{testData.questions.length}</Text>
            <Text>{t('levelTest.progress.marked')}: {markedQuestions.size}</Text>
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
              <Tag color="cyan">{currentQuestion.maxScore}{t('levelTest.points')}</Tag>
            </div>
            <Button
              type={markedQuestions.has(currentIndex) ? 'primary' : 'default'}
              icon={<FlagOutlined />}
              onClick={() => toggleMark(currentIndex)}
            >
              {t('levelTest.progress.markQuestion')}
            </Button>
          </div>

          <div className={styles.questionContent}>
            <Title level={4} className={styles.questionNumber}>
              {t('levelTest.progress.question').replace('{current}', String(currentIndex + 1))}
            </Title>
            {/* 显示AI生成的题目图片 */}
            {currentQuestion.imageUrl && (
              <div className={styles.questionImage}>
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="题目图表" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '400px', 
                    borderRadius: '8px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
              </div>
            )}
            <Paragraph className={styles.questionText}>
              <MathText text={currentQuestion.questionText} />
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
                    <MathText text={option} />
                  </Radio>
                ))}
              </Radio.Group>
            )}

            {currentQuestion.questionType === 'short' && (
              <TextArea
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder={t('levelTest.progress.pleaseAnswer')}
                rows={4}
                className={styles.textInput}
              />
            )}

            {currentQuestion.questionType === 'long' && (
              <TextArea
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder={t('levelTest.progress.pleaseAnswerLong')}
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
              <Text type="secondary">{t('levelTest.progress.relatedTopics')}:</Text>
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
              {t('levelTest.progress.previousQuestion')}
            </Button>
            
            <Space>
              {currentIndex < testData.questions.length - 1 ? (
                <Button
                  type="primary"
                  onClick={() => goToQuestion(currentIndex + 1)}
                >
                  {t('levelTest.progress.nextQuestion')} <RightOutlined />
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => setShowSubmitModal(true)}
                  icon={<SendOutlined />}
                >
                  {t('levelTest.progress.submitTest')}
                </Button>
              )}
            </Space>
          </div>
        </Card>
      </div>

      {/* 提交确认弹窗 */}
      <Modal
        title={t('levelTest.confirmSubmit.title')}
        open={showSubmitModal}
        onCancel={() => setShowSubmitModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowSubmitModal(false)}>
            {t('levelTest.confirmSubmit.continue')}
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => handleSubmit()}
            loading={submitting}
          >
            {t('common.confirm')}
          </Button>
        ]}
      >
        <div className={styles.submitModal}>
          <div className={styles.submitStats}>
            <div className={styles.submitStatItem}>
              <CheckCircleOutlined className={styles.iconGreen} />
              <Text>{t('levelTest.confirmSubmit.answered')}: {answeredCount}/{testData.questions.length}</Text>
            </div>
            {testData.questions.length - answeredCount > 0 && (
              <div className={styles.submitStatItem}>
                <ExclamationCircleOutlined className={styles.iconOrange} />
                <Text type="warning">
                  {t('levelTest.confirmSubmit.unanswered')}: {testData.questions.length - answeredCount}
                </Text>
              </div>
            )}
            {markedQuestions.size > 0 && (
              <div className={styles.submitStatItem}>
                <FlagOutlined className={styles.iconBlue} />
                <Text>{t('levelTest.confirmSubmit.marked')}: {markedQuestions.size}</Text>
              </div>
            )}
          </div>
          
          {testData.questions.length - answeredCount > 0 && (
            <Paragraph type="warning" className={styles.submitWarning}>
              {t('levelTest.confirmSubmit.warning').replace('{count}', String(testData.questions.length - answeredCount))}
            </Paragraph>
          )}
        </div>
      </Modal>
    </div>
  )
}

