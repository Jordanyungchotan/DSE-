import { useState, useEffect } from 'react'
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
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  RocketOutlined,
  BookOutlined,
  TrophyOutlined,
  LoadingOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import styles from './UniversityAnalysisPage.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

// DSE科目列表
const DSE_SUBJECTS = [
  { value: 'chinese', label: '中国语文' },
  { value: 'english', label: '英国语文' },
  { value: 'math', label: '数学' },
  { value: 'liberal', label: '公民与社会发展' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'biology', label: '生物' },
  { value: 'economics', label: '经济' },
  { value: 'bafs', label: '企业会计与财务概论' },
  { value: 'geography', label: '地理' },
  { value: 'history', label: '历史' },
  { value: 'ict', label: '资讯及通讯科技' },
  { value: 'm1', label: '数学延伸部分(M1)' },
  { value: 'm2', label: '数学延伸部分(M2)' },
]

// DSE等级
const DSE_GRADES = ['5**', '5*', '5', '4', '3', '2', '1', 'U']

// 香港大学列表
const HK_UNIVERSITIES = [
  { value: 'HKU', label: '香港大学' },
  { value: 'CUHK', label: '香港中文大学' },
  { value: 'UST', label: '香港科技大学' },
  { value: 'POLYU', label: '香港理工大学' },
  { value: 'CITYU', label: '香港城市大学' },
  { value: 'HKBU', label: '香港浸会大学' },
  { value: 'LINGU', label: '岭南大学' },
  { value: 'EDUHK', label: '香港教育大学' },
]

// 专业类别
const MAJOR_CATEGORIES = [
  { value: 'medicine', label: '医学' },
  { value: 'law', label: '法律' },
  { value: 'business', label: '商科' },
  { value: 'engineering', label: '工程' },
  { value: 'science', label: '理科' },
  { value: 'arts', label: '文科' },
  { value: 'social_science', label: '社会科学' },
  { value: 'education', label: '教育' },
]

interface DseResult {
  subject: string
  grade: string
}

/**
 * 分析进度阶段
 */
const ANALYSIS_STAGES = [
  { progress: 10, text: '正在连接AI分析服务...' },
  { progress: 25, text: '正在解析DSE成绩数据...' },
  { progress: 40, text: '正在匹配大学录取要求...' },
  { progress: 55, text: '正在分析专业适配度...' },
  { progress: 70, text: '正在评估录取概率...' },
  { progress: 85, text: '正在生成申请建议...' },
  { progress: 95, text: '即将完成，请稍候...' },
]

/**
 * 大学申请分析页面
 */
const UniversityAnalysisPage = () => {
  const navigate = useNavigate()
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

  // 计算最佳5科分数
  const calculateBestFive = () => {
    const gradeToScore: Record<string, number> = {
      '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0
    }
    const scores = dseResults
      .filter(r => r.grade)
      .map(r => gradeToScore[r.grade] || 0)
      .sort((a, b) => b - a)
    return scores.slice(0, 5).reduce((a, b) => a + b, 0)
  }

  // 提交分析
  const handleSubmit = async (values: Record<string, unknown>) => {
    // 验证DSE成绩
    const filledResults = dseResults.filter(r => r.subject && r.grade)
    if (filledResults.length < 4) {
      message.error('请至少填写4个科目的成绩')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/analysis/university', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dseResults: filledResults,
          targetUniversities: values.targetUniversities || [],
          targetMajors: values.targetMajors || [],
          extracurriculars: values.extracurriculars || '',
          careerInterests: values.careerInterests || [],
        }),
      })

      if (!response.ok) {
        throw new Error('分析请求失败')
      }

      const data = await response.json()
      navigate(`/result/university/${data.result.id}`)
    } catch (error) {
      message.error('分析失败，请稍后重试')
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
          返回
        </Button>
        <div className={styles.titleSection}>
          <Title level={2} className="gradient-title">
            <RocketOutlined /> 大学申请分析
          </Title>
          <Text type="secondary">
            分析您的DSE成绩与目标大学专业的匹配度
          </Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className={styles.form}
      >
          {/* DSE成绩输入 */}
          <Card 
            title={<><BookOutlined /> DSE成绩</>}
            className={styles.formCard}
            extra={
              <Tag color="blue" className={styles.scoreTag}>
                最佳5科：{bestFive}分
              </Tag>
            }
          >
            <div className={styles.subjectsGrid}>
              {dseResults.map((result, index) => (
                <div key={index} className={styles.subjectRow}>
                  <Select
                    placeholder="选择科目"
                    value={result.subject || undefined}
                    onChange={(v) => updateDseResult(index, 'subject', v)}
                    options={DSE_SUBJECTS}
                    style={{ flex: 2 }}
                  />
                  <Select
                    placeholder="等级"
                    value={result.grade || undefined}
                    onChange={(v) => updateDseResult(index, 'grade', v)}
                    options={DSE_GRADES.map(g => ({ value: g, label: g }))}
                    style={{ flex: 1 }}
                  />
                  {index >= 4 && (
                    <Button 
                      type="text" 
                      danger 
                      onClick={() => removeSubject(index)}
                    >
                      删除
                    </Button>
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
              添加选修科目
            </Button>
          </Card>

          {/* 目标大学和专业 */}
          <Card 
            title={<><TrophyOutlined /> 目标大学与专业</>}
            className={styles.formCard}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="targetUniversities"
                  label="目标大学"
                  rules={[{ required: true, message: '请选择至少一所目标大学' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择目标大学（可多选）"
                    options={HK_UNIVERSITIES}
                    maxTagCount={3}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="targetMajors"
                  label="目标专业类别"
                  rules={[{ required: true, message: '请选择目标专业' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择专业类别（可多选）"
                    options={MAJOR_CATEGORIES}
                    maxTagCount={3}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="specificMajor"
              label="具体专业（选填）"
            >
              <Input placeholder="如：计算机科学、工商管理等" />
            </Form.Item>
          </Card>

          {/* 个人背景 */}
          <Card 
            title="个人背景（选填）"
            className={styles.formCard}
          >
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="extracurriculars"
                  label="课外活动与成就"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="描述您的课外活动、比赛获奖、社区服务等"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="careerInterests"
                  label="职业兴趣方向"
                >
                  <Select
                    mode="tags"
                    placeholder="输入您感兴趣的职业方向"
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
            >
              开始分析
            </Button>
          </div>
        </Form>

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
          
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            请耐心等待，分析过程通常需要 1-2 分钟
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
            <span>{analysisStage || '准备中...'}</span>
          </div>
          
          <div className={styles.analysisTips}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 提示：AI正在分析您的成绩与各大学专业的匹配度
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default UniversityAnalysisPage

