import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, Typography, Table, Tag, Button, Select, Space, Empty, Spin 
} from 'antd'
import { 
  FileTextOutlined, 
  TrophyOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { apiFetch } from '../config/api'
import styles from './LevelTestHistoryPage.module.css'

const { Title, Text } = Typography
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

export default function LevelTestHistoryPage() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<TestRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filterSubject, setFilterSubject] = useState<string>('')
  const [filterGrade, setFilterGrade] = useState<string>('')

  useEffect(() => {
    loadHistory()
  }, [page, pageSize, filterSubject, filterGrade])

  const loadHistory = async () => {
    setLoading(true)
    try {
      let url = `/api/level-test/history?limit=${pageSize}&offset=${(page - 1) * pageSize}`
      if (filterSubject) url += `&subject=${encodeURIComponent(filterSubject)}`
      if (filterGrade) url += `&grade=${encodeURIComponent(filterGrade)}`
      
      const response = await apiFetch(url) as { tests?: TestRecord[]; total?: number }
      
      if (response.tests) {
        setTests(response.tests)
        setTotal(response.total || 0)
      }
    } catch (error) {
      console.error('Load history error:', error)
    } finally {
      setLoading(false)
    }
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
          <Text type="secondary">查看您的水平测试记录和报告</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/level-test')}
        >
          开始新测试
        </Button>
      </div>

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
            description="暂无测试记录"
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
              showTotal: (total) => `共 ${total} 条记录`,
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

