import { useEffect, useState } from 'react'
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
  Collapse,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  RocketOutlined,
  TrophyOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import { useLanguageStore } from '../stores/languageStore'
import styles from './UniversityResultPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

interface UniversityResult {
  id: string
  createdAt: string
  bestFive: number
  bestSix: number
  admissionAnalysis: {
    overallScore: number
    summary: string
    targetProgramAnalyses: {
      university: string
      program: string
      admissionChance: 'high' | 'medium' | 'low'
      minScore: number
      yourScore: number
      analysis: string
      recommendations: string[]
    }[]
  }
  alternativeRecommendations: {
    program: string
    university: string
    matchScore: number
    reason: string
  }[]
  careerAnalysis: {
    industryTrends: string[]
    highDemandFields: string[]
    salaryOutlook: string
    aiImpact: string
  }
  applicationStrategy: {
    bandAStrategy: string[]
    interviewTips: string[]
    personalStatementAdvice: string[]
  }
  backupPlans: string[]
}

/**
 * 大学申请分析结果页面
 */
const UniversityResultPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const [result, setResult] = useState<UniversityResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadResult = async () => {
      if (!id) return
      
      try {
        const response = await apiFetch(`/api/analysis/result/${id}`)
        if (!response.ok) {
          throw new Error('无法加载分析结果')
        }
        const data = await response.json()
        setResult(data.result)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [id])

  const getChanceColor = (chance: string) => {
    switch (chance) {
      case 'high': return '#52c41a'
      case 'medium': return '#faad14'
      case 'low': return '#ff4d4f'
      default: return '#1890ff'
    }
  }

  const getChanceText = (chance: string) => {
    switch (chance) {
      case 'high': return '录取机会高'
      case 'medium': return '录取机会中等'
      case 'low': return '录取机会较低'
      default: return '待评估'
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="正在加载分析结果..." />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          type="error"
          message="加载失败"
          description={error || '无法找到分析结果'}
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
      </div>

      {/* 报告内容 */}
      <div className={styles.reportContent}>
        {/* 报告头部 */}
        <Card className={styles.reportHeader}>
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <Title level={2} className="gradient-title">
                <RocketOutlined /> {t('analysis.universityTitle')}
              </Title>
              <Paragraph type="secondary">
                生成时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
                <br />
                最佳5科分数：<Tag color="blue">{result.bestFive}分</Tag>
              </Paragraph>
            </Col>
            <Col xs={24} md={8}>
              <div className={styles.scoreCircle}>
                <Progress
                  type="circle"
                  percent={result.admissionAnalysis?.overallScore || 0}
                  size={140}
                  strokeColor={result.admissionAnalysis?.overallScore >= 70 ? '#52c41a' : result.admissionAnalysis?.overallScore >= 50 ? '#faad14' : '#ff4d4f'}
                  format={(percent) => (
                    <div className={styles.scoreContent}>
                      <span className={styles.scoreValue}>{percent}</span>
                      <span className={styles.scoreLabel}>综合评分</span>
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
            {result.admissionAnalysis?.summary || '暂无综合评估'}
          </Paragraph>
        </Card>

        {/* 目标专业分析 */}
        <Card title={<><BankOutlined /> 目标专业录取分析</>} className={styles.sectionCard}>
          {result.admissionAnalysis?.targetProgramAnalyses?.map((program, index) => (
            <Card 
              key={index} 
              size="small" 
              className={styles.programCard}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16} align="middle">
                <Col xs={24} md={8}>
                  <Title level={5} style={{ margin: 0 }}>{program.university}</Title>
                  <Text>{program.program}</Text>
                </Col>
                <Col xs={24} md={8}>
                  <Tag color={getChanceColor(program.admissionChance)} style={{ fontSize: 14, padding: '4px 12px' }}>
                    {getChanceText(program.admissionChance)}
                  </Tag>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最低分数: {program.minScore} | 你的分数: {program.yourScore}
                  </Text>
                </Col>
                <Col xs={24} md={8}>
                  <Text>{program.analysis}</Text>
                </Col>
              </Row>
              {program.recommendations?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text strong>建议：</Text>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {program.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </Card>

        {/* 备选专业推荐 */}
        {result.alternativeRecommendations?.length > 0 && (
          <Card title={<><CheckCircleOutlined /> 备选专业推荐</>} className={styles.sectionCard}>
            <Row gutter={[16, 16]}>
              {result.alternativeRecommendations.map((alt, index) => (
                <Col xs={24} md={12} key={index}>
                  <Card size="small" className={styles.altCard}>
                    <div className={styles.altHeader}>
                      <Text strong>{alt.program}</Text>
                      <Tag color="green">匹配度 {alt.matchScore}%</Tag>
                    </div>
                    <Text type="secondary">{alt.university}</Text>
                    <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{alt.reason}</Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 就业趋势分析 */}
        <Card title={<><LineChartOutlined /> 就业趋势分析</>} className={styles.sectionCard}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Title level={5}>行业趋势</Title>
              <List
                size="small"
                dataSource={result.careerAnalysis?.industryTrends || []}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={5}>高需求领域</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.careerAnalysis?.highDemandFields?.map((field, i) => (
                  <Tag key={i} color="blue">{field}</Tag>
                ))}
              </div>
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Title level={5}>薪资前景</Title>
              <Paragraph>{result.careerAnalysis?.salaryOutlook || '暂无数据'}</Paragraph>
            </Col>
            <Col xs={24} md={12}>
              <Title level={5}>AI影响分析</Title>
              <Paragraph>{result.careerAnalysis?.aiImpact || '暂无数据'}</Paragraph>
            </Col>
          </Row>
        </Card>

        {/* 申请策略 */}
        <Card title={<><ExclamationCircleOutlined /> 申请策略建议</>} className={styles.sectionCard}>
          <Collapse ghost defaultActiveKey={['1']}>
            <Panel header="Band A 选择策略" key="1">
              <List
                size="small"
                dataSource={result.applicationStrategy?.bandAStrategy || []}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Panel>
            <Panel header="面试准备技巧" key="2">
              <List
                size="small"
                dataSource={result.applicationStrategy?.interviewTips || []}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Panel>
            <Panel header="个人陈述建议" key="3">
              <List
                size="small"
                dataSource={result.applicationStrategy?.personalStatementAdvice || []}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Panel>
          </Collapse>
        </Card>

        {/* 备选方案 */}
        {result.backupPlans?.length > 0 && (
          <Card title="备选方案" className={styles.sectionCard}>
            <List
              dataSource={result.backupPlans}
              renderItem={(item, index) => (
                <List.Item>
                  <Tag color="orange">{index + 1}</Tag>
                  {item}
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    </div>
  )
}

export default UniversityResultPage

