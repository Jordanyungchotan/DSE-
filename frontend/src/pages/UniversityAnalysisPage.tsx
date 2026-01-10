import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Input,
  Tag,
  message,
  Modal,
  Progress,
  Tooltip,
  Badge,
  Spin,
  Alert,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  RocketOutlined,
  BookOutlined,
  TrophyOutlined,
  LoadingOutlined,
  RobotOutlined,
  HeartOutlined,
  StarOutlined,
  BulbOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useLanguageStore } from '../stores/languageStore'
import {
  getUniversityFields,
  analyzeWithAI,
  ProgrammeField,
  FIELD_NAMES,
  FIELD_COLORS,
  ComprehensiveAnalysisInput,
  AIAnalysisResponse,
} from '../services/jupasApi'
import styles from './UniversityAnalysisPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// DSE科目列表
const DSE_SUBJECTS = [
  { value: 'chinese', label: '中国语文', labelEn: 'Chinese' },
  { value: 'english', label: '英国语文', labelEn: 'English' },
  { value: 'math', label: '数学', labelEn: 'Mathematics' },
  { value: 'liberal', label: '公民与社会发展', labelEn: 'Citizenship' },
  { value: 'physics', label: '物理', labelEn: 'Physics' },
  { value: 'chemistry', label: '化学', labelEn: 'Chemistry' },
  { value: 'biology', label: '生物', labelEn: 'Biology' },
  { value: 'economics', label: '经济', labelEn: 'Economics' },
  { value: 'bafs', label: '企业会计与财务概论', labelEn: 'BAFS' },
  { value: 'geography', label: '地理', labelEn: 'Geography' },
  { value: 'history', label: '历史', labelEn: 'History' },
  { value: 'ict', label: '资讯及通讯科技', labelEn: 'ICT' },
  { value: 'm1', label: '数学延伸部分(M1)', labelEn: 'M1' },
  { value: 'm2', label: '数学延伸部分(M2)', labelEn: 'M2' },
]

// DSE等级
const DSE_GRADES = ['5**', '5*', '5', '4', '3', '2', '1', 'U']

// 香港大学列表（使用数据库中的代码）
const HK_UNIVERSITIES = [
  { value: 'hku', label: '香港大学', labelEn: 'HKU' },
  { value: 'cuhk', label: '香港中文大学', labelEn: 'CUHK' },
  { value: 'ust', label: '香港科技大学', labelEn: 'HKUST' },
  { value: 'polyu', label: '香港理工大学', labelEn: 'PolyU' },
  { value: 'cityu', label: '香港城市大学', labelEn: 'CityU' },
  { value: 'bu', label: '香港浸会大学', labelEn: 'HKBU' },
  { value: 'ln', label: '岭南大学', labelEn: 'Lingnan' },
  { value: 'eduhk', label: '香港教育大学', labelEn: 'EdUHK' },
  { value: 'hkmu', label: '香港都会大学', labelEn: 'HKMU' },
]

// 兴趣选项
const INTEREST_OPTIONS = [
  { value: '科技创新', label: '科技创新', labelEn: 'Technology & Innovation' },
  { value: '商业金融', label: '商业金融', labelEn: 'Business & Finance' },
  { value: '医学健康', label: '医学健康', labelEn: 'Medicine & Health' },
  { value: '法律正义', label: '法律正义', labelEn: 'Law & Justice' },
  { value: '艺术设计', label: '艺术设计', labelEn: 'Art & Design' },
  { value: '教育培训', label: '教育培训', labelEn: 'Education' },
  { value: '社会服务', label: '社会服务', labelEn: 'Social Services' },
  { value: '科学研究', label: '科学研究', labelEn: 'Scientific Research' },
  { value: '媒体传播', label: '媒体传播', labelEn: 'Media & Communication' },
  { value: '建筑规划', label: '建筑规划', labelEn: 'Architecture & Planning' },
  { value: '环境保护', label: '环境保护', labelEn: 'Environmental Protection' },
  { value: '国际事务', label: '国际事务', labelEn: 'International Affairs' },
]

