import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Progress,
  Tag,
  Button,
  Spin,
  Alert,
  Divider,
  List,
  Space,
  Collapse,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  TrophyOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useAnalysisStore } from '../stores/analysisStore'
import { useLanguageStore } from '../stores/languageStore'
import styles from './ResultPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

/**
 * 分析结果页面
 * 展示AI分析的完整报告
 */
const ResultPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const reportRef = useRef<HTMLDivElement>(null)
  const { currentResult, loading, error, loadResult } = useAnalysisStore()

  // 加载分析结果
  useEffect(() => {
    if (id) {
      loadResult(id)
    }
  }, [id, loadResult])

  /**
   * 导出PDF报告
   */
  const handleExportPDF = async () => {
    if (!reportRef.current) return

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`DSE分析报告_${id}.pdf`)
    } catch (err) {
      console.error('PDF导出失败:', err)
    }
  }

  /**
   * 分享报告
   */
  const handleShare = () => {
    const shareUrl = window.location.href
    navigator.clipboard.writeText(shareUrl)
    // 可以添加message提示
  }

  /**
   * 获取可行性评分颜色
   */
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#38a169'
    if (score >= 60) return '#d69e2e'
    if (score >= 40) return '#dd6b20'
    return '#e53e3e'
  }

  /**
   * 获取成绩差距标签
   */
  const getGapTag = (gap: string) => {
    if (gap.includes('已达标') || gap.includes('超出')) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>{gap}</Tag>
    }
    if (gap.includes('接近') || gap.includes('差1')) {
      return <Tag color="warning" icon={<ExclamationCircleOutlined />}>{gap}</Tag>
    }
    return <Tag color="error" icon={<ClockCircleOutlined />}>{gap}</Tag>
  }

  // 加载中状态
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="正在加载分析结果..." />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Button onClick={() => navigate('/analysis')}>
              重新分析
            </Button>
          }
        />
      </div>
    )
  }

  // 无数据状态（模拟数据）
  const result = currentResult || {
    id: id || 'demo',
    createdAt: new Date().toISOString(),
    studentInfo: {
      enrollmentDate: '2025-02-01',
      semester: '2024-2025-2',
      grade: 'form5',
      age: 16,
      currentSchool: '某中学',
      subjects: [
        { subject: 'chinese', currentScore: '4', targetScore: '5' },
        { subject: 'english', currentScore: '5', targetScore: '5*' },
        { subject: 'math', currentScore: '5*', targetScore: '5**' },
        { subject: 'physics', currentScore: '4', targetScore: '5' },
        { subject: 'chemistry', currentScore: '3', targetScore: '4' },
      ],
      targetSchools: ['喇沙书院', '拔萃男书院'],
      notes: '',
    },
    overallAssessment: {
      feasibilityScore: 75,
      summary: '该学生整体学术表现良好，数学和英语科目表现优秀。中文和化学科目有提升空间。根据目标学校的录取要求，建议加强中文写作和化学实验能力。',
      keyStrengths: ['数学思维能力强', '英语阅读理解优秀', '学习态度积极'],
      keyWeaknesses: ['中文写作需加强', '化学实验操作不够熟练', '时间管理能力待提升'],
    },
    subjectAnalyses: [
      {
        subject: '中国语文',
        currentLevel: '4',
        targetLevel: '5',
        gap: '差1级',
        strengths: ['阅读理解能力不错', '古文基础扎实'],
        weaknesses: ['作文结构需改进', '议论文论证不够有力'],
        recommendations: ['每周练习2篇作文', '阅读优秀范文', '参加写作班'],
        estimatedTimeToImprove: '3-4个月',
      },
      {
        subject: '英国语文',
        currentLevel: '5',
        targetLevel: '5*',
        gap: '差1级',
        strengths: ['词汇量丰富', '口语流利'],
        weaknesses: ['语法细节需注意', '写作用词可更精准'],
        recommendations: ['多做语法练习', '阅读英文原著', '练习学术写作'],
        estimatedTimeToImprove: '2-3个月',
      },
      {
        subject: '数学',
        currentLevel: '5*',
        targetLevel: '5**',
        gap: '接近目标',
        strengths: ['逻辑思维强', '计算准确'],
        weaknesses: ['高难度题目需加强', '时间控制'],
        recommendations: ['练习历年难题', '限时训练', '总结解题技巧'],
        estimatedTimeToImprove: '2个月',
      },
      {
        subject: '物理',
        currentLevel: '4',
        targetLevel: '5',
        gap: '差1级',
        strengths: ['概念理解清晰', '计算能力强'],
        weaknesses: ['实验设计能力需加强', '部分公式应用不熟练'],
        recommendations: ['多做实验题', '整理公式表', '观看实验视频'],
        estimatedTimeToImprove: '3个月',
      },
      {
        subject: '化学',
        currentLevel: '3',
        targetLevel: '4',
        gap: '差1级',
        strengths: ['有机化学基础可以'],
        weaknesses: ['无机化学较弱', '实验操作不熟练'],
        recommendations: ['重点复习无机化学', '多做实验题', '建立知识框架'],
        estimatedTimeToImprove: '4个月',
      },
    ],
    schoolAssessments: [
      {
        schoolName: '喇沙书院',
        admissionProbability: 70,
        requirements: ['DSE成绩优异', '良好品行记录', '面试表现'],
        gaps: ['中文成绩需提升', '需准备面试'],
        recommendations: ['重点提升中文成绩', '准备自我介绍', '了解学校文化'],
      },
      {
        schoolName: '拔萃男书院',
        admissionProbability: 60,
        requirements: ['顶尖学术成绩', '课外活动表现', '领导力展示'],
        gaps: ['整体成绩需进一步提升', '需展示课外活动参与'],
        recommendations: ['全面提升各科成绩', '参与更多课外活动', '培养领导能力'],
      },
    ],
    studyPlan: {
      weeklySchedule: [
        '周一至周五：每天2小时自习，重点复习薄弱科目',
        '周六上午：数学难题训练',
        '周六下午：英语写作练习',
        '周日上午：中文作文练习',
        '周日下午：化学和物理复习',
      ],
      monthlyGoals: [
        '第1个月：完成中文写作基础训练',
        '第2个月：提升化学无机化学部分',
        '第3个月：强化英语学术写作',
        '第4个月：全面模拟考试训练',
      ],
      resources: [
        'DSE历年真题集',
        '中文写作技巧指南',
        '化学实验操作视频',
        '英语学术写作教程',
        '在线模拟考试平台',
      ],
    },
    additionalAdvice: [
      '建议每天保持充足睡眠（7-8小时），确保学习效率',
      '定期与老师沟通，及时调整学习策略',
      '保持积极心态，适当进行体育锻炼',
      '制定详细的复习计划，按计划执行',
      '考前一周进行全面的模拟训练',
    ],
  }

  // 雷达图数据
  const radarData = result.subjectAnalyses.map((subject) => ({
    subject: subject.subject,
    current: parseInt(subject.currentLevel) || 3,
    target: parseInt(subject.targetLevel) || 5,
  }))

  // 学校录取概率柱状图数据
  const schoolChartData = result.schoolAssessments.map((school) => ({
    name: school.schoolName,
    probability: school.admissionProbability,
  }))

  return (
    <div className={styles.resultPage}>
      {/* 操作栏 */}
      <div className={styles.actionBar}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/analysis')}
        >
          {t('common.back')}
        </Button>
        <Space>
          <Tooltip title={t('result.shareResult')}>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              {t('result.shareResult')}
            </Button>
          </Tooltip>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportPDF}
          >
            {t('result.downloadPDF')}
          </Button>
        </Space>
      </div>

      {/* 报告内容 */}
      <div ref={reportRef} className={styles.reportContent}>
        {/* 报告头部 */}
        <Card className={styles.reportHeader}>
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Title level={2} className="gradient-title">
                {t('result.title')}
              </Title>
              <Paragraph type="secondary">
                生成时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
                <br />
                报告编号：{result.id}
              </Paragraph>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.scoreCircle}>
                <Progress
                  type="circle"
                  percent={result.overallAssessment.feasibilityScore}
                  size={140}
                  strokeColor={getScoreColor(result.overallAssessment.feasibilityScore)}
                  format={(percent) => (
                    <div className={styles.scoreContent}>
                      <span className={styles.scoreValue}>{percent}</span>
                      <span className={styles.scoreLabel}>可行性评分</span>
                    </div>
                  )}
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* 综合评估 */}
        <Card title={<><TrophyOutlined /> 综合评估</>} className={styles.sectionCard}>
          <Paragraph className={styles.summary}>
            {result.overallAssessment.summary}
          </Paragraph>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className={styles.listSection}>
                <Title level={5}>
                  <CheckCircleOutlined style={{ color: '#38a169' }} /> 主要优势
                </Title>
                <List
                  size="small"
                  dataSource={result.overallAssessment.keyStrengths}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className={styles.listSection}>
                <Title level={5}>
                  <ExclamationCircleOutlined style={{ color: '#d69e2e' }} /> 待改进项
                </Title>
                <List
                  size="small"
                  dataSource={result.overallAssessment.keyWeaknesses}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* 科目分析 */}
        <Card title={<><BookOutlined /> 科目详细分析</>} className={styles.sectionCard}>
          <Row gutter={24}>
            <Col xs={24} lg={12}>
              <div className={styles.chartContainer}>
                <Title level={5} style={{ textAlign: 'center' }}>成绩雷达图</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 7]} />
                    <Radar
                      name="当前成绩"
                      dataKey="current"
                      stroke="#2b6cb0"
                      fill="#2b6cb0"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="目标成绩"
                      dataKey="target"
                      stroke="#d69e2e"
                      fill="#d69e2e"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <Collapse defaultActiveKey={['0']} ghost>
                {result.subjectAnalyses.map((subject, index) => (
                  <Panel
                    key={index}
                    header={
                      <div className={styles.subjectHeader}>
                        <Text strong>{subject.subject}</Text>
                        <Space>
                          <Tag>{subject.currentLevel} → {subject.targetLevel}</Tag>
                          {getGapTag(subject.gap)}
                        </Space>
                      </div>
                    }
                  >
                    <div className={styles.subjectDetail}>
                      <div className={styles.strengthWeakness}>
                        <div>
                          <Text type="success" strong>优势：</Text>
                          <ul>
                            {subject.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <Text type="warning" strong>待改进：</Text>
                          <ul>
                            {subject.weaknesses.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <Divider />
                      <Text strong>建议：</Text>
                      <ul>
                        {subject.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                      <Text type="secondary">
                        预计提升时间：{subject.estimatedTimeToImprove}
                      </Text>
                    </div>
                  </Panel>
                ))}
              </Collapse>
            </Col>
          </Row>
        </Card>

        {/* 目标学校评估 */}
        <Card title={<><RocketOutlined /> 目标学校评估</>} className={styles.sectionCard}>
          <Row gutter={24}>
            <Col xs={24} lg={10}>
              <div className={styles.chartContainer}>
                <Title level={5} style={{ textAlign: 'center' }}>录取概率对比</Title>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={schoolChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <RechartsTooltip />
                    <Bar
                      dataKey="probability"
                      fill="#2b6cb0"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} lg={14}>
              {result.schoolAssessments.map((school, index) => (
                <Card
                  key={index}
                  size="small"
                  className={styles.schoolCard}
                  title={
                    <Space>
                      <Text strong>{school.schoolName}</Text>
                      <Tag color={school.admissionProbability >= 70 ? 'success' : school.admissionProbability >= 50 ? 'warning' : 'error'}>
                        录取概率 {school.admissionProbability}%
                      </Tag>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>录取要求：</Text>
                      <ul className={styles.compactList}>
                        {school.requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </Col>
                    <Col span={12}>
                      <Text strong>建议：</Text>
                      <ul className={styles.compactList}>
                        {school.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Col>
          </Row>
        </Card>

        {/* 学习计划 */}
        <Card title={<><ClockCircleOutlined /> 学习计划建议</>} className={styles.sectionCard}>
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <div className={styles.planSection}>
                <Title level={5}>每周安排</Title>
                <List
                  size="small"
                  dataSource={result.studyPlan.weeklySchedule}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.planSection}>
                <Title level={5}>月度目标</Title>
                <List
                  size="small"
                  dataSource={result.studyPlan.monthlyGoals}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.planSection}>
                <Title level={5}>推荐资源</Title>
                <List
                  size="small"
                  dataSource={result.studyPlan.resources}
                  renderItem={(item) => (
                    <List.Item>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* 额外建议 */}
        <Card title="其他建议" className={styles.sectionCard}>
          <List
            dataSource={result.additionalAdvice}
            renderItem={(item, index) => (
              <List.Item>
                <Text>
                  <Tag color="blue">{index + 1}</Tag>
                  {item}
                </Text>
              </List.Item>
            )}
          />
        </Card>
      </div>
    </div>
  )
}

export default ResultPage

