import { useMemo } from 'react'
import { Card, Typography, Row, Col, Empty } from 'antd'
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import styles from './LearningChart.module.css'

const { Title, Text } = Typography

interface ActivityData {
  date: string
  quizCount: number
  questionsAnswered: number
  accuracy: number
}

interface SubjectData {
  subjectId: string
  subjectName: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number
}

interface LearningChartProps {
  recentActivity: ActivityData[]
  subjectMastery: SubjectData[]
}

/**
 * 学习数据可视化图表组件
 * 使用纯CSS实现简单图表，无需额外依赖
 */
const LearningChart = ({ recentActivity, subjectMastery }: LearningChartProps) => {
  // 计算趋势数据
  const trendData = useMemo(() => {
    if (recentActivity.length < 2) return null
    
    const recent = recentActivity.slice(0, 3)
    const older = recentActivity.slice(3, 6)
    
    const recentAvg = recent.reduce((sum, d) => sum + d.accuracy, 0) / recent.length
    const olderAvg = older.length > 0 
      ? older.reduce((sum, d) => sum + d.accuracy, 0) / older.length 
      : recentAvg
    
    return {
      improvement: recentAvg - olderAvg,
      currentAvg: recentAvg,
      trend: recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable',
    }
  }, [recentActivity])

  // 获取最大值用于图表缩放
  const maxQuestions = useMemo(() => {
    return Math.max(...recentActivity.map(d => d.questionsAnswered), 10)
  }, [recentActivity])

  // 科目颜色映射
  const subjectColors: Record<string, string> = {
    math: '#2b6cb0',
    physics: '#805ad5',
    chemistry: '#38a169',
    biology: '#d69e2e',
    chinese: '#e53e3e',
    english: '#3182ce',
    ls: '#dd6b20',
    economics: '#319795',
    geography: '#718096',
    history: '#b7791f',
    chinese_history: '#c53030',
  }

  const getSubjectColor = (subjectId: string) => {
    return subjectColors[subjectId] || '#718096'
  }

  if (recentActivity.length === 0 && subjectMastery.length === 0) {
    return (
      <Card className={styles.chartCard}>
        <Empty description="暂无学习数据" />
      </Card>
    )
  }

  return (
    <div className={styles.chartsContainer}>
      {/* 学习趋势概览 */}
      {trendData && (
        <Card className={styles.trendCard}>
          <div className={styles.trendHeader}>
            <RiseOutlined className={styles.trendIcon} />
            <Title level={5}>学习趋势</Title>
          </div>
          <div className={styles.trendContent}>
            <div className={styles.trendValue}>
              <span className={`${styles.trendNumber} ${trendData.improvement >= 0 ? styles.positive : styles.negative}`}>
                {trendData.improvement >= 0 ? '+' : ''}{trendData.improvement.toFixed(1)}%
              </span>
              <Text type="secondary">相比上周</Text>
            </div>
            <div className={styles.trendAvg}>
              <span className={styles.avgNumber}>{trendData.currentAvg.toFixed(1)}%</span>
              <Text type="secondary">近期平均正确率</Text>
            </div>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {/* 每日答题量柱状图 */}
        <Col xs={24} md={12}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <BarChartOutlined className={styles.chartIcon} />
              <Title level={5}>每日答题量</Title>
            </div>
            <div className={styles.barChart}>
              {recentActivity.slice(0, 7).reverse().map((day, index) => (
                <div key={index} className={styles.barItem}>
                  <div className={styles.barWrapper}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${(day.questionsAnswered / maxQuestions) * 100}%`,
                        backgroundColor: 'var(--color-primary)',
                      }}
                    >
                      <span className={styles.barValue}>{day.questionsAnswered}</span>
                    </div>
                  </div>
                  <span className={styles.barLabel}>
                    {new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 正确率折线图 */}
        <Col xs={24} md={12}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <LineChartOutlined className={styles.chartIcon} />
              <Title level={5}>正确率趋势</Title>
            </div>
            <div className={styles.lineChart}>
              <div className={styles.lineChartArea}>
                {/* Y轴刻度 */}
                <div className={styles.yAxis}>
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>
                {/* 数据点和线 */}
                <div className={styles.lineChartContent}>
                  <svg className={styles.lineSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* 背景网格线 */}
                    <line x1="0" y1="25" x2="100" y2="25" className={styles.gridLine} />
                    <line x1="0" y1="50" x2="100" y2="50" className={styles.gridLine} />
                    <line x1="0" y1="75" x2="100" y2="75" className={styles.gridLine} />
                    
                    {/* 折线 */}
                    <polyline
                      className={styles.dataLine}
                      points={recentActivity
                        .slice(0, 7)
                        .reverse()
                        .map((d, i) => `${(i / 6) * 100},${100 - d.accuracy}`)
                        .join(' ')}
                    />
                    
                    {/* 数据点 */}
                    {recentActivity.slice(0, 7).reverse().map((d, i) => (
                      <circle
                        key={i}
                        cx={`${(i / 6) * 100}`}
                        cy={`${100 - d.accuracy}`}
                        r="3"
                        className={styles.dataPoint}
                      />
                    ))}
                  </svg>
                </div>
              </div>
              {/* X轴标签 */}
              <div className={styles.xAxis}>
                {recentActivity.slice(0, 7).reverse().map((day, index) => (
                  <span key={index}>
                    {new Date(day.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* 科目分布饼图 */}
        <Col xs={24} md={12}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <PieChartOutlined className={styles.chartIcon} />
              <Title level={5}>科目练习分布</Title>
            </div>
            <div className={styles.pieChart}>
              <div className={styles.pieWrapper}>
                {/* 简化的圆环图 */}
                <svg viewBox="0 0 36 36" className={styles.pieSvg}>
                  {subjectMastery.slice(0, 5).map((subject, index, arr) => {
                    const total = arr.reduce((sum, s) => sum + s.totalQuestions, 0)
                    const percentage = (subject.totalQuestions / total) * 100
                    const previousPercentages = arr
                      .slice(0, index)
                      .reduce((sum, s) => sum + (s.totalQuestions / total) * 100, 0)
                    
                    return (
                      <circle
                        key={subject.subjectId}
                        className={styles.pieSegment}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={getSubjectColor(subject.subjectId)}
                        strokeWidth="3"
                        strokeDasharray={`${percentage} ${100 - percentage}`}
                        strokeDashoffset={`${25 - previousPercentages}`}
                      />
                    )
                  })}
                </svg>
                <div className={styles.pieCenter}>
                  <span className={styles.pieTotalNumber}>
                    {subjectMastery.reduce((sum, s) => sum + s.totalQuestions, 0)}
                  </span>
                  <span className={styles.pieTotalLabel}>总题数</span>
                </div>
              </div>
              <div className={styles.pieLegend}>
                {subjectMastery.slice(0, 5).map((subject) => (
                  <div key={subject.subjectId} className={styles.legendItem}>
                    <span
                      className={styles.legendColor}
                      style={{ backgroundColor: getSubjectColor(subject.subjectId) }}
                    />
                    <span className={styles.legendName}>{subject.subjectName}</span>
                    <span className={styles.legendValue}>{subject.totalQuestions}题</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* 科目掌握度条形图 */}
        <Col xs={24} md={12}>
          <Card className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <BarChartOutlined className={styles.chartIcon} />
              <Title level={5}>科目掌握度</Title>
            </div>
            <div className={styles.horizontalBarChart}>
              {subjectMastery.slice(0, 5).map((subject) => (
                <div key={subject.subjectId} className={styles.horizontalBarItem}>
                  <div className={styles.horizontalBarLabel}>
                    <span>{subject.subjectName}</span>
                    <span className={styles.horizontalBarValue}>{subject.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className={styles.horizontalBarTrack}>
                    <div
                      className={styles.horizontalBarFill}
                      style={{
                        width: `${subject.accuracy}%`,
                        backgroundColor: getSubjectColor(subject.subjectId),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default LearningChart




