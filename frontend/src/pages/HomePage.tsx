import { useNavigate } from 'react-router-dom'
import { Button, Card, Row, Col, Typography, Space } from 'antd'
import {
  FormOutlined,
  RocketOutlined,
  BarChartOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import styles from './HomePage.module.css'

const { Title, Paragraph, Text } = Typography

/**
 * 首页组件
 * 展示系统介绍、功能特点和入口按钮
 */
const HomePage = () => {
  const navigate = useNavigate()

  // 功能特点数据
  const features = [
    {
      icon: <RocketOutlined />,
      title: 'AI智能分析',
      description: '采用先进的DeepSeek AI技术，深度分析学生情况，提供精准的插班可行性评估。',
      color: '#2b6cb0',
    },
    {
      icon: <BarChartOutlined />,
      title: '科目诊断',
      description: '全面分析各科目强弱项，识别学习差距，制定针对性提升策略。',
      color: '#38a169',
    },
    {
      icon: <FormOutlined />,
      title: '个性化建议',
      description: '根据目标学校要求，生成专属学习计划和时间规划表。',
      color: '#d69e2e',
    },
    {
      icon: <SafetyOutlined />,
      title: '数据安全',
      description: '严格保护学生隐私，数据加密存储，符合GDPR合规要求。',
      color: '#e53e3e',
    },
  ]

  // 使用步骤数据
  const steps = [
    {
      number: '01',
      title: '填写信息',
      description: '输入插班时间、年级、科目成绩和目标学校',
    },
    {
      number: '02',
      title: 'AI分析',
      description: 'DeepSeek AI深度分析，生成专业评估报告',
    },
    {
      number: '03',
      title: '获取建议',
      description: '查看详细分析结果，下载个性化学习计划',
    },
  ]

  return (
    <div className={styles.homePage}>
      {/* Hero区域 */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <Title level={1} className={styles.heroTitle}>
              <span className="gradient-title">DSE插班分析</span>
              <br />
              <Text className={styles.heroSubtitle}>智能评估系统</Text>
            </Title>
            <Paragraph className={styles.heroDescription}>
              专为香港DSE考生打造的AI智能分析平台。通过先进的人工智能技术，
              深度评估插班可行性，提供个性化的成绩提升建议和学习规划。
            </Paragraph>
            <Space size="large" className={styles.heroButtons}>
              <Button
                type="primary"
                size="large"
                icon={<FormOutlined />}
                onClick={() => navigate('/analysis')}
                className={styles.primaryBtn}
              >
                开始分析
              </Button>
              <Button
                size="large"
                onClick={() => navigate('/history')}
              >
                查看历史记录
              </Button>
            </Space>
          </div>
          
          {/* 装饰图形 */}
          <div className={styles.heroVisual}>
            <div className={styles.decorativeCard}>
              <div className={styles.scorePreview}>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreValue}>85</span>
                  <span className={styles.scoreLabel}>可行性评分</span>
                </div>
                <div className={styles.scoreDetails}>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>英语达标</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>数学优秀</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#d69e2e' }} />
                    <span>中文待提升</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 功能特点 */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>为什么选择我们</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
          <Paragraph className={styles.sectionDesc}>
            专业的DSE升学辅导团队，结合AI技术为您提供最优质的分析服务
          </Paragraph>
        </div>
        
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                className={`${styles.featureCard} fade-in stagger-${index + 1}`}
                hoverable
              >
                <div
                  className={styles.featureIcon}
                  style={{ background: `${feature.color}15`, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <Title level={4}>{feature.title}</Title>
                <Paragraph className={styles.featureDesc}>
                  {feature.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 使用步骤 */}
      <section className={styles.stepsSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>简单三步开始</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} className={`${styles.stepItem} fade-in stagger-${index + 1}`}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepContent}>
                <Title level={4}>{step.title}</Title>
                <Paragraph>{step.description}</Paragraph>
              </div>
              {index < steps.length - 1 && (
                <ArrowRightOutlined className={styles.stepArrow} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA区域 */}
      <section className={styles.ctaSection}>
        <Card className={styles.ctaCard}>
          <Title level={2} style={{ color: 'white' }}>
            准备好开始您的DSE升学规划了吗？
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}>
            立即体验AI智能分析，获取专属的插班建议和学习计划
          </Paragraph>
          <Button
            size="large"
            onClick={() => navigate('/analysis')}
            style={{ 
              background: 'white', 
              color: 'var(--color-primary)',
              fontWeight: 600,
              height: 48,
              paddingInline: 32,
            }}
          >
            免费开始分析 <ArrowRightOutlined />
          </Button>
        </Card>
      </section>
    </div>
  )
}

export default HomePage

