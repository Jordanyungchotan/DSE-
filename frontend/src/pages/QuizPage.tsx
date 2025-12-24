import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Progress, Typography, Modal, Radio, Input, Space, Tag, message, Tooltip } from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  FireOutlined,
  StarOutlined,
  StarFilled,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuizStore, SUPPORTED_SUBJECTS, GRADE_LEVELS, DIFFICULTY_LEVELS } from '../stores/quizStore'
import styles from './QuizPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/**
 * DSE智能刷题 - 答题页面
 */
// 清理选项中的字母前缀（如 "A. ", "A、", "A.", "A " 等）
const cleanOptionPrefix = (option: string): string => {
  // 匹配开头的字母前缀模式：A. / A、/ A. / A  / (A) 等
  return option.replace(/^[A-Da-d][.、．\s)\]】]*\s*/i, '').trim()
}

const QuizPage = () => {
  const navigate = useNavigate()
  const {
    currentSession,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    finishQuiz,
    pauseQuiz,
    resumeQuiz,
    clearSession,
    saveWrongQuestion,
  } = useQuizStore()

  const [currentAnswer, setCurrentAnswer] = useState<string | number>('')
  const [timer, setTimer] = useState(0)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [favoriteQuestions, setFavoriteQuestions] = useState<Set<string>>(new Set())
  const [showTimeWarning, setShowTimeWarning] = useState(false)

  // 计算时间限制（秒）
  const timeLimit = useMemo(() => {
    if (!currentSession?.config.timeLimit) return null
    return currentSession.config.timeLimit * 60 // 转换为秒
  }, [currentSession?.config.timeLimit])

  // 计算剩余时间
  const remainingTime = useMemo(() => {
    if (!timeLimit) return null
    return Math.max(0, timeLimit - timer)
  }, [timeLimit, timer])

  // 如果没有会话，重定向到设置页面
  useEffect(() => {
    if (!currentSession) {
      navigate('/quiz')
    }
  }, [currentSession, navigate])

  // 计时器
  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') return

    const interval = setInterval(() => {
      setTimer((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [currentSession])

  // 时间警告检测
  useEffect(() => {
    if (remainingTime !== null && remainingTime <= 60 && remainingTime > 0 && !showTimeWarning) {
      setShowTimeWarning(true)
      message.warning('⏰ 剩余时间不足1分钟！')
    }
  }, [remainingTime, showTimeWarning])

  // 时间到自动提交
  useEffect(() => {
    if (remainingTime === 0) {
      message.error('时间到！自动提交答案...')
      handleFinishQuiz()
    }
  }, [remainingTime])

  // 当切换题目时，重置当前答案
  useEffect(() => {
    if (currentSession) {
      const currentQ = currentSession.questions[currentSession.currentQuestionIndex]
      setCurrentAnswer(currentQ?.userAnswer ?? '')
      setShowHint(false)
    }
  }, [currentSession?.currentQuestionIndex, currentSession])

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // 切换收藏
  const toggleFavorite = useCallback((questionId: string) => {
    setFavoriteQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
        message.info('已取消收藏')
      } else {
        newSet.add(questionId)
        message.success('已收藏题目')
      }
      return newSet
    })
  }, [])

  // 获取科目名称
  const getSubjectName = () => {
    if (!currentSession) return ''
    const allSubjects = [
      ...SUPPORTED_SUBJECTS.CORE,
      ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
      ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
    ]
    const subject = allSubjects.find((s) => s.id === currentSession.config.subject)
    return subject ? `${subject.icon} ${subject.name}` : ''
  }

  // 获取年级名称
  const getGradeName = () => {
    if (!currentSession) return ''
    const grade = GRADE_LEVELS.find((g) => g.id === currentSession.config.grade)
    return grade?.name || ''
  }

  // 获取难度配置
  const getDifficulty = () => {
    if (!currentSession) return null
    return DIFFICULTY_LEVELS.find((d) => d.id === currentSession.config.difficulty)
  }

  // 提交当前答案
  const handleSubmitAnswer = async () => {
    if (currentAnswer === '' || currentAnswer === undefined) {
      message.warning('请先选择或输入答案')
      return
    }
    
    const currentQ = currentSession?.questions[currentSession.currentQuestionIndex]
    if (!currentQ) return

    setSubmitting(true)

    try {
      // 调用后端智能批改API
      const { apiFetch } = await import('../config/api')
      const response = await apiFetch('/api/quiz/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          questionType: currentQ.questionType,
          correctAnswer: currentQ.correctAnswer,
          studentAnswer: currentAnswer,
          options: currentQ.options,
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // 使用后端返回的智能匹配结果
        submitAnswer(currentAnswer, result.isCorrect)
        
        // 显示智能反馈
        if (result.isCorrect) {
          message.success(result.feedback || '答案正确！✅')
        } else {
          message.error(result.feedback || '答案不正确')
          // 保存到错题本
          saveWrongQuestion(currentQ, currentAnswer).catch(() => {})
        }
      } else {
        // 后端请求失败，使用本地匹配
        const isCorrect = localAnswerMatch(currentAnswer, currentQ.correctAnswer, currentQ.questionType)
        submitAnswer(currentAnswer, isCorrect)
        
        if (isCorrect) {
          message.success('答案正确！✅')
        } else {
          message.error('答案不正确')
          saveWrongQuestion(currentQ, currentAnswer).catch(() => {})
        }
      }
    } catch {
      // 网络错误，使用本地匹配
      const isCorrect = localAnswerMatch(currentAnswer, currentQ.correctAnswer, currentQ.questionType)
      submitAnswer(currentAnswer, isCorrect)
      
      if (isCorrect) {
        message.success('答案正确！✅')
      } else {
        message.error('答案不正确')
        saveWrongQuestion(currentQ, currentAnswer).catch(() => {})
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 本地答案匹配（作为后备方案）
  const localAnswerMatch = (userAnswer: string | number, correctAnswer: string | number, questionType: string): boolean => {
    const userStr = String(userAnswer).trim().toLowerCase()
    const expectedStr = String(correctAnswer).trim().toLowerCase()
    
    // 完全匹配
    if (userStr === expectedStr) return true
    
    // 规范化匹配
    const normalizeStr = (s: string) => s
      .replace(/\s+/g, '')
      .replace(/[，。：；]/g, '')
      .replace(/^(答|答案|解|结果|等于)[:：]?/i, '')
    
    if (normalizeStr(userStr) === normalizeStr(expectedStr)) return true
    
    // 选择题特殊处理
    if (questionType === 'multiple_choice') {
      const userChoice = userStr.charAt(0).toUpperCase()
      let expectedChoice = expectedStr.charAt(0).toUpperCase()
      // 如果是数字索引，转换为字母
      if (/^\d$/.test(expectedChoice)) {
        expectedChoice = String.fromCharCode(65 + parseInt(expectedChoice))
      }
      if (/^[A-D]$/.test(userChoice) && userChoice === expectedChoice) return true
    }
    
    // 数值匹配
    const extractNum = (s: string): number | null => {
      const match = s.replace(/[¥$€£\s]/g, '').match(/[-+]?\d*\.?\d+/)
      return match ? parseFloat(match[0]) : null
    }
    
    const userNum = extractNum(userStr)
    const expectedNum = extractNum(expectedStr)
    
    if (userNum !== null && expectedNum !== null) {
      const tolerance = Math.abs(expectedNum) * 0.001 + 0.001
      if (Math.abs(userNum - expectedNum) < tolerance) return true
    }
    
    return false
  }

  // 下一题
  const handleNextQuestion = () => {
    if (!currentSession) return

    // 如果当前题目已答过，直接跳转
    const currentQ = currentSession.questions[currentSession.currentQuestionIndex]
    if (currentQ.userAnswer === undefined && currentAnswer !== '') {
      submitAnswer(currentAnswer)
    }

    if (currentSession.currentQuestionIndex < currentSession.questions.length - 1) {
      nextQuestion()
    }
  }

  // 上一题
  const handlePreviousQuestion = () => {
    if (!currentSession || currentSession.currentQuestionIndex <= 0) return
    previousQuestion()
  }

  // 结束刷题
  const handleFinishQuiz = async () => {
    setSubmitting(true)
    try {
      // 提交当前未提交的答案
      const currentQ = currentSession?.questions[currentSession.currentQuestionIndex]
      if (currentQ && currentQ.userAnswer === undefined && currentAnswer !== '') {
        submitAnswer(currentAnswer)
      }

      await finishQuiz()
      navigate('/quiz/result')
    } catch {
      message.error('结束刷题失败')
    } finally {
      setSubmitting(false)
      setShowExitModal(false)
    }
  }

  // 退出刷题
  const handleExitQuiz = () => {
    clearSession()
    navigate('/quiz')
  }

  // 暂停/继续
  const handleTogglePause = () => {
    if (!currentSession) return
    if (currentSession.status === 'active') {
      pauseQuiz()
    } else {
      resumeQuiz()
    }
  }

  if (!currentSession) {
    return null
  }

  const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex]
  const isLastQuestion = currentSession.currentQuestionIndex === currentSession.questions.length - 1
  const answeredCount = currentSession.questions.filter((q) => q.userAnswer !== undefined).length
  const progress = (answeredCount / currentSession.questions.length) * 100
  const difficulty = getDifficulty()

  return (
    <div className={styles.quizPage}>
      {/* 顶部状态栏 */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.subjectBadge}>{getSubjectName()}</span>
          <span className={styles.gradeBadge}>{getGradeName()}</span>
          {difficulty && (
            <Tag color={difficulty.color} className={styles.difficultyTag}>
              <FireOutlined /> {difficulty.name}
            </Tag>
          )}
        </div>
        <div className={styles.statusCenter}>
          {timeLimit ? (
            // 倒计时模式
            <div className={`${styles.countdown} ${remainingTime && remainingTime <= 60 ? styles.warning : ''}`}>
              {remainingTime && remainingTime <= 60 && <WarningOutlined className={styles.warningIcon} />}
              <ClockCircleOutlined />
              <span className={styles.timer}>
                {remainingTime !== null ? formatTime(remainingTime) : '--:--'}
              </span>
              <Text type="secondary" className={styles.timerLabel}>剩余</Text>
            </div>
          ) : (
            // 正计时模式
            <div className={styles.stopwatch}>
              <ClockCircleOutlined />
              <span className={styles.timer}>{formatTime(timer)}</span>
              <Text type="secondary" className={styles.timerLabel}>用时</Text>
            </div>
          )}
        </div>
        <div className={styles.statusRight}>
          <Button
            type="text"
            icon={currentSession.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handleTogglePause}
          >
            {currentSession.status === 'active' ? '暂停' : '继续'}
          </Button>
          <Button
            type="text"
            danger
            icon={<StopOutlined />}
            onClick={() => setShowExitModal(true)}
          >
            结束
          </Button>
        </div>
      </div>

      {/* 进度条 */}
      <div className={styles.progressSection}>
        <div className={styles.progressInfo}>
          <span>
            第 <strong>{currentSession.currentQuestionIndex + 1}</strong> / {currentSession.questions.length} 题
          </span>
          <span>已完成 {answeredCount} 题</span>
        </div>
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor={{
            '0%': 'var(--color-primary)',
            '100%': 'var(--color-accent)',
          }}
          className={styles.progressBar}
        />
      </div>

      {/* 暂停遮罩 */}
      {currentSession.status === 'paused' && (
        <div className={styles.pauseOverlay}>
          <div className={styles.pauseContent}>
            <PauseCircleOutlined className={styles.pauseIcon} />
            <Title level={3}>已暂停</Title>
            <Paragraph>点击继续按钮恢复刷题</Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleTogglePause}
            >
              继续刷题
            </Button>
          </div>
        </div>
      )}

      {/* 题目内容 */}
      <div className={styles.questionSection}>
        <Card className={styles.questionCard}>
          {/* 题目类型标签 */}
          <div className={styles.questionMeta}>
            <div className={styles.questionTags}>
              <Tag color="blue">
                <QuestionCircleOutlined />{' '}
                {currentQuestion.questionType === 'multiple_choice'
                  ? '选择题'
                  : currentQuestion.questionType === 'short_answer'
                  ? '简答题'
                  : currentQuestion.questionType === 'calculation'
                  ? '计算题'
                  : '解释题'}
              </Tag>
              {currentQuestion.topicTags?.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </div>
            <Tooltip title={favoriteQuestions.has(currentQuestion.id) ? '取消收藏' : '收藏题目'}>
              <Button
                type="text"
                icon={favoriteQuestions.has(currentQuestion.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                onClick={() => toggleFavorite(currentQuestion.id)}
                className={styles.favoriteBtn}
              />
            </Tooltip>
          </div>

          {/* 题目内容 */}
          <div className={styles.questionContent}>
            <Title level={4} className={styles.questionText}>
              {currentQuestion.question}
            </Title>
          </div>

          {/* 答题区域 */}
          <div className={styles.answerSection}>
            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options ? (
              <Radio.Group
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className={styles.optionsGroup}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {currentQuestion.options.map((option, index) => {
                    // 解析正确答案索引（支持数字、字母、文本格式）
                    const getCorrectIndex = () => {
                      const answer = currentQuestion.correctAnswer
                      if (typeof answer === 'number') return answer
                      if (typeof answer === 'string') {
                        const trimmed = answer.trim().toUpperCase()
                        if (/^[0-3]$/.test(trimmed)) return parseInt(trimmed)
                        if (/^[A-D]$/.test(trimmed)) return trimmed.charCodeAt(0) - 65
                        // 尝试匹配选项文本
                        const matchIdx = currentQuestion.options!.findIndex(
                          opt => opt.toLowerCase().includes(answer.toLowerCase()) ||
                                 answer.toLowerCase().includes(opt.toLowerCase())
                        )
                        if (matchIdx >= 0) return matchIdx
                      }
                      return -1
                    }
                    const correctIndex = getCorrectIndex()
                    const isCorrectOption = index === correctIndex
                    const isUserSelected = currentQuestion.userAnswer === index
                    const isAnswered = currentQuestion.userAnswer !== undefined
                    
                    return (
                      <Radio
                        key={index}
                        value={index}
                        className={`${styles.optionItem} ${
                          isAnswered
                            ? isCorrectOption
                              ? styles.correct  // 正确选项显示绿色
                              : isUserSelected
                              ? styles.incorrect  // 用户选错的显示红色
                              : ''
                            : ''
                        }`}
                      >
                        <span className={styles.optionLabel}>
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className={styles.optionText}>{cleanOptionPrefix(option)}</span>
                        {isAnswered && isCorrectOption && (
                          <span style={{ marginLeft: 8, color: '#52c41a', fontWeight: 'bold' }}>✓ 正确答案</span>
                        )}
                      </Radio>
                    )
                  })}
                </Space>
              </Radio.Group>
            ) : (
              <TextArea
                value={currentAnswer as string}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="请输入您的答案..."
                rows={4}
                className={styles.answerInput}
                disabled={currentQuestion.userAnswer !== undefined}
              />
            )}
          </div>

          {/* 提示按钮 */}
          {!currentQuestion.userAnswer && (
            <div className={styles.hintSection}>
              <Button
                type="link"
                icon={<BulbOutlined />}
                onClick={() => setShowHint(!showHint)}
              >
                {showHint ? '隐藏提示' : '获取提示'}
              </Button>
              {showHint && (
                <div className={styles.hintBox}>
                  <BulbOutlined className={styles.hintIcon} />
                  <Text type="secondary">
                    知识点: {currentQuestion.topicTags?.join(', ') || '暂无提示'}
                  </Text>
                </div>
              )}
            </div>
          )}

          {/* 已答题显示解析 */}
          {currentQuestion.userAnswer !== undefined && (
            <div className={styles.explanationSection}>
              <div
                className={`${styles.resultBadge} ${
                  currentQuestion.isCorrect ? styles.correctBadge : styles.incorrectBadge
                }`}
              >
                {currentQuestion.isCorrect ? (
                  <>
                    <CheckOutlined /> 回答正确
                  </>
                ) : (
                  <>
                    ✕ 回答错误
                  </>
                )}
              </div>

              {/* 始终显示正确答案（无论对错） */}
              <div className={styles.correctAnswer} style={{ 
                background: currentQuestion.isCorrect ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${currentQuestion.isCorrect ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 12
              }}>
                <Text strong style={{ color: currentQuestion.isCorrect ? '#52c41a' : '#ff4d4f' }}>
                  {currentQuestion.isCorrect ? '✓ 你选对了！' : '✗ 正确答案：'}
                </Text>
                {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options ? (
                  <Text style={{ marginLeft: 8, color: '#52c41a', fontWeight: 'bold' }}>
                    {(() => {
                      const answer = currentQuestion.correctAnswer
                      let answerIndex = -1
                      if (typeof answer === 'number') {
                        answerIndex = answer
                      } else if (typeof answer === 'string') {
                        const upperAnswer = answer.toUpperCase().trim()
                        if (/^[A-D]$/.test(upperAnswer)) {
                          answerIndex = upperAnswer.charCodeAt(0) - 65
                        } else if (/^[0-3]$/.test(answer)) {
                          answerIndex = parseInt(answer)
                        } else {
                          answerIndex = currentQuestion.options!.findIndex(
                            opt => opt.toLowerCase().includes(answer.toLowerCase()) || 
                                   answer.toLowerCase().includes(opt.toLowerCase())
                          )
                        }
                      }
                      
                      if (answerIndex >= 0 && answerIndex < currentQuestion.options!.length) {
                        return `${String.fromCharCode(65 + answerIndex)}. ${cleanOptionPrefix(currentQuestion.options![answerIndex])}`
                      }
                      return String(answer)
                    })()}
                  </Text>
                ) : (
                  <Text style={{ marginLeft: 8, color: '#52c41a', fontWeight: 'bold' }}>
                    {currentQuestion.correctAnswer}
                  </Text>
                )}
              </div>

              <div className={styles.explanationBox}>
                <Title level={5}>解析</Title>
                <Paragraph>{currentQuestion.explanation}</Paragraph>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 底部导航 */}
      <div className={styles.navigationBar}>
        <Button
          size="large"
          icon={<LeftOutlined />}
          onClick={handlePreviousQuestion}
          disabled={currentSession.currentQuestionIndex === 0}
          className={styles.navButton}
        >
          上一题
        </Button>

        <div className={styles.navCenter}>
          {currentQuestion.userAnswer === undefined ? (
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={handleSubmitAnswer}
              className={styles.submitButton}
              disabled={currentAnswer === ''}
            >
              提交答案
            </Button>
          ) : isLastQuestion ? (
            <Button
              type="primary"
              size="large"
              onClick={handleFinishQuiz}
              loading={submitting}
              className={styles.finishButton}
            >
              查看结果
            </Button>
          ) : null}
        </div>

        <Button
          size="large"
          icon={<RightOutlined />}
          onClick={handleNextQuestion}
          disabled={isLastQuestion && currentQuestion.userAnswer !== undefined}
          className={styles.navButton}
        >
          {isLastQuestion ? '最后一题' : '下一题'}
        </Button>
      </div>

      {/* 题目快速导航 */}
      <div className={styles.questionNav}>
        {currentSession.questions.map((q, index) => (
          <div
            key={q.id}
            className={`${styles.questionDot} ${
              index === currentSession.currentQuestionIndex ? styles.current : ''
            } ${q.userAnswer !== undefined ? (q.isCorrect ? styles.correct : styles.incorrect) : ''}`}
            onClick={() => {
              // 快速跳转逻辑
              if (index < currentSession.currentQuestionIndex) {
                for (let i = 0; i < currentSession.currentQuestionIndex - index; i++) {
                  previousQuestion()
                }
              } else {
                for (let i = 0; i < index - currentSession.currentQuestionIndex; i++) {
                  nextQuestion()
                }
              }
            }}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* 退出确认弹窗 */}
      <Modal
        title="结束刷题"
        open={showExitModal}
        onCancel={() => setShowExitModal(false)}
        footer={null}
        centered
      >
        <div className={styles.exitModal}>
          <Paragraph>
            您已完成 <strong>{answeredCount}</strong> / {currentSession.questions.length} 题
          </Paragraph>
          <Paragraph type="secondary">
            {answeredCount < currentSession.questions.length
              ? '还有题目未完成，确定要结束吗？'
              : '确定要结束刷题并查看结果吗？'}
          </Paragraph>
          <div className={styles.exitButtons}>
            <Button onClick={() => setShowExitModal(false)}>继续刷题</Button>
            <Button onClick={handleExitQuiz}>放弃本次</Button>
            <Button type="primary" onClick={handleFinishQuiz} loading={submitting}>
              提交并查看结果
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default QuizPage

