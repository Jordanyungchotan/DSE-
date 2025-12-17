import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Popconfirm,
  message,
  Progress,
} from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAnalysisStore, HistoryItem } from '../stores/analysisStore'
import styles from './HistoryPage.module.css'

const { Title, Text, Paragraph } = Typography

/**
 * 历史记录页面
 * 展示用户的所有分析历史记录
 */
const HistoryPage = () => {
  const navigate = useNavigate()
  const { history, loading, loadHistory, deleteHistoryItem } = useAnalysisStore()

  // 加载历史记录
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  /**
   * 获取年级中文名称
   */
  const getGradeName = (grade: string) => {
    const gradeMap: Record<string, string> = {
      form4: '中四',
      form5: '中五',
      form6: '中六',
    }
    return gradeMap[grade] || grade
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
   * 删除记录
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryItem(id)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    }
  }

  // 表格列定义
  const columns: ColumnsType<HistoryItem> = [
    {
      title: '分析时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => (
        <Text>{new Date(date).toLocaleString('zh-CN')}</Text>
      ),
      sorter: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '年级',
      dataIndex: ['studentInfo', 'grade'],
      key: 'grade',
      width: 100,
      render: (grade: string) => (
        <Tag color="blue">{getGradeName(grade)}</Tag>
      ),
    },
    {
      title: '目标学校',
      dataIndex: ['studentInfo', 'targetSchools'],
      key: 'targetSchools',
      width: 200,
      render: (schools: string[]) => (
        <Space wrap size={[4, 4]}>
          {schools?.slice(0, 2).map((school, index) => (
            <Tag key={index}>{school}</Tag>
          ))}
          {schools?.length > 2 && (
            <Tag>+{schools.length - 2}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '可行性评分',
      dataIndex: 'feasibilityScore',
      key: 'feasibilityScore',
      width: 150,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={getScoreColor(score)}
          format={(percent) => `${percent}分`}
        />
      ),
      sorter: (a, b) => a.feasibilityScore - b.feasibilityScore,
    },
    {
      title: '分析摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (summary: string) => (
        <Text ellipsis={{ tooltip: summary }}>
          {summary}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/result/${record.id}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除此记录？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 模拟历史数据（实际应从API获取）
  const mockHistory: HistoryItem[] = history.length > 0 ? history : [
    {
      id: 'demo-1',
      createdAt: new Date().toISOString(),
      studentInfo: {
        enrollmentDate: '2025-02-01',
        semester: '2024-2025-2',
        grade: 'form5',
        age: 16,
        currentSchool: '某中学',
        subjects: [],
        targetSchools: ['喇沙书院', '拔萃男书院'],
        notes: '',
      },
      feasibilityScore: 75,
      summary: '该学生整体学术表现良好，数学和英语科目表现优秀。',
    },
    {
      id: 'demo-2',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      studentInfo: {
        enrollmentDate: '2025-01-15',
        semester: '2024-2025-2',
        grade: 'form4',
        age: 15,
        currentSchool: '另一中学',
        subjects: [],
        targetSchools: ['皇仁书院'],
        notes: '',
      },
      feasibilityScore: 82,
      summary: '学生基础扎实，各科成绩均衡，插班成功率较高。',
    },
  ]

  return (
    <div className={styles.historyPage}>
      <Card className={styles.mainCard}>
        {/* 页面头部 */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <HistoryOutlined className={styles.headerIcon} />
            <div>
              <Title level={2} className="gradient-title">
                分析历史记录
              </Title>
              <Paragraph type="secondary">
                查看您的所有DSE插班分析记录，可随时查看详细报告或删除记录
              </Paragraph>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/analysis')}
          >
            新建分析
          </Button>
        </div>

        {/* 历史记录表格 */}
        {mockHistory.length > 0 ? (
          <Table
            columns={columns}
            dataSource={mockHistory}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ x: 1000 }}
            className={styles.historyTable}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无分析记录"
            className={styles.emptyState}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/analysis')}
            >
              开始第一次分析
            </Button>
          </Empty>
        )}
      </Card>
    </div>
  )
}

export default HistoryPage

