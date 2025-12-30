import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Table, Card, Button, Tag, Space, Typography, message, 
  Modal, Input, Select, Statistic, Row, Col, Tooltip, Divider, List, Avatar,
  Tabs, Progress, Badge, Empty, Spin
} from 'antd'
import { 
  DownloadOutlined, LogoutOutlined, ReloadOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, PhoneOutlined,
  UserOutlined, MailOutlined, MessageOutlined, DeleteOutlined,
  ExclamationCircleOutlined, TeamOutlined, BarChartOutlined,
  RiseOutlined, BookOutlined, TrophyOutlined, DatabaseOutlined,
  SafetyOutlined, EditOutlined, CloseCircleOutlined
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import styles from './AdminDashboardPage.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface Inquiry {
  id: string
  name: string
  phone: string | null
  email: string | null
  message: string
  status: 'pending' | 'contacted' | 'resolved'
  notes: string | null
  created_at: string
  updated_at: string
}

interface SystemStats {
  totalUsers: number
  todayUsers: number
  totalAnalysis: number
  todayAnalysis: number
}

interface RecentUser {
  id: string
  name: string
  email: string
  created_at: string
}

interface LevelTestStats {
  totalTests: number
  completedTests: number
  todayTests: number
  averageScore: number
  subjectDistribution: Array<{ subject: string; count: number; avg_score: number }>
  gradeDistribution: Array<{ grade: string; count: number; avg_score: number }>
  levelDistribution: Array<{ overall_level: string; count: number }>
  cachedQuestions: number
  pendingReviews: number
}

interface ReviewItem {
  id: string
  question_id: string
  source_type: string
  status: string
  question_data: string
  grade: string
  subject: string
  difficulty: string
  question_type: string
  created_at: string
}

