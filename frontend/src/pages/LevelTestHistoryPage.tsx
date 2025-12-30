import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, Typography, Table, Tag, Button, Select, Space, Empty, Spin,
  Row, Col, Progress, Tooltip
} from 'antd'
import { 
  FileTextOutlined, 
  TrophyOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  FireOutlined,
  StarOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { apiFetch } from '../config/api'
import styles from './LevelTestHistoryPage.module.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

interface TestRecord {
  id: string
  grade: string
  subject: string
  testType: string
  status: string
  finalScore: number
  level: string
  levelDescription: string
  timeSpent: number
  createdAt: string
  completedAt: string
}

interface ProgressData {
  overallTrend: 'up' | 'down' | 'stable'
  scoreChange: number
  levelChange: number
  bestSubject: string
  worstSubject: string
  streakDays: number
  subjectProgress: Array<{
    subject: string
    currentLevel: string
    previousLevel: string
    trend: 'up' | 'down' | 'stable'
    avgScore: number
    testCount: number
  }>
  recentScores: number[]
}

export default function LevelTestHistoryPage() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<TestRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterGrade, setFilterGrade] = useState<string>('')
  const [progressData, setProgressData] = useState<ProgressData | null>(null)

  useEffect(() => {
    loadHistory()
  }, [page, pageSize, filterSubject, filterGrade])

  const loadHistory = async () => {
    setLoading(true)
    try {
      let url = `/api/level-test/history?limit=${pageSize}&offset=${(page - 1) * pageSize}`
      if (filterSubject) url += `&subject=${encodeURIComponent(filterSubject)}`
      if (filterGrade) url += `&grade=${encodeURIComponent(filterGrade)}`
      
      const res = await apiFetch(url)
      const response = await res.json() as { tests?: TestRecord[]; total?: number }
      
      if (response.tests) {
        setTests(response.tests)
        setTotal(response.total || 0)
        
        // 计算进步数据
        calculateProgressData(response.tests)
      }
    } catch (error) {
      console.error('Load history error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算进步追踪数据
  const calculateProgressData = (testsData: TestRecord[]) => {
    if (testsData.length === 0) {
      setProgressData(null)
      return
    }

    // 按科目分组
    const bySubject: Record<string, TestRecord[]> = {}
    testsData.forEach(test => {
      if (!bySubject[test.subject]) {
        bySubject[test.subject] = []
      }
      bySubject[test.subject].push(test)
    })

    // 计算科目进步
    const subjectProgress = Object.entries(bySubject).map(([subject, subjectTests]) => {
      const sortedTests = subjectTests.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      
      const currentLevel = sortedTests[0]?.level || 'U'
      const previousLevel = sortedTests[1]?.level || currentLevel
      const avgScore = sortedTests.reduce((sum, t) => sum + t.finalScore, 0) / sortedTests.length
      
      const levelOrder = ['U', '1', '2', '3', '4', '5', '5*', '5**']
      const currentIdx = levelOrder.indexOf(currentLevel)
      const previousIdx = levelOrder.indexOf(previousLevel)
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (currentIdx > previousIdx) trend = 'up'
      else if (currentIdx < previousIdx) trend = 'down'
      
      return {
        subject,
        currentLevel,
        previousLevel,
        trend,
        avgScore: Math.round(avgScore),
        testCount: sortedTests.length
      }
    })

    // 计算总体趋势
    const sortedAll = [...testsData].sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    
    const recentScores = sortedAll.slice(0, 10).map(t => t.finalScore).reverse()
    
    let overallTrend: 'up' | 'down' | 'stable' = 'stable'
    let scoreChange = 0
    if (sortedAll.length >= 2) {
      scoreChange = sortedAll[0].finalScore - sortedAll[1].finalScore
      if (scoreChange > 5) overallTrend = 'up'
      else if (scoreChange < -5) overallTrend = 'down'
    }

    // 找出最好和最差的科目
    const sortedSubjects = [...subjectProgress].sort((a, b) => b.avgScore - a.avgScore)
    const bestSubject = sortedSubjects[0]?.subject || '-'
    const worstSubject = sortedSubjects[sortedSubjects.length - 1]?.subject || '-'

    // 计算连续天数
    let streakDays = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const testDates = new Set(
      testsData.map(t => new Date(t.completedAt).toDateString())
    )
    
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      if (testDates.has(checkDate.toDateString())) {
        streakDays++
      } else if (i > 0) {
        break
      }
    }

    setProgressData({
      overallTrend,
      scoreChange,
      levelChange: 0,
      bestSubject,
      worstSubject,
      streakDays,
      subjectProgress,
      recentScores
    })
  }

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

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <RiseOutlined style={{ color: '#52c41a' }} />
    if (trend === 'down') return <FallOutlined style={{ color: '#ff4d4f' }} />
    return <span style={{ color: '#999' }}>—</span>
  }

  const columns: ColumnsType<TestRecord> = [
    {
      title: '日期',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN')
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (grade: string) => <Tag color="blue">{grade}</Tag>
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
      render: (subject: string) => <Tag color="purple">{subject}</Tag>
    },
    {
      title: '类型',
      dataIndex: 'testType',
      key: 'testType',
      width: 100,
      render: (type: string) => (
        <Tag>{type === 'quick' ? '基础测试' : '完整评估'}</Tag>
      )
    },
    {
      title: 'DSE等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => (
        <Tag 
          color={getLevelColor(level)}
          style={{ fontWeight: 600, fontSize: 14 }}
        >
          {level}
        </Tag>
      )
    },
    {
      title: '得分',
      dataIndex: 'finalScore',
      key: 'finalScore',
      width: 80,
      render: (score: number) => (
        <Text strong>{score}分</Text>
      )
    },
    {
      title: '用时',
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      width: 100,
      render: (time: number) => formatTime(time)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/level-test/${record.id}/report`)}
        >
          查看报告
        </Button>
      )
    }
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title level={2} className={styles.title}>
            <FileTextOutlined /> 测试历史
          </Title>
          <Text type="secondary">查看您的水平测试记录和进步追踪</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/level-test')}
        >
          开始新测试
        </Button>
      </div>

      {/* 进步追踪仪表板 */}
      {progressData && (
        <div className={styles.progressDashboard}>
          <Title level={4} className={styles.sectionTitle}>
            <LineChartOutlined /> 进步追踪
          </Title>
          
          <Row gutter={[16, 16]}>
            {/* 总体趋势卡片 */}
            <Col xs={24} sm={12} md={6}>
              <Card className={`${styles.trendCard} ${styles[progressData.overallTrend]}`}>
                <div className={styles.trendIcon}>
                  {getTrendIcon(progressData.overallTrend)}
                </div>
                <div className={styles.trendContent}>
                  <Text type="secondary">总体趋势</Text>
                  <div className={styles.trendValue}>
                    {progressData.overallTrend === 'up' && '进步中'}
                    {progressData.overallTrend === 'down' && '需加油'}
                    {progressData.overallTrend === 'stable' && '稳定'}
                  </div>
                  {progressData.scoreChange !== 0 && (
                    <div className={styles.changeValue}>
                      较上次 {progressData.scoreChange > 0 ? '+' : ''}{progressData.scoreChange} 分
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* 连续学习天数 */}
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.streakCard}>
                <div className={styles.streakIcon}>
                  <FireOutlined style={{ color: '#ff7a45', fontSize: 28 }} />
                </div>
                <div className={styles.streakContent}>
                  <Text type="secondary">连续学习</Text>
                  <div className={styles.streakValue}>
                    {progressData.streakDays} <span>天</span>
                  </div>
                </div>
              </Card>
            </Col>

            {/* 最佳科目 */}
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.subjectCard}>
                <div className={styles.subjectIcon}>
                  <StarOutlined style={{ color: '#faad14', fontSize: 24 }} />
                </div>
                <div className={styles.subjectContent}>
                  <Text type="secondary">最佳科目</Text>
                  <div className={styles.subjectValue}>{progressData.bestSubject}</div>
                </div>
              </Card>
            </Col>

            {/* 待提升科目 */}
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.subjectCard}>
                <div className={styles.subjectIcon}>
                  <TrophyOutlined style={{ color: '#1890ff', fontSize: 24 }} />
                </div>
                <div className={styles.subjectContent}>
                  <Text type="secondary">待提升</Text>
                  <div className={styles.subjectValue}>{progressData.worstSubject}</div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 分数趋势图 */}
          {progressData.recentScores.length > 1 && (
            <Card className={styles.chartCard} style={{ marginTop: 16 }}>
              <Title level={5}>近期分数趋势</Title>
              <div className={styles.scoreChart}>
                {progressData.recentScores.map((score, idx) => {
                  const maxScore = Math.max(...progressData.recentScores)
                  const height = (score / maxScore) * 100
                  return (
                    <Tooltip key={idx} title={`${score}分`}>
                      <div 
                        className={styles.scoreBar}
                        style={{ height: `${height}%` }}
                      >
                        <span className={styles.scoreLabel}>{score}</span>
                      </div>
                    </Tooltip>
                  )
                })}
              </div>
              <div className={styles.chartLabels}>
                {progressData.recentScores.map((_, idx) => (
                  <span key={idx}>第{idx + 1}次</span>
                ))}
              </div>
            </Card>
          )}

          {/* 科目进步详情 */}
          {progressData.subjectProgress.length > 0 && (
            <Card className={styles.subjectProgressCard} style={{ marginTop: 16 }}>
              <Title level={5}>各科目进步情况</Title>
              <Row gutter={[16, 16]}>
                {progressData.subjectProgress.map((sp) => (
                  <Col xs={24} sm={12} md={8} key={sp.subject}>
                    <div className={styles.subjectProgressItem}>
                      <div className={styles.progressHeader}>
                        <Text strong>{sp.subject}</Text>
                        <span className={styles.testCount}>{sp.testCount}次测试</span>
                      </div>
                      <div className={styles.levelChange}>
                        <Tag color={getLevelColor(sp.previousLevel)}>{sp.previousLevel}</Tag>
                        <span className={styles.arrow}>→</span>
                        <Tag color={getLevelColor(sp.currentLevel)}>{sp.currentLevel}</Tag>
                        {getTrendIcon(sp.trend)}
                      </div>
                      <Progress 
                        percent={sp.avgScore} 
                        size="small"
                        strokeColor={{
                          '0%': '#1890ff',
                          '100%': '#52c41a',
                        }}
                        format={() => `平均${sp.avgScore}分`}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}
        </div>
      )}

      {/* 统计卡片 */}
      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <TrophyOutlined className={styles.statIcon} />
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{total}</div>
            <Text type="secondary">总测试次数</Text>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <ClockCircleOutlined className={styles.statIcon} />
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {tests.length > 0 
                ? Math.round(tests.reduce((sum, t) => sum + t.finalScore, 0) / tests.length)
                : 0}
            </div>
            <Text type="secondary">平均分数</Text>
          </div>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card className={styles.filterCard}>
        <Space size="middle">
          <Select
            placeholder="筛选年级"
            allowClear
            style={{ width: 120 }}
            value={filterGrade || undefined}
            onChange={setFilterGrade}
          >
            <Option value="中四">中四</Option>
            <Option value="中五">中五</Option>
            <Option value="中六">中六</Option>
          </Select>
          <Select
            placeholder="筛选科目"
            allowClear
            style={{ width: 150 }}
            value={filterSubject || undefined}
            onChange={setFilterSubject}
          >
            <Option value="中文">中文</Option>
            <Option value="英文">英文</Option>
            <Option value="数学">数学</Option>
            <Option value="通识教育">通识教育</Option>
            <Option value="物理">物理</Option>
            <Option value="化学">化学</Option>
            <Option value="生物">生物</Option>
            <Option value="经济">经济</Option>
          </Select>
          <Button onClick={() => { setFilterGrade(''); setFilterSubject(''); }}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 历史记录表格 */}
      <Card className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : tests.length === 0 ? (
          <Empty
            description={
              <Paragraph>
                暂无测试记录
                <br />
                <Text type="secondary">开始您的第一次水平测试，追踪学习进步</Text>
              </Paragraph>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/level-test')}>
              开始第一次测试
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={tests}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (totalCount) => `共 ${totalCount} 条记录`,
              onChange: (p, ps) => {
                setPage(p)
                if (ps !== pageSize) setPageSize(ps)
              }
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  )
}
