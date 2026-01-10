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
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAnalysisStore, SubjectScore } from '../stores/analysisStore'
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
 * DSE科目列表
 */
const DSE_SUBJECTS = [
  { value: 'chinese', label: '中国语文', category: 'core' },
  { value: 'english', label: '英国语文', category: 'core' },
  { value: 'math', label: '数学', category: 'core' },
  { value: 'liberal', label: '公民与社会发展', category: 'core' },
  { value: 'physics', label: '物理', category: 'elective' },
  { value: 'chemistry', label: '化学', category: 'elective' },
  { value: 'biology', label: '生物', category: 'elective' },
  { value: 'economics', label: '经济', category: 'elective' },
  { value: 'bafs', label: '企业会计与财务概论', category: 'elective' },
  { value: 'geography', label: '地理', category: 'elective' },
  { value: 'history', label: '历史', category: 'elective' },
  { value: 'ict', label: '资讯及通讯科技', category: 'elective' },
  { value: 'm1', label: '数学延伸部分(M1)', category: 'elective' },
  { value: 'm2', label: '数学延伸部分(M2)', category: 'elective' },
]

/**
 * DSE成绩等级
 */
const DSE_GRADES = [
  { value: '5**', label: '5**' },
  { value: '5*', label: '5*' },
  { value: '5', label: '5' },
  { value: '4', label: '4' },
  { value: '3', label: '3' },
  { value: '2', label: '2' },
  { value: '1', label: '1' },
  { value: 'U', label: 'U (不予评级)' },
]

/**
 * 年级选项（包含初中和高中）
 */
const GRADE_OPTIONS = [
  { value: 'S1', label: '中一' },
  { value: 'S2', label: '中二' },
  { value: 'S3', label: '中三' },
  { value: 'S4', label: '中四' },
  { value: 'S5', label: '中五' },
  { value: 'S6', label: '中六' },
]

/**
 * 学期选项
 */
const SEMESTER_OPTIONS = [
  { value: '2024-2025-1', label: '2024-2025年度 上学期' },
  { value: '2024-2025-2', label: '2024-2025年度 下学期' },
  { value: '2025-2026-1', label: '2025-2026年度 上学期' },
  { value: '2025-2026-2', label: '2025-2026年度 下学期' },
]


/**
 * 分析进度阶段
 */
