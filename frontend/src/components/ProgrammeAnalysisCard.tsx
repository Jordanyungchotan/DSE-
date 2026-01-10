/**
 * 专业分析结果卡片组件
 * 
 * 展示每个专业的详细分析信息：
 * - 用户计算总分
 * - 该专业5年中位数
 * - 相对位置标签
 * - 使用了哪些科目参与计算
 * - mappingConfidence 提示说明
 */

import { useState } from 'react'
import {
  Card,
  Tag,
  Tooltip,
  Collapse,
  Row,
  Col,
  Typography,
  Table,
  Progress,
  Alert,
  Divider,
  Space,
  Badge,
} from 'antd'
import {
  TrophyOutlined,
  InfoCircleOutlined,
  LineChartOutlined,
  BookOutlined,
  CalculatorOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import {
  type ProgrammeAnalysisResultV2,
  type ScoreBreakdownItem,
  getMatchLevelConfig,
  getRecommendationLevelConfig,
  getRelativePositionLabel,
  getMappingConfidenceInfo,
} from '../services/jupasApi'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

interface ProgrammeAnalysisCardProps {
  result: ProgrammeAnalysisResultV2
  isEnglish?: boolean
  showDetails?: boolean
}

/** 科目名称映射 */
const SUBJECT_NAMES: Record<string, { zh: string; en: string }> = {
  english: { zh: '英文', en: 'English' },
  chinese: { zh: '中文', en: 'Chinese' },
  math: { zh: '数学', en: 'Math' },
  citizenship: { zh: '公民', en: 'Citizenship' },
  physics: { zh: '物理', en: 'Physics' },
  chemistry: { zh: '化学', en: 'Chemistry' },
  biology: { zh: '生物', en: 'Biology' },
  economics: { zh: '经济', en: 'Economics' },
  geography: { zh: '地理', en: 'Geography' },
  history: { zh: '历史', en: 'History' },
  ict: { zh: 'ICT', en: 'ICT' },
  m1: { zh: 'M1', en: 'M1' },
  m2: { zh: 'M2', en: 'M2' },
  bafs: { zh: '企会财', en: 'BAFS' },
}

/** 获取科目显示名称 */
function getSubjectName(code: string, isEnglish: boolean): string {
  const name = SUBJECT_NAMES[code.toLowerCase()]
  return name ? (isEnglish ? name.en : name.zh) : code
}

/** 获取类型标签颜色 */
function getTypeColor(type: ScoreBreakdownItem['type']): string {
  switch (type) {
    case 'required': return '#1890ff'
    case 'best': return '#52c41a'
    case 'bonus': return '#faad14'
    default: return '#bfbfbf'
  }
}

/** 获取类型标签文字 */
function getTypeLabel(type: ScoreBreakdownItem['type'], isEnglish: boolean): string {
  switch (type) {
    case 'required': return isEnglish ? 'Required' : '必修加权'
    case 'best': return isEnglish ? 'Best N' : '最佳科目'
    case 'bonus': return isEnglish ? 'Bonus' : '加分'
    default: return type
  }
}

/** 获取趋势图标 */
function getTrendIcon(trend: string) {
  switch (trend) {
    case 'rising': return <ArrowUpOutlined style={{ color: '#ff4d4f' }} />
    case 'falling': return <ArrowDownOutlined style={{ color: '#52c41a' }} />
    case 'stable': return <MinusOutlined style={{ color: '#faad14' }} />
    default: return <QuestionCircleOutlined style={{ color: '#bfbfbf' }} />
  }
}

/** 获取趋势说明 */
function getTrendLabel(trend: string, isEnglish: boolean): string {
  switch (trend) {
    case 'rising': return isEnglish ? 'Rising (more competitive)' : '上升趋势（竞争加剧）'
    case 'falling': return isEnglish ? 'Falling (easier)' : '下降趋势（相对容易）'
    case 'stable': return isEnglish ? 'Stable' : '相对稳定'
    default: return isEnglish ? 'Unknown' : '趋势未知'
  }
}

/**
 * 专业分析结果卡片
 */
export const ProgrammeAnalysisCard: React.FC<ProgrammeAnalysisCardProps> = ({
  result,
  isEnglish = false,
  showDetails = true,
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const matchConfig = getMatchLevelConfig(result.match.level, isEnglish)
  const recConfig = getRecommendationLevelConfig(result.recommendation.level, isEnglish)
  const positionConfig = getRelativePositionLabel(result.relative_position.position, isEnglish)
  const mappingInfo = getMappingConfidenceInfo(result.score.grade_mapping_used, isEnglish)
  
  // 5年中位数平均
  const validMedians = result.historical.filter(h => h.median !== null).map(h => h.median!)
  const avgMedian = validMedians.length > 0 
    ? Math.round(validMedians.reduce((a, b) => a + b, 0) / validMedians.length * 10) / 10
    : null
  
  return (
    <Card
      className="programme-analysis-card"
      style={{
        marginBottom: 16,
        borderLeft: `4px solid ${matchConfig.color}`,
      }}
    >
      {/* 卡片头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          {/* 排名和推荐标签 */}
          <Space size={8} style={{ marginBottom: 8 }}>
            <Badge 
              count={result.recommendation.rank} 
              style={{ backgroundColor: recConfig.color }}
            />
            <Tag color={recConfig.color}>
              {recConfig.icon} {recConfig.label}
            </Tag>
            <Tag color={matchConfig.color}>
              {matchConfig.label}
            </Tag>
          </Space>
          
          {/* 专业名称 */}
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            {isEnglish ? result.programme_name_en : result.programme_name_zh}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>
            {result.programme_code} · {result.university_name_zh}
          </div>
        </div>
        
        {/* 相对位置标签 */}
        <Tooltip title={result.relative_position.explanation}>
          <Tag 
            color={positionConfig.color}
            style={{ fontSize: 14, padding: '4px 12px', cursor: 'help' }}
          >
            {positionConfig.icon} {positionConfig.label}
          </Tag>
        </Tooltip>
      </div>
      
      {/* 核心数据展示 */}
      <Row gutter={[24, 16]} style={{ marginBottom: 16 }}>
        {/* 你的分数 */}
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: '12px', background: '#f0f5ff', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              <CalculatorOutlined /> {isEnglish ? 'Your Score' : '你的分数'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>
              {result.score.weighted_score}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {isEnglish ? 'Weighted' : '加权后'}
            </div>
          </div>
        </Col>
        
        {/* 5年中位数 */}
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: '12px', background: '#fffbe6', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              <LineChartOutlined /> {isEnglish ? '5yr Median' : '5年中位数'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>
              {avgMedian ?? 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {result.relative_position.details.trend !== 'unknown' && (
                <span>
                  {getTrendIcon(result.relative_position.details.trend)}
                  {' '}
                  {getTrendLabel(result.relative_position.details.trend, isEnglish)}
                </span>
              )}
            </div>
          </div>
        </Col>
        
        {/* 差距 */}
        <Col xs={12} sm={6}>
          <div style={{ 
            textAlign: 'center', 
            padding: '12px', 
            background: result.comparison?.difference_from_median && result.comparison.difference_from_median >= 0 
              ? '#f6ffed' : '#fff2f0',
            borderRadius: 8 
          }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              {isEnglish ? 'Difference' : '与中位数差距'}
            </div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: result.comparison?.difference_from_median && result.comparison.difference_from_median >= 0 
                ? '#52c41a' : '#ff4d4f'
            }}>
              {result.comparison?.difference_from_median !== null 
                ? `${result.comparison.difference_from_median >= 0 ? '+' : ''}${result.comparison.difference_from_median.toFixed(1)}`
                : 'N/A'
              }
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {isEnglish ? 'points' : '分'}
            </div>
          </div>
        </Col>
        
        {/* Best 5 参考 */}
        <Col xs={12} sm={6}>
          <div style={{ textAlign: 'center', padding: '12px', background: '#f5f5f5', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
              <BookOutlined /> Best 5
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#666' }}>
              {result.score.raw_best5}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {isEnglish ? 'Reference' : '参考值'}
            </div>
          </div>
        </Col>
      </Row>
      
      {/* 推荐原因 */}
      <Alert
        message={result.recommendation.reason}
        type={result.recommendation.level === 'high' ? 'success' : 
              result.recommendation.level === 'medium' ? 'warning' : 'info'}
        showIcon
        icon={result.recommendation.level === 'high' ? <CheckCircleOutlined /> : 
              result.recommendation.level === 'medium' ? <InfoCircleOutlined /> : <WarningOutlined />}
        style={{ marginBottom: 16 }}
      />
      
      {/* 可信度提示 */}
      <div style={{ 
        background: '#fafafa', 
        padding: '8px 12px', 
        borderRadius: 4,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <Tooltip title={mappingInfo.description}>
          <Tag color={mappingInfo.color} style={{ cursor: 'help' }}>
            <InfoCircleOutlined /> {mappingInfo.label}
          </Tag>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {result.score.formula_description}
        </Text>
      </div>
      
      {/* 警告信息 */}
      {result.score.warnings.length > 0 && (
        <Alert
          message={isEnglish ? 'Notes' : '注意事项'}
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {result.score.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* 详细信息折叠面板 */}
      {showDetails && (
        <Collapse 
          ghost 
          onChange={(keys) => setExpanded(keys.includes('details'))}
        >
          <Panel 
            header={
              <span style={{ color: '#1890ff' }}>
                {isEnglish ? 'View Calculation Details' : '查看计算详情'} 
                ({result.score.breakdown.length} {isEnglish ? 'subjects used' : '科目参与计算'})
              </span>
            } 
            key="details"
          >
            {/* 科目分数明细表 */}
            <Table
              dataSource={result.score.breakdown}
              rowKey={(_, i) => String(i)}
              size="small"
              pagination={false}
              columns={[
                {
                  title: isEnglish ? 'Subject' : '科目',
                  dataIndex: 'subject',
                  render: (subject: string) => getSubjectName(subject, isEnglish),
                  width: 100,
                },
                {
                  title: isEnglish ? 'Grade' : '等级',
                  dataIndex: 'rawGrade',
                  width: 60,
                  align: 'center',
                  render: (grade: string) => <Tag>{grade}</Tag>,
                },
                {
                  title: isEnglish ? 'Score' : '分数',
                  dataIndex: 'mappedScore',
                  width: 60,
                  align: 'center',
                },
                {
                  title: isEnglish ? 'Weight' : '权重',
                  dataIndex: 'weight',
                  width: 60,
                  align: 'center',
                  render: (w: number) => w !== 1 ? <Text strong>×{w}</Text> : '×1',
                },
                {
                  title: isEnglish ? 'Weighted' : '加权分',
                  dataIndex: 'weightedScore',
                  width: 80,
                  align: 'center',
                  render: (s: number) => <Text strong style={{ color: '#1890ff' }}>{s}</Text>,
                },
                {
                  title: isEnglish ? 'Type' : '类型',
                  dataIndex: 'type',
                  width: 90,
                  render: (type: ScoreBreakdownItem['type']) => (
                    <Tag color={getTypeColor(type)} style={{ fontSize: 11 }}>
                      {getTypeLabel(type, isEnglish)}
                    </Tag>
                  ),
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>{isEnglish ? 'Total Weighted Score' : '加权总分'}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} colSpan={2}>
                    <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                      {result.score.weighted_score}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            
            <Divider style={{ margin: '16px 0' }} />
            
            {/* 5年历史数据 */}
            <div style={{ marginBottom: 12 }}>
              <Text strong>
                <HistoryOutlined /> {isEnglish ? '5-Year Historical Data' : '5年历史数据'}
              </Text>
            </div>
            
            <Row gutter={[8, 8]}>
              {result.historical.map((h) => (
                <Col key={h.year} xs={12} sm={4}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '8px', 
                    background: '#fafafa', 
                    borderRadius: 4,
                    border: h.year === result.historical[0]?.year ? '1px solid #1890ff' : 'none'
                  }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{h.year}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {h.median ?? '-'}
                    </div>
                    {h.lower_quartile && (
                      <div style={{ fontSize: 10, color: '#999' }}>
                        LQ: {h.lower_quartile}
                      </div>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
            
            {/* 相对位置详细说明 */}
            <Divider style={{ margin: '16px 0' }} />
            <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
              {result.relative_position.explanation}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {result.relative_position.historical_summary}
            </Text>
          </Panel>
        </Collapse>
      )}
    </Card>
  )
}

export default ProgrammeAnalysisCard