interface TestRecord {
  id: string
  user_id: string
  user_name: string
  user_email: string
  grade: string
  subject: string
  test_type: string
  status: string
  score: number
  overall_level: string
  question_count: number
  created_at: string
  completed_at: string
}

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // 系统统计数据
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    todayUsers: 0,
    totalAnalysis: 0,
    todayAnalysis: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  
  // 水平测试管理相关状态
  const [levelTestStats, setLevelTestStats] = useState<LevelTestStats | null>(null)
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([])
  const [testRecords, setTestRecords] = useState<TestRecord[]>([])
  const [levelTestLoading, setLevelTestLoading] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'modified'>('approved')
  const [reviewComments, setReviewComments] = useState('')

  const adminKey = sessionStorage.getItem('adminKey')

  useEffect(() => {
    if (!adminKey) {
      navigate('/admin')
      return
    }
    loadInquiries()
    loadSystemStats()
  }, [adminKey, navigate])

  useEffect(() => {
    if (activeTab === 'levelTest' && adminKey) {
      loadLevelTestStats()
      loadReviewQueue()
      loadTestRecords()
    }
  }, [activeTab, adminKey])

  // 加载系统统计数据
  const loadSystemStats = async () => {
    try {
      const response = await apiFetch('/api/admin/stats', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data.stats)
        setRecentUsers(data.recentUsers || [])
      }
    } catch {
      console.error('加载统计数据失败')
    }
  }

  // 加载水平测试统计
  const loadLevelTestStats = async () => {
    setLevelTestLoading(true)
    try {
      const response = await apiFetch('/api/admin/level-test/stats', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLevelTestStats(data)
      }
    } catch {
      console.error('加载水平测试统计失败')
    } finally {
      setLevelTestLoading(false)
    }
  }

  // 加载审核队列
  const loadReviewQueue = async () => {
    try {
      const response = await apiFetch('/api/admin/level-test/review-queue?status=pending', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviewQueue(data.reviews || [])
      }
    } catch {
      console.error('加载审核队列失败')
    }
  }

  // 加载测试记录
  const loadTestRecords = async () => {
    try {
      const response = await apiFetch('/api/admin/level-test/tests?limit=20', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTestRecords(data.tests || [])
      }
    } catch {
      console.error('加载测试记录失败')
    }
  }

  // 处理题目审核
  const handleReviewQuestion = async () => {
    if (!selectedReview) return
    
    setUpdating(true)
    try {
      const response = await apiFetch(`/api/admin/level-test/question/${selectedReview.question_id}/review`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '' 
        },
        body: JSON.stringify({ 
          status: reviewStatus, 
          comments: reviewComments 
        })
      })
      
      if (response.ok) {
        message.success('审核完成')
        setReviewModalVisible(false)
        loadReviewQueue()
        loadLevelTestStats()
      } else {
        throw new Error('审核失败')
      }
    } catch {
      message.error('审核失败')
    } finally {
      setUpdating(false)
    }
  }

  const loadInquiries = async () => {
    setLoading(true)
    try {
      const response = await apiFetch('/api/admin/inquiries', {
        headers: { 'X-Admin-Key': adminKey || '' }
      })
      
      if (!response.ok) {
        throw new Error('加载失败')
      }
      
      const data = await response.json()
      setInquiries(data.inquiries || [])
    } catch {
      message.error('加载客户咨询失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey')
    navigate('/admin')
  }

  const handleViewDetails = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setEditStatus(inquiry.status)
    setEditNotes(inquiry.notes || '')
    setModalVisible(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedInquiry) return
    
    setUpdating(true)
    try {
      const response = await apiFetch(`/api/admin/inquiry/${selectedInquiry.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey || '' 
        },
        body: JSON.stringify({ status: editStatus, notes: editNotes })
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      message.success('更新成功')
      setModalVisible(false)
      loadInquiries()
    } catch {
      message.error('更新失败')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = (inquiry: Inquiry) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 "${inquiry.name}" 的咨询记录吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiFetch(`/api/admin/inquiry/${inquiry.id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': adminKey || '' }
          })
          
          if (!response.ok) {
            throw new Error('删除失败')
          }
          
          message.success('删除成功')
          loadInquiries()
        } catch {
          message.error('删除失败')
        }
      }
    })
  }

  const exportToCSV = () => {
    if (inquiries.length === 0) {
      message.warning('没有数据可导出')
      return
    }

    const headers = ['姓名', '电话', '邮箱', '咨询内容', '状态', '备注', '提交时间']
    const statusMap: Record<string, string> = {
      pending: '待处理',
      contacted: '已联系',
      resolved: '已解决'
    }
    
    const rows = inquiries.map(item => [
      item.name,
      item.phone || '',
      item.email || '',
      item.message.replace(/,/g, '，').replace(/\n/g, ' '),
      statusMap[item.status] || item.status,
      (item.notes || '').replace(/,/g, '，').replace(/\n/g, ' '),
      new Date(item.created_at).toLocaleString('zh-CN')
    ])

    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `客户咨询_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    message.success('导出成功')
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="warning">待处理</Tag>
      case 'contacted':
        return <Tag icon={<PhoneOutlined />} color="processing">已联系</Tag>
      case 'resolved':
        return <Tag icon={<CheckCircleOutlined />} color="success">已解决</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getTestStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag color="default">待开始</Tag>
      case 'active':
        return <Tag color="processing">进行中</Tag>
      case 'completed':
        return <Tag color="warning">待评分</Tag>
      case 'graded':
        return <Tag color="success">已完成</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const getLevelTag = (level: string) => {
    const colors: Record<string, string> = {
      '5**': '#722ed1',
      '5*': '#1890ff',
      '5': '#13c2c2',
      '4': '#52c41a',
      '3': '#faad14',
      '2': '#fa8c16',
      '1': '#f5222d',
      'U': '#d9d9d9',
    }
    return <Tag color={colors[level] || 'default'}>{level}</Tag>
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 180,
      render: (_: unknown, record: Inquiry) => (
        <div>
          {record.phone && (
            <div><PhoneOutlined /> {record.phone}</div>
          )}
          {record.email && (
            <div><MailOutlined /> {record.email}</div>
          )}
          {!record.phone && !record.email && (
            <Text type="secondary">未提供</Text>
          )}
        </div>
      )
    },
    {
      title: '咨询内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (messageText: string) => (
        <Tooltip title={messageText}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
            <MessageOutlined style={{ marginRight: 8 }} />
            {messageText}
          </Paragraph>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '已联系', value: 'contacted' },
        { text: '已解决', value: 'resolved' },
      ],
      onFilter: (value: unknown, record: Inquiry) => record.status === value,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      sorter: (a: Inquiry, b: Inquiry) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Inquiry) => (
        <Space>
          <Button type="link" onClick={() => handleViewDetails(record)}>
            详情
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  const testRecordColumns = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: unknown, record: TestRecord) => (
        <div>
          <div><Text strong>{record.user_name || '匿名'}</Text></div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.user_email}</Text>
        </div>
      )
    },
    {
      title: '科目',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'test_type',
      key: 'test_type',
      width: 80,
      render: (type: string) => type === 'quick' ? '快速测试' : '完整测试'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getTestStatusTag(status)
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => score ? `${Math.round(score)}分` : '-'
    },
    {
      title: '等级',
      dataIndex: 'overall_level',
      key: 'overall_level',
      width: 80,
      render: (level: string) => level ? getLevelTag(level) : '-'
    },
    {
      title: '题目数',
      dataIndex: 'question_count',
      key: 'question_count',
      width: 80,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
  ]

  // 统计数据
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  }

  // 渲染系统概览标签页
  const renderOverviewTab = () => (
    <>
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="注册用户总数" 
              value={systemStats.totalUsers}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日新用户" 
              value={systemStats.todayUsers}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="分析报告总数" 
              value={systemStats.totalAnalysis}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日分析数" 
              value={systemStats.todayAnalysis}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {recentUsers.length > 0 && (
        <Card 
          title="最近注册用户" 
          className={styles.tableCard}
          style={{ marginBottom: 24 }}
        >
          <List
            itemLayout="horizontal"
            dataSource={recentUsers}
            renderItem={(user) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />}
                  title={user.name}
                  description={
                    <Space split={<Divider type="vertical" />}>
                      <span><MailOutlined /> {user.email}</span>
                      <span>注册时间: {new Date(user.created_at).toLocaleString('zh-CN')}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </>
  )

  // 渲染客户咨询标签页
  const renderInquiriesTab = () => (
    <>
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic title="总咨询数" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.pending}`}>
            <Statistic 
              title="待处理" 
              value={stats.pending} 
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.contacted}`}>
            <Statistic 
              title="已联系" 
              value={stats.contacted}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={`${styles.statCard} ${styles.resolved}`}>
            <Statistic 
              title="已解决" 
              value={stats.resolved}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        className={styles.tableCard}
        title="客户咨询列表"
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadInquiries}
              loading={loading}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={exportToCSV}
            >
              导出CSV
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={inquiries}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </>
  )

  // 渲染水平测试管理标签页
  const renderLevelTestTab = () => (
    <Spin spinning={levelTestLoading}>
      {/* 水平测试统计 */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="测试总数" 
              value={levelTestStats?.totalTests || 0}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="已完成测试" 
              value={levelTestStats?.completedTests || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="今日测试" 
              value={levelTestStats?.todayTests || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className={styles.statCard}>
            <Statistic 
              title="平均分数" 
              value={levelTestStats?.averageScore || 0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card className={styles.statCard}>
            <Statistic 
              title="缓存题目数" 
              value={levelTestStats?.cachedQuestions || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={styles.statCard}>
            <Statistic 
              title={
                <span>
                  待审核题目 
                  {(levelTestStats?.pendingReviews || 0) > 0 && (
                    <Badge count={levelTestStats?.pendingReviews} style={{ marginLeft: 8 }} />
                  )}
                </span>
              }
              value={levelTestStats?.pendingReviews || 0}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 科目分布 */}
      {levelTestStats?.subjectDistribution && levelTestStats.subjectDistribution.length > 0 && (
        <Card title="科目测试分布" className={styles.tableCard} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {levelTestStats.subjectDistribution.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.subject}>
                <Card size="small" className={styles.subjectCard}>
                  <div className={styles.subjectHeader}>
                    <Text strong>{item.subject}</Text>
                    <Tag color="blue">{item.count} 次</Tag>
                  </div>
                  <Progress 
                    percent={item.avg_score ? Math.round(item.avg_score) : 0} 
                    size="small"
                    status="active"
                    format={(percent) => `平均 ${percent}分`}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 等级分布 */}
      {levelTestStats?.levelDistribution && levelTestStats.levelDistribution.length > 0 && (
        <Card title="等级分布" className={styles.tableCard} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {levelTestStats.levelDistribution.map((item) => (
              <Col xs={8} sm={6} md={4} lg={3} key={item.overall_level}>
                <Card size="small" className={styles.levelCard}>
                  <div className={styles.levelContent}>
                    {getLevelTag(item.overall_level)}
                    <Text strong style={{ fontSize: 20, marginTop: 8 }}>{item.count}</Text>
                    <Text type="secondary">人</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 待审核题目 */}
      <Card 
        title={
          <span>
            待审核题目
            {reviewQueue.length > 0 && (
              <Badge count={reviewQueue.length} style={{ marginLeft: 8 }} />
            )}
          </span>
        }
        className={styles.tableCard} 
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadReviewQueue}>
            刷新
          </Button>
        }
      >
        {reviewQueue.length === 0 ? (
          <Empty description="暂无待审核题目" />
        ) : (
          <List
            dataSource={reviewQueue}
            renderItem={(item) => {
              let questionData: { question?: string; options?: string[] } = {}
              try {
                questionData = JSON.parse(item.question_data || '{}')
              } catch {
                questionData = {}
              }
              
              return (
                <List.Item
                  actions={[
                    <Button 
                      key="review"
                      type="primary" 
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setSelectedReview(item)
                        setReviewStatus('approved')
                        setReviewComments('')
                        setReviewModalVisible(true)
                      }}
                    >
                      审核
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag>{item.grade}</Tag>
                        <Tag color="blue">{item.subject}</Tag>
                        <Tag color={item.difficulty === 'hard' ? 'red' : item.difficulty === 'medium' ? 'orange' : 'green'}>
                          {item.difficulty === 'hard' ? '困难' : item.difficulty === 'medium' ? '中等' : '简单'}
                        </Tag>
                        <Tag>{item.question_type === 'choice' ? '选择题' : item.question_type === 'short' ? '简答题' : '论述题'}</Tag>
                      </Space>
                    }
                    description={
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                        {questionData.question || '题目内容加载中...'}
                      </Paragraph>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </Card>

      {/* 测试记录列表 */}
      <Card 
        title="最近测试记录" 
        className={styles.tableCard}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadTestRecords}>
            刷新
          </Button>
        }
      >
        <Table
          columns={testRecordColumns}
          dataSource={testRecords}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Spin>
  )

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined />
          系统概览
        </span>
      ),
      children: renderOverviewTab(),
    },
    {
      key: 'inquiries',
      label: (
        <span>
          <MessageOutlined />
          客户咨询
          {stats.pending > 0 && <Badge count={stats.pending} style={{ marginLeft: 8 }} />}
        </span>
      ),
      children: renderInquiriesTab(),
    },
    {
      key: 'levelTest',
      label: (
        <span>
          <BookOutlined />
          水平测试管理
          {(levelTestStats?.pendingReviews || 0) > 0 && (
            <Badge count={levelTestStats?.pendingReviews} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: renderLevelTestTab(),
    },
  ]

  return (
    <div className={styles.adminDashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Title level={3} style={{ margin: 0, color: '#fff' }}>
            管理员后台
          </Title>
          <Button 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            type="text"
            style={{ color: '#fff' }}
          >
            退出登录
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </main>

      {/* 咨询详情弹窗 */}
      <Modal
        title="咨询详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={updating}
            onClick={handleUpdateStatus}
          >
            保存
          </Button>
        ]}
        width={600}
      >
        {selectedInquiry && (
          <div className={styles.detailContent}>
            <div className={styles.detailItem}>
              <Text type="secondary">姓名：</Text>
              <Text strong>{selectedInquiry.name}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">电话：</Text>
              <Text>{selectedInquiry.phone || '未提供'}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">邮箱：</Text>
              <Text>{selectedInquiry.email || '未提供'}</Text>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">咨询内容：</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {selectedInquiry.message}
              </Paragraph>
            </div>
            <div className={styles.detailItem}>
              <Text type="secondary">提交时间：</Text>
              <Text>{new Date(selectedInquiry.created_at).toLocaleString('zh-CN')}</Text>
            </div>
            
            <div className={styles.editSection}>
              <div className={styles.detailItem}>
                <Text type="secondary">状态：</Text>
                <Select
                  value={editStatus}
                  onChange={setEditStatus}
                  style={{ width: 150 }}
                  options={[
                    { value: 'pending', label: '待处理' },
                    { value: 'contacted', label: '已联系' },
                    { value: 'resolved', label: '已解决' },
                  ]}
                />
              </div>
              <div className={styles.detailItem}>
                <Text type="secondary">备注：</Text>
                <TextArea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="添加跟进备注..."
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 题目审核弹窗 */}
      <Modal
        title="题目审核"
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="reject" 
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => {
              setReviewStatus('rejected')
              handleReviewQuestion()
            }}
            loading={updating}
          >
            拒绝
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            loading={updating}
            onClick={() => {
              setReviewStatus('approved')
              handleReviewQuestion()
            }}
          >
            通过
          </Button>
        ]}
        width={700}
      >
        {selectedReview && (
          <div className={styles.reviewContent}>
            <div className={styles.reviewMeta}>
              <Space>
                <Tag>{selectedReview.grade}</Tag>
                <Tag color="blue">{selectedReview.subject}</Tag>
                <Tag color={selectedReview.difficulty === 'hard' ? 'red' : selectedReview.difficulty === 'medium' ? 'orange' : 'green'}>
                  {selectedReview.difficulty === 'hard' ? '困难' : selectedReview.difficulty === 'medium' ? '中等' : '简单'}
                </Tag>
                <Tag>{selectedReview.question_type === 'choice' ? '选择题' : selectedReview.question_type === 'short' ? '简答题' : '论述题'}</Tag>
              </Space>
            </div>
            
            <div className={styles.questionPreview}>
              <Title level={5}>题目内容</Title>
              <Card size="small" className={styles.previewCard}>
                {(() => {
                  try {
                    const data = JSON.parse(selectedReview.question_data || '{}')
                    return (
                      <>
                        <Paragraph>{data.question}</Paragraph>
                        {data.options && (
                          <div className={styles.optionsList}>
                            {data.options.map((opt: string, idx: number) => (
                              <div key={idx} className={styles.optionItem}>
                                {String.fromCharCode(65 + idx)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {data.answer && (
                          <div className={styles.answerSection}>
                            <Text strong>正确答案：</Text> {data.answer}
                          </div>
                        )}
                        {data.explanation && (
                          <div className={styles.explanationSection}>
                            <Text strong>解析：</Text> {data.explanation}
                          </div>
                        )}
                      </>
                    )
                  } catch {
                    return <Text type="secondary">题目数据解析失败</Text>
                  }
                })()}
              </Card>
            </div>

            <div className={styles.reviewForm}>
              <Title level={5}>审核意见</Title>
              <TextArea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={3}
                placeholder="添加审核意见（可选）..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminDashboardPage
