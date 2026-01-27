import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form,
  Card,
  Steps,
  Button,
  DatePicker,
  Select,
  InputNumber,
  Input,
  Space,
  Typography,
  Row,
  Col,
  message,
  Divider,
  Tag,
  Modal,
  Progress,
  Spin,
  Empty,
  Tooltip,
} from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  BankOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SwapOutlined,
  RocketOutlined,
  RightOutlined,
  LoadingOutlined,
  RobotOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAnalysisStore, TransferSubjectInput } from '../stores/analysisStore'
import {
  CORE_SUBJECTS,
  ELECTIVE_SUBJECTS,
  GRADE_LEVEL_SELECT_OPTIONS,
  isCoreSubject,
  getSubjectDisplayName,
  LEARNING_STATUS_OPTIONS,
  RANK_POSITION_OPTIONS,
  SCORE_SOURCE_OPTIONS,
  LearningStatus,
} from '@/shared/domain'
import { useLanguageStore } from '../stores/languageStore'
import {
  getRegions,
  getSchoolsByDistrict,
  searchSchools,
  Region,
  School,
  REGION_COLORS,
} from '../services/schoolsApi'
import styles from './AnalysisFormPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/**
 * 根据日期计算对应的学期
 * 香港学年：9月-1月为上学期，2月-8月为下学期
 */
function getSemesterFromDate(date: dayjs.Dayjs): { value: string; label: string } {
  const month = date.month() + 1 // dayjs month is 0-indexed
  const year = date.year()
  
  if (month >= 9) {
    // 9-12月属于该学年上学期
    return {
      value: `${year}-${year + 1}-1`,
      label: `${year}-${year + 1}年度 上学期`
    }
  } else if (month >= 2) {
    // 2-8月属于上一学年下学期
    return {
      value: `${year - 1}-${year}-2`,
      label: `${year - 1}-${year}年度 下学期`
    }
  } else {
    // 1月属于上一学年上学期
    return {
      value: `${year - 1}-${year}-1`,
      label: `${year - 1}-${year}年度 上学期`
    }
  }
}

/**
 * 动态生成学期选项（从当前年度到未来3年）
 */
function generateSemesterOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  const options: { value: string; label: string }[] = []
  
  for (let year = currentYear - 1; year <= currentYear + 3; year++) {
    options.push({
      value: `${year}-${year + 1}-1`,
      label: `${year}-${year + 1}年度 上学期`
    })
    options.push({
      value: `${year}-${year + 1}-2`,
      label: `${year}-${year + 1}年度 下学期`
    })
  }
  
  return options
}

const SEMESTER_OPTIONS = generateSemesterOptions()


/**
 * 分析进度阶段
 */
const ANALYSIS_STAGES = [
  { progress: 10, text: '正在连接AI分析服务...' },
  { progress: 25, text: '正在解析学生信息...' },
  { progress: 40, text: '正在分析各科目学习状态...' },
  { progress: 55, text: '正在评估目标学校录取概率...' },
  { progress: 70, text: '正在生成学习计划建议...' },
  { progress: 85, text: '正在整理分析报告...' },
  { progress: 95, text: '即将完成，请稍候...' },
]

/**
 * 分析表单页面组件
 */
const AnalysisFormPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const { t, currentLanguage } = useLanguageStore()
  const currentLang = currentLanguage
  const [showSelector, setShowSelector] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  
  // 使用新的学习状态输入模型
  const [subjectStatuses, setSubjectStatuses] = useState<TransferSubjectInput[]>([
    { subject: CORE_SUBJECTS[0].key, status: 'ok' as LearningStatus },
    { subject: CORE_SUBJECTS[1].key, status: 'ok' as LearningStatus },
    { subject: CORE_SUBJECTS[2].key, status: 'ok' as LearningStatus },
    { subject: CORE_SUBJECTS[3].key, status: 'ok' as LearningStatus },
  ])
  
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  // 【核心修复】使用 AI 增强接口而非纯规则接口
  const { updateFormData, submitTransferAnalysisAI, loading } = useAnalysisStore()

  // 分析进度状态
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState('')

  // 18区学校选择状态
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [districtSchools, setDistrictSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

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
          setAnalysisStage(ANALYSIS_STAGES[stageIndex].text)
        }
      }, 8000) // 每8秒更新一次进度

      return () => clearInterval(interval)
    } else {
      setAnalysisProgress(0)
      setAnalysisStage('')
    }
  }, [loading])

  // 加载18区数据
  useEffect(() => {
    async function loadRegions() {
      const result = await getRegions()
      if (result.success && result.data) {
        setRegions(result.data)
      }
    }
    loadRegions()
  }, [])

  // 加载区内学校
  useEffect(() => {
    async function loadSchools() {
      if (!selectedDistrict) {
        setDistrictSchools([])
        return
      }
      setSchoolsLoading(true)
      const result = await getSchoolsByDistrict(selectedDistrict)
      if (result.success && result.data) {
        setDistrictSchools(result.data)
      }
      setSchoolsLoading(false)
    }
    loadSchools()
  }, [selectedDistrict])

  // 搜索学校
  const handleSchoolSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const result = await searchSchools(query)
    if (result.success && result.data) {
      setSearchResults(result.data)
    }
    setSearchLoading(false)
  }, [])

  // 选择学校（从搜索或列表）
  const handleSelectSchool = (school: School) => {
    const schoolName = school.name_zh
    if (!selectedSchools.includes(schoolName)) {
      setSelectedSchools([...selectedSchools, schoolName])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  // 移除已选学校
  const handleRemoveSchool = (schoolName: string) => {
    setSelectedSchools(selectedSchools.filter(s => s !== schoolName))
  }

  // 处理分析类型选择
  const handleSelectType = (type: 'transfer' | 'university') => {
    if (type === 'university') {
      navigate('/analysis/university')
    } else {
      setShowSelector(false)
    }
  }

  // 功能选择器
  const renderSelector = () => (
    <div className={styles.selectorContainer}>
      <div className={styles.selectorHeader}>
        <Title level={2} className="gradient-title">
          选择分析类型
        </Title>
        <Text type="secondary">
          请选择您需要的分析服务
        </Text>
      </div>

      <Row gutter={[24, 24]} className={styles.selectorCards}>
        <Col xs={24} md={12}>
          <Card 
            className={styles.selectorCard}
            hoverable
            onClick={() => handleSelectType('transfer')}
          >
            <div className={styles.selectorCardContent}>
              <div className={styles.selectorIconWrapper} style={{ backgroundColor: '#e6f7ff' }}>
                <SwapOutlined style={{ fontSize: 28, color: '#1890ff' }} />
              </div>
              <div className={styles.selectorTextContent}>
                <Title level={4}>插班分析</Title>
                <Text type="secondary">
                  分析学生的插班可行性，提供学校推荐、科目提升建议
                </Text>
              </div>
              <RightOutlined className={styles.selectorArrow} />
            </div>
            <div className={styles.selectorFeatures}>
              <span className={styles.featureTag}>智能学校推荐</span>
              <span className={styles.featureTag}>学习状态分析</span>
              <span className={styles.featureTag}>学习计划</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card 
            className={styles.selectorCard}
            hoverable
            onClick={() => handleSelectType('university')}
          >
            <div className={styles.selectorCardContent}>
              <div className={styles.selectorIconWrapper} style={{ backgroundColor: '#f6ffed' }}>
                <RocketOutlined style={{ fontSize: 28, color: '#52c41a' }} />
              </div>
              <div className={styles.selectorTextContent}>
                <Title level={4}>大学申请分析</Title>
                <Text type="secondary">
                  分析DSE成绩与目标大学专业的匹配度
                </Text>
              </div>
              <RightOutlined className={styles.selectorArrow} />
            </div>
            <div className={styles.selectorFeatures}>
              <span className={styles.featureTag}>录取概率分析</span>
              <span className={styles.featureTag}>专业推荐</span>
              <span className={styles.featureTag}>就业趋势</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )

  // 步骤配置
  const steps = [
    {
      title: '插班时间',
      icon: <CalendarOutlined />,
      description: '选择目标插班日期',
    },
    {
      title: '学生信息',
      icon: <UserOutlined />,
      description: '填写基本信息',
    },
    {
      title: '学习状态',
      icon: <BookOutlined />,
      description: '评估各科学习情况',
    },
    {
      title: '目标学校',
      icon: <BankOutlined />,
      description: '选择期望学校',
    },
  ]

  /**
   * 添加科目
   */
  const handleAddSubject = () => {
    setSubjectStatuses([
      ...subjectStatuses,
      { subject: '', status: 'ok' as LearningStatus },
    ])
  }

  /**
   * 删除科目（不能删除核心科目）
   */
  const handleRemoveSubject = (index: number) => {
    const subjectToRemove = subjectStatuses[index]
    // 核心科目不能删除
    if (isCoreSubject(subjectToRemove.subject)) {
      return
    }
    setSubjectStatuses(subjectStatuses.filter((_, i) => i !== index))
  }

  /**
   * 更新科目学习状态
   */
  const handleSubjectStatusChange = (
    index: number,
    field: keyof TransferSubjectInput,
    value: string | number | undefined
  ) => {
    const newStatuses = [...subjectStatuses]
    if (field === 'subject') {
      // 切换科目时清空其他输入
      newStatuses[index] = { 
        subject: value as string, 
        status: 'ok' as LearningStatus 
      }
    } else {
      newStatuses[index] = { 
        ...newStatuses[index], 
        [field]: value 
      }
    }
    setSubjectStatuses(newStatuses)
  }

  /**
   * 下一步
   */
  const handleNext = async () => {
    try {
      // 验证当前步骤
      if (currentStep === 0) {
        await form.validateFields(['enrollmentDate', 'semester'])
      } else if (currentStep === 1) {
        await form.validateFields(['grade', 'age'])
      } else if (currentStep === 2) {
        if (subjectStatuses.length === 0) {
          message.warning('请至少添加一个科目')
          return
        }
        // 验证所有科目都已填写学习状态
        const incomplete = subjectStatuses.some(
          (s) => !s.subject || !s.status
        )
        if (incomplete) {
          message.warning('请完整填写所有科目的学习状态')
          return
        }
      }
      
      setCurrentStep(currentStep + 1)
    } catch {
      message.error('请填写必填项')
    }
  }

  /**
   * 上一步
   */
  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  /**
   * 提交分析
   * 
   * 【核心修复】插班分析必须走 Transfer Analysis V2 系统
   * - 调用 submitTransferAnalysisV2（纯规则引擎）
   * - 跳转到 /transfer/result/:analysisId
   * - 禁止使用旧的 submitAnalysis 和 /result/:id
   */
  const handleSubmit = async () => {
    try {
      if (selectedSchools.length === 0) {
        message.warning('请至少选择一所目标学校')
        return
      }

      const values = await form.validateFields()
      
      // 构建完整的表单数据（使用新的学习状态模型）
      const formData = {
        enrollmentDate: values.enrollmentDate?.format('YYYY-MM-DD') || '',
        semester: values.semester,
        grade: values.grade,
        age: values.age,
        currentSchool: values.currentSchool || '',
        subjectStatuses: subjectStatuses,
        targetSchools: selectedSchools,
        notes: values.notes || '',
        // 个人特质信息
        hobbies: values.hobbies || [],
        strengths: values.strengths || [],
        extracurriculars: values.extracurriculars || [],
        achievements: values.achievements || '',
      }

      // 更新store（保持兼容）
      updateFormData(formData)

      // 【V2 核心】构建 TransferAnalysisInputV2 payload
      const v2Payload = {
        targetSchools: selectedSchools,
        targetGrade: values.grade,
        languagePreference: undefined, // 暂不支持语言偏好选择
        enableAI: false, // 使用纯规则引擎
        subjectStatuses: subjectStatuses.map(s => ({
          subject: s.subject,
          status: s.status as 'strong' | 'ok' | 'weak',
          rankPosition: s.rankPosition,
        })),
        selfAssessment: {
          // 可从表单扩展
          englishLevel: undefined,
          mathLevel: undefined,
          academicLevel: undefined,
          adaptability: undefined,
        },
      }

      // 【核心修复】提交到 Transfer Analysis AI 增强接口
      // AI 失败会自动降级为纯规则结果，aiEnabled 会准确反映实际状态
      const analysisId = await submitTransferAnalysisAI(v2Payload)
      message.success('分析已完成！')
      
      // 【V2 核心】跳转到 V2 专用结果页
      navigate(`/transfer/result/${analysisId}`)
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      } else {
        message.error('提交失败，请重试')
      }
    }
  }

  /**
   * 处理日期选择，自动设置对应学期
   */
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const semester = getSemesterFromDate(date)
      form.setFieldsValue({ 
        enrollmentDate: date,
        semester: semester.value 
      })
    }
  }

  /**
   * 渲染步骤1 - 插班时间
   */
  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>选择插班时间</Title>
      <Paragraph type="secondary">
        请选择您期望的插班日期，系统将自动匹配对应学期
      </Paragraph>
      
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            name="enrollmentDate"
            label="目标插班日期"
            rules={[{ required: true, message: '请选择插班日期' }]}
          >
            <DatePicker
              size="large"
              style={{ width: '100%' }}
              placeholder="选择日期"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="semester"
            label="目标学期（自动匹配）"
            rules={[{ required: true, message: '请选择学期' }]}
            tooltip="根据选择的日期自动推荐，也可手动调整"
          >
            <Select
              size="large"
              placeholder="选择日期后自动匹配"
              options={SEMESTER_OPTIONS}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  )

  /**
   * 渲染步骤2 - 学生信息
   */
  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>学生基本信息</Title>
      <Paragraph type="secondary">
        请填写学生的基本信息和个人特质，有助于AI进行全面分析
      </Paragraph>
      
      {/* 基本信息 */}
      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Form.Item
            name="grade"
            label="就读年级"
            rules={[{ required: true, message: '请选择年级' }]}
          >
            <Select
              size="large"
              placeholder="选择年级"
              options={GRADE_LEVEL_SELECT_OPTIONS}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="age"
            label="学生年龄"
            rules={[
              { required: true, message: '请输入年龄' },
              { type: 'number', min: 12, max: 20, message: '年龄应在12-20岁之间' },
            ]}
          >
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              placeholder="输入年龄"
              min={12}
              max={20}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="currentSchool"
            label="当前就读学校"
            tooltip="选填，有助于更精准的分析"
          >
            <Input
              size="large"
              placeholder="输入学校名称（选填）"
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">个人特质（选填，有助于综合评估）</Divider>

      {/* 兴趣爱好 */}
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item
            name="hobbies"
            label="兴趣爱好"
            tooltip="如：阅读、音乐、运动、编程等"
          >
            <Select
              mode="tags"
              size="large"
              placeholder="输入后按回车添加，可添加多个"
              tokenSeparators={[',']}
              options={[
                { value: '阅读', label: '阅读' },
                { value: '音乐', label: '音乐' },
                { value: '运动', label: '运动' },
                { value: '绘画', label: '绘画' },
                { value: '编程', label: '编程' },
                { value: '写作', label: '写作' },
                { value: '棋艺', label: '棋艺' },
                { value: '摄影', label: '摄影' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="strengths"
            label="个人特长"
            tooltip="如：领导力、演讲、语言能力、数理逻辑等"
          >
            <Select
              mode="tags"
              size="large"
              placeholder="输入后按回车添加，可添加多个"
              tokenSeparators={[',']}
              options={[
                { value: '领导力', label: '领导力' },
                { value: '演讲', label: '演讲' },
                { value: '团队协作', label: '团队协作' },
                { value: '英语口语', label: '英语口语' },
                { value: '数理逻辑', label: '数理逻辑' },
                { value: '创意思维', label: '创意思维' },
                { value: '组织能力', label: '组织能力' },
                { value: '时间管理', label: '时间管理' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 课外活动 */}
      <Row gutter={24}>
        <Col xs={24}>
          <Form.Item
            name="extracurriculars"
            label="课外活动与社团"
            tooltip="如：学生会、辩论队、运动队、志愿服务等"
          >
            <Select
              mode="tags"
              size="large"
              placeholder="输入后按回车添加，可添加多个"
              tokenSeparators={[',']}
              options={[
                { value: '学生会', label: '学生会' },
                { value: '辩论队', label: '辩论队' },
                { value: '合唱团', label: '合唱团' },
                { value: '篮球队', label: '篮球队' },
                { value: '足球队', label: '足球队' },
                { value: '游泳队', label: '游泳队' },
                { value: '志愿服务', label: '志愿服务' },
                { value: '科学社', label: '科学社' },
                { value: '戏剧社', label: '戏剧社' },
                { value: '摄影社', label: '摄影社' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 成就与奖项 */}
      <Row gutter={24}>
        <Col xs={24}>
          <Form.Item
            name="achievements"
            label="获奖经历与成就"
            tooltip="如：学科竞赛奖项、体育比赛名次、艺术表演获奖等"
          >
            <TextArea
              rows={3}
              placeholder="请描述获得的奖项或成就，例如：&#10;• 2024年校际数学竞赛银奖&#10;• 学生会副主席&#10;• 钢琴八级证书"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  )

  // 获取科目显示名称
  const getSubjectLabel = (subjectKey: string) => getSubjectDisplayName(subjectKey, currentLang)

  // 获取可选的选修科目（排除已选的）
  const getAvailableElectives = () => {
    const selectedSubjectKeys = subjectStatuses.map(s => s.subject)
    return ELECTIVE_SUBJECTS.filter((subject) => !selectedSubjectKeys.includes(subject.key))
  }

  /**
   * 渲染步骤3 - 学习状态（核心改动）
   * 
   * ⚠️ 重要设计原则：
   * - 系统判断仅基于"学习状态"（status），不使用任何等级分数
   * - 校内成绩仅供顾问参考，不参与系统分析
   * - 中一至中五学生无需了解 DSE 等级概念
   */
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>科目学习状态评估</Title>
      <Paragraph type="secondary">
        请根据学生在各科目的实际学习情况进行评估，系统将据此分析插班可行性
      </Paragraph>

      {/* 说明提示 */}
      <Card size="small" style={{ marginBottom: 20, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <Space>
          <InfoCircleOutlined style={{ color: '#52c41a' }} />
          <Text>
            <strong>填写说明：</strong>
            「学习状态」为系统分析依据，「校内成绩」仅供顾问参考，不影响分析结果
          </Text>
        </Space>
      </Card>

      <div className={styles.subjectsContainer}>
        {subjectStatuses.map((subjectStatus, index) => {
          const isCore = isCoreSubject(subjectStatus.subject)
          
          return (
            <Card
              key={index}
              size="small"
              className={styles.subjectCard}
              style={isCore ? { borderLeft: '3px solid #1890ff' } : undefined}
              extra={
                isCore ? (
                  <Tag color="blue">必修</Tag>
                ) : (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveSubject(index)}
                  >
                    删除
                  </Button>
                )
              }
            >
              <Row gutter={[16, 16]}>
                {/* 科目选择 */}
                <Col xs={24} sm={6}>
                  <Form.Item label="科目" required style={{ marginBottom: 0 }}>
                    {isCore ? (
                      <Select
                        value={subjectStatus.subject}
                        disabled
                        options={[{
                          value: subjectStatus.subject,
                          label: (
                            <span>
                              {getSubjectLabel(subjectStatus.subject)}
                              <Tag color="blue" style={{ marginLeft: 8 }}>核心</Tag>
                            </span>
                          ),
                        }]}
                      />
                    ) : (
                      <Select
                        placeholder="选择科目"
                        value={subjectStatus.subject || undefined}
                        onChange={(value) => handleSubjectStatusChange(index, 'subject', value)}
                        options={[
                          ...(subjectStatus.subject ? [{
                            value: subjectStatus.subject,
                            label: getSubjectLabel(subjectStatus.subject)
                          }] : []),
                          ...getAvailableElectives().map((subjectDef) => ({
                            value: subjectDef.key,
                            label: subjectDef.displayName[currentLang],
                          }))
                        ]}
                      />
                    )}
                  </Form.Item>
                </Col>

                {/* 学习状态（必填，系统分析主判断） */}
                <Col xs={24} sm={6}>
                  <Form.Item 
                    label={
                      <Space>
                        <span>学习状态</span>
                        <Tooltip title="系统将根据此项进行插班可行性分析">
                          <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      </Space>
                    }
                    required 
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="选择学习状态"
                      value={subjectStatus.status || undefined}
                      onChange={(value) => handleSubjectStatusChange(index, 'status', value)}
                      options={LEARNING_STATUS_OPTIONS.map(opt => ({
                        value: opt.value,
                        label: opt.label[currentLang],
                      }))}
                    />
                  </Form.Item>
                </Col>

                {/* 校内位置（可选） */}
                <Col xs={12} sm={6}>
                  <Form.Item 
                    label="校内位置" 
                    tooltip="班级/年级相对排名"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="选填"
                      value={subjectStatus.rankPosition || undefined}
                      onChange={(value) => handleSubjectStatusChange(index, 'rankPosition', value)}
                      allowClear
                      options={RANK_POSITION_OPTIONS.map(opt => ({
                        value: opt.value,
                        label: opt.label[currentLang],
                      }))}
                    />
                  </Form.Item>
                </Col>

                {/* 校内成绩（可选，仅供参考） */}
                <Col xs={12} sm={6}>
                  <Form.Item 
                    label={
                      <Space>
                        <span>校内成绩</span>
                        <Tooltip title="仅供老师参考，不直接用于系统分析">
                          <InfoCircleOutlined style={{ color: '#faad14' }} />
                        </Tooltip>
                      </Space>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      placeholder="0-100"
                      value={subjectStatus.schoolScore}
                      onChange={(value) => handleSubjectStatusChange(index, 'schoolScore', value ?? undefined)}
                      min={0}
                      max={100}
                      style={{ width: '100%' }}
                      addonAfter={
                        <Select
                          value={subjectStatus.scoreSource || 'latest'}
                          onChange={(value) => handleSubjectStatusChange(index, 'scoreSource', value)}
                          style={{ width: 80 }}
                          bordered={false}
                          size="small"
                        >
                          {SCORE_SOURCE_OPTIONS.map(opt => (
                            <Select.Option key={opt.value} value={opt.value}>
                              {opt.label[currentLang]}
                            </Select.Option>
                          ))}
                        </Select>
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )
        })}

        {getAvailableElectives().length > 0 && (
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={handleAddSubject}
            className={styles.addSubjectBtn}
          >
            添加选修科目
          </Button>
        )}
      </div>
    </div>
  )

  /**
   * 渲染步骤4 - 目标学校
   */
  // 手动输入学校
  const [customSchool, setCustomSchool] = useState('')
  
  const handleAddCustomSchool = () => {
    const trimmed = customSchool.trim()
    if (trimmed && !selectedSchools.includes(trimmed)) {
      setSelectedSchools([...selectedSchools, trimmed])
      setCustomSchool('')
    }
  }

  // 获取当前区域的区列表
  const currentRegion = regions.find(r => r.code === selectedRegion)
  const districts = currentRegion?.districts || []

  const renderStep4 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>选择目标学校</Title>
      <Paragraph type="secondary">
        请选择您期望入读的学校（可多选），支持按18区浏览或直接搜索
      </Paragraph>

      {/* 搜索框 */}
      <div style={{ marginBottom: 20 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="🔍 搜索学校名称..."
          value={searchQuery}
          onChange={e => handleSchoolSearch(e.target.value)}
          allowClear
          size="large"
          style={{ maxWidth: 500 }}
        />
      </div>

      {/* 搜索结果 */}
      {searchQuery.length >= 2 && (
        <Card 
          size="small" 
          style={{ marginBottom: 20, maxHeight: 250, overflow: 'auto' }}
          title={<><SearchOutlined /> 搜索结果 <Tag>{searchResults.length}</Tag></>}
        >
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : searchResults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map(school => (
                <div
                  key={school.id}
                  onClick={() => handleSelectSchool(school)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: selectedSchools.includes(school.name_zh) ? '#e6f4ff' : '#fafafa',
                    border: selectedSchools.includes(school.name_zh) ? '1px solid #1890ff' : '1px solid #f0f0f0',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>
                    <BankOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    {school.name_zh}
                    {selectedSchools.includes(school.name_zh) && (
                      <Tag color="success" style={{ marginLeft: 8 }}>已选</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginLeft: 22 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {school.region_name} · {school.district_name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="未找到匹配的学校" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      )}

      <Divider>按18区浏览学校</Divider>

      {/* 区域和区选择器 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>选择区域：</Text>
          <Select
            placeholder="选择区域"
            value={selectedRegion || undefined}
            onChange={(v) => { setSelectedRegion(v); setSelectedDistrict(''); }}
            style={{ width: '100%' }}
            allowClear
            size="large"
          >
            {regions.map(region => (
              <Select.Option key={region.code} value={region.code}>
                <Tag color={REGION_COLORS[region.code]} style={{ marginRight: 8 }}>
                  {region.name_zh}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>选择区：</Text>
          <Select
            placeholder="选择区"
            value={selectedDistrict || undefined}
            onChange={setSelectedDistrict}
            style={{ width: '100%' }}
            disabled={!selectedRegion}
            allowClear
            size="large"
          >
            {districts.map(district => (
              <Select.Option key={district.code} value={district.code}>
                {district.name_zh}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* 区内学校列表 */}
      {selectedDistrict && (
        <Card 
          size="small"
          style={{ maxHeight: 300, overflow: 'auto', marginBottom: 20 }}
          title={
            <Space>
              <BankOutlined />
              <span>{districts.find(d => d.code === selectedDistrict)?.name_zh}的学校</span>
              <Tag color="blue">{districtSchools.length}所</Tag>
            </Space>
          }
        >
          {schoolsLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : districtSchools.length > 0 ? (
            <div className={styles.schoolTags}>
              {districtSchools.map(school => (
                <Tag.CheckableTag
                  key={school.id}
                  checked={selectedSchools.includes(school.name_zh)}
                  onChange={(checked) => {
                    if (checked) {
                      setSelectedSchools([...selectedSchools, school.name_zh])
                    } else {
                      setSelectedSchools(selectedSchools.filter(s => s !== school.name_zh))
                    }
                  }}
                  className={styles.schoolTag}
                >
                  {school.name_zh}
                </Tag.CheckableTag>
              ))}
            </div>
          ) : (
            <Empty description="该区暂无学校数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      )}

      <Divider />

      {/* 已选学校 */}
      <div className={styles.selectedSchools}>
        <Text strong>✅ 已选学校 ({selectedSchools.length})：</Text>
        <div className={styles.selectedTags} style={{ marginTop: 12 }}>
          {selectedSchools.length > 0 ? (
            selectedSchools.map((school) => (
              <Tag
                key={school}
                closable
                color="blue"
                style={{ marginBottom: 8, padding: '4px 10px', fontSize: 14 }}
                onClose={() => handleRemoveSchool(school)}
              >
                {school}
              </Tag>
            ))
          ) : (
            <Text type="secondary">暂未选择学校，请从上方搜索或浏览选择</Text>
          )}
        </div>
      </div>

      <Divider />

      {/* 手动添加学校 */}
      <div style={{ marginBottom: 20 }}>
        <Text strong>手动添加学校：</Text>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Input
            placeholder="输入学校名称"
            value={customSchool}
            onChange={(e) => setCustomSchool(e.target.value)}
            onPressEnter={handleAddCustomSchool}
            style={{ maxWidth: 300 }}
          />
          <Button type="primary" onClick={handleAddCustomSchool}>
            添加
          </Button>
        </div>
      </div>

      {/* 备注 */}
      <Form.Item name="notes" label="备注信息">
        <TextArea
          rows={4}
          placeholder="如有其他需要说明的情况，请在此处填写（选填）"
        />
      </Form.Item>
    </div>
  )

  /**
   * 渲染当前步骤内容
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep1()
      case 1:
        return renderStep2()
      case 2:
        return renderStep3()
      case 3:
        return renderStep4()
      default:
        return null
    }
  }

  // 如果显示选择器
  if (showSelector) {
    return (
      <div className={styles.analysisFormPage}>
        {renderSelector()}
      </div>
    )
  }

  return (
    <div className={styles.analysisFormPage}>
      <Card className={styles.formCard}>
        {/* 页面标题 */}
        <div className={styles.pageHeader}>
          <Button 
            type="link" 
            onClick={() => setShowSelector(true)}
            style={{ padding: 0, marginBottom: 16 }}
          >
            ← {t('common.back')}
          </Button>
          <Title level={2} className="gradient-title">
            {t('analysis.title')}
          </Title>
          <Paragraph type="secondary">
            {t('analysis.description')}
          </Paragraph>
        </div>

        {/* 步骤指示器 */}
        <Steps
          current={currentStep}
          items={steps.map((step) => ({
            title: step.title,
            description: step.description,
            icon: step.icon,
          }))}
          className={styles.steps}
        />

        <Divider />

        {/* 表单内容 */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            age: 16,
          }}
        >
          {renderStepContent()}
        </Form>

        {/* 操作按钮 */}
        <div className={styles.formActions}>
          <Space>
            {currentStep > 0 && (
              <Button size="large" onClick={handlePrev}>
                上一步
              </Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" size="large" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                提交分析
              </Button>
            )}
          </Space>
        </div>
      </Card>

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
            AI 正在分析中
          </Title>
          
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            请耐心等待，分析过程通常需要 1-2 分钟
          </Paragraph>
          
          <Progress 
            percent={analysisProgress} 
            status="active"
            strokeColor={{
              '0%': '#1890ff',
              '100%': '#52c41a',
            }}
            style={{ marginBottom: 16 }}
          />
          
          <div className={styles.analysisStage}>
            <LoadingOutlined style={{ marginRight: 8 }} />
            <span>{analysisStage || '准备中...'}</span>
          </div>
          
          <div className={styles.analysisTips}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 提示：AI正在综合分析学生的学习状态、目标学校要求等多维度数据
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AnalysisFormPage