const ANALYSIS_STAGES = [
  { progress: 10, text: '正在连接AI分析服务...' },
  { progress: 25, text: '正在解析学生信息...' },
  { progress: 40, text: '正在分析各科目成绩...' },
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
  const { t } = useLanguageStore()
  const [showSelector, setShowSelector] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  // 核心科目（必填）
  const CORE_SUBJECTS = ['chinese', 'english', 'math', 'liberal']
  
  const [subjects, setSubjects] = useState<SubjectScore[]>([
    { subject: 'chinese', currentScore: '', targetScore: '' },
    { subject: 'english', currentScore: '', targetScore: '' },
    { subject: 'math', currentScore: '', targetScore: '' },
    { subject: 'liberal', currentScore: '', targetScore: '' },
  ])
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const { updateFormData, submitAnalysis, loading } = useAnalysisStore()

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
              <span className={styles.featureTag}>科目分析</span>
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
      title: '科目成绩',
      icon: <BookOutlined />,
      description: '录入各科成绩',
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
    setSubjects([
      ...subjects,
      { subject: '', currentScore: '', targetScore: '' },
    ])
  }

  /**
   * 删除科目（不能删除核心科目）
   */
  const handleRemoveSubject = (index: number) => {
    const subjectToRemove = subjects[index]
    // 核心科目不能删除
    if (CORE_SUBJECTS.includes(subjectToRemove.subject)) {
      return
    }
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  /**
   * 更新科目信息
   */
  const handleSubjectChange = (
    index: number,
    field: keyof SubjectScore,
    value: string
  ) => {
    const newSubjects = [...subjects]
    newSubjects[index] = { ...newSubjects[index], [field]: value }
    setSubjects(newSubjects)
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
        if (subjects.length === 0) {
          message.warning('请至少添加一个科目')
          return
        }
        // 验证所有科目都已填写
        const incomplete = subjects.some(
          (s) => !s.subject || !s.currentScore || !s.targetScore
        )
        if (incomplete) {
          message.warning('请完整填写所有科目信息')
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
   */
  const handleSubmit = async () => {
    try {
      if (selectedSchools.length === 0) {
        message.warning('请至少选择一所目标学校')
        return
      }

      const values = await form.validateFields()
      
      // 构建完整的表单数据
      const formData = {
        enrollmentDate: values.enrollmentDate?.format('YYYY-MM-DD') || '',
        semester: values.semester,
        grade: values.grade,
        age: values.age,
        currentSchool: values.currentSchool || '',
        subjects: subjects,
        targetSchools: selectedSchools,
        notes: values.notes || '',
      }

      // 更新store
      updateFormData(formData)

      // 提交分析
      const resultId = await submitAnalysis()
      message.success('分析已完成！')
      navigate(`/result/${resultId}`)
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      } else {
        message.error('提交失败，请重试')
      }
    }
  }

  /**
   * 渲染步骤1 - 插班时间
   */
  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>选择插班时间</Title>
      <Paragraph type="secondary">
        请选择您期望的插班日期和目标学期
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
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="semester"
            label="目标学期"
            rules={[{ required: true, message: '请选择学期' }]}
          >
            <Select
              size="large"
              placeholder="选择学期"
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
        请填写学生的基本信息，以便进行精准分析
      </Paragraph>
      
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
              options={GRADE_OPTIONS}
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
    </div>
  )

  // 获取科目显示名称
  const getSubjectLabel = (subjectValue: string) => {
    const found = DSE_SUBJECTS.find(s => s.value === subjectValue)
    return found?.label || subjectValue
  }

  // 获取可选的选修科目（排除已选的）
  const getAvailableElectives = () => {
    const selectedSubjects = subjects.map(s => s.subject)
    return DSE_SUBJECTS.filter(s => 
      s.category === 'elective' && !selectedSubjects.includes(s.value)
    )
  }

  /**
   * 渲染步骤3 - 科目成绩
   */
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>科目成绩录入</Title>
      <Paragraph type="secondary">
        核心科目（中文、英文、数学、公民与社会发展）为必填项，可添加其他选修科目
      </Paragraph>

      <div className={styles.subjectsContainer}>
        {subjects.map((subject, index) => {
          const isCore = CORE_SUBJECTS.includes(subject.subject)
          
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
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label="科目" required>
                    {isCore ? (
                      <Select
                        value={subject.subject}
                        disabled
                        options={[{
                          value: subject.subject,
                          label: (
                            <span>
                              {getSubjectLabel(subject.subject)}
                              <Tag color="blue" style={{ marginLeft: 8 }}>核心</Tag>
                            </span>
                          ),
                        }]}
                      />
                    ) : (
                      <Select
                        placeholder="选择科目"
                        value={subject.subject || undefined}
                        onChange={(value) => handleSubjectChange(index, 'subject', value)}
                        options={[
                          // 当前已选的科目
                          ...(subject.subject ? [{
                            value: subject.subject,
                            label: getSubjectLabel(subject.subject)
                          }] : []),
                          // 其他可选的选修科目
                          ...getAvailableElectives().map((s) => ({
                            value: s.value,
                            label: s.label,
                          }))
                        ]}
                      />
                    )}
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label="当前成绩" required>
                    <Select
                      placeholder="选择成绩"
                      value={subject.currentScore || undefined}
                      onChange={(value) => handleSubjectChange(index, 'currentScore', value)}
                      options={DSE_GRADES}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={8}>
                  <Form.Item label="目标成绩" required>
                    <Select
                      placeholder="选择目标"
                      value={subject.targetScore || undefined}
                      onChange={(value) => handleSubjectChange(index, 'targetScore', value)}
                      options={DSE_GRADES}
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
              💡 提示：AI正在综合分析您的成绩、目标学校录取标准等多维度数据
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AnalysisFormPage

