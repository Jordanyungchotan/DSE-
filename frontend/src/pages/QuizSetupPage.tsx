import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, message, Spin, Tooltip, Modal, Progress } from 'antd'
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
  LoadingOutlined,
} from '@ant-design/icons'
import {
  useQuizStore,
  SUPPORTED_SUBJECTS,
  GRADE_LEVELS,
  DIFFICULTY_LEVELS,
  QUESTION_COUNT_OPTIONS,
  CurriculumModule,
} from '../stores/quizStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './QuizSetupPage.module.css'

const { Title, Paragraph, Text } = Typography

/**
 * DSE智能刷题 - 配置选择页面
 */
const QuizSetupPage = () => {
  const navigate = useNavigate()
  const { t, locale } = useLanguageStore()
  const { 
    config, updateConfig, startQuiz, generating, error, setError,
    curriculumModules, modulesLoading, fetchCurriculumModules 
  } = useQuizStore()
  const [starting, setStarting] = useState(false)
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  // 支持模块选择的科目列表
  const subjectsWithModules = ['physics', 'biology', 'chemistry', 'math', 'math_m1']
  
  // 当选择物理/生物/化学时，获取课程模块（语言变化时也重新获取）
  useEffect(() => {
    if (subjectsWithModules.includes(config.subject)) {
      fetchCurriculumModules(config.subject)
    } else {
      // 切换科目时清空模块选择
      setSelectedModules([])
      updateConfig({ moduleCodes: undefined })
    }
  }, [config.subject, fetchCurriculumModules, locale])

  // 切换模块选择
  const handleModuleToggle = (moduleCode: string) => {
    setSelectedModules(prev => {
      const newSelection = prev.includes(moduleCode)
        ? prev.filter(m => m !== moduleCode)
        : [...prev, moduleCode]
      // 更新到 config
      updateConfig({ moduleCodes: newSelection.length > 0 ? newSelection : undefined })
      return newSelection
    })
  }

  // 获取模块名称（根据语言）
  const getModuleName = (module: CurriculumModule) => {
    return locale === 'en' ? module.module_name_en : module.module_name_zh
  }

  // 获取模块描述（根据语言）
  const getModuleDescription = (module: CurriculumModule) => {
    return locale === 'en' ? module.description_en : module.description_zh
  }

  // 翻译年级名称
  const getGradeName = (gradeId: string) => {
    const gradeNames: Record<string, string> = {
      f4: t('quiz.grades.f4'),
      f5: t('quiz.grades.f5'),
      f6: t('quiz.grades.f6'),
    }
    return gradeNames[gradeId] || gradeId
  }

  // 翻译年级描述
  const getGradeDescription = (gradeId: string) => {
    const gradeDescs: Record<string, string> = {
      f4: t('quiz.gradeDescs.f4'),
      f5: t('quiz.gradeDescs.f5'),
      f6: t('quiz.gradeDescs.f6'),
    }
    return gradeDescs[gradeId] || ''
  }

  // 翻译科目名称
  const getSubjectName = (subjectId: string) => {
    const subjectNames: Record<string, string> = {
      chinese: t('quiz.subjects.chinese'),
      english: t('quiz.subjects.english'),
      math: t('quiz.subjects.math'),
      physics: t('quiz.subjects.physics'),
      chemistry: t('quiz.subjects.chemistry'),
      biology: t('quiz.subjects.biology'),
      math_m1: t('quiz.subjects.mathM1'),
      math_m2: t('quiz.subjects.mathM2'),
    }
    return subjectNames[subjectId] || subjectId
  }

  // 翻译难度名称
  const getDifficultyName = (diffId: string) => {
    const diffNames: Record<string, string> = {
      basic: t('quiz.difficulties.basic'),
      standard: t('quiz.difficulties.standard'),
      challenging: t('quiz.difficulties.challenging'),
      exam: t('quiz.difficulties.exam'),
    }
    return diffNames[diffId] || diffId
  }

  // 翻译难度描述
  const getDifficultyDescription = (diffId: string) => {
    const diffDescs: Record<string, string> = {
      basic: t('quiz.difficultyDescs.basic'),
      standard: t('quiz.difficultyDescs.standard'),
      challenging: t('quiz.difficultyDescs.challenging'),
      exam: t('quiz.difficultyDescs.exam'),
    }
    return diffDescs[diffId] || ''
  }

  // 翻译题目数量选项
  const getCountLabel = (value: number) => {
    const labels: Record<number, string> = {
      5: t('quiz.countLabels.quick'),
      10: t('quiz.countLabels.standard'),
      15: t('quiz.countLabels.deep'),
      20: t('quiz.countLabels.mock'),
    }
    return labels[value] || ''
  }

  const getCountDescription = (value: number) => {
    return `${value}${t('quiz.countSuffix')}`
  }

  // 获取所有科目列表
  const allSubjects = [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ]

  // 开始刷题
  const handleStartQuiz = async () => {
    if (!config.subject) {
      message.warning(t('quiz.warnings.selectSubject'))
      return
    }
    if (!config.grade) {
      message.warning(t('quiz.warnings.selectGrade'))
      return
    }
    if (!config.difficulty) {
      message.warning(t('quiz.warnings.selectDifficulty'))
      return
    }

    setStarting(true)
    setError(null)

    try {
      await startQuiz()
      navigate('/quiz/practice')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.error')
      message.error(errorMessage)
    } finally {
      setStarting(false)
    }
  }

  // 获取选中科目的显示名称
  const getSelectedSubjectName = () => {
    const subject = allSubjects.find((s) => s.id === config.subject)
    return subject ? `${subject.icon} ${getSubjectName(subject.id)}` : t('common.notSelected')
  }

  // 获取选中年级的显示名称
  const getSelectedGradeName = () => {
    const grade = GRADE_LEVELS.find((g) => g.id === config.grade)
    return grade ? getGradeName(grade.id) : t('common.notSelected')
  }

  // 获取选中难度的显示
  const getSelectedDifficulty = () => {
    const diff = DIFFICULTY_LEVELS.find((d) => d.id === config.difficulty)
    if (!diff) return null
    return {
      ...diff,
      name: getDifficultyName(diff.id),
    }
  }

  // 加载提示文案
  const loadingTips = [
    t('quiz.loadingTips.selecting'),
    t('quiz.loadingTips.adjusting'),
    t('quiz.loadingTips.generating'),
    t('quiz.loadingTips.optimizing'),
    t('quiz.loadingTips.almostDone'),
  ]
  const [loadingTipIndex, setLoadingTipIndex] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // 加载时更新进度条（线性前进，不循环）
  useEffect(() => {
    if (starting || generating) {
      // 重置进度
      setLoadingProgress(0)
      setLoadingTipIndex(0)
      
      // 进度条平滑前进（15秒内从0到95%）
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return 95 // 最多到95%，等待完成
          return prev + 1
        })
      }, 150) // 每150ms增加1%
      
      // 提示文案切换
      const tipInterval = setInterval(() => {
        setLoadingTipIndex((prev) => {
          if (prev >= loadingTips.length - 1) return prev // 到最后一条就停止
          return prev + 1
        })
      }, 3000) // 每3秒切换一次提示
      
      return () => {
        clearInterval(progressInterval)
        clearInterval(tipInterval)
      }
    } else {
      // 完成时重置
      setLoadingProgress(0)
      setLoadingTipIndex(0)
    }
  }, [starting, generating, loadingTips.length])

  return (
    <div className={styles.setupPage}>
      {/* 全屏加载覆盖层 */}
      <Modal
        open={starting || generating}
        footer={null}
        closable={false}
        centered
        maskClosable={false}
        width={420}
        styles={{
          body: {
            padding: '48px 32px',
            textAlign: 'center',
          },
          mask: {
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* 动画图标 */}
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          }}>
            <LoadingOutlined style={{ fontSize: 36, color: '#fff' }} spin />
          </div>
          
          {/* 标题 */}
          <div>
            <Title level={3} style={{ marginBottom: '8px', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🎯 {t('quiz.aiGenerating')}
            </Title>
            <Text style={{ fontSize: '16px', color: '#666' }}>
              {loadingTips[loadingTipIndex]}
            </Text>
          </div>
          
          {/* 进度条 - 线性前进 */}
          <Progress 
            percent={loadingProgress} 
            showInfo={false}
            strokeColor={{
              '0%': '#667eea',
              '100%': '#764ba2',
            }}
            trailColor="#f0f0f0"
            style={{ width: '100%' }}
          />
          
          {/* 提示 */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf4 100%)',
            padding: '12px 16px',
            borderRadius: '8px',
            width: '100%',
          }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              💡 {t('quiz.generatingHint')}
            </Text>
          </div>
        </div>
      </Modal>

      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBadge}>
            <ExperimentOutlined /> {t('quiz.title')}
          </div>
          <Title level={1} className={styles.pageTitle}>
            <span className="gradient-title">{t('quiz.title')}</span>
          </Title>
          <Paragraph className={styles.pageDesc}>
            {t('quiz.description')}
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
                  <Title level={4}>{t('quiz.config.grade')}</Title>
                  <Text type="secondary">{t('quiz.config.grade')}</Text>
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
                      <span className={styles.optionTitle}>{getGradeName(grade.id)}</span>
                      {config.grade === grade.id && (
                        <CheckCircleOutlined className={styles.checkIcon} />
                      )}
                    </div>
                    <span className={styles.optionDesc}>{getGradeDescription(grade.id)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 科目选择 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <ThunderboltOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>{t('quiz.config.subject')}</Title>
                  <Text type="secondary">{t('quiz.config.subjectDesc')}</Text>
                </div>
              </div>

              {/* 核心科目 */}
              <div className={styles.subjectSection}>
                <Text strong className={styles.sectionLabel}>{t('levelTest.setup.coreSubjects')}</Text>
                <div className={styles.subjectsGrid}>
                  {SUPPORTED_SUBJECTS.CORE.map((subject) => (
                    <Tooltip key={subject.id} title={getSubjectName(subject.id)}>
                      <div
                        className={`${styles.subjectCard} ${
                          config.subject === subject.id ? styles.selected : ''
                        }`}
                        onClick={() => updateConfig({ subject: subject.id })}
                      >
                        <span className={styles.subjectIcon}>{subject.icon}</span>
                        <span className={styles.subjectName}>{getSubjectName(subject.id)}</span>
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
                <Text strong className={styles.sectionLabel}>{t('quiz.config.scienceElectives')}</Text>
                <div className={styles.subjectsGrid}>
                  {SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES.map((subject) => (
                    <Tooltip key={subject.id} title={getSubjectName(subject.id)}>
                      <div
                        className={`${styles.subjectCard} ${
                          config.subject === subject.id ? styles.selected : ''
                        }`}
                        onClick={() => updateConfig({ subject: subject.id })}
                      >
                        <span className={styles.subjectIcon}>{subject.icon}</span>
                        <span className={styles.subjectName}>{getSubjectName(subject.id)}</span>
                        {config.subject === subject.id && (
                          <CheckCircleOutlined className={styles.checkIcon} />
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>

            </Card>

            {/* 课程模块选择 - 物理/生物/化学时显示 */}
            {subjectsWithModules.includes(config.subject) && (
              <Card className={styles.configCard}>
                <div className={styles.cardHeader}>
                  <BookOutlined className={styles.cardIcon} />
                  <div>
                    <Title level={4}>{t('quiz.config.modules') || '知识模块'}</Title>
                    <Text type="secondary">
                      {t('quiz.config.modulesDesc') || '选择想要练习的知识模块（可多选，不选则随机）'}
                    </Text>
                  </div>
                </div>

                {modulesLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="small" />
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {t('common.loading') || '加载中...'}
                    </Text>
                  </div>
                ) : (
                  <>
                    {/* 必修部分 */}
                    {curriculumModules.compulsory.length > 0 && (
                      <div className={styles.subjectSection}>
                        <Text strong className={styles.sectionLabel}>
                          {t('quiz.config.compulsory') || '必修部分'}
                        </Text>
                        <div className={styles.modulesGrid}>
                          {curriculumModules.compulsory.map((module) => (
                            <Tooltip 
                              key={module.module_code} 
                              title={getModuleDescription(module)}
                            >
                              <div
                                className={`${styles.moduleCard} ${
                                  selectedModules.includes(module.module_code) ? styles.selected : ''
                                }`}
                                onClick={() => handleModuleToggle(module.module_code)}
                              >
                                <span className={styles.moduleName}>{getModuleName(module)}</span>
                                <span className={styles.moduleTopics}>
                                  {module.topics?.slice(0, 3).join('、')}
                                  {module.topics?.length > 3 ? '...' : ''}
                                </span>
                                {selectedModules.includes(module.module_code) && (
                                  <CheckCircleOutlined className={styles.checkIcon} />
                                )}
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 选修部分 */}
                    {curriculumModules.elective.length > 0 && (
                      <div className={styles.subjectSection}>
                        <Text strong className={styles.sectionLabel}>
                          {t('quiz.config.elective') || '选修部分（四选二）'}
                        </Text>
                        <div className={styles.modulesGrid}>
                          {curriculumModules.elective.map((module) => (
                            <Tooltip 
                              key={module.module_code} 
                              title={getModuleDescription(module)}
                            >
                              <div
                                className={`${styles.moduleCard} ${
                                  selectedModules.includes(module.module_code) ? styles.selected : ''
                                }`}
                                onClick={() => handleModuleToggle(module.module_code)}
                              >
                                <span className={styles.moduleName}>{getModuleName(module)}</span>
                                <span className={styles.moduleTopics}>
                                  {module.topics?.slice(0, 3).join('、')}
                                  {module.topics?.length > 3 ? '...' : ''}
                                </span>
                                {selectedModules.includes(module.module_code) && (
                                  <CheckCircleOutlined className={styles.checkIcon} />
                                )}
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* 难度选择 */}
            <Card className={styles.configCard}>
              <div className={styles.cardHeader}>
                <FireOutlined className={styles.cardIcon} />
                <div>
                  <Title level={4}>{t('quiz.config.difficulty')}</Title>
                  <Text type="secondary">{t('quiz.config.difficultyDesc')}</Text>
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
                      <span className={styles.difficultyName}>{getDifficultyName(diff.id)}</span>
                      <span className={styles.difficultyDesc}>{getDifficultyDescription(diff.id)}</span>
                      <span className={styles.difficultyTarget}>
                        {t('quiz.targetAccuracy')}: {diff.targetAccuracy}
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
                  <Title level={4}>{t('quiz.config.questionCount')}</Title>
                  <Text type="secondary">{t('quiz.config.questionCountDesc')}</Text>
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
                    <span className={styles.countLabel}>{getCountLabel(option.value)}</span>
                    <span className={styles.countDesc}>{getCountDescription(option.value)}</span>
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
                  <Title level={4}>{t('quiz.config.title')}</Title>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('quiz.config.grade')}</span>
                    <span className={styles.summaryValue}>{getSelectedGradeName()}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('quiz.config.subject')}</span>
                    <span className={styles.summaryValue}>{getSelectedSubjectName()}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('quiz.config.difficulty')}</span>
                    <span
                      className={styles.summaryValue}
                      style={{ color: getSelectedDifficulty()?.color }}
                    >
                      {getSelectedDifficulty()?.name || t('common.notSelected')}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('quiz.config.questionCount')}</span>
                    <span className={styles.summaryValue}>{config.questionCount} {t('common.questions')}</span>
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
                  {starting || generating ? t('common.generatingQuestions') : t('quiz.config.start')}
                </Button>

                <div className={styles.tipBox}>
                  <TrophyOutlined className={styles.tipIcon} />
                  <div>
                    <Text strong>{t('quiz.config.aiGenerated')}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '0.85rem' }}>
                      {t('quiz.config.aiGeneratedDesc')}
                    </Text>
                  </div>
                </div>
              </Card>

              {/* 特色说明 */}
              <Card className={styles.featureCard}>
                <Title level={5}>{t('quiz.config.features')}</Title>
                <div className={styles.featureList}>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>{t('quiz.features.dseStandard')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>{t('quiz.features.aiGenerated')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>{t('quiz.features.instantGrading')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>{t('quiz.features.detailedReport')}</span>
                  </div>
                  <div className={styles.featureItem}>
                    <CheckCircleOutlined className={styles.featureCheck} />
                    <span>{t('quiz.features.pauseResume')}</span>
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