// 特长选项
const STRENGTH_OPTIONS = [
  { value: '数学逻辑', label: '数学逻辑', labelEn: 'Mathematical Logic' },
  { value: '语言表达', label: '语言表达', labelEn: 'Language & Communication' },
  { value: '编程技术', label: '编程技术', labelEn: 'Programming' },
  { value: '领导能力', label: '领导能力', labelEn: 'Leadership' },
  { value: '团队协作', label: '团队协作', labelEn: 'Teamwork' },
  { value: '创意思维', label: '创意思维', labelEn: 'Creative Thinking' },
  { value: '批判思考', label: '批判思考', labelEn: 'Critical Thinking' },
  { value: '动手能力', label: '动手能力', labelEn: 'Hands-on Skills' },
  { value: '艺术审美', label: '艺术审美', labelEn: 'Artistic Sense' },
  { value: '沟通协调', label: '沟通协调', labelEn: 'Communication' },
  { value: '分析能力', label: '分析能力', labelEn: 'Analytical Skills' },
  { value: '耐心细致', label: '耐心细致', labelEn: 'Patience & Attention to Detail' },
]

interface DseResult {
  subject: string
  grade: string
}

/**
 * 分析进度阶段
 */
const ANALYSIS_STAGES = [
  { progress: 10, text: '正在连接AI分析服务...', textEn: 'Connecting to AI service...' },
  { progress: 25, text: '正在解析DSE成绩数据...', textEn: 'Parsing DSE results...' },
  { progress: 40, text: '正在匹配大学录取要求...', textEn: 'Matching admission requirements...' },
  { progress: 55, text: '正在分析专业适配度...', textEn: 'Analyzing programme compatibility...' },
  { progress: 70, text: '正在评估录取概率...', textEn: 'Evaluating admission probability...' },
  { progress: 85, text: '正在生成申请建议...', textEn: 'Generating recommendations...' },
  { progress: 95, text: '即将完成，请稍候...', textEn: 'Almost done, please wait...' },
]

/**
 * 大学申请分析页面
 */
