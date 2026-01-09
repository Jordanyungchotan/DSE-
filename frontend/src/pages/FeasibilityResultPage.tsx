/**
 * 插班可行性评估结果页面
 * 
 * 展示A/B/C/D等级评估结果，不显示具体百分比
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, 
  Typography, 
  Tag, 
  List, 
  Spin, 
  Button, 
  Alert, 
  Progress,
  Row,
  Col,
  Divider,
  Collapse
} from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  BookOutlined,
  StarOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  BulbOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import styles from './FeasibilityResultPage.module.css'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

// 可行性等级配置
const LEVEL_CONFIG = {
  A: {
    color: '#52c41a',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
    icon: <CheckCircleOutlined />,
    title: '可行性较高',
    emoji: '🌟',
  },
  B: {
    color: '#1890ff',
    bgColor: '#e6f7ff',
    borderColor: '#91d5ff',
    icon: <CheckCircleOutlined />,
    title: '可行性中等',
    emoji: '💪',
  },
  C: {
    color: '#faad14',
    bgColor: '#fffbe6',
    borderColor: '#ffe58f',
    icon: <ExclamationCircleOutlined />,
    title: '可行性一般',
    emoji: '📚',
  },
  D: {
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    borderColor: '#ffccc7',
    icon: <WarningOutlined />,
    title: '可行性较低',
    emoji: '🎯',
  },
}

// 科目状态配置
const STATUS_CONFIG = {
  strong: { color: 'success', text: '优秀', icon: <StarOutlined /> },
  adequate: { color: 'processing', text: '达标', icon: <CheckCircleOutlined /> },
  weak: { color: 'warning', text: '待提升', icon: <ExclamationCircleOutlined /> },
  critical: { color: 'error', text: '需加强', icon: <WarningOutlined /> },
}

interface FeasibilityResult {
  id: string
  createdAt: string
  feasibilityLevel: 'A' | 'B' | 'C' | 'D'
  levelDescription: string
  overallAssessment: string
  mainRisks: string[]
  keyStrengths: string[]
  recommendations: string[]
  subjectAnalysis: {
    subject: string
    score: number
    status: 'strong' | 'adequate' | 'weak' | 'critical'
    statusDescription: string
    recommendation: string
  }[]
  preparationPlan: {
    priorityActions: string[]
    shortTermGoals: string[]
    mediumTermGoals: string[]
    resources: string[]
  }
  disclaimer: string
  request?: {
    student: {
      age: number
      gender: string
      currentGrade: string
    }
    targetSchool: {
      schoolName: string
      bandLevel: number
      district: string
    }
  }
}

const FeasibilityResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<FeasibilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchResult(id)
    }
  }, [id])

  const fetchResult = async (recordId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analysis/feasibility/${recordId}`)
      const data = await response.json()
      
      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || '获取结果失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="正在加载评估结果..." />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          type="error"
          message="加载失败"
          description={error || '未找到评估记录'}
          showIcon
          action={
            <Button onClick={() => navigate('/analysis')}>
              返回重新评估
            </Button>
          }
        />
      </div>
    )
  }

  const levelConfig = LEVEL_CONFIG[result.feasibilityLevel]
  const gradeMap: Record<string, string> = {
    'S1': '中一', 'S2': '中二', 'S3': '中三',
    'S4': '中四', 'S5': '中五', 'S6': '中六',
  }

  return (
    <div className={styles.resultPage}>
      {/* 顶部导航 */}
      <div className={styles.header}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/analysis')}
        >
          返回
        </Button>
        <Button 
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => navigate('/analysis')}
        >
          重新评估
        </Button>
      </div>

      {/* 免责声明 */}
      <Alert
        type="warning"
        message="重要提示"
        description={result.disclaimer}
        showIcon
        icon={<ExclamationCircleOutlined />}
        className={styles.disclaimer}
      />

      {/* 评估概览卡片 */}
      <Card className={styles.overviewCard}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={8}>
            <div 
              className={styles.levelBadge}
              style={{ 
                backgroundColor: levelConfig.bgColor,
                borderColor: levelConfig.borderColor,
              }}
            >
              <div className={styles.levelEmoji}>{levelConfig.emoji}</div>
              <div 
                className={styles.levelGrade}
                style={{ color: levelConfig.color }}
              >
                {result.feasibilityLevel}
              </div>
              <div className={styles.levelTitle}>{levelConfig.title}</div>
            </div>
          </Col>
          
          <Col xs={24} md={16}>
            <div className={styles.overviewInfo}>
              {result.request && (
                <div className={styles.studentInfo}>
                  <Tag color="blue">
                    {gradeMap[result.request.student.currentGrade] || result.request.student.currentGrade}
                  </Tag>
                  <Tag color="purple">{result.request.student.age}岁</Tag>
                  <span className={styles.arrow}>→</span>
                  <Tag color="gold">
                    {result.request.targetSchool.schoolName}
                  </Tag>
                  <Tag>Band {result.request.targetSchool.bandLevel}</Tag>
                </div>
              )}
              <Paragraph className={styles.levelDescription}>
                {result.levelDescription}
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 综合评估 */}
      <Card 
        title={<><BookOutlined /> 综合评估</>}
        className={styles.sectionCard}
      >
        <Paragraph className={styles.assessment}>
          {result.overallAssessment}
        </Paragraph>
      </Card>

      {/* 优势与风险并列 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card 
            title={<><StarOutlined style={{ color: '#52c41a' }} /> 主要优势</>}
            className={styles.sectionCard}
          >
            <List
              dataSource={result.keyStrengths}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
              locale={{ emptyText: '暂无明显优势项' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title={<><WarningOutlined style={{ color: '#faad14' }} /> 主要风险</>}
            className={styles.sectionCard}
          >
            <List
              dataSource={result.mainRisks}
              renderItem={(item) => (
                <List.Item>
                  <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
              locale={{ emptyText: '暂无明显风险项' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 科目分析 */}
      <Card 
        title={<><TrophyOutlined /> 科目分析</>}
        className={styles.sectionCard}
      >
        <div className={styles.subjectGrid}>
          {result.subjectAnalysis.map((subject, index) => {
            const statusConfig = STATUS_CONFIG[subject.status]
            return (
              <Card 
                key={index}
                size="small"
                className={styles.subjectCard}
              >
                <div className={styles.subjectHeader}>
                  <Text strong>{subject.subject}</Text>
                  <Tag color={statusConfig.color}>
                    {statusConfig.icon} {statusConfig.text}
                  </Tag>
                </div>
                <div className={styles.subjectScore}>
                  <Progress 
                    percent={subject.score} 
                    size="small"
                    strokeColor={
                      subject.score >= 75 ? '#52c41a' :
                      subject.score >= 55 ? '#1890ff' :
                      subject.score >= 40 ? '#faad14' : '#ff4d4f'
                    }
                  />
                </div>
                <Text type="secondary" className={styles.subjectDesc}>
                  {subject.statusDescription}
                </Text>
                <div className={styles.subjectRecommendation}>
                  <BulbOutlined /> {subject.recommendation}
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      {/* 改进建议 */}
      <Card 
        title={<><RocketOutlined /> 改进建议</>}
        className={styles.sectionCard}
      >
        <List
          dataSource={result.recommendations}
          renderItem={(item, index) => (
            <List.Item>
              <Tag color="blue">{index + 1}</Tag>
              {item}
            </List.Item>
          )}
        />
      </Card>

      {/* 准备计划 */}
      <Collapse 
        defaultActiveKey={['plan']}
        className={styles.planCollapse}
      >
        <Panel 
          header={<><CalendarOutlined /> 准备计划</>} 
          key="plan"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card size="small" title="🎯 优先行动">
                <List
                  size="small"
                  dataSource={result.preparationPlan.priorityActions}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Text>• {item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="📅 短期目标（1-2月）">
                <List
                  size="small"
                  dataSource={result.preparationPlan.shortTermGoals}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Text>• {item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="🎓 中期目标（3-4月）">
                <List
                  size="small"
                  dataSource={result.preparationPlan.mediumTermGoals}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '4px 0' }}>
                      <Text>• {item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <Text strong>📚 推荐资源：</Text>
            <div style={{ marginTop: 8 }}>
              {result.preparationPlan.resources.map((resource, i) => (
                <Tag key={i} style={{ margin: '4px' }}>{resource}</Tag>
              ))}
            </div>
          </div>
        </Panel>
      </Collapse>

      {/* 底部操作 */}
      <div className={styles.footer}>
        <Button 
          type="primary" 
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => navigate('/analysis')}
        >
          开始新的评估
        </Button>
      </div>
    </div>
  )
}

export default FeasibilityResultPage
