import { useState } from 'react'
import { Card, Typography, Button, Progress, Row, Col, Tag, Spin, message, Divider } from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  BulbOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../../config/api'
import { useAuthStore } from '../../stores/authStore'
import styles from './LearningReport.module.css'

const { Title, Text, Paragraph } = Typography

interface LearningReportData {
  generatedAt: string
  period: string
  summary: {
    totalStudyTime: number
    totalQuestions: number
    averageAccuracy: number
    improvement: number
    strongSubjects: string[]
    weakSubjects: string[]
  }
  subjectAnalysis: Array<{
    subject: string
    accuracy: number
    trend: 'up' | 'down' | 'stable'
    recommendations: string[]
  }>
  topicInsights: Array<{
    topic: string
    mastery: number
    status: 'strong' | 'needs_work' | 'critical'
  }>
  recommendations: string[]
  nextSteps: string[]
}

interface LearningReportProps {
  userId?: string
}

/**
 * 学习报告组件
 */
const LearningReport = ({ userId }: LearningReportProps) => {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<LearningReportData | null>(null)

  // 生成学习报告
  const generateReport = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/quiz/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, period: 'weekly' }),
      })

      if (!response.ok) {
        throw new Error('生成报告失败')
      }

      const data = await response.json()
      setReport(data)
      message.success('报告生成成功！')
    } catch (error) {
      console.error('生成报告失败:', error)
      // 使用模拟数据
      setReport(generateMockReport())
      message.info('已生成示例报告')
    } finally {
      setLoading(false)
    }
  }

  // 生成模拟报告
  const generateMockReport = (): LearningReportData => {
    return {
      generatedAt: new Date().toISOString(),
      period: '本周',
      summary: {
        totalStudyTime: 320, // 分钟
        totalQuestions: 156,
        averageAccuracy: 74.5,
        improvement: 8.3,
        strongSubjects: ['数学', '物理'],
        weakSubjects: ['中国语文'],
      },
      subjectAnalysis: [
        {
          subject: '数学',
          accuracy: 82.5,
          trend: 'up',
          recommendations: [
            '继续保持当前的学习节奏',
            '可以尝试挑战更高难度的题目',
            '建议复习三角函数和微积分相关知识点',
          ],
        },
        {
          subject: '物理',
          accuracy: 78.2,
          trend: 'stable',
          recommendations: [
            '力学部分掌握良好',
            '电磁学需要加强练习',
            '建议做更多实验分析类题目',
          ],
        },
        {
          subject: '化学',
          accuracy: 68.9,
          trend: 'up',
          recommendations: [
            '有机化学反应机理需要巩固',
            '建议多做计算题练习',
            '化学平衡是重点，需加强',
          ],
        },
        {
          subject: '中国语文',
          accuracy: 58.3,
          trend: 'down',
          recommendations: [
            '文言文阅读需要重点突破',
            '建议每天阅读一篇古文',
            '作文结构需要改进',
          ],
        },
      ],
      topicInsights: [
        { topic: '二次方程', mastery: 92, status: 'strong' },
        { topic: '三角函数', mastery: 78, status: 'strong' },
        { topic: '牛顿力学', mastery: 85, status: 'strong' },
        { topic: '化学平衡', mastery: 55, status: 'needs_work' },
        { topic: '有机化学', mastery: 48, status: 'critical' },
        { topic: '文言文阅读', mastery: 42, status: 'critical' },
      ],
      recommendations: [
        '📚 建议每天保持至少30分钟的刷题时间',
        '🎯 优先复习标记为"需加强"的知识点',
        '📝 利用错题本进行针对性复习',
        '⏰ 尝试在模拟考试环境下做题，提高时间管理能力',
        '💡 数学和物理是你的强项，可以挑战更高难度',
      ],
      nextSteps: [
        '完成化学平衡专项练习（推荐20题）',
        '每天阅读一篇文言文并做理解练习',
        '复习本周所有错题',
        '尝试一次完整的模拟测试',
      ],
    }
  }

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <RiseOutlined style={{ color: '#52c41a' }} />
      case 'down':
        return <FallOutlined style={{ color: '#f5222d' }} />
      default:
        return <span style={{ color: '#999' }}>—</span>
    }
  }

  // 获取状态标签
  const getStatusTag = (status: 'strong' | 'needs_work' | 'critical') => {
    switch (status) {
      case 'strong':
        return <Tag color="success">掌握良好</Tag>
      case 'needs_work':
        return <Tag color="warning">需要加强</Tag>
      case 'critical':
        return <Tag color="error">重点突破</Tag>
    }
  }

  // 导出报告
  const exportReport = () => {
    if (!report) return
    
    const reportText = `
DSE学习报告 - ${report.period}
生成时间: ${new Date(report.generatedAt).toLocaleString()}

=== 学习概况 ===
总学习时长: ${Math.floor(report.summary.totalStudyTime / 60)}小时${report.summary.totalStudyTime % 60}分钟
完成题目数: ${report.summary.totalQuestions}
平均正确率: ${report.summary.averageAccuracy}%
进步幅度: ${report.summary.improvement > 0 ? '+' : ''}${report.summary.improvement}%

强势科目: ${report.summary.strongSubjects.join('、')}
需加强科目: ${report.summary.weakSubjects.join('、')}

=== 科目分析 ===
${report.subjectAnalysis.map(s => `
${s.subject} - 正确率: ${s.accuracy}% (${s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '—'})
建议:
${s.recommendations.map(r => `  - ${r}`).join('\n')}
`).join('\n')}

=== 学习建议 ===
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

=== 下一步计划 ===
${report.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
    `.trim()

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DSE学习报告_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    message.success('报告已导出')
  }

  if (loading) {
    return (
      <Card className={styles.reportCard}>
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="正在生成学习报告..." />
        </div>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className={styles.reportCard}>
        <div className={styles.emptyState}>
          <FileTextOutlined className={styles.emptyIcon} />
          <Title level={4}>生成学习报告</Title>
          <Paragraph type="secondary">
            基于您的学习数据，生成个性化的分析报告和学习建议
          </Paragraph>
          <Button type="primary" size="large" icon={<FileTextOutlined />} onClick={generateReport}>
            生成报告
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.reportContainer}>
      {/* 报告头部 */}
      <Card className={styles.reportHeader}>
        <div className={styles.headerContent}>
          <div>
            <Title level={3}>
              <FileTextOutlined /> {report.period}学习报告
            </Title>
            <Text type="secondary">
              生成时间: {new Date(report.generatedAt).toLocaleString()}
            </Text>
          </div>
          <div className={styles.headerActions}>
            <Button icon={<DownloadOutlined />} onClick={exportReport}>
              导出报告
            </Button>
            <Button type="primary" onClick={generateReport}>
              重新生成
            </Button>
          </div>
        </div>
      </Card>

      {/* 学习概况 */}
      <Card className={styles.summaryCard} title={<><TrophyOutlined /> 学习概况</>}>
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={6}>
            <div className={styles.summaryItem}>
              <ClockCircleOutlined className={styles.summaryIcon} />
              <div className={styles.summaryValue}>
                {Math.floor(report.summary.totalStudyTime / 60)}h {report.summary.totalStudyTime % 60}m
              </div>
              <div className={styles.summaryLabel}>学习时长</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className={styles.summaryItem}>
              <BookOutlined className={styles.summaryIcon} />
              <div className={styles.summaryValue}>{report.summary.totalQuestions}</div>
              <div className={styles.summaryLabel}>完成题目</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className={styles.summaryItem}>
              <CheckCircleOutlined className={styles.summaryIcon} style={{ color: '#52c41a' }} />
              <div className={styles.summaryValue}>{report.summary.averageAccuracy}%</div>
              <div className={styles.summaryLabel}>平均正确率</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className={styles.summaryItem}>
              <RiseOutlined
                className={styles.summaryIcon}
                style={{ color: report.summary.improvement >= 0 ? '#52c41a' : '#f5222d' }}
              />
              <div
                className={styles.summaryValue}
                style={{ color: report.summary.improvement >= 0 ? '#52c41a' : '#f5222d' }}
              >
                {report.summary.improvement >= 0 ? '+' : ''}
                {report.summary.improvement}%
              </div>
              <div className={styles.summaryLabel}>进步幅度</div>
            </div>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12}>
            <div className={styles.subjectTags}>
              <Text strong><CheckCircleOutlined style={{ color: '#52c41a' }} /> 强势科目：</Text>
              {report.summary.strongSubjects.map((s) => (
                <Tag key={s} color="success">{s}</Tag>
              ))}
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className={styles.subjectTags}>
              <Text strong><WarningOutlined style={{ color: '#fa8c16' }} /> 需加强科目：</Text>
              {report.summary.weakSubjects.map((s) => (
                <Tag key={s} color="warning">{s}</Tag>
              ))}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 科目分析 */}
      <Card className={styles.analysisCard} title={<><BookOutlined /> 科目详细分析</>}>
        <div className={styles.subjectList}>
          {report.subjectAnalysis.map((subject) => (
            <div key={subject.subject} className={styles.subjectItem}>
              <div className={styles.subjectHeader}>
                <div className={styles.subjectInfo}>
                  <Text strong>{subject.subject}</Text>
                  {getTrendIcon(subject.trend)}
                </div>
                <Text className={styles.accuracyText}>{subject.accuracy}%</Text>
              </div>
              <Progress
                percent={subject.accuracy}
                strokeColor={
                  subject.accuracy >= 80
                    ? '#52c41a'
                    : subject.accuracy >= 60
                    ? '#1890ff'
                    : '#fa8c16'
                }
                showInfo={false}
              />
              <ul className={styles.recommendationList}>
                {subject.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* 知识点洞察 */}
      <Card className={styles.insightsCard} title={<><BulbOutlined /> 知识点掌握情况</>}>
        <Row gutter={[16, 16]}>
          {report.topicInsights.map((topic, index) => (
            <Col xs={12} sm={8} md={6} key={index}>
              <div className={`${styles.topicItem} ${styles[topic.status]}`}>
                <Text strong>{topic.topic}</Text>
                <Progress
                  type="circle"
                  percent={topic.mastery}
                  size={60}
                  strokeColor={
                    topic.status === 'strong'
                      ? '#52c41a'
                      : topic.status === 'needs_work'
                      ? '#fa8c16'
                      : '#f5222d'
                  }
                />
                {getStatusTag(topic.status)}
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 学习建议 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className={styles.recommendCard} title={<><BulbOutlined /> 学习建议</>}>
            <ul className={styles.tipsList}>
              {report.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className={styles.nextStepsCard} title={<><RiseOutlined /> 下一步计划</>}>
            <ul className={styles.stepsList}>
              {report.nextSteps.map((step, i) => (
                <li key={i}>
                  <span className={styles.stepNumber}>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default LearningReport