const UniversityAnalysisPage = () => {
  const navigate = useNavigate()
  const { t, locale } = useLanguageStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dseResults, setDseResults] = useState<DseResult[]>([
    { subject: 'chinese', grade: '' },
    { subject: 'english', grade: '' },
    { subject: 'math', grade: '' },
    { subject: 'liberal', grade: '' },
  ])

  // 分析进度状态
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState('')

  // 院校专业领域联动
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [availableFields, setAvailableFields] = useState<ProgrammeField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)

  // 分析结果
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null)
  
  // 结果区域引用
  const resultRef = useRef<HTMLDivElement>(null)

  const isEnglish = locale === 'en'

  // 获取院校可用专业领域
  const fetchAvailableFields = useCallback(async (universities: string[]) => {
    if (universities.length === 0) {
      setAvailableFields([])
      return
    }

    setLoadingFields(true)
    try {
      // 获取所有选中院校的专业领域并合并
      const allFields: { [id: string]: ProgrammeField } = {}
      
      for (const uni of universities) {
        const response = await getUniversityFields(uni)
        if (response.success && response.data?.fields) {
          for (const field of response.data.fields) {
            if (!allFields[field.id]) {
              allFields[field.id] = { ...field, count: 0 }
            }
            allFields[field.id].count += field.count
          }
        }
      }
      
      const merged = Object.values(allFields).sort((a, b) => b.count - a.count)
      setAvailableFields(merged)
    } catch (error) {
      console.error('Failed to fetch fields:', error)
    } finally {
      setLoadingFields(false)
    }
  }, [])

  // 当选择的院校变化时，更新可用专业领域
  useEffect(() => {
    fetchAvailableFields(selectedUniversities)
  }, [selectedUniversities, fetchAvailableFields])

  // 模拟分析进度
  useEffect(() => {
    if (loading) {
      setAnalysisProgress(0)
      setAnalysisStage(ANALYSIS_STAGES[0].text)
      
      let stageIndex = 0
      const interval = setInterval(() => {
        stageIndex++
        if (stageIndex < ANALYSIS_STAGES.length) {
          setAnalysisProgress(ANALYSIS_STAGES[stageIndex].progress)
          setAnalysisStage(isEnglish ? ANALYSIS_STAGES[stageIndex].textEn : ANALYSIS_STAGES[stageIndex].text)
        }
      }, 5000) // 每5秒更新一次进度

      return () => clearInterval(interval)
    } else {
      setAnalysisProgress(0)
      setAnalysisStage('')
    }
  }, [loading, isEnglish])

  // 分析完成后滚动到结果区域
  useEffect(() => {
    if (analysisResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [analysisResult])

  // 添加科目
  const addSubject = () => {
    setDseResults([...dseResults, { subject: '', grade: '' }])
  }

  // 更新科目成绩
  const updateDseResult = (index: number, field: 'subject' | 'grade', value: string) => {
    const newResults = [...dseResults]
    newResults[index][field] = value
    setDseResults(newResults)
  }

  // 移除科目
  const removeSubject = (index: number) => {
    if (dseResults.length > 4) {
      setDseResults(dseResults.filter((_, i) => i !== index))
    }
  }

  /**
   * 计算最佳5科分数（仅用于前端显示参考）
   * 
   * @deprecated 此函数使用固定换算 (5**=7)，仅作为用户界面参考显示。
   * 实际大学分析应使用后端返回的加权分数 (weighted_score)。
   * 
   * TODO: 禁止在大学分析结果展示中使用此值作为匹配依据。
   * 应显示后端计算的 weighted_score 而非此 Best 5。
   */
  const calculateBestFive = () => {
    // @deprecated - 固定换算，不同课程有不同规则
    const gradeToScore: Record<string, number> = {
      '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0
    }
    const scores = dseResults
      .filter(r => r.grade)
      .map(r => gradeToScore[r.grade] || 0)
      .sort((a, b) => b - a)
    return scores.slice(0, 5).reduce((a, b) => a + b, 0)
  }

  // 重新分析
  const handleReanalyze = () => {
    setAnalysisResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 提交分析
  const handleSubmit = async (values: Record<string, unknown>) => {
    // 验证DSE成绩
    const filledResults = dseResults.filter(r => r.subject && r.grade)
    if (filledResults.length < 4) {
      message.error(isEnglish ? 'Please fill in at least 4 subjects' : '请至少填写4个科目的成绩')
      return
    }

    if (selectedUniversities.length === 0) {
      message.error(isEnglish ? 'Please select at least one university' : '请至少选择一所目标大学')
      return
    }

    setLoading(true)
    setAnalysisResult(null)
    try {
      // 构建成绩对象
      const grades: { [subject: string]: string } = {}
      for (const result of filledResults) {
        grades[result.subject] = result.grade
      }

      const input: ComprehensiveAnalysisInput = {
        grades,
        interests: (values.interests as string[]) || [],
        strengths: (values.strengths as string[]) || [],
        target_universities: selectedUniversities,
        target_fields: (values.targetFields as string[]) || [],
        career_aspirations: (values.careerInterests as string) || '',
        extracurriculars: (values.extracurriculars as string) || '',
        limit: 15
      }

      const response = await analyzeWithAI(input)

      if (response.success && response.data) {
        setAnalysisResult(response.data)
      } else {
        throw new Error(response.error || 'Analysis failed')
      }
    } catch (error) {
      message.error(isEnglish ? 'Analysis failed, please try again' : '分析失败，请稍后重试')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const bestFive = calculateBestFive()

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/analysis')}
        >
          {t('common.back')}
        </Button>
        <div className={styles.titleSection}>
          <Title level={2} className="gradient-title">
            <RocketOutlined /> {isEnglish ? 'University Application Analysis' : 'JUPAS 大学申请分析'}
          </Title>
          <Text type="secondary">
            {isEnglish 
              ? 'AI-powered analysis to help you find the best matching programmes'
              : '基于 AI 的深度分析，帮助你找到最匹配的大学专业'}
          </Text>
        </div>
      </div>

      {/* 表单区域 - 有结果时折叠显示 */}
      {!analysisResult ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={styles.form}
        >
          {/* DSE成绩输入 */}
          <Card 
            title={<><BookOutlined /> {isEnglish ? 'DSE Results' : 'DSE成绩'}</>}
            className={styles.formCard}
            extra={
              <Tag color="blue" className={styles.scoreTag}>
                {isEnglish ? 'Best 5:' : '最佳5科：'} {bestFive}{isEnglish ? '' : '分'}
              </Tag>
            }
          >
            <div className={styles.subjectsGrid}>
              {dseResults.map((result, index) => (
                <div key={index} className={styles.subjectRow}>
                  <Select
                    placeholder={isEnglish ? 'Select Subject' : '选择科目'}
                    value={result.subject || undefined}
                    onChange={(v) => updateDseResult(index, 'subject', v)}
                    options={DSE_SUBJECTS.map(s => ({ 
                      value: s.value, 
                      label: isEnglish ? s.labelEn : s.label 
                    }))}
                    style={{ flex: 2 }}
                  />
                  <Select
                    placeholder={isEnglish ? 'Grade' : '等级'}
                    value={result.grade || undefined}
                    onChange={(v) => updateDseResult(index, 'grade', v)}
                    options={DSE_GRADES.map(g => ({ value: g, label: g }))}
                    style={{ flex: 1 }}
                  />
                  {index >= 4 && (
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      onClick={() => removeSubject(index)}
                    />
                  )}
                </div>
              ))}
            </div>
            <Button 
              type="dashed" 
              onClick={addSubject} 
              icon={<PlusOutlined />}
              className={styles.addButton}
            >
              {isEnglish ? 'Add Elective Subject' : '添加选修科目'}
            </Button>
          </Card>

          {/* 目标大学和专业 */}
          <Card 
            title={<><TrophyOutlined /> {isEnglish ? 'Target Universities & Fields' : '目标大学与专业'}</>}
            className={styles.formCard}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={isEnglish ? 'Target Universities' : '目标大学'}
                  required
                >
                  <Select
                    mode="multiple"
                    placeholder={isEnglish ? 'Select universities (multiple)' : '选择目标大学（可多选）'}
                    options={HK_UNIVERSITIES.map(u => ({
                      value: u.value,
                      label: isEnglish ? u.labelEn : u.label
                    }))}
                    value={selectedUniversities}
                    onChange={setSelectedUniversities}
                    maxTagCount={3}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="targetFields"
                  label={
                    <span>
                      {isEnglish ? 'Target Fields' : '目标专业领域'} 
                      {loadingFields && <Spin size="small" style={{ marginLeft: 8 }} />}
                      {availableFields.length > 0 && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {availableFields.length} {isEnglish ? 'fields available' : '个领域可选'}
                        </Tag>
                      )}
                    </span>
                  }
                >
                  <Select
                    mode="multiple"
                    placeholder={
                      selectedUniversities.length === 0 
                        ? (isEnglish ? 'Please select university first' : '请先选择目标大学')
                        : (isEnglish ? 'Select fields (optional)' : '选择专业领域（可选）')
                    }
                    disabled={selectedUniversities.length === 0}
                    maxTagCount={3}
                  >
                    {availableFields.map(field => (
                      <Select.Option key={field.id} value={field.id}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: field.color,
                          marginRight: 8 
                        }} />
                        {isEnglish ? (FIELD_NAMES[field.id]?.en || field.name_en) : field.name_zh}
                        <span style={{ color: '#999', marginLeft: 8 }}>({field.count})</span>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 兴趣与特长 */}
          <Card 
            title={<><HeartOutlined /> {isEnglish ? 'Interests & Strengths' : '兴趣与特长'}</>}
            className={styles.formCard}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="interests"
                  label={<><BulbOutlined /> {isEnglish ? 'Interests' : '兴趣爱好'}</>}
                >
                  <Select
                    mode="multiple"
                    placeholder={isEnglish ? 'Select your interests' : '选择你的兴趣爱好'}
                    options={INTEREST_OPTIONS.map(i => ({
                      value: i.value,
                      label: isEnglish ? i.labelEn : i.label
                    }))}
                    maxTagCount={4}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="strengths"
                  label={<><StarOutlined /> {isEnglish ? 'Strengths' : '个人特长'}</>}
                >
                  <Select
                    mode="multiple"
                    placeholder={isEnglish ? 'Select your strengths' : '选择你的个人特长'}
                    options={STRENGTH_OPTIONS.map(s => ({
                      value: s.value,
                      label: isEnglish ? s.labelEn : s.label
                    }))}
                    maxTagCount={4}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="extracurriculars"
                  label={isEnglish ? 'Extracurricular Activities' : '课外活动与成就'}
                >
                  <TextArea 
                    rows={3} 
                    placeholder={isEnglish 
                      ? 'Describe your extracurricular activities, competitions, community service, etc.'
                      : '描述您的课外活动、比赛获奖、社区服务等'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="careerInterests"
                  label={isEnglish ? 'Career Aspirations' : '职业兴趣方向'}
                >
                  <TextArea 
                    rows={3} 
                    placeholder={isEnglish 
                      ? 'Describe your career goals and aspirations'
                      : '描述您的职业目标和期望'}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 提交按钮 */}
          <div className={styles.submitSection}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large"
              loading={loading}
              className={styles.submitButton}
              icon={<RobotOutlined />}
            >
              {isEnglish ? 'Start AI Analysis' : '开始 AI 分析'}
            </Button>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              {isEnglish 
                ? 'Analysis takes about 1-2 minutes. Please be patient.'
                : '分析过程约需 1-2 分钟，请耐心等待'}
            </Text>
          </div>
        </Form>
      ) : (
        /* 有结果时显示简化的信息栏 */
        <Card className={styles.resultSummaryBar}>
          <Row align="middle" justify="space-between">
            <Col>
              <div className={styles.resultSummaryInfo}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24, marginRight: 12 }} />
                <div>
                  <Text strong>{isEnglish ? 'Analysis Complete' : '分析完成'}</Text>
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    Best 5: {analysisResult.student_profile.best5} | 
                    {isEnglish ? ' Matched: ' : ' 匹配课程: '}{analysisResult.matched_programmes.length}
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={handleReanalyze}
              >
                {isEnglish ? 'New Analysis' : '重新分析'}
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* AI分析进度弹窗 */}
      <Modal
        open={loading}
        closable={false}
        footer={null}
        centered
        width={480}
        maskClosable={false}
        className={styles.analysisModal}
      >
        <div className={styles.analysisModalContent}>
          <div className={styles.analysisIconWrapper}>
            <RobotOutlined className={styles.analysisIcon} />
            <div className={styles.analysisIconPulse} />
          </div>
          
          <Title level={3} style={{ marginBottom: 8, marginTop: 24 }}>
            {isEnglish ? 'AI Analysis in Progress' : 'AI 正在分析中'}
          </Title>
          
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            {isEnglish 
              ? 'Please wait patiently, analysis usually takes 1-2 minutes'
              : '请耐心等待，分析过程通常需要 1-2 分钟'}
          </Text>
          
          <Progress 
            percent={analysisProgress} 
            status="active"
            strokeColor={{
              '0%': '#52c41a',
              '100%': '#1890ff',
            }}
            style={{ marginBottom: 16 }}
          />
          
          <div className={styles.analysisStage}>
            <LoadingOutlined style={{ marginRight: 8 }} />
            <span>{analysisStage || (isEnglish ? 'Preparing...' : '准备中...')}</span>
          </div>
          
          <div className={styles.analysisTips}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 {isEnglish 
                ? 'AI is analyzing your results and matching with university programmes'
                : '提示：AI正在分析您的成绩与各大学专业的匹配度'}
            </Text>
          </div>
        </div>
      </Modal>

      {/* 分析结果区域 - 直接显示在页面上 */}
      {analysisResult && (
        <div ref={resultRef} className={styles.resultSection}>
          {/* 成功提示 */}
          <Alert
            message={isEnglish ? 'AI Analysis Complete!' : 'AI 分析完成！'}
            description={isEnglish 
              ? `Found ${analysisResult.matched_programmes.length} matching programmes for you.`
              : `已为您匹配到 ${analysisResult.matched_programmes.length} 个适合的课程。`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          {/* 学生档案摘要 */}
          <Card className={styles.summaryCard}>
            <Row gutter={[24, 16]}>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>{isEnglish ? 'Best 5' : '最佳5科'}</div>
                  <div className={styles.statValue}>{analysisResult.student_profile.best5}</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>{isEnglish ? 'Best 6' : '最佳6科'}</div>
                  <div className={styles.statValue}>{analysisResult.student_profile.best6}</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>{isEnglish ? 'Matched' : '匹配课程'}</div>
                  <div className={styles.statValue}>{analysisResult.matched_programmes.length}</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>{isEnglish ? 'Generated' : '生成时间'}</div>
                  <div className={styles.statValueSmall}>
                    {new Date(analysisResult.generated_at).toLocaleDateString()}
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 匹配课程列表 */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: '#faad14' }} />
                <span>{isEnglish ? 'Top Matched Programmes' : '匹配度最高的课程'}</span>
              </div>
            }
            className={styles.resultCard}
          >
            <div className={styles.programmesGrid}>
              {analysisResult.matched_programmes.slice(0, 5).map((prog, index) => (
                <div 
                  key={prog.code} 
                  className={styles.programmeCard}
                  style={{ borderLeftColor: FIELD_COLORS[prog.field?.toLowerCase().replace(/[^a-z]/g, '_')] || '#1890ff' }}
                >
                  <div className={styles.programmeHeader}>
                    <Badge 
                      count={index + 1} 
                      style={{ 
                        backgroundColor: prog.recommendation === 'safe' ? '#52c41a' : 
                                         prog.recommendation === 'match' ? '#faad14' : '#ff4d4f' 
                      }} 
                    />
                    <Tag color={
                      prog.recommendation === 'safe' ? 'success' : 
                      prog.recommendation === 'match' ? 'warning' : 'error'
                    }>
                      {prog.recommendation === 'safe' ? (isEnglish ? 'Safe' : '保底') :
                       prog.recommendation === 'match' ? (isEnglish ? 'Target' : '目标') :
                       (isEnglish ? 'Reach' : '冲刺')}
                    </Tag>
                  </div>
                  <div className={styles.programmeTitle}>{prog.title}</div>
                  <div className={styles.programmeUniversity}>{prog.university}</div>
                  <div className={styles.programmeScores}>
                    <Tooltip title={isEnglish ? 'Overall Match' : '综合匹配度'}>
                      <span className={styles.scoreItem}>
                        🎯 {prog.match_score}%
                      </span>
                    </Tooltip>
                    <Tooltip title={isEnglish ? 'Academic Match' : '成绩匹配度'}>
                      <span className={styles.scoreItem}>
                        📚 {prog.academic_score}%
                      </span>
                    </Tooltip>
                    {prog.historical.median && (
                      <Tooltip title={isEnglish ? 'Median Score' : '历年中位数'}>
                        <span className={styles.scoreItem}>
                          📊 {prog.historical.median}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI 详细报告 */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RobotOutlined style={{ color: '#1890ff' }} />
                <span>{isEnglish ? 'AI Detailed Analysis' : 'AI 详细分析报告'}</span>
              </div>
            }
            className={styles.resultCard}
          >
            <div className={styles.aiReportContainer}>
              <Paragraph className={styles.aiReport}>
                {analysisResult.ai_report.split('\n').map((line, index) => {
                  // 处理标题
                  if (line.startsWith('## ')) {
                    return <h3 key={index} className={styles.reportH3}>{line.replace('## ', '')}</h3>
                  }
                  if (line.startsWith('### ')) {
                    return <h4 key={index} className={styles.reportH4}>{line.replace('### ', '')}</h4>
                  }
                  if (line.startsWith('#### ')) {
                    return <h5 key={index} className={styles.reportH5}>{line.replace('#### ', '')}</h5>
                  }
                  // 处理列表项
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={index} className={styles.reportListItem}>{line.substring(2)}</li>
                  }
                  // 处理编号列表
                  if (/^\d+\.\s/.test(line)) {
                    return <li key={index} className={styles.reportListItem}>{line.replace(/^\d+\.\s/, '')}</li>
                  }
                  // 空行
                  if (!line.trim()) {
                    return <br key={index} />
                  }
                  // 普通段落
                  return <p key={index} className={styles.reportParagraph}>{line}</p>
                })}
              </Paragraph>
            </div>
          </Card>

          {/* 免责声明 */}
          <Alert
            message={isEnglish ? 'Disclaimer' : '免责声明'}
            description={analysisResult.disclaimer}
            type="warning"
            showIcon
            style={{ marginTop: 24 }}
          />

          {/* 重新分析按钮 */}
          <div className={styles.reanalyzeSection}>
            <Button 
              type="primary" 
              size="large"
              icon={<ReloadOutlined />}
              onClick={handleReanalyze}
            >
              {isEnglish ? 'Start New Analysis' : '开始新的分析'}
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

export default UniversityAnalysisPage
