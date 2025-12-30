import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, Typography, Tag, Progress, Row, Col, Button, 
  Collapse, Spin, Divider, List, Space, Alert
} from 'antd'
import { 
  TrophyOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  BookOutlined,
  RiseOutlined,
  BulbOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  HomeOutlined,
  RedoOutlined
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import styles from './LevelTestReportPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

interface Question {
  id: string
  questionIndex: number
  questionText: string
  questionType: 'choice' | 'short' | 'long'
  options?: string[]
  correctAnswer: string
  userAnswer: string
  score: number
  maxScore: number
  feedback: string
  difficulty: string
  knowledgePoints: string[]
}

interface ReportData {
  testId: string
  grade: string
  subject: string
  testType: string
  completedAt: string
  timeSpent: number
  overallLevel: string
  overallScore: number
  gradeEquivalent: string
  abilityRadar: {
    knowledge: number
    application: number
    analysis: number
    synthesis: number
    evaluation: number
  }
  strengthPoints: string[]
  weaknessPoints: string[]
  recommendations: Array<{
    priority: number
    topic: string
    suggestion: string
    resources: string[]
  }>
  questions: Question[]
}

export default function LevelTestReportPage() {
  const { testId } = useParams<{ testId: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<ReportData | null>(null)

  useEffect(() => {
    const loadReport = async () => {
      if (!testId) return
      
      try {
        const response = await apiFetch(`/api/level-test/${testId}/report`)
        
        if (response.testId) {
          setReport(response)
        } else {
          navigate('/level-test')
        }
      } catch (error) {
        console.error('Load report error:', error)
        navigate('/level-test')
      } finally {
        setLoading(false)
      }
    }
    
    loadReport()
  }, [testId, navigate])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      '5**': '#52c41a',
      '5*': '#73d13d',
      '5': '#95de64',
      '4': '#1890ff',
      '3': '#69c0ff',
      '2': '#faad14',
      '1': '#ff7a45',
      'U': '#ff4d4f'
    }
    return colors[level] || '#999'
  }

  const getLevelDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      '5**': '优异 - 表现卓越，掌握高阶思维能力',
      '5*': '优良 - 全面掌握，能灵活应用',
      '5': '良好 - 扎实掌握核心概念',
      '4': '中等 - 理解大部分内容，部分需加强',
      '3': '基本达标 - 掌握基础，需提升应用能力',
      '2': '部分达标 - 基础薄弱，需系统复习',
      '1': '未达标 - 需要重新学习基础知识',
      'U': '不予评级 - 建议从头开始学习'
    }
    return descriptions[level] || '未知等级'
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '基础'
      case 'medium': return '中等'
      case 'hard': return '进阶'
      default: return difficulty
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载报告中..." />
      </div>
    )
  }

  if (!report) {
    return null
  }

  const correctCount = report.questions.filter(q => q.score === q.maxScore).length
  const totalScore = report.questions.reduce((sum, q) => sum + q.maxScore, 0)
  const earnedScore = report.questions.reduce((sum, q) => sum + q.score, 0)

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/level-test/history')}
        >
          返回历史
        </Button>
        <Title level={2} className={styles.title}>
          <FileTextOutlined /> 水平测试报告
        </Title>
        <div className={styles.headerMeta}>
          <Tag color="blue">{report.grade}</Tag>
          <Tag color="purple">{report.subject}</Tag>
          <Text type="secondary">
            <ClockCircleOutlined /> {new Date(report.completedAt).toLocaleDateString()}
          </Text>
        </div>
      </div>

      {/* 等级结果 */}
      <Card className={styles.levelCard}>
        <Row gutter={[32, 32]} align="middle">
          <Col xs={24} md={8} className={styles.levelCol}>
            <div className={styles.levelBadge} style={{ borderColor: getLevelColor(report.overallLevel) }}>
              <span className={styles.levelText} style={{ color: getLevelColor(report.overallLevel) }}>
                {report.overallLevel}
              </span>
            </div>
            <Title level={3} className={styles.levelTitle}>DSE预测等级</Title>
            <Text type="secondary">{getLevelDescription(report.overallLevel)}</Text>
          </Col>
          
          <Col xs={24} md={16}>
            <Row gutter={[24, 24]}>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <TrophyOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>{report.overallScore}</div>
                  <Text type="secondary">总得分</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <CheckCircleOutlined className={styles.statIcon} style={{ color: '#52c41a' }} />
                  <div className={styles.statValue}>{correctCount}/{report.questions.length}</div>
                  <Text type="secondary">正确题数</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <ClockCircleOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>{formatTime(report.timeSpent)}</div>
                  <Text type="secondary">用时</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className={styles.statItem}>
                  <BookOutlined className={styles.statIcon} />
                  <div className={styles.statValue}>{report.gradeEquivalent}</div>
                  <Text type="secondary">等价水平</Text>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 能力雷达图 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card className={styles.card} title={<><RiseOutlined /> 能力维度分析</>}>
            <div className={styles.abilityList}>
              {[
                { key: 'knowledge', label: '知识理解', value: report.abilityRadar.knowledge },
                { key: 'application', label: '应用能力', value: report.abilityRadar.application },
                { key: 'analysis', label: '分析能力', value: report.abilityRadar.analysis },
                { key: 'synthesis', label: '综合能力', value: report.abilityRadar.synthesis },
                { key: 'evaluation', label: '评价能力', value: report.abilityRadar.evaluation },
              ].map(item => (
                <div key={item.key} className={styles.abilityItem}>
                  <div className={styles.abilityLabel}>
                    <Text>{item.label}</Text>
                    <Text strong>{item.value}%</Text>
                  </div>
                  <Progress 
                    percent={item.value} 
                    showInfo={false}
                    strokeColor={item.value >= 80 ? '#52c41a' : item.value >= 60 ? '#1890ff' : '#faad14'}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className={styles.card} title={<><BulbOutlined /> 知识点分析</>}>
            <div className={styles.knowledgeSection}>
              <div className={styles.knowledgeGroup}>
                <Text strong className={styles.groupTitle}>
                  <CheckCircleOutlined className={styles.iconGreen} /> 优势知识点
                </Text>
                {report.strengthPoints.length > 0 ? (
                  <div className={styles.tags}>
                    {report.strengthPoints.map((point, idx) => (
                      <Tag key={idx} color="green">{point}</Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">暂无明显优势点</Text>
                )}
              </div>
              
              <Divider />
              
              <div className={styles.knowledgeGroup}>
                <Text strong className={styles.groupTitle}>
                  <CloseCircleOutlined className={styles.iconRed} /> 薄弱知识点
                </Text>
                {report.weaknessPoints.length > 0 ? (
                  <div className={styles.tags}>
                    {report.weaknessPoints.map((point, idx) => (
                      <Tag key={idx} color="red">{point}</Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">表现均衡，继续保持！</Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 学习建议 */}
      {report.recommendations.length > 0 && (
        <Card className={styles.card} title={<><BulbOutlined /> 学习建议</>}>
          <List
            dataSource={report.recommendations}
            renderItem={(item, index) => (
              <List.Item className={styles.recommendationItem}>
                <div className={styles.recommendationContent}>
                  <div className={styles.recommendationHeader}>
                    <Tag color="blue">优先级 {item.priority}</Tag>
                    <Text strong>{item.topic}</Text>
                  </div>
                  <Paragraph className={styles.suggestion}>{item.suggestion}</Paragraph>
                  {item.resources.length > 0 && (
                    <div className={styles.resources}>
                      <Text type="secondary">推荐资源：</Text>
                      {item.resources.map((r, idx) => (
                        <Tag key={idx}>{r}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 题目详情 */}
      <Card className={styles.card} title={<><FileTextOutlined /> 题目详情</>}>
        <Collapse accordion>
          {report.questions.map((q, idx) => {
            const isCorrect = q.score === q.maxScore
            
            return (
              <Panel
                key={q.id}
                header={
                  <div className={styles.questionHeader}>
                    <span className={styles.questionNum}>第 {idx + 1} 题</span>
                    <Tag color={isCorrect ? 'green' : 'red'}>
                      {q.score}/{q.maxScore}分
                    </Tag>
                    <Tag>{getDifficultyLabel(q.difficulty)}</Tag>
                    {isCorrect ? (
                      <CheckCircleOutlined className={styles.iconGreen} />
                    ) : (
                      <CloseCircleOutlined className={styles.iconRed} />
                    )}
                  </div>
                }
              >
                <div className={styles.questionDetail}>
                  <div className={styles.questionText}>
                    <Text strong>题目：</Text>
                    <Paragraph>{q.questionText}</Paragraph>
                  </div>
                  
                  {q.options && (
                    <div className={styles.options}>
                      {q.options.map((opt, optIdx) => (
                        <div 
                          key={optIdx}
                          className={`${styles.optionItem} ${
                            String.fromCharCode(65 + optIdx) === q.correctAnswer ? styles.correct : ''
                          } ${
                            q.userAnswer === String.fromCharCode(65 + optIdx) && q.userAnswer !== q.correctAnswer ? styles.wrong : ''
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Divider />
                  
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Alert
                        type={q.userAnswer ? (isCorrect ? 'success' : 'error') : 'warning'}
                        message="你的答案"
                        description={q.userAnswer || '未作答'}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Alert
                        type="info"
                        message="正确答案"
                        description={q.correctAnswer}
                      />
                    </Col>
                  </Row>
                  
                  {q.feedback && (
                    <div className={styles.feedback}>
                      <Text strong>评语：</Text>
                      <Paragraph>{q.feedback}</Paragraph>
                    </div>
                  )}
                  
                  {q.knowledgePoints.length > 0 && (
                    <div className={styles.kpTags}>
                      <Text type="secondary">知识点：</Text>
                      {q.knowledgePoints.map((kp, kpIdx) => (
                        <Tag key={kpIdx}>{kp}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            )
          })}
        </Collapse>
      </Card>

      {/* 底部操作 */}
      <div className={styles.actions}>
        <Button 
          icon={<HomeOutlined />} 
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
        <Button 
          type="primary" 
          icon={<RedoOutlined />}
          onClick={() => navigate('/level-test')}
        >
          再次测试
        </Button>
      </div>
    </div>
  )
}

