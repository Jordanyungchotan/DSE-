import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Select, Button, message, Typography, Row, Col, Tag, Alert, Radio, Modal, Progress } from 'antd'
import { 
  ExperimentOutlined, 
  ClockCircleOutlined, 
  BookOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { apiFetch, ragFetch } from '../config/api'
import { useLanguageStore } from '../stores/languageStore'
import { useAuthStore } from '../stores/authStore'
import styles from './LevelTestSetupPage.module.css'

// RAG服务是否启用 (可通过环境变量控制)
const USE_RAG_SERVICE = import.meta.env.VITE_USE_RAG_SERVICE !== 'false'

const { Title, Paragraph, Text } = Typography
const { Option } = Select

// 年级选项 (使用value作为API参数，label用于显示)
const GRADES = [
  { value: '中四', labelKey: 'quiz.grades.f4', label: '中四 (Form 4)', description: 'Form 4' },
  { value: '中五', labelKey: 'quiz.grades.f5', label: '中五 (Form 5)', description: 'Form 5' },
  { value: '中六', labelKey: 'quiz.grades.f6', label: '中六 (Form 6)', description: 'Form 6 / DSE Year' },
]

// 科目选项 - 只包含目前系统支持的科目
const SUBJECTS = {
  core: [
    { value: 'chinese', labelKey: 'quiz.subjects.chinese', icon: '📚' },
    { value: 'english', labelKey: 'quiz.subjects.english', icon: '🔤' },
    { value: 'math', labelKey: 'quiz.subjects.math', icon: '📐' },
  ],
  elective: [
    { value: 'physics', labelKey: 'quiz.subjects.physics', icon: '⚛️' },
    { value: 'chemistry', labelKey: 'quiz.subjects.chemistry', icon: '🧪' },
    { value: 'biology', labelKey: 'quiz.subjects.biology', icon: '🧬' },
    { value: 'mathM1', labelKey: 'quiz.subjects.mathM1', icon: '📐' },
    { value: 'mathM2', labelKey: 'quiz.subjects.mathM2', icon: '📊' },
  ]
}

export default function LevelTestSetupPage() {
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  
  const [grade, setGrade] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [testType, setTestType] = useState<'quick' | 'full'>('full')
  const [loading, setLoading] = useState(false)
  
  // 加载进度状态
  const [loadingTipIndex, setLoadingTipIndex] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // 加载提示文案
  const loadingTips = [
    t('quiz.loadingTips.selecting'),
    t('quiz.loadingTips.adjusting'),
    t('quiz.loadingTips.generating'),
    t('quiz.loadingTips.optimizing'),
    t('quiz.loadingTips.almostDone'),
  ]
  
  // 加载时更新进度条（线性前进，不循环）
  useEffect(() => {
    if (loading) {
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
  }, [loading, loadingTips.length])

  // 测试类型配置
  const TEST_TYPES = [
    {
      value: 'quick',
      label: t('levelTest.setup.quickTest'),
      description: t('levelTest.setup.quickDesc'),
      icon: <ThunderboltOutlined />,
      time: 30,
      questions: '15-20',
      recommended: false
    },
    {
      value: 'full',
      label: t('levelTest.setup.fullTest'),
      description: t('levelTest.setup.fullDesc'),
      icon: <TrophyOutlined />,
      time: 60,
      questions: '25-30',
      recommended: true
    }
  ]

  const handleStartTest = async () => {
    if (!grade) {
      message.warning(t('levelTest.setup.pleaseSelectGrade'))
      return
    }
    if (!subject) {
      message.warning(t('levelTest.setup.pleaseSelectSubject'))
      return
    }

    setLoading(true)
    try {
      let testId: string | undefined
      let testData: { success?: boolean; testId?: string; error?: string; questions?: unknown[] }

      if (USE_RAG_SERVICE) {
        // 使用RAG服务生成水平测试
        console.log('[LevelTest] 使用RAG服务生成测试')
        
        const totalQuestions = testType === 'quick' ? 18 : 28
        
        // 获取当前语言设置
        const languageStorage = localStorage.getItem('language-storage')
        let currentLanguage = 'zh-CN'
        if (languageStorage) {
          try {
            const parsed = JSON.parse(languageStorage)
            currentLanguage = parsed?.state?.locale || 'zh-CN'
          } catch {
            // ignore
          }
        }
        
        // 获取用户ID用于去重
        const { user } = useAuthStore.getState()
        const userId = user?.id || `anon_${Date.now()}`
        
        const ragRes = await ragFetch('/api/generate-test', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId, // 传递用户ID用于去重
            language: currentLanguage,
            test_profile: {
              grade,
              subject,
              total_questions: totalQuestions,
              difficulty_distribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
              question_type_distribution: { 
                multiple_choice: 0.4, 
                short_answer: 0.4, 
                long_answer: 0.2 
              },
            },
            mode: 'hybrid',
          })
        })

        testData = await ragRes.json() as typeof testData
        
        if (testData.success && testData.testId) {
          // 检查是否有题目生成
          if (!testData.questions || testData.questions.length === 0) {
            throw new Error(t('levelTest.setup.noQuestionsError'))
          }
          
          testId = testData.testId
          console.log(`[LevelTest] RAG服务生成测试成功，ID: ${testId}，题目数: ${testData.questions?.length}`)
          
          // 将测试数据存储到localStorage供LevelTestPage使用
          localStorage.setItem(`level_test_${testId}`, JSON.stringify({
            testId,
            grade,
            subject,
            testType,
            questions: testData.questions,
            timeLimit: testType === 'quick' ? 30 * 60 : 60 * 60, // 秒
            startedAt: new Date().toISOString(),
            source: 'rag'
          }))
        } else {
          throw new Error(testData.error || t('levelTest.setup.generateFailed'))
        }
      } else {
        // 使用原有后端API
        const res = await apiFetch('/api/level-test/generate', {
          method: 'POST',
          body: JSON.stringify({ grade, subject, testType })
        })
        
        testData = await res.json() as typeof testData

        if (testData.success && testData.testId) {
          testId = testData.testId
        } else {
          throw new Error(testData.error || '生成测试失败')
        }
      }

      if (testId) {
        message.success(t('levelTest.submit.success'))
        // 跳转到测试页面
        navigate(`/level-test/${testId}`)
      }
    } catch (error) {
      console.error('Generate test error:', error)
      message.error(error instanceof Error ? error.message : t('levelTest.submit.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* AI生成等待弹窗 */}
      <Modal
        open={loading}
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

      <div className={styles.header}>
        <SafetyCertificateOutlined className={styles.headerIcon} />
        <Title level={2} className={styles.title}>
          {t('levelTest.title')}
        </Title>
        <Paragraph className={styles.subtitle}>
          {t('levelTest.subtitle')}
        </Paragraph>
      </div>

      {/* 测试介绍 */}
      <Row gutter={[24, 24]} className={styles.features}>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <ExperimentOutlined className={styles.featureIcon} />
            <Title level={4}>{t('levelTest.features.aiTitle')}</Title>
            <Text type="secondary">
              {t('levelTest.features.aiDesc')}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <BookOutlined className={styles.featureIcon} />
            <Title level={4}>{t('levelTest.features.multiTitle')}</Title>
            <Text type="secondary">
              {t('levelTest.features.multiDesc')}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <TrophyOutlined className={styles.featureIcon} />
            <Title level={4}>{t('levelTest.features.predictTitle')}</Title>
            <Text type="secondary">
              {t('levelTest.features.predictDesc')}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 测试配置 */}
      <Card className={styles.configCard}>
        <Title level={3} className={styles.configTitle}>
          <ExperimentOutlined /> {t('levelTest.setup.startTest')}
        </Title>

        {/* 年级选择 */}
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>
            <span className={styles.stepNumber}>1</span>
            {t('levelTest.setup.selectGrade')}
          </div>
          <Select
            size="large"
            placeholder={t('levelTest.setup.pleaseSelectGrade')}
            value={grade || undefined}
            onChange={setGrade}
            className={styles.select}
          >
            {GRADES.map(g => (
              <Option key={g.value} value={g.value}>
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>{g.label}</span>
                  <span className={styles.optionDesc}>{g.description}</span>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {/* 科目选择 */}
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>
            <span className={styles.stepNumber}>2</span>
            {t('levelTest.setup.selectSubject')}
          </div>
          
          <div className={styles.subjectGroup}>
            <Text strong className={styles.groupLabel}>{t('levelTest.setup.coreSubjects')}</Text>
            <div className={styles.subjectGrid}>
              {SUBJECTS.core.map(s => (
                <div
                  key={s.value}
                  className={`${styles.subjectItem} ${subject === s.value ? styles.selected : ''}`}
                  onClick={() => setSubject(s.value)}
                >
                  <span className={styles.subjectIcon}>{s.icon}</span>
                  <span className={styles.subjectName}>{t(s.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.subjectGroup}>
            <Text strong className={styles.groupLabel}>{t('levelTest.setup.electiveSubjects')}</Text>
            <div className={styles.subjectGrid}>
              {SUBJECTS.elective.map(s => (
                <div
                  key={s.value}
                  className={`${styles.subjectItem} ${subject === s.value ? styles.selected : ''}`}
                  onClick={() => setSubject(s.value)}
                >
                  <span className={styles.subjectIcon}>{s.icon}</span>
                  <span className={styles.subjectName}>{t(s.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 测试类型选择 */}
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>
            <span className={styles.stepNumber}>3</span>
            {t('levelTest.setup.selectType')}
          </div>
          
          <Radio.Group 
            value={testType} 
            onChange={e => setTestType(e.target.value)}
            className={styles.testTypeGroup}
          >
            {TEST_TYPES.map(type => (
              <Radio.Button 
                key={type.value} 
                value={type.value}
                className={`${styles.testTypeBtn} ${testType === type.value ? styles.activeType : ''}`}
              >
                <div className={styles.testTypeContent}>
                  <div className={styles.testTypeHeader}>
                    {type.icon}
                    <span className={styles.testTypeName}>{type.label}</span>
                    {type.recommended && <Tag color="green">{t('levelTest.setup.recommended')}</Tag>}
                  </div>
                  <div className={styles.testTypeInfo}>
                    <span><ClockCircleOutlined /> {type.time} min</span>
                    <span><BookOutlined /> {type.questions}</span>
                  </div>
                </div>
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        {/* 测试须知 */}
        <Alert
          type="info"
          showIcon
          className={styles.notice}
          message={t('levelTest.testNotice.title')}
          description={
            <ul className={styles.noticeList}>
              <li>{t('levelTest.testNotice.tip1')}</li>
              <li>{t('levelTest.testNotice.tip2')}</li>
              <li>{t('levelTest.testNotice.tip3')}</li>
              <li>{t('levelTest.testNotice.tip4')}</li>
            </ul>
          }
        />

        {/* 开始按钮 */}
        <Button
          type="primary"
          size="large"
          block
          className={styles.startBtn}
          onClick={handleStartTest}
          disabled={!grade || !subject || loading}
        >
          <ExperimentOutlined />
          {t('levelTest.setup.startTest')}
        </Button>

        {(!grade || !subject) && (
          <Text type="secondary" className={styles.hint}>
            {t('levelTest.setup.selectBoth')}
          </Text>
        )}
      </Card>

      {/* DSE等级说明 */}
      <Card className={styles.levelGuide}>
        <Title level={4}>{t('levelTest.dseLevels.title')}</Title>
        <Row gutter={[16, 16]}>
          {[
            { level: '5**', score: '90-100', descKey: 'levelTest.dseLevels.5star2', color: '#52c41a' },
            { level: '5*', score: '85-89', descKey: 'levelTest.dseLevels.5star', color: '#73d13d' },
            { level: '5', score: '80-84', descKey: 'levelTest.dseLevels.5', color: '#95de64' },
            { level: '4', score: '70-79', descKey: 'levelTest.dseLevels.4', color: '#1890ff' },
            { level: '3', score: '60-69', descKey: 'levelTest.dseLevels.3', color: '#69c0ff' },
            { level: '2', score: '40-59', descKey: 'levelTest.dseLevels.2', color: '#faad14' },
            { level: '1', score: '20-39', descKey: 'levelTest.dseLevels.1', color: '#ff7a45' },
            { level: 'U', score: '0-19', descKey: 'levelTest.dseLevels.U', color: '#ff4d4f' },
          ].map(item => (
            <Col xs={12} sm={6} key={item.level}>
              <div className={styles.levelItem}>
                <Tag color={item.color} className={styles.levelTag}>{item.level}</Tag>
                <div className={styles.levelInfo}>
                  <Text strong>{t(item.descKey)}</Text>
                  <Text type="secondary">{item.score}</Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}

