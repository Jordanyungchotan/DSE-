import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Tag, Skeleton, Typography } from 'antd'
import { 
  BulbOutlined, 
  RocketOutlined, 
  BookOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import { apiFetch } from '../../config/api'
import { useAuthStore } from '../../stores/authStore'
import styles from './LearningRecommendCard.module.css'

const { Text } = Typography

// ===== 类型定义 =====

interface QuickRecommendation {
  suggestedAction: string
  difficulty: string
  reason: string
  modules?: string[]
  subject?: string
}

interface QuickRecommendResponse {
  code: number
  data: QuickRecommendation
  message: string
}

// ===== 配置 =====

const DIFFICULTY_CONFIG: Record<string, { color: string; label: string }> = {
  basic: { color: '#52c41a', label: '基础' },
  standard: { color: '#1890ff', label: '标准' },
  challenging: { color: '#fa8c16', label: '挑战' },
  exam: { color: '#722ed1', label: '考试难度' },
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; route: string; label: string; color: string }> = {
  quiz: { 
    icon: <BookOutlined />, 
    route: '/quiz', 
    label: '开始刷题',
    color: '#1890ff'
  },
  test: { 
    icon: <ExperimentOutlined />, 
    route: '/level-test', 
    label: '进行测试',
    color: '#722ed1'
  },
  review: { 
    icon: <ReloadOutlined />, 
    route: '/quiz/wrong-questions', 
    label: '复习错题',
    color: '#fa8c16'
  },
}

interface LearningRecommendCardProps {
  compact?: boolean  // 紧凑模式（用于嵌入其他页面）
  onActionClick?: () => void  // 点击行动按钮后的回调
}

export default function LearningRecommendCard({ compact = false, onActionClick }: LearningRecommendCardProps) {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<QuickRecommendation | null>(null)
  const [error, setError] = useState(false)

  const fetchRecommendation = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(false)
    
    try {
      const response = await apiFetch('/api/learning/quick-recommend', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data: QuickRecommendResponse = await response.json()
        if (data.code === 0 && data.data) {
          setRecommendation(data.data)
        } else {
          setError(true)
        }
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch recommendation:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRecommendation()
  }, [fetchRecommendation])

  // 解析推荐行动类型
  const parseAction = (action: string): keyof typeof ACTION_CONFIG => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('test') || actionLower.includes('测试')) {
      return 'test'
    }
    if (actionLower.includes('review') || actionLower.includes('复习') || actionLower.includes('错题')) {
      return 'review'
    }
    return 'quiz'
  }

  // 处理行动按钮点击
  const handleAction = () => {
    if (!recommendation) return
    
    const actionType = parseAction(recommendation.suggestedAction)
    const config = ACTION_CONFIG[actionType]
    
    onActionClick?.()
    navigate(config.route)
  }

  // 获取难度配置
  const getDifficultyConfig = (difficulty: string) => {
    return DIFFICULTY_CONFIG[difficulty.toLowerCase()] || DIFFICULTY_CONFIG.standard
  }

  // 未登录状态
  if (!token) {
    return null
  }

  // 加载中
  if (loading) {
    return (
      <Card className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <Skeleton active paragraph={{ rows: compact ? 1 : 2 }} />
      </Card>
    )
  }

  // 错误状态
  if (error || !recommendation) {
    return (
      <Card className={`${styles.card} ${compact ? styles.compact : ''}`}>
        <div className={styles.errorState}>
          <BulbOutlined className={styles.errorIcon} />
          <Text type="secondary">暂无个性化推荐</Text>
          <Button size="small" onClick={fetchRecommendation}>重试</Button>
        </div>
      </Card>
    )
  }

  const actionType = parseAction(recommendation.suggestedAction)
  const actionConfig = ACTION_CONFIG[actionType]
  const difficultyConfig = getDifficultyConfig(recommendation.difficulty)

  // 紧凑模式
  if (compact) {
    return (
      <Card className={`${styles.card} ${styles.compact}`} bordered={false}>
        <div className={styles.compactContent}>
          <div className={styles.compactLeft}>
            <div className={styles.compactIcon} style={{ background: `${actionConfig.color}15`, color: actionConfig.color }}>
              <RocketOutlined />
            </div>
            <div className={styles.compactInfo}>
              <Text strong className={styles.compactTitle}>下一步推荐</Text>
              <Text type="secondary" className={styles.compactReason}>
                {recommendation.reason.length > 30 
                  ? recommendation.reason.substring(0, 30) + '...' 
                  : recommendation.reason}
              </Text>
            </div>
          </div>
          <Button 
            type="primary" 
            size="small"
            icon={actionConfig.icon}
            onClick={handleAction}
            style={{ background: actionConfig.color, borderColor: actionConfig.color }}
          >
            {actionConfig.label}
          </Button>
        </div>
      </Card>
    )
  }

  // 完整模式
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <RocketOutlined />
        </div>
        <div className={styles.headerText}>
          <Text strong className={styles.headerTitle}>智能学习推荐</Text>
          <Text type="secondary" className={styles.headerSubtitle}>基于你的学习数据分析</Text>
        </div>
      </div>

      <div className={styles.content}>
        {/* 推荐理由 */}
        <div className={styles.reasonSection}>
          <BulbOutlined className={styles.reasonIcon} />
          <Text className={styles.reasonText}>{recommendation.reason}</Text>
        </div>

        {/* 推荐详情 */}
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <Text type="secondary">推荐行动</Text>
            <Tag color={actionConfig.color}>{recommendation.suggestedAction}</Tag>
          </div>
          <div className={styles.detailItem}>
            <Text type="secondary">推荐难度</Text>
            <Tag color={difficultyConfig.color}>{difficultyConfig.label}</Tag>
          </div>
          {recommendation.subject && (
            <div className={styles.detailItem}>
              <Text type="secondary">科目</Text>
              <Tag>{recommendation.subject}</Tag>
            </div>
          )}
        </div>

        {/* 模块标签 */}
        {recommendation.modules && recommendation.modules.length > 0 && (
          <div className={styles.modules}>
            <Text type="secondary" className={styles.modulesLabel}>推荐模块：</Text>
            <div className={styles.modulesTags}>
              {recommendation.modules.slice(0, 3).map((mod, idx) => (
                <Tag key={idx} className={styles.moduleTag}>{mod}</Tag>
              ))}
              {recommendation.modules.length > 3 && (
                <Tag className={styles.moduleTag}>+{recommendation.modules.length - 3}</Tag>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 行动按钮 */}
      <div className={styles.action}>
        <Button 
          type="primary" 
          size="large"
          block
          icon={actionConfig.icon}
          onClick={handleAction}
          className={styles.actionButton}
          style={{ background: actionConfig.color, borderColor: actionConfig.color }}
        >
          {actionConfig.label}
          <ArrowRightOutlined className={styles.actionArrow} />
        </Button>
      </div>
    </Card>
  )
}
