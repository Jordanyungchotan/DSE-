import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, Progress, Collapse, Tag, Divider } from 'antd'
import {
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  HomeOutlined,
  BarChartOutlined,
  BulbOutlined,
  RightOutlined,
  FireOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { useQuizStore, SUPPORTED_SUBJECTS, GRADE_LEVELS, DIFFICULTY_LEVELS } from '../stores/quizStore'
import { useLanguageStore } from '../stores/languageStore'
import ShareResult from '../components/ShareResult/ShareResult'
import LearningRecommendCard from '../components/LearningRecommendCard'
import styles from './QuizResultPage.module.css'

const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

/**
 * DSE智能刷题 - 结果页面
 */
const QuizResultPage = () => {
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const { currentSession, currentReport, generateReport, clearSession } = useQuizStore()
  const [showShareModal, setShowShareModal] = useState(false)

  // 如果没有会话或报告，生成报告或重定向
  useEffect(() => {
    if (!currentSession) {
      navigate('/quiz')
      return
    }

    if (!currentReport && currentSession.status === 'completed') {
      generateReport()
    }
  }, [currentSession, currentReport, generateReport, navigate])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}分${secs}秒`
    }
    return `${secs}秒`
  }

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

  // 获取成绩等级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return '#52c41a'
      case 'B':
        return '#1890ff'
      case 'C':
        return '#faad14'
      case 'D':
        return '#fa8c16'
      case 'E':
        return '#f5222d'
      default:
        return '#8c8c8c'
    }
  }

  // 重新开始
  const handleRestart = () => {
    clearSession()
    navigate('/quiz')
  }

  // 返回首页
  const handleGoHome = () => {
    clearSession()
    navigate('/')
  }

  if (!currentSession || !currentReport) {
    return null
  }

  const difficulty = getDifficulty()
  const { scores, detailedAnswers, recommendations } = currentReport

  return (
    <div className={styles.resultPage}>
      {/* 顶部成绩概览 */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.trophyIcon}>
            <TrophyOutlined />
          </div>
          <Title level={2} className={styles.heroTitle}>
            刷题完成！
          </Title>
          <div className={styles.sessionInfo}>
            <span>{getSubjectName()}</span>
            <span>•</span>
            <span>{getGradeName()}</span>
            <span>•</span>
            {difficulty && (
              <Tag color={difficulty.color}>
                <FireOutlined /> {difficulty.name}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* 成绩卡片 */}
      <div className={styles.scoreSection}>
        <Row gutter={[24, 24]}>
          {/* 主成绩卡片 */}
          <Col xs={24} lg={8}>
            <Card className={styles.mainScoreCard}>
              <div className={styles.scoreCircle}>
                <div
                  className={styles.scoreValue}
                  style={{ color: getGradeColor(scores.grade) }}
                >
                  {scores.grade}
                </div>
                <div className={styles.scoreLabel}>等级评定</div>
              </div>
              <div className={styles.accuracyBar}>
                <div className={styles.accuracyLabel}>
                  <span>{t('quiz.result.accuracy')}</span>
                  <span className={styles.accuracyValue}>{scores.accuracy}%</span>
                </div>
                <Progress
                  percent={scores.accuracy}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#1890ff',
                    '100%': scores.accuracy >= 60 ? '#52c41a' : '#f5222d',
                  }}
                  trailColor="#e8e8e8"
                  strokeWidth={12}
                />
              </div>
            </Card>
          </Col>

          {/* 统计卡片 */}
          <Col xs={24} lg={16}>
            <Card className={styles.statsCard}>
              <Row gutter={[24, 24]}>
                <Col xs={12} sm={6}>
                  <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>
                      <BarChartOutlined />
                    </div>
                    <div className={styles.statValue}>{scores.totalQuestions}</div>
                    <div className={styles.statLabel}>总题数</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>
                      <CheckCircleOutlined />
                    </div>
                    <div className={styles.statValue}>{scores.correctAnswers}</div>
                    <div className={styles.statLabel}>正确</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: 'rgba(245, 34, 45, 0.1)', color: '#f5222d' }}>
                      <CloseCircleOutlined />
                    </div>
                    <div className={styles.statValue}>{scores.totalQuestions - scores.correctAnswers}</div>
                    <div className={styles.statLabel}>错误</div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className={styles.statItem}>
                    <div className={styles.statIcon} style={{ background: 'rgba(250, 173, 20, 0.1)', color: '#faad14' }}>
                      <ClockCircleOutlined />
                    </div>
                    <div className={styles.statValue}>{formatTime(currentReport.totalTime)}</div>
                    <div className={styles.statLabel}>用时</div>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>

      {/* AI建议 */}
      <Card className={styles.recommendCard}>
        <div className={styles.recommendHeader}>
          <BulbOutlined className={styles.recommendIcon} />
          <Title level={4}>学习建议</Title>
        </div>
        <div className={styles.recommendList}>
          {recommendations.map((rec, index) => (
            <div key={index} className={styles.recommendItem}>
              <RightOutlined className={styles.recommendArrow} />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 智能学习推荐 */}
      <LearningRecommendCard onActionClick={clearSession} />

      {/* 详细答题记录 */}
      <Card className={styles.detailCard}>
        <Title level={4} className={styles.detailTitle}>
          答题详情
        </Title>
        <Collapse accordion className={styles.detailCollapse}>
          {detailedAnswers.map((answer, index) => (
            <Panel
              key={answer.questionId}
              header={
                <div className={styles.panelHeader}>
                  <span className={styles.questionNum}>第 {index + 1} 题</span>
                  {answer.isCorrect ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      正确
                    </Tag>
                  ) : (
                    <Tag color="error" icon={<CloseCircleOutlined />}>
                      错误
                    </Tag>
                  )}
                </div>
              }
            >
              <div className={styles.answerDetail}>
                <div className={styles.questionText}>
                  <Text strong>题目：</Text>
                  <Paragraph>{answer.question}</Paragraph>
                </div>

                <Divider dashed />

                <div className={styles.answerCompare}>
                  <div className={styles.answerItem}>
                    <Text type="secondary">您的答案</Text>
                    <div className={`${styles.answerBox} ${answer.isCorrect ? styles.correct : styles.incorrect}`}>
                      {answer.userAnswer !== undefined ? String(answer.userAnswer) : '未作答'}
                    </div>
                  </div>
                  <div className={styles.answerItem}>
                    <Text type="secondary">正确答案</Text>
                    <div className={`${styles.answerBox} ${styles.correct}`}>
                      {String(answer.correctAnswer)}
                    </div>
                  </div>
                </div>

                <Divider dashed />

                <div className={styles.explanationSection}>
                  <Text strong style={{ color: 'var(--color-primary)' }}>解析</Text>
                  <Paragraph className={styles.explanationText}>
                    {answer.explanation}
                  </Paragraph>
                </div>
              </div>
            </Panel>
          ))}
        </Collapse>
      </Card>

      {/* 操作按钮 */}
      <div className={styles.actionSection}>
        <Button
          size="large"
          icon={<HomeOutlined />}
          onClick={handleGoHome}
          className={styles.homeButton}
        >
          返回首页
        </Button>
        <Button
          size="large"
          icon={<ShareAltOutlined />}
          onClick={() => setShowShareModal(true)}
          className={styles.shareButton}
        >
          分享成绩
        </Button>
        <Button
          type="primary"
          size="large"
          icon={<ReloadOutlined />}
          onClick={handleRestart}
          className={styles.restartButton}
        >
          再来一次
        </Button>
      </div>

      {/* 分享弹窗 */}
      <ShareResult
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        result={{
          subject: currentSession.config.subject,
          subjectName: getSubjectName().replace(/^[^\s]+\s/, ''),
          grade: currentSession.config.grade,
          gradeName: getGradeName(),
          difficulty: currentSession.config.difficulty,
          difficultyName: difficulty?.name || '',
          questionCount: scores.totalQuestions,
          correctCount: scores.correctAnswers,
          accuracy: scores.accuracy,
          score: scores.accuracy,
          timeSpent: currentSession.timeSpent,
          date: new Date().toLocaleDateString('zh-CN'),
        }}
      />
    </div>
  )
}

export default QuizResultPage

