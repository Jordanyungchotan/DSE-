/**
 * 插班分析结果页面 V2
 * 
 * 专用于展示 TransferAnalysisResultV2 结构
 * ⚠️ 不复用 ResultPage（JUPAS）
 * ⚠️ 所有 map() 前必须保证数组存在
 */

import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, 
  Typography, 
  Tag, 
  List, 
  Spin, 
  Button, 
  Alert, 
  Progress,
  Row,
  Col,
  Empty,
  Space,
  Divider,
  Collapse,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  BookOutlined,
  RocketOutlined,
  SafetyOutlined,
  StarOutlined,
  BulbOutlined,
  CalendarOutlined,
  FileTextOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useAnalysisStore } from '../stores/analysisStore'
import type { 
  CapabilityAnalysis, 
  SchoolAssessment, 
  TransitionPlan,
  TransferSummary,
  ExternalDataVerification,
  DataGapExplanation,
} from '../types/transferAnalysisV2'
import styles from './TransferResultPage.module.css'

const { Title, Text, Paragraph } = Typography

// 可行性等级配置
const LEVEL_CONFIG = {
  '稳妥': {
    color: '#52c41a',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
    icon: <CheckCircleOutlined />,
    emoji: '🌟',
    progressColor: '#52c41a',
  },
  '可尝试': {
    color: '#1890ff',
    bgColor: '#e6f7ff',
    borderColor: '#91d5ff',
    icon: <ExclamationCircleOutlined />,
    emoji: '💪',
    progressColor: '#1890ff',
  },
  '高风险': {
    color: '#ff4d4f',
    bgColor: '#fff2f0',
    borderColor: '#ffccc7',
    icon: <WarningOutlined />,
    emoji: '⚠️',
    progressColor: '#ff4d4f',
  },
}

// 能力等级配置
const CAPABILITY_LEVEL_CONFIG = {
  '强': { color: 'success', icon: <StarOutlined /> },
  '中': { color: 'processing', icon: <CheckCircleOutlined /> },
  '弱': { color: 'warning', icon: <ExclamationCircleOutlined /> },
}

// 风险等级配置
const RISK_LEVEL_CONFIG = {
  '低': { color: '#52c41a', tagColor: 'success' },
  '中': { color: '#faad14', tagColor: 'warning' },
  '高': { color: '#ff4d4f', tagColor: 'error' },
}

// 推荐类型配置
const RECOMMENDATION_CONFIG = {
  '保底': { color: 'success', text: '保底' },
  '目标': { color: 'processing', text: '目标' },
  '冲刺': { color: 'warning', text: '冲刺' },
}

// 能力维度中文名
const DIMENSION_NAMES: Record<string, string> = {
  'English': '英语能力',
  'Math': '数学能力',
  'AcademicFoundation': '学术基础',
  'LearningAdaptability': '学习适应能力',
  'DisciplineFit': '校风契合度',
}

const TransferResultPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()
  
  const { 
    transferResultV2, 
    loading, 
    error, 
    loadTransferResultV2 
  } = useAnalysisStore()

  useEffect(() => {
    if (analysisId) {
      loadTransferResultV2(analysisId).catch(console.error)
    }
  }, [analysisId, loadTransferResultV2])

  // 【强制】进阶分析未启用时显示用户提示
  useEffect(() => {
    if (transferResultV2 && !transferResultV2.aiEnabled) {
      message.warning({
        content: '当前显示的是基础规则分析，进阶分析暂未启用',
        duration: 5,
        key: 'ai-not-enabled',
      })
    }
  }, [transferResultV2])

  // 加载中
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="正在加载分析结果..." />
      </div>
    )
  }

  // 错误或无数据
  if (error || !transferResultV2) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          type="error"
          message="加载失败"
          description={error || '未找到分析记录'}
          showIcon
          action={
            <Button onClick={() => navigate('/analysis')}>
              返回重新分析
            </Button>
          }
        />
      </div>
    )
  }

  const { summary, capabilityAnalyses, schoolAssessments, transitionPlan, meta, aiEnabled, externalDataVerification } = transferResultV2
  const levelConfig = LEVEL_CONFIG[summary.overallLevel] || LEVEL_CONFIG['可尝试']

  // 渲染综合评估
  const renderSummary = (summaryData: TransferSummary) => (
    <Card className={styles.overviewCard}>
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} md={8}>
          <div 
            className={styles.levelBadge}
            style={{ 
              backgroundColor: levelConfig.bgColor,
              borderColor: levelConfig.borderColor,
            }}
          >
            <div className={styles.levelEmoji}>{levelConfig.emoji}</div>
            <div 
              className={styles.levelScore}
              style={{ color: levelConfig.color }}
            >
              {summaryData.feasibilityScore}
            </div>
            <div className={styles.levelTitle}>{summaryData.overallLevel}</div>
          </div>
        </Col>
        
        <Col xs={24} md={16}>
          <div className={styles.overviewInfo}>
            <Title level={4}>
              {aiEnabled ? '📊 综合分析' : '📊 规则分析'}
            </Title>
            
            <Progress 
              percent={summaryData.feasibilityScore} 
              strokeColor={levelConfig.progressColor}
              format={(percent) => `${percent}分`}
            />
            
            <div className={styles.metaInfo}>
              <Text type="secondary">
                分析时间：{new Date(meta.generatedAt).toLocaleString('zh-CN')}
              </Text>
              <Tag color="blue">版本 {meta.version}</Tag>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  )

  // 渲染优势与风险
  const renderStrengthsAndRisks = (summaryData: TransferSummary) => (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Card 
          title={<><StarOutlined style={{ color: '#52c41a' }} /> 主要优势</>}
          className={styles.sectionCard}
        >
          {summaryData.keyAdvantages && summaryData.keyAdvantages.length > 0 ? (
            <List
              dataSource={summaryData.keyAdvantages}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无数据" />
          )}
        </Card>
      </Col>
      
      <Col xs={24} md={12}>
        <Card 
          title={<><WarningOutlined style={{ color: '#faad14' }} /> 主要风险</>}
          className={styles.sectionCard}
        >
          {summaryData.keyRisks && summaryData.keyRisks.length > 0 ? (
            <List
              dataSource={summaryData.keyRisks}
              renderItem={(item) => (
                <List.Item>
                  <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无数据" />
          )}
        </Card>
      </Col>
    </Row>
  )

  // 渲染决策依据和分析贡献（Explainability）
  const renderDecisionBasis = (summaryData: TransferSummary) => (
    <Row gutter={[16, 16]}>
      {/* 📌 决策依据（规则引擎解释） */}
      <Col xs={24} md={aiEnabled && summaryData.aiContribution ? 12 : 24}>
        <Card 
          title={<><FileTextOutlined style={{ color: '#1890ff' }} /> 决策依据</>}
          className={styles.sectionCard}
        >
          {summaryData.decisionBasis && summaryData.decisionBasis.length > 0 ? (
            <List
              dataSource={summaryData.decisionBasis}
              renderItem={(item, index) => (
                <List.Item>
                  <Text type="secondary" style={{ marginRight: 8 }}>#{index + 1}</Text>
                  {item}
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无决策依据数据" />
          )}
          <div style={{ marginTop: 12 }}>
            <Tag color="blue">📊 规则分析</Tag>
          </div>
        </Card>
      </Col>
      
      {/* 📊 分析增强说明（仅 aiEnabled === true 时显示） */}
      {aiEnabled && summaryData.aiContribution && summaryData.aiContribution.length > 0 && (
        <Col xs={24} md={12}>
          <Card 
            title={<><BulbOutlined style={{ color: '#722ed1' }} /> 分析增强说明</>}
            className={styles.sectionCard}
          >
            <List
              dataSource={summaryData.aiContribution}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                  {item}
                </List.Item>
              )}
            />
            <div style={{ marginTop: 12 }}>
              <Tag color="purple">📊 分析贡献</Tag>
            </div>
          </Card>
        </Col>
      )}
    </Row>
  )

  // 渲染能力分析
  const renderCapabilityAnalyses = (analyses: CapabilityAnalysis[]) => (
    <Card 
      title={<><BookOutlined /> 能力维度分析</>}
      className={styles.sectionCard}
    >
      {analyses && analyses.length > 0 ? (
        <div className={styles.capabilityGrid}>
          {analyses.map((analysis, index) => {
            const levelCfg = CAPABILITY_LEVEL_CONFIG[analysis.level] || CAPABILITY_LEVEL_CONFIG['中']
            return (
              <Card 
                key={index}
                size="small"
                className={styles.capabilityCard}
              >
                <div className={styles.capabilityHeader}>
                  <Text strong>{DIMENSION_NAMES[analysis.dimension] || analysis.dimension}</Text>
                  <Tag color={levelCfg.color}>
                    {levelCfg.icon} {analysis.level}
                  </Tag>
                </div>
                <Paragraph type="secondary" className={styles.capabilityDesc}>
                  {analysis.description}
                </Paragraph>
                <div className={styles.capabilityImpact}>
                  <Text type="secondary">影响：</Text>
                  <Text>{analysis.impact}</Text>
                </div>
                <div className={styles.capabilitySuggestion}>
                  <BulbOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                  {analysis.suggestion}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty description="暂无能力分析数据" />
      )}
    </Card>
  )

  // 渲染数据缺口解释（三段式）
  const renderDataGapExplanation = (gap: DataGapExplanation) => (
    <div className={styles.dataGapExplanation}>
      <div className={styles.gapSection}>
        <Text strong style={{ color: '#1890ff' }}>
          <InfoCircleOutlined /> 1️⃣ 为什么缺失
        </Text>
        <Paragraph className={styles.gapText}>{gap.whyMissing}</Paragraph>
      </div>
      
      <div className={styles.gapSection}>
        <Text strong style={{ color: '#faad14' }}>
          <ExclamationCircleOutlined /> 2️⃣ 是否影响判断
        </Text>
        <Paragraph className={styles.gapText}>{gap.impactStatement}</Paragraph>
      </div>
      
      <div className={styles.gapSection}>
        <Text strong style={{ color: '#52c41a' }}>
          <CheckCircleOutlined /> 3️⃣ 您可以做什么
        </Text>
        <ul className={styles.actionList}>
          {(gap.userActions || []).map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ul>
      </div>
    </div>
  )

  // 渲染学校评估
  const renderSchoolAssessments = (assessments: SchoolAssessment[]) => (
    <Card 
      title={<><SafetyOutlined /> 目标学校评估</>}
      className={styles.sectionCard}
    >
      {assessments && assessments.length > 0 ? (
        <div className={styles.schoolGrid}>
          {assessments.map((school, index) => {
            const riskCfg = RISK_LEVEL_CONFIG[school.riskLevel] || RISK_LEVEL_CONFIG['中']
            const recCfg = RECOMMENDATION_CONFIG[school.recommendation] || RECOMMENDATION_CONFIG['目标']
            return (
              <Card 
                key={index}
                size="small"
                className={styles.schoolCard}
              >
                <div className={styles.schoolHeader}>
                  <Text strong>{school.schoolName}</Text>
                  <Space>
                    <Tag color={recCfg.color}>{recCfg.text}</Tag>
                    <Tag color={riskCfg.tagColor}>风险: {school.riskLevel}</Tag>
                  </Space>
                </div>
                
                <div className={styles.schoolMeta}>
                  <Text type="secondary">目标年级：{school.programme}</Text>
                </div>
                
                <Progress 
                  percent={school.matchScore} 
                  size="small"
                  strokeColor={riskCfg.color}
                  format={(percent) => `匹配度 ${percent}%`}
                />

                {/* V2 新增：融合结论（三层信息） - 仅进阶分析启用时显示 */}
                {aiEnabled && school.integratedConclusion && (
                  <div className={styles.integratedConclusion}>
                    <Alert
                      type="info"
                      showIcon
                      icon={<BulbOutlined />}
                      message="综合分析结论"
                      description={school.integratedConclusion}
                      style={{ marginTop: 12, marginBottom: 12 }}
                    />
                  </div>
                )}
                
                {school.requirements && school.requirements.length > 0 && (
                  <div className={styles.schoolSection}>
                    <Text type="secondary">申请要求：</Text>
                    <ul className={styles.schoolList}>
                      {school.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {school.gaps && school.gaps.length > 0 && (
                  <div className={styles.schoolSection}>
                    <Text type="secondary">差距分析：</Text>
                    <ul className={styles.schoolList}>
                      {school.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* V2 新增：数据缺口解释 - 仅进阶分析启用时显示 */}
                {aiEnabled && school.dataGapExplanations && school.dataGapExplanations.length > 0 && (
                  <Collapse 
                    ghost 
                    size="small"
                    items={[{
                      key: 'gaps',
                      label: <Text type="secondary"><SearchOutlined /> 数据说明（为什么某些信息缺失）</Text>,
                      children: school.dataGapExplanations.map((gap, i) => (
                        <div key={i}>
                          {renderDataGapExplanation(gap)}
                          {i < (school.dataGapExplanations?.length || 0) - 1 && <Divider />}
                        </div>
                      ))
                    }]}
                  />
                )}
                
                {school.notes && school.notes.length > 0 && (
                  <div className={styles.schoolNotes}>
                    {school.notes.map((note, i) => (
                      <Tag key={i} color="default">{note}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty description="暂无学校评估数据" />
      )}
    </Card>
  )

  // 渲染外部数据核验结果（V2 新增）
  const renderExternalVerification = (verification: ExternalDataVerification | undefined) => {
    if (!verification || !verification.triggered) return null

    // 数据可用性颜色映射
    const availabilityColors: Record<string, string> = {
      '充分': '#52c41a',
      '有限': '#1890ff',
      '极少': '#faad14',
      '几乎没有': '#ff4d4f',
    }

    // 影响程度颜色映射
    const impactColors: Record<string, string> = {
      '不影响': '#52c41a',
      '轻微影响': '#faad14',
      '明显影响': '#ff4d4f',
    }

    const availabilityColor = availabilityColors[verification.dataAvailability || '有限']
    const impactColor = impactColors[verification.impactOnAssessment || '轻微影响']

    return (
      <Card 
        title={<><GlobalOutlined /> 外部数据核验</>}
        className={styles.sectionCard}
        extra={
          <Space>
            <Tag color="blue">数据可用性</Tag>
            <Tag 
              style={{ 
                color: availabilityColor, 
                borderColor: availabilityColor,
                backgroundColor: `${availabilityColor}10`
              }}
            >
              {verification.dataAvailability || '有限'}
            </Tag>
          </Space>
        }
      >
        {/* 核验原因 */}
        {verification.triggerReasons && verification.triggerReasons.length > 0 && (
          <div className={styles.verificationSection}>
            <Text strong>核验触发原因：</Text>
            <div style={{ marginTop: 8 }}>
              {verification.triggerReasons.map((reason, i) => (
                <Tag key={i} color="default" style={{ marginBottom: 4 }}>{reason}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* 公开信息发现 */}
        {verification.publicFindings && verification.publicFindings.length > 0 && (
          <div className={styles.verificationSection}>
            <Text strong><SearchOutlined /> 公开信息发现：</Text>
            <List
              size="small"
              dataSource={verification.publicFindings}
              renderItem={(item) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <Text>• {item}</Text>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 现实推断结论 */}
        {verification.realityInference && (
          <div className={styles.verificationSection}>
            <Alert
              type="info"
              showIcon
              icon={<BulbOutlined />}
              message="现实综合判断"
              description={verification.realityInference}
            />
          </div>
        )}

        {/* 对评估的影响 */}
        <div className={styles.verificationSection}>
          <Text strong>对当前评估的影响：</Text>
          <Tag 
            style={{ 
              marginLeft: 8,
              color: impactColor, 
              borderColor: impactColor,
              backgroundColor: `${impactColor}10`
            }}
          >
            {verification.impactOnAssessment || '轻微影响'}
          </Tag>
        </div>

        {/* 建议行动 */}
        {verification.recommendedActions && verification.recommendedActions.length > 0 && (
          <div className={styles.verificationSection}>
            <Text strong><RocketOutlined /> 建议行动：</Text>
            <List
              size="small"
              dataSource={verification.recommendedActions}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '4px 0' }}>
                  <Text><Tag color="green">{index + 1}</Tag> {item}</Text>
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>
    )
  }

  // 渲染综合现实结论（V2 新增）
  const renderIntegratedRealityConclusion = (summaryData: TransferSummary) => {
    if (!summaryData.integratedRealityConclusion) return null

    return (
      <Card 
        className={styles.realityConclusionCard}
        style={{ 
          background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
          border: '1px solid #91d5ff',
          marginBottom: 16
        }}
      >
        <div className={styles.realityConclusion}>
          <Title level={5}>
            <BulbOutlined style={{ color: '#1890ff', marginRight: 8 }} />
            综合现实结论
          </Title>
          <Paragraph style={{ marginBottom: 0, fontSize: 14 }}>
            {summaryData.integratedRealityConclusion}
          </Paragraph>
        </div>
      </Card>
    )
  }

  // 渲染过渡计划
  const renderTransitionPlan = (plan: TransitionPlan) => (
    <Card 
      title={<><CalendarOutlined /> 过渡计划</>}
      className={styles.sectionCard}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" title="📅 短期计划（1-2个月）" className={styles.planCard}>
            {plan.shortTerm && plan.shortTerm.length > 0 ? (
              <List
                size="small"
                dataSource={plan.shortTerm}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text>• {item}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card size="small" title="🎯 中期计划（3-6个月）" className={styles.planCard}>
            {plan.midTerm && plan.midTerm.length > 0 ? (
              <List
                size="small"
                dataSource={plan.midTerm}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text>• {item}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card size="small" title="⚠️ 风险提示" className={styles.planCard}>
            {plan.riskWarnings && plan.riskWarnings.length > 0 ? (
              <List
                size="small"
                dataSource={plan.riskWarnings}
                renderItem={(item) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text type="warning">• {item}</Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </Card>
  )

  return (
    <div className={styles.resultPage}>
      {/* 顶部导航 */}
      <div className={styles.header}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <Button 
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => navigate('/analysis')}
        >
          重新分析
        </Button>
      </div>

      {/* 分析状态显示 - 区分分析级别 */}
      {aiEnabled ? (
        <Alert
          message={<><CheckCircleOutlined /> 进阶分析</>}
          description="本报告包含进阶分析内容：个性化能力分析、过渡计划、外部数据核验"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          message={<><BarChartOutlined /> 基础规则分析</>}
          description="当前为基础规则分析结果。进阶分析暂未启用，部分高级功能（如外部数据核验、个性化建议）不可用。"
          type="warning"
          showIcon
          icon={<BarChartOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 页面标题 */}
      <div className={styles.pageTitle}>
        <Title level={2}>
          {aiEnabled ? '📊 插班综合分析报告' : '📊 规则分析报告'}
        </Title>
        <Text type="secondary">
          分析编号：{transferResultV2.analysisId}
        </Text>
        <div style={{ marginTop: 8 }}>
          {aiEnabled 
            ? <Tag color="green">📊 进阶分析</Tag>
            : <Tag color="orange">📊 基础规则分析</Tag>
          }
        </div>
      </div>

      {/* 1️⃣ 综合评估 */}
      {renderSummary(summary)}

      {/* 1.5️⃣ 综合现实结论（仅进阶分析启用时显示） */}
      {aiEnabled && renderIntegratedRealityConclusion(summary)}

      {/* 2️⃣ 优势与风险 */}
      {renderStrengthsAndRisks(summary)}

      {/* 2.5️⃣ 决策依据与分析贡献（Explainability） */}
      {renderDecisionBasis(summary)}

      {/* 3️⃣ 外部数据核验（仅进阶分析启用时显示） */}
      {aiEnabled && renderExternalVerification(externalDataVerification)}

      {/* 4️⃣ 能力分析 */}
      {renderCapabilityAnalyses(capabilityAnalyses)}

      {/* 5️⃣ 学校评估（含融合结论） */}
      {renderSchoolAssessments(schoolAssessments)}

      {/* 6️⃣ 过渡计划 */}
      {renderTransitionPlan(transitionPlan)}

      {/* 免责声明 */}
      <Alert
        type="warning"
        message="重要提示"
        description="本分析基于公开资料与教育经验模型，仅供参考，不构成任何录取保证。实际录取结果取决于学校当年的具体政策和名额情况。"
        showIcon
        icon={<ExclamationCircleOutlined />}
        className={styles.disclaimer}
      />

      {/* 底部操作 */}
      <div className={styles.footer}>
        <Button 
          type="primary" 
          size="large"
          icon={<RocketOutlined />}
          onClick={() => navigate('/analysis')}
        >
          开始新的分析
        </Button>
      </div>
    </div>
  )
}

export default TransferResultPage
