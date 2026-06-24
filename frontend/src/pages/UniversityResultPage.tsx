import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Spin,
  Alert,
  Badge,
  Tooltip,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  BulbOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { apiFetch } from '../config/api'
import { useLanguageStore } from '../stores/languageStore'
import { UNIVERSITY_NAMES, ProgrammeMatchResult } from '../services/jupasApi'
import styles from './UniversityResultPage.module.css'

const { Title, Text, Paragraph } = Typography

interface JupasFullResult {
  student_profile: {
    best5: number
    best6: number
    subjectScores: Record<string, number>
  }
  matched_programmes: ProgrammeMatchResult[]
  scoring_summary: {
    total_matched: number
    weighted_calculated: number
    base_only: number
    meets_median_count: number
  }
  ai_report: string
  generated_at: string
}

/**
 * 大学申请分析结果页面 - 查看历史记录
 */
const UniversityResultPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const isEnglish = language === 'en'
  const [result, setResult] = useState<JupasFullResult | null>(null)
  const [createdAt, setCreatedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadResult = async () => {
      if (!id) return
      
      try {
        const response = await apiFetch(`/api/analysis/result/${id}`)
        if (!response.ok) {
          throw new Error('无法加载分析结果')
        }
        const data = await response.json()
        const record = data.result || data.data
        
        // 解析 fullResult
        if (record?.fullResult) {
          const parsed = typeof record.fullResult === 'string' 
            ? JSON.parse(record.fullResult) 
            : record.fullResult
          setResult(parsed)
          setCreatedAt(record.createdAt || record.created_at || '')
        } else if (record?.full_result) {
          const parsed = typeof record.full_result === 'string'
            ? JSON.parse(record.full_result)
            : record.full_result
          setResult(parsed)
          setCreatedAt(record.created_at || record.createdAt || '')
        } else {
          setError('此分析记录的详细数据不可用（旧版记录未保存完整数据）')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="正在加载分析结果..." />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px' }}>
        <Alert
          type="warning"
          message="无法显示完整报告"
          description={error || '此记录的详细数据不可用。请重新进行分析。'}
          showIcon
          action={
            <Button onClick={() => navigate('/analysis/university')} type="primary">
              重新分析
            </Button>
          }
        />
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)} 
          style={{ marginTop: 16 }}
        >
          返回
        </Button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* 操作栏 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        返回
      </Button>

      {/* 成功提示 */}
      <Alert
        message={isEnglish ? 'AI Analysis Complete!' : 'AI 分析完成！'}
        description={isEnglish 
          ? `Found ${result.matched_programmes.length} matching programmes for you.`
          : `已为您匹配到 ${result.matched_programmes.length} 个适合的课程。`}
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* 学生档案摘要 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: 12 }}>{isEnglish ? 'Best 5' : '最佳5科'}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{result.student_profile.best5}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: 12 }}>{isEnglish ? 'Best 6' : '最佳6科'}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{result.student_profile.best6}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: 12 }}>{isEnglish ? 'Matched' : '匹配课程'}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1890ff' }}>{result.matched_programmes.length}</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: 12 }}>{isEnglish ? 'Generated' : '生成时间'}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1890ff', marginTop: 8 }}>
                {createdAt ? new Date(createdAt).toLocaleDateString() : new Date(result.generated_at).toLocaleDateString()}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 匹配课程列表 */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#faad14' }} />
            <span>{isEnglish ? 'Top Matched Programmes' : '匹配度最高的课程'}</span>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {result.matched_programmes.slice(0, 5).map((prog, index) => {
            const displayScore = prog.weightedScore ?? prog.baseScore
            const uniName = UNIVERSITY_NAMES[prog.university]
              ? (isEnglish ? UNIVERSITY_NAMES[prog.university].en : UNIVERSITY_NAMES[prog.university].zh)
              : prog.university.toUpperCase()
            const recommendation = prog.meetsMedian === true && (prog.medianGap ?? 0) >= 3 ? 'safe'
              : prog.meetsMedian === true ? 'match'
              : 'reach'
            const matchScore = prog.medianScore != null 
              ? Math.min(99, Math.max(30, Math.round(50 + (prog.medianGap ?? 0) * 5)))
              : Math.min(99, Math.max(30, Math.round(displayScore * 3)))
            const academicScore = prog.medianScore != null
              ? Math.min(99, Math.max(25, Math.round(displayScore / prog.medianScore * 100)))
              : matchScore

            return (
              <div 
                key={prog.programmeCode} 
                style={{
                  border: '1px solid #f0f0f0',
                  borderLeft: `4px solid ${recommendation === 'safe' ? '#52c41a' : recommendation === 'match' ? '#faad14' : '#1890ff'}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Badge 
                    count={index + 1} 
                    style={{ 
                      backgroundColor: recommendation === 'safe' ? '#52c41a' : 
                                       recommendation === 'match' ? '#faad14' : '#ff4d4f' 
                    }} 
                  />
                  <Tag color={
                    recommendation === 'safe' ? 'success' : 
                    recommendation === 'match' ? 'warning' : 'error'
                  }>
                    {recommendation === 'safe' ? '保底' :
                     recommendation === 'match' ? '目标' : '冲刺'}
                  </Tag>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{prog.programmeName}</div>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>{uniName} · {prog.programmeCode}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                  <Tooltip title={isEnglish ? 'Overall Match' : '综合匹配度'}>
                    <span>🎯 {matchScore}%</span>
                  </Tooltip>
                  <Tooltip title={isEnglish ? 'Academic Match' : '成绩匹配度'}>
                    <span>📚 {academicScore}%</span>
                  </Tooltip>
                  {prog.medianScore != null && (
                    <Tooltip title={isEnglish ? 'Median Score' : '历年中位数'}>
                      <span>📊 {prog.medianScore}</span>
                    </Tooltip>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 详细分析报告 */}
      {result.ai_report && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BulbOutlined style={{ color: '#1890ff' }} />
              <span>{isEnglish ? 'Detailed Analysis Report' : '详细分析报告'}</span>
            </div>
          }
          style={{ marginBottom: 24 }}
        >
          <div style={{ lineHeight: 1.8 }}>
            <Paragraph>
              {result.ai_report.split('\n').map((line, index) => {
                if (line.startsWith('## ')) {
                  return <h3 key={index} style={{ marginTop: 16, marginBottom: 8, color: '#1a1a1a' }}>{line.replace('## ', '')}</h3>
                }
                if (line.startsWith('### ')) {
                  return <h4 key={index} style={{ marginTop: 12, marginBottom: 6, color: '#333' }}>{line.replace('### ', '')}</h4>
                }
                if (line.startsWith('#### ')) {
                  return <h5 key={index} style={{ marginTop: 8, marginBottom: 4 }}>{line.replace('#### ', '')}</h5>
                }
                if (line.includes('**')) {
                  const parts = line.split(/\*\*([^*]+)\*\*/)
                  return (
                    <p key={index} style={{ margin: '4px 0' }}>
                      {parts.map((part, i) => 
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </p>
                  )
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return <li key={index} style={{ marginLeft: 16, marginBottom: 4 }}>{line.substring(2)}</li>
                }
                if (/^\d+\.\s/.test(line)) {
                  return <li key={index} style={{ marginLeft: 16, marginBottom: 4 }}>{line.replace(/^\d+\.\s/, '')}</li>
                }
                if (!line.trim()) {
                  return <br key={index} />
                }
                return <p key={index} style={{ margin: '4px 0' }}>{line}</p>
              })}
            </Paragraph>
          </div>
        </Card>
      )}

      {/* 免责声明 */}
      <Alert
        message={isEnglish ? 'Disclaimer' : '免责声明'}
        description="本分析基于 JUPAS 公开数据计算，仅供参考，不构成录取保证。实际录取受面试、推荐信等多种因素影响。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 重新分析按钮 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Button 
          type="primary" 
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => navigate('/analysis/university')}
        >
          {isEnglish ? 'Start New Analysis' : '开始新的分析'}
        </Button>
      </div>
    </div>
  )
}

export default UniversityResultPage
