import { useState, useEffect } from 'react'
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
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAnalysisStore, SubjectScore } from '../stores/analysisStore'
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
 * 年级选项
 */
const GRADE_OPTIONS = [
  { value: 'form4', label: '中四' },
  { value: 'form5', label: '中五' },
  { value: 'form6', label: '中六' },
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
 * 香港著名中学列表（按地区分类）
 */
/**
 * 香港中学列表（按区域分类）
 */
const HK_SCHOOLS = {
  hongKongIsland: [
    // 中西区
    '皇仁书院', '英皇书院', '圣保罗男女中学', '圣若瑟书院', '圣士提反女子中学',
    '英华女学校', '圣类斯中学', '高主教书院', '圣嘉勒女书院', '圣保罗书院',
    // 湾仔区
    '香港华仁书院', '玛利曼中学', '圣保禄学校', '嘉诺撒圣方济各书院', '香港真光中学',
    '皇仁旧生会中学', '邓肇坚维多利亚官立中学',
    // 东区
    '庇理罗士女子中学', '筲箕湾官立中学', '张祝珊英文中学', '港岛民生书院', '中华基金中学',
    '卫理中学', '嘉诺撒书院', '圣马可中学', '文理书院(香港)',
    // 南区
    '嘉诺撒圣心书院', '圣士提反书院', '港大同学会书院', '余振强纪念第二中学',
    '金文泰中学', '明爱庄月明中学',
  ],
  kowloon: [
    // 油尖旺区
    '拔萃女书院', '真光女书院', '循道中学', '伊利沙伯中学', '九龙华仁书院',
    '官立嘉道理爵士中学', '中华基督教会铭基书院', '油麻地天主教小学(中学部)',
    // 深水埗区
    '英华书院', '圣芳济书院', '德雅中学', '宝血会上智英文书院', '长沙湾天主教英文中学',
    '惠侨英文中学', '香港四邑商工总会黄棣珊纪念中学',
    // 九龙城区
    '喇沙书院', '拔萃男书院', '玛利诺修院学校', '协恩中学', '华英中学',
    '民生书院', '何明华会督银禧中学', '旺角劳工子弟学校', '迦密中学',
    '东华三院黄笏南中学', '保良局颜宝铃书院', '圣公会圣三一堂中学',
    // 黄大仙区
    '德望学校', '保良局第一张永庆中学', '中华基督教会协和书院', '圣文德书院',
    '可立中学(啬色园主办)', '佛教孔仙洲纪念中学',
    // 观塘区
    '圣杰灵女子中学', '圣言中学', '观塘玛利诺书院', '顺利天主教中学',
    '梁式芝书院', '观塘官立中学', '宁波公学', '圣傑灵女子中学',
  ],
  newTerritories: [
    // 沙田区
    '沙田官立中学', '浸信会吕明才中学', '圣公会曾肇添中学', '沙田培英中学',
    '沙田循道卫理中学', '圣罗撒书院', '天主教郭得胜中学', '五旬节林汉光中学',
    '圣母无玷圣心书院', '培侨中学', '香港浸会大学附属学校王锦辉中小学',
    // 大埔区
    '圣公会莫寿增会督中学', '迦密柏雨中学', '恩主教书院', '王肇枝中学',
    '南亚路德会沐恩中学', '罗定邦中学',
    // 北区
    '圣芳济各书院', '风采中学(教育评议会主办)', '东华三院李嘉诚中学',
    '田家炳中学', '保良局马锦明中学',
    // 元朗区
    '天主教崇德英文书院', '圣公会白约翰会督中学', '新界乡议局元朗区中学',
    '元朗公立中学', '东华三院卢干庭纪念中学', '基督教香港信义会元朗信义中学',
    // 屯门区
    '保良局百周年李兆忠纪念中学', '屯门官立中学', '顺德联谊总会谭伯羽中学',
    '妙法寺刘金龙中学', '南屯门官立中学', '保良局董玉娣中学',
    // 荃湾区
    '荃湾官立中学', '保良局李城璧中学', '廖宝珊纪念书院', '宝安商会王少清中学',
    // 葵青区
    '圣公会林护纪念中学', '顺德联谊总会李兆基中学', '东华三院伍若瑜夫人纪念中学',
    '佛教善德英文中学', '皇仁旧生会中学',
    // 西贡区
    '迦密主恩中学', '将军澳官立中学', '景岭书院', '宝觉中学',
    '仁济医院王华湘中学', '西贡崇真天主教学校(中学部)',
    // 离岛区
    '长洲官立中学', '东涌天主教学校', '灵粮堂怡文中学',
  ],
}

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
  const [showSelector, setShowSelector] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [subjects, setSubjects] = useState<SubjectScore[]>([])
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const { updateFormData, submitAnalysis, loading } = useAnalysisStore()

  // 分析进度状态
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState('')

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
   * 删除科目
   */
  const handleRemoveSubject = (index: number) => {
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

  /**
   * 渲染步骤3 - 科目成绩
   */
  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>科目成绩录入</Title>
      <Paragraph type="secondary">
        请添加并填写各科目的当前成绩和目标成绩
      </Paragraph>

      <div className={styles.subjectsContainer}>
        {subjects.map((subject, index) => (
          <Card
            key={index}
            size="small"
            className={styles.subjectCard}
            extra={
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveSubject(index)}
              >
                删除
              </Button>
            }
          >
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item label="科目" required>
                  <Select
                    placeholder="选择科目"
                    value={subject.subject || undefined}
                    onChange={(value) => handleSubjectChange(index, 'subject', value)}
                    options={DSE_SUBJECTS.map((s) => ({
                      value: s.value,
                      label: (
                        <span>
                          {s.label}
                          {s.category === 'core' && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>核心</Tag>
                          )}
                        </span>
                      ),
                    }))}
                  />
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
        ))}

        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={handleAddSubject}
          className={styles.addSubjectBtn}
        >
          添加科目
        </Button>
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

  const renderStep4 = () => (
    <div className={styles.stepContent}>
      <Title level={4}>选择目标学校</Title>
      <Paragraph type="secondary">
        请选择您期望入读的学校（可多选），也可以手动输入学校名称
      </Paragraph>

      {/* 手动输入学校 */}
      <div style={{ marginBottom: 24 }}>
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

      <Divider>或从列表中选择</Divider>

      <div className={styles.schoolsContainer}>
        {/* 港岛区 */}
        <div className={styles.schoolRegion}>
          <Title level={5}>🏝️ 港岛区 ({HK_SCHOOLS.hongKongIsland.length}所)</Title>
          <div className={styles.schoolTags}>
            {HK_SCHOOLS.hongKongIsland.map((school) => (
              <Tag.CheckableTag
                key={school}
                checked={selectedSchools.includes(school)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedSchools([...selectedSchools, school])
                  } else {
                    setSelectedSchools(selectedSchools.filter((s) => s !== school))
                  }
                }}
                className={styles.schoolTag}
              >
                {school}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>

        {/* 九龙区 */}
        <div className={styles.schoolRegion}>
          <Title level={5}>🏙️ 九龙区 ({HK_SCHOOLS.kowloon.length}所)</Title>
          <div className={styles.schoolTags}>
            {HK_SCHOOLS.kowloon.map((school) => (
              <Tag.CheckableTag
                key={school}
                checked={selectedSchools.includes(school)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedSchools([...selectedSchools, school])
                  } else {
                    setSelectedSchools(selectedSchools.filter((s) => s !== school))
                  }
                }}
                className={styles.schoolTag}
              >
                {school}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>

        {/* 新界区 */}
        <div className={styles.schoolRegion}>
          <Title level={5}>🌿 新界区 ({HK_SCHOOLS.newTerritories.length}所)</Title>
          <div className={styles.schoolTags}>
            {HK_SCHOOLS.newTerritories.map((school) => (
              <Tag.CheckableTag
                key={school}
                checked={selectedSchools.includes(school)}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedSchools([...selectedSchools, school])
                  } else {
                    setSelectedSchools(selectedSchools.filter((s) => s !== school))
                  }
                }}
                className={styles.schoolTag}
              >
                {school}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>
      </div>

      <Divider />

      {/* 已选学校 */}
      <div className={styles.selectedSchools}>
        <Text strong>已选学校 ({selectedSchools.length})：</Text>
        <div className={styles.selectedTags}>
          {selectedSchools.length > 0 ? (
            selectedSchools.map((school) => (
              <Tag
                key={school}
                closable
                color="blue"
                onClose={() => setSelectedSchools(selectedSchools.filter((s) => s !== school))}
              >
                {school}
              </Tag>
            ))
          ) : (
            <Text type="secondary">暂未选择学校</Text>
          )}
        </div>
      </div>

      <Divider />

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
            ← 返回选择
          </Button>
          <Title level={2} className="gradient-title">
            DSE插班分析
          </Title>
          <Paragraph type="secondary">
            请完整填写以下信息，AI将为您生成专业的插班可行性分析报告
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

