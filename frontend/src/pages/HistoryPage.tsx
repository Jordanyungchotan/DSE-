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
import { useLanguageStore } from '../stores/languageStore'
import styles from './HistoryPage.module.css'

const { Title, Text, Paragraph } = Typography

/**
 * 历史记录页面
 * 展示用户的所有分析历史记录
 */
const HistoryPage = () => {
  const navigate = useNavigate()
  const { t } = useLanguageStore()
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
  // 【修复】移除前端 sorter，后端已按 created_at DESC 排序
  const columns: ColumnsType<HistoryItem> = [
    {
      title: '分析时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => (
        <Text>{new Date(date).toLocaleString('zh-CN')}</Text>
      ),
      // 后端已排序，不再前端排序
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

  // 使用真实历史数据
  const displayHistory = history

  return (
    <div className={styles.historyPage}>
      <Card className={styles.mainCard}>
        {/* 页面头部 */}
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <HistoryOutlined className={styles.headerIcon} />
            <div>
              <Title level={2} className="gradient-title">
                {t('history.title')}
              </Title>
              <Paragraph type="secondary">
                {t('history.title')}
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
        {displayHistory.length > 0 ? (
          <Table
            columns={columns}
            dataSource={displayHistory}
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

