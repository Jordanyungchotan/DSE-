import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Select, Button, message, Typography, Row, Col, Tag, Alert, Spin, Radio } from 'antd'
import { 
  ExperimentOutlined, 
  ClockCircleOutlined, 
  BookOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import styles from './LevelTestSetupPage.module.css'

const { Title, Paragraph, Text } = Typography
const { Option } = Select

// 年级选项
const GRADES = [
  { value: '中四', label: '中四 (Form 4)', description: '高中一年级' },
  { value: '中五', label: '中五 (Form 5)', description: '高中二年级' },
  { value: '中六', label: '中六 (Form 6)', description: '高中三年级/DSE年' },
]

// 科目选项
const SUBJECTS = {
  core: [
    { value: '中文', label: '中文', icon: '📚' },
    { value: '英文', label: '英文 (English)', icon: '🔤' },
    { value: '数学', label: '数学', icon: '📐' },
    { value: '通识教育', label: '通识教育', icon: '🌍' },
  ],
  elective: [
    { value: '物理', label: '物理', icon: '⚛️' },
    { value: '化学', label: '化学', icon: '🧪' },
    { value: '生物', label: '生物', icon: '🧬' },
    { value: '经济', label: '经济', icon: '📈' },
    { value: '地理', label: '地理', icon: '🗺️' },
    { value: '历史', label: '历史', icon: '📜' },
    { value: '中国历史', label: '中国历史', icon: '🏯' },
    { value: '信息及通讯科技', label: '信息及通讯科技', icon: '💻' },
  ]
}

// 测试类型
const TEST_TYPES = [
  {
    value: 'quick',
    label: '基础测试',
    description: '15-20题，约30分钟',
    icon: <ThunderboltOutlined />,
    time: 30,
    questions: '15-20',
    recommended: false
  },
  {
    value: 'full',
    label: '完整评估',
    description: '25-30题，约60分钟',
    icon: <TrophyOutlined />,
    time: 60,
    questions: '25-30',
    recommended: true
  }
]

export default function LevelTestSetupPage() {
  const navigate = useNavigate()
  
  const [grade, setGrade] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [testType, setTestType] = useState<'quick' | 'full'>('full')
  const [loading, setLoading] = useState(false)

  const handleStartTest = async () => {
    if (!grade) {
      message.warning('请选择年级')
      return
    }
    if (!subject) {
      message.warning('请选择科目')
      return
    }

    setLoading(true)
    try {
      const response = await apiFetch('/api/level-test/generate', {
        method: 'POST',
        body: JSON.stringify({ grade, subject, testType })
      }) as unknown as { success?: boolean; testId?: string; error?: string }

      if (response.success) {
        message.success('测试已生成，即将开始')
        // 跳转到测试页面
        navigate(`/level-test/${response.testId}`)
      } else {
        message.error(response.error || '生成测试失败')
      }
    } catch (error) {
      console.error('Generate test error:', error)
      message.error('生成测试失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <SafetyCertificateOutlined className={styles.headerIcon} />
        <Title level={2} className={styles.title}>
          DSE水平测试
        </Title>
        <Paragraph className={styles.subtitle}>
          精准评估您在香港DSE课程中的实际学业水平，获取个性化学习建议
        </Paragraph>
      </div>

      {/* 测试介绍 */}
      <Row gutter={[24, 24]} className={styles.features}>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <ExperimentOutlined className={styles.featureIcon} />
            <Title level={4}>智能AI出题</Title>
            <Text type="secondary">
              基于DeepSeek AI，严格遵循香港考评局DSE课程纲要生成题目
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <BookOutlined className={styles.featureIcon} />
            <Title level={4}>多维度评估</Title>
            <Text type="secondary">
              选择题、短答题、论述题综合评估，全面了解知识掌握情况
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.featureCard}>
            <TrophyOutlined className={styles.featureIcon} />
            <Title level={4}>DSE等级预测</Title>
            <Text type="secondary">
              根据测试表现预测DSE等级（1-5**），提供精准定位
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 测试配置 */}
      <Card className={styles.configCard}>
        <Title level={3} className={styles.configTitle}>
          <ExperimentOutlined /> 开始测试
        </Title>

        {/* 年级选择 */}
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>
            <span className={styles.stepNumber}>1</span>
            选择年级
          </div>
          <Select
            size="large"
            placeholder="请选择您的年级"
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
            选择科目
          </div>
          
          <div className={styles.subjectGroup}>
            <Text strong className={styles.groupLabel}>核心科目</Text>
            <div className={styles.subjectGrid}>
              {SUBJECTS.core.map(s => (
                <div
                  key={s.value}
                  className={`${styles.subjectItem} ${subject === s.value ? styles.selected : ''}`}
                  onClick={() => setSubject(s.value)}
                >
                  <span className={styles.subjectIcon}>{s.icon}</span>
                  <span className={styles.subjectName}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.subjectGroup}>
            <Text strong className={styles.groupLabel}>选修科目</Text>
            <div className={styles.subjectGrid}>
              {SUBJECTS.elective.map(s => (
                <div
                  key={s.value}
                  className={`${styles.subjectItem} ${subject === s.value ? styles.selected : ''}`}
                  onClick={() => setSubject(s.value)}
                >
                  <span className={styles.subjectIcon}>{s.icon}</span>
                  <span className={styles.subjectName}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 测试类型选择 */}
        <div className={styles.configSection}>
          <div className={styles.sectionLabel}>
            <span className={styles.stepNumber}>3</span>
            选择测试类型
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
                    {type.recommended && <Tag color="green">推荐</Tag>}
                  </div>
                  <div className={styles.testTypeInfo}>
                    <span><ClockCircleOutlined /> {type.time}分钟</span>
                    <span><BookOutlined /> {type.questions}题</span>
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
          message="测试须知"
          description={
            <ul className={styles.noticeList}>
              <li>测试开始后请确保网络稳定，系统会每30秒自动保存进度</li>
              <li>测试题目包含选择题（40%）、短答题（40%）、论述题（20%）</li>
              <li>请在规定时间内完成测试，超时将自动提交</li>
              <li>测试结果将生成详细的分析报告和学习建议</li>
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
          loading={loading}
          disabled={!grade || !subject}
        >
          {loading ? (
            <>
              <Spin size="small" style={{ marginRight: 8 }} />
              正在生成题目...
            </>
          ) : (
            <>
              <ExperimentOutlined />
              开始水平测试
            </>
          )}
        </Button>

        {(!grade || !subject) && (
          <Text type="secondary" className={styles.hint}>
            请先选择年级和科目
          </Text>
        )}
      </Card>

      {/* DSE等级说明 */}
      <Card className={styles.levelGuide}>
        <Title level={4}>DSE等级说明</Title>
        <Row gutter={[16, 16]}>
          {[
            { level: '5**', score: '90-100', desc: '优异', color: '#52c41a' },
            { level: '5*', score: '85-89', desc: '优良', color: '#73d13d' },
            { level: '5', score: '80-84', desc: '良好', color: '#95de64' },
            { level: '4', score: '70-79', desc: '中等', color: '#1890ff' },
            { level: '3', score: '60-69', desc: '基本达标', color: '#69c0ff' },
            { level: '2', score: '40-59', desc: '部分达标', color: '#faad14' },
            { level: '1', score: '20-39', desc: '未达标', color: '#ff7a45' },
            { level: 'U', score: '0-19', desc: '不予评级', color: '#ff4d4f' },
          ].map(item => (
            <Col xs={12} sm={6} key={item.level}>
              <div className={styles.levelItem}>
                <Tag color={item.color} className={styles.levelTag}>{item.level}</Tag>
                <div className={styles.levelInfo}>
                  <Text strong>{item.desc}</Text>
                  <Text type="secondary">{item.score}分</Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  )
}

