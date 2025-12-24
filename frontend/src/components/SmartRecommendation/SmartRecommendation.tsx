import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Button, Tag, Progress, Tooltip, Badge } from 'antd'
import {
  BulbOutlined,
  RocketOutlined,
  FireOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  BookOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { useQuizStore, SUPPORTED_SUBJECTS } from '../../stores/quizStore'
import styles from './SmartRecommendation.module.css'

const { Title, Text, Paragraph } = Typography

interface SubjectMastery {
  subjectId: string
  subjectName: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  recentTrend: 'up' | 'down' | 'stable'
}

interface TopicMastery {
  topic: string
  subject: string
  mastery: number
  questionsAttempted: number
}

interface WrongQuestion {
  id: string
  subject: string
  topic: string
  status: 'unreviewed' | 'reviewed' | 'mastered'
}

interface SmartRecommendationProps {
  subjectMastery: SubjectMastery[]
  topicMastery: TopicMastery[]
  wrongQuestions: WrongQuestion[]
  totalQuizzes: number
}

interface Recommendation {
  id: string
  type: 'weakness' | 'review' | 'challenge' | 'streak' | 'new'
  title: string
  description: string
  subject: string
  difficulty: string
  questionCount: number
  priority: number
  icon: React.ReactNode
  color: string
  tags: string[]
}

/**
 * 智能推荐组件
 * 根据用户学习数据智能推荐练习内容
 */
const SmartRecommendation = ({
  subjectMastery,
  topicMastery,
  wrongQuestions,
  totalQuizzes,
}: SmartRecommendationProps) => {
  const navigate = useNavigate()
  const { updateConfig } = useQuizStore()
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)

  // 获取所有科目
  const allSubjects = useMemo(() => [
    ...SUPPORTED_SUBJECTS.CORE,
    ...SUPPORTED_SUBJECTS.SCIENCE_ELECTIVES,
    ...SUPPORTED_SUBJECTS.ARTS_ELECTIVES,
  ], [])

  // 生成智能推荐
  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = []

    // 1. 薄弱科目推荐
    const weakSubjects = subjectMastery
      .filter((s) => s.accuracy < 70 && s.totalQuestions > 5)
      .sort((a, b) => a.accuracy - b.accuracy)
    
    weakSubjects.slice(0, 2).forEach((subject, index) => {
      recs.push({
        id: `weak-${subject.subjectId}`,
        type: 'weakness',
        title: `加强${subject.subjectName}练习`,
        description: `您的${subject.subjectName}正确率为${subject.accuracy.toFixed(1)}%，建议进行针对性训练`,
        subject: subject.subjectId,
        difficulty: 'basic',
        questionCount: 10,
        priority: 10 - index,
        icon: <WarningOutlined />,
        color: '#f5222d',
        tags: ['薄弱项', '重点突破'],
      })
    })

    // 2. 错题复习推荐
    const unreviewedWrongQuestions = wrongQuestions.filter((q) => q.status === 'unreviewed')
    if (unreviewedWrongQuestions.length >= 5) {
      // 按科目分组
      const subjectCounts = unreviewedWrongQuestions.reduce((acc, q) => {
        acc[q.subject] = (acc[q.subject] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]
      if (topSubject) {
        const subjectInfo = allSubjects.find((s) => s.id === topSubject[0])
        recs.push({
          id: 'review-wrong',
          type: 'review',
          title: '错题复习',
          description: `您有${unreviewedWrongQuestions.length}道错题待复习，其中${subjectInfo?.name || topSubject[0]}最多`,
          subject: topSubject[0],
          difficulty: 'standard',
          questionCount: Math.min(unreviewedWrongQuestions.length, 15),
          priority: 9,
          icon: <BookOutlined />,
          color: '#fa8c16',
          tags: ['错题复习', '巩固知识'],
        })
      }
    }

    // 3. 挑战推荐（针对强势科目）
    const strongSubjects = subjectMastery
      .filter((s) => s.accuracy >= 80 && s.totalQuestions >= 10)
      .sort((a, b) => b.accuracy - a.accuracy)

    if (strongSubjects.length > 0) {
      const topStrong = strongSubjects[0]
      recs.push({
        id: `challenge-${topStrong.subjectId}`,
        type: 'challenge',
        title: `${topStrong.subjectName}进阶挑战`,
        description: `您的${topStrong.subjectName}正确率高达${topStrong.accuracy.toFixed(1)}%，挑战更高难度！`,
        subject: topStrong.subjectId,
        difficulty: 'challenging',
        questionCount: 10,
        priority: 7,
        icon: <FireOutlined />,
        color: '#722ed1',
        tags: ['进阶挑战', '能力提升'],
      })
    }

    // 4. 薄弱知识点推荐
    const weakTopics = topicMastery
      .filter((t) => t.mastery < 60 && t.questionsAttempted >= 3)
      .sort((a, b) => a.mastery - b.mastery)

    if (weakTopics.length > 0) {
      const weakestTopic = weakTopics[0]
      const subjectInfo = allSubjects.find((s) => s.id === weakestTopic.subject)
      recs.push({
        id: `topic-${weakestTopic.topic}`,
        type: 'weakness',
        title: `专项训练：${weakestTopic.topic}`,
        description: `该知识点掌握度仅${weakestTopic.mastery}%，需要重点练习`,
        subject: weakestTopic.subject,
        difficulty: 'standard',
        questionCount: 10,
        priority: 8,
        icon: <ThunderboltOutlined />,
        color: '#eb2f96',
        tags: [subjectInfo?.name || '', '专项突破'],
      })
    }

    // 5. 新手推荐（如果练习次数少）
    if (totalQuizzes < 5) {
      const lessAttemptedSubjects = allSubjects.filter(
        (s) => !subjectMastery.some((m) => m.subjectId === s.id && m.totalQuestions > 10)
      )
      if (lessAttemptedSubjects.length > 0) {
        recs.push({
          id: 'new-subject',
          type: 'new',
          title: '开始新科目练习',
          description: '尝试更多科目，全面提升DSE成绩',
          subject: lessAttemptedSubjects[0].id,
          difficulty: 'basic',
          questionCount: 5,
          priority: 5,
          icon: <StarOutlined />,
          color: '#52c41a',
          tags: ['新探索', '入门练习'],
        })
      }
    }

    // 6. 保持连续学习推荐
    recs.push({
      id: 'daily-practice',
      type: 'streak',
      title: '每日练习',
      description: '保持每日练习习惯，持续进步',
      subject: subjectMastery[0]?.subjectId || 'math',
      difficulty: 'standard',
      questionCount: 10,
      priority: 6,
      icon: <RocketOutlined />,
      color: '#1890ff',
      tags: ['每日打卡', '养成习惯'],
    })

    // 按优先级排序
    return recs.sort((a, b) => b.priority - a.priority)
  }, [subjectMastery, topicMastery, wrongQuestions, totalQuizzes, allSubjects])

  // 开始推荐练习
  const startRecommendedPractice = (rec: Recommendation) => {
    updateConfig({
      subject: rec.subject,
      difficulty: rec.difficulty,
      questionCount: rec.questionCount,
    })
    navigate('/quiz')
  }

  // 获取推荐类型标签
  const getTypeLabel = (type: Recommendation['type']) => {
    switch (type) {
      case 'weakness':
        return { text: '薄弱项训练', color: 'error' }
      case 'review':
        return { text: '错题复习', color: 'warning' }
      case 'challenge':
        return { text: '进阶挑战', color: 'purple' }
      case 'streak':
        return { text: '每日练习', color: 'blue' }
      case 'new':
        return { text: '新探索', color: 'green' }
      default:
        return { text: '推荐', color: 'default' }
    }
  }

  return (
    <div className={styles.recommendationContainer}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <BulbOutlined />
        </div>
        <div>
          <Title level={4}>智能推荐</Title>
          <Text type="secondary">根据您的学习数据，为您个性化推荐练习内容</Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {recommendations.slice(0, 6).map((rec) => {
          const typeLabel = getTypeLabel(rec.type)
          const isSelected = selectedRecommendation === rec.id

          return (
            <Col xs={24} sm={12} lg={8} key={rec.id}>
              <Card
                className={`${styles.recommendCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedRecommendation(isSelected ? null : rec.id)}
                hoverable
              >
                <Badge.Ribbon text={typeLabel.text} color={typeLabel.color}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <div
                        className={styles.iconWrapper}
                        style={{ backgroundColor: `${rec.color}20`, color: rec.color }}
                      >
                        {rec.icon}
                      </div>
                      <div className={styles.cardInfo}>
                        <Text strong className={styles.cardTitle}>{rec.title}</Text>
                        <div className={styles.cardTags}>
                          {rec.tags.map((tag, index) => (
                            <Tag key={index} size="small">{tag}</Tag>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Paragraph className={styles.cardDesc} ellipsis={{ rows: 2 }}>
                      {rec.description}
                    </Paragraph>

                    <div className={styles.cardMeta}>
                      <span>
                        <CheckCircleOutlined /> {rec.questionCount}题
                      </span>
                      <span>
                        {rec.difficulty === 'basic' && '基础'}
                        {rec.difficulty === 'standard' && '标准'}
                        {rec.difficulty === 'challenging' && '挑战'}
                        {rec.difficulty === 'exam' && '考试'}
                      </span>
                    </div>

                    {isSelected && (
                      <Button
                        type="primary"
                        block
                        icon={<ArrowRightOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          startRecommendedPractice(rec)
                        }}
                        className={styles.startButton}
                      >
                        开始练习
                      </Button>
                    )}
                  </div>
                </Badge.Ribbon>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* 快速开始区域 */}
      <Card className={styles.quickStartCard}>
        <div className={styles.quickStartContent}>
          <div>
            <Title level={5}>
              <RocketOutlined /> 快速开始
            </Title>
            <Text type="secondary">选择上方推荐开始练习，或直接进入刷题配置</Text>
          </div>
          <Button type="primary" size="large" onClick={() => navigate('/quiz')}>
            自定义练习 <ArrowRightOutlined />
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default SmartRecommendation

