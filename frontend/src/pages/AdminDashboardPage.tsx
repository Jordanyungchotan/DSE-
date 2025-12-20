import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Table, Card, Button, Tag, Space, Typography, message, 
  Modal, Input, Select, Statistic, Row, Col, Tooltip, Divider, List, Avatar
} from 'antd'
import { 
  DownloadOutlined, LogoutOutlined, ReloadOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, PhoneOutlined,
  UserOutlined, MailOutlined, MessageOutlined, DeleteOutlined,
  ExclamationCircleOutlined, TeamOutlined, BarChartOutlined,
  RiseOutlined
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

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // 系统统计数据
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    todayUsers: 0,
    totalAnalysis: 0,
    todayAnalysis: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])

  const adminKey = sessionStorage.getItem('adminKey')

  useEffect(() => {
    if (!adminKey) {
      navigate('/admin')
      return
    }
    loadInquiries()
    loadSystemStats()
  }, [adminKey, navigate])

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
      render: (message: string) => (
        <Tooltip title={message}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
            <MessageOutlined style={{ marginRight: 8 }} />
            {message}
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

  // 统计数据
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter(i => i.status === 'pending').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  }

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
        {/* 系统概览统计 */}
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

        {/* 最近注册用户 */}
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

        <Divider />

        {/* 咨询统计卡片 */}
        <Title level={4} style={{ marginBottom: 16 }}>客户咨询管理</Title>
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

        {/* 数据表格 */}
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
      </main>

      {/* 详情弹窗 */}
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
    </div>
  )
}

export default AdminDashboardPage

