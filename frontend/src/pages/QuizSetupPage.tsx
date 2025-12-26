import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, message, Spin, Tooltip } from 'antd'
import {
  ThunderboltOutlined,
  BookOutlined,
  RocketOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FireOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import {
  useQuizStore,
  SUPPORTED_SUBJECTS,
  GRADE_LEVELS,
  DIFFICULTY_LEVELS,
  QUESTION_COUNT_OPTIONS,
} from '../stores/quizStore'
import styles from './QuizSetupPage.module.css'

const { Title, Paragraph, Text } = Typography

/**
 * DSE智能刷题 - 配置选择页面
 */
const QuizSetupPage = () => {
  const navigate = useNavigate()
  const { config, updateConfig, startQuiz, generating, error, setError } = useQuizStore()
  const [starting, setStarting] = useState(false)

  // 获取所有科目列表
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ]

  // 开始刷题
  const handleStartQuiz = async () => {
    if (!config.subject) {
      message.warning('请选择一个科目')
      return
    }
    if (!config.grade) {
      message.warning('请选择年级')
      return
    }
    if (!config.difficulty) {
      message.warning('请选择难度')
      return
    }

    setStarting(true)
    setError(null)

    try {
      await startQuiz()
      navigate('/quiz/practice')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '开始刷题失败，请重试'
      message.error(errorMessage)
    } finally {
      setStarting(false)
    }
  }

  // 获取选中科目的显示名称
  const getSelectedSubjectName = () => {
    const subject = allSubjects.find((s) => s.id === config.subject)
    return subject ? `${subject.icon} ${subject.name}` : '未选择'
  }

  // 获取选中年级的显示名称
  const getSelectedGradeName = () => {
    const grade = GRADE_LEVELS.find((g) => g.id === config.grade)
    return grade ? grade.name : '未选择'
  }

  // 获取选中难度的显示
  const getSelectedDifficulty = () => {
    return DIFFICULTY_LEVELS.find((d) => d.id === config.difficulty)
  }

  return (
    <div className={styles.setupPage}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBadge}>
            <ExperimentOutlined /> AI智能刷题
          </div>
          <Title level={1} className={styles.pageTitle}>
            <span className="gradient-title">DSE智能刷题系统</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            基于DeepSeek AI的动态题目生成，每次刷题都会根据您选择的配置，
            实时生成符合DSE考试标准的题目，助您高效备考。
          </Paragraph>
        </div>
      </div>

      {/* 配置区域 */}
      <div className={styles.configSection}>
        <Row gutter={[24, 24]}>
          {/* 左侧：配置选项 */}
          <Col xs={24} lg={16}>
            {/* 年级选择 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <BookOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>选择年级</Title>
                  <Text type="secondary">根据您当前的学习阶段选择</Text>
                </div>
              </div>
              <div className={styles.optionsGrid}>
                {GRADE_LEVELS.map((grade) => (
                  <div
                    key={grade.id}
                    className={`${styles.optionCard} ${
                      config.grade === grade.id ? styles.selected : ''
                    }`}
                    onClick={() => updateConfig({ grade: grade.id })}
                  >
                    <div className={styles.optionMain}>
                      <span className={styles.optionTitle}>{grade.name}</span>
                      {config.grade === grade.id && (
                        <CheckCircleOutlined className={styles.checkIcon} />
                      )}
                    </div>
                    <span className={styles.optionDesc}>{grade.description}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 科目选择 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <ThunderboltOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>选择科目</Title>
                  <Text type="secondary">选择您想要练习的科目</Text>
                </div>
              </div>

              {/* 核心科目 */}
              <div className={styles.subjectSection}>
                <Text strong className={styles.sectionLabel}>核心科目（必修）</Text>
                <div className={styles.subjectsGrid}>
                  {SUPPORTED_SUBJECTS.CORE.map((subject) => (
                    <Tooltip key={subject.id} title={subject.name}>
                      <div
                        className={`${styles.subjectCard} ${
                          config.subject === subject.id ? styles.selected : ''
                        }`}
                        onClick={() => updateConfig({ subject: subject.id })}
                      >
                        <span className={styles.subjectIcon}>{subject.icon}</span>
                        <span className={styles.subjectName}>{subject.name}</span>
                        {config.subject === subject.id && (
                          <CheckCircleOutlined className={styles.checkIcon} />
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* 理科选修 */}
              <div className={styles.subjectSection}>
                <Text strong className={styles.sectionLabel}>理科选修</Text>
                <div className={styles.subjectsGrid}>
                  {SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES.map((subject) => (
                    <Tooltip key={subject.id} title={subject.name}>
                      <div
                        className={`${styles.subjectCard} ${
                          config.subject === subject.id ? styles.selected : ''
                        }`}
                        onClick={() => updateConfig({ subject: subject.id })}
                      >
                        <span className={styles.subjectIcon}>{subject.icon}</span>
                        <span className={styles.subjectName}>{subject.name}</span>
                        {config.subject === subject.id && (
                          <CheckCircleOutlined className={styles.checkIcon} />
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* 文科选修 */}
              <div className={styles.subjectSection}>
                <Text strong className={styles.sectionLabel}>文科选修</Text>
                <div className={styles.subjectsGrid}>
                  {SUPPORTED_SUBJECTS.ARTS_ELECTIVES.map((subject) => (
                    <Tooltip key={subject.id} title={subject.name}>
                      <div
                        className={`${styles.subjectCard} ${
                          config.subject === subject.id ? styles.selected : ''
                        }`}
                        onClick={() => updateConfig({ subject: subject.id })}
                      >
                        <span className={styles.subjectIcon}>{subject.icon}</span>
                        <span className={styles.subjectName}>{subject.name}</span>
                        {config.subject === subject.id && (
                          <CheckCircleOutlined className={styles.checkIcon} />
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </Card>

            {/* 难度选择 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <FireOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>选择难度</Title>
                  <Text type="secondary">根据您的水平选择合适的难度</Text>
                </div>
              </div>
              <div className={styles.difficultyGrid}>
                {DIFFICULTY_LEVELS.map((diff) => (
                  <div
                    key={diff.id}
                    className={`${styles.difficultyCard} ${
                      config.difficulty === diff.id ? styles.selected : ''
                    }`}
                    style={{
                      '--accent-color': diff.color,
                    } as React.CSSProperties}
                    onClick={() => updateConfig({ difficulty: diff.id })}
                  >
                    <div
                      className={styles.difficultyIndicator}
                      style={{ background: diff.color }}
                    />
                    <div className={styles.difficultyContent}>
                      <span className={styles.difficultyName}>{diff.name}</span>
                      <span className={styles.difficultyDesc}>{diff.description}</span>
                      <span className={styles.difficultyTarget}>
                        目标正确率: {diff.targetAccuracy}
                      </span>
                    </div>
                    {config.difficulty === diff.id && (
                      <CheckCircleOutlined
                        className={styles.checkIcon}
                        style={{ color: diff.color }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* 题目数量 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <ClockCircleOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>题目数量</Title>
                  <Text type="secondary">选择本次练习的题目数量</Text>
                </div>
              </div>
              <div className={styles.countGrid}>
                {QUESTION_COUNT_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`${styles.countCard} ${
                      config.questionCount === option.value ? styles.selected : ''
                    }`}
                    onClick={() => updateConfig({ questionCount: option.value })}
                  >
                    <span className={styles.countValue}>{option.value}</span>
                    <span className={styles.countLabel}>{option.label}</span>
                    <span className={styles.countDesc}>{option.description}</span>
                    {config.questionCount === option.value && (
                      <CheckCircleOutlined className={styles.checkIcon} />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* 右侧：配置摘要和开始按钮 */}
          <Col xs={24} lg={8}>
            <div className={styles.summarySticky}>
              <Card className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <RocketOutlined className={styles.summaryIcon} />
                  <Title level={4}>刷题配置</Title>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>年级</span>
                    <span className={styles.summaryValue}>{getSelectedGradeName()}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>科目</span>
                    <span className={styles.summaryValue}>{getSelectedSubjectName()}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>难度</span>
                    <span
                      className={styles.summaryValue}
                      style={{ color: getSelectedDifficulty()?.color }}
                    >
                      {getSelectedDifficulty()?.name || '未选择'}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>题目数量</span>
                    <span className={styles.summaryValue}>{config.questionCount} 题</span>
                  </div>
                </div>

                {error && (
                  <div className={styles.errorMessage}>
                    <Text type="danger">{error}</Text>
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={starting || generating ? <Spin size="small" /> : <ArrowRightOutlined />}
                  className={styles.startButton}
                  onClick={handleStartQuiz}
                  disabled={starting || generating || !config.subject || !config.grade}
                >
                  {starting || generating ? '正在生成题目...' : '开始刷题'}
                </Button>

                <div className={styles.tipBox}>
                  <TrophyOutlined className={styles.tipIcon} />
                  <div>
                    <Text strong>AI智能生成</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                      题目将根据DSE近五年考试标准实时生成，每次练习都是全新题目
                    </Text>
                  </div>
                </div>
              </Card>

              {/* 特色说明 */}
              <Card className={styles.featureCard}>
                <Title level={5}>刷题特色</Title>
                <div className={styles.featureList}>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>符合DSE考试标准</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>AI动态生成题目</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>即时批改与解析</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>详细学习报告</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>随时暂停继续</span>
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default QuizSetupPage


