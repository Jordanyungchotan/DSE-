import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Row, Col, Typography, Collapse, Form, Input, Carousel, message, Modal } from 'antd'
import {
  FormOutlined,
  RocketOutlined,
  BarChartOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  BankOutlined,
  TeamOutlined,
  TrophyOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  WechatOutlined,
  FacebookOutlined,
  InstagramOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  UserOutlined,
  FileSearchOutlined,
  ScheduleOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
  BookOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { useLanguageStore } from '../stores/languageStore'
import { apiFetch } from '../config/api'
import styles from './HomePage.module.css'

const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

/**
 * 首页组件 - 质心DSE升学分析系统完整介绍页面
 */
const HomePage = () => {
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [wechatModalVisible, setWechatModalVisible] = useState(false)

  // 社交媒体链接
  const socialLinks = {
    googleMaps: 'https://maps.app.goo.gl/jyDjPeBWYumwvfsMA',
    facebook: 'https://www.facebook.com/zhixinhk',
    instagram: 'https://www.instagram.com/centerofmass_hk/',
  }

  // 提交咨询表单
  const handleInquirySubmit = async (values: { name: string; phone?: string; email?: string; message: string }) => {
    setSubmitting(true)
    try {
      const response = await apiFetch('/api/inquiry/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error('提交失败')
      }
      
      message.success('咨询提交成功，我们会尽快与您联系！')
      form.resetFields()
    } catch {
      message.error('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 核心功能数据
  const coreFeatures = [
    {
      icon: <BankOutlined />,
      title: t('home.coreFeatures.transfer.title'),
      features: [
        t('home.coreFeatures.transfer.feature1'),
        t('home.coreFeatures.transfer.feature2'),
        t('home.coreFeatures.transfer.feature3'),
      ],
      color: '#2b6cb0',
    },
    {
      icon: <TrophyOutlined />,
      title: t('home.coreFeatures.university.title'),
      features: [
        t('home.coreFeatures.university.feature1'),
        t('home.coreFeatures.university.feature2'),
        t('home.coreFeatures.university.feature3'),
      ],
      color: '#38a169',
    },
    {
      icon: <BarChartOutlined />,
      title: t('home.coreFeatures.data.title'),
      features: [
        t('home.coreFeatures.data.feature1'),
        t('home.coreFeatures.data.feature2'),
        t('home.coreFeatures.data.feature3'),
      ],
      color: '#d69e2e',
    },
  ]

  // 系统优势
  const advantages = [
    {
      icon: <RocketOutlined />,
      title: t('home.advantages.scientific.title'),
      description: t('home.advantages.scientific.desc'),
      color: '#2b6cb0',
    },
    {
      icon: <FormOutlined />,
      title: t('home.advantages.precise.title'),
      description: t('home.advantages.precise.desc'),
      color: '#38a169',
    },
    {
      icon: <ThunderboltOutlined />,
      title: t('home.advantages.smart.title'),
      description: t('home.advantages.smart.desc'),
      color: '#d69e2e',
    },
    {
      icon: <LineChartOutlined />,
      title: t('home.advantages.optimize.title'),
      description: t('home.advantages.optimize.desc'),
      color: '#e53e3e',
    },
  ]

  // 技术特色
  const techFeatures = [
    {
      icon: <RocketOutlined />,
      title: t('home.tech.ai.title'),
      items: [t('home.tech.ai.item1'), t('home.tech.ai.item2'), t('home.tech.ai.item3')],
    },
    {
      icon: <SafetyOutlined />,
      title: t('home.tech.security.title'),
      items: [t('home.tech.security.item1'), t('home.tech.security.item2'), t('home.tech.security.item3')],
    },
    {
      icon: <GlobalOutlined />,
      title: t('home.tech.platform.title'),
      items: [t('home.tech.platform.item1'), t('home.tech.platform.item2'), t('home.tech.platform.item3')],
    },
    {
      icon: <EnvironmentOutlined />,
      title: t('home.tech.local.title'),
      items: [t('home.tech.local.item1'), t('home.tech.local.item2'), t('home.tech.local.item3')],
    },
  ]

  // 使用步骤数据
  const steps = [
    {
      number: '01',
      icon: <FileSearchOutlined />,
      title: t('home.steps.step1.title'),
      description: t('home.steps.step1.desc'),
    },
    {
      number: '02',
      icon: <FormOutlined />,
      title: t('home.steps.step2.title'),
      description: t('home.steps.step2.desc'),
    },
    {
      number: '03',
      icon: <ScheduleOutlined />,
      title: t('home.steps.step3.title'),
      description: t('home.steps.step3.desc'),
    },
    {
      number: '04',
      icon: <CheckCircleOutlined />,
      title: t('home.steps.step4.title'),
      description: t('home.steps.step4.desc'),
    },
  ]

  // 适用人群
  const targetUsers = [
    {
      icon: <UserOutlined />,
      title: t('home.targetUsers.transfer.title'),
      items: [
        t('home.targetUsers.transfer.item1'),
        t('home.targetUsers.transfer.item2'),
        t('home.targetUsers.transfer.item3'),
      ],
    },
    {
      icon: <TrophyOutlined />,
      title: t('home.targetUsers.university.title'),
      items: [
        t('home.targetUsers.university.item1'),
        t('home.targetUsers.university.item2'),
        t('home.targetUsers.university.item3'),
      ],
    },
    {
      icon: <TeamOutlined />,
      title: t('home.targetUsers.parents.title'),
      items: [
        t('home.targetUsers.parents.item1'),
        t('home.targetUsers.parents.item2'),
        t('home.targetUsers.parents.item3'),
      ],
    },
  ]

  // 成功案例
  const successCases = [
    {
      quote: t('home.cases.case1.quote'),
      author: t('home.cases.case1.author'),
      type: t('home.cases.case1.type'),
    },
    {
      quote: t('home.cases.case2.quote'),
      author: t('home.cases.case2.author'),
      type: t('home.cases.case2.type'),
    },
    {
      quote: t('home.cases.case3.quote'),
      author: t('home.cases.case3.author'),
      type: t('home.cases.case3.type'),
    },
  ]

  // FAQ数据
  const faqs = [
    { question: t('home.faq.q1.question'), answer: t('home.faq.q1.answer') },
    { question: t('home.faq.q2.question'), answer: t('home.faq.q2.answer') },
    { question: t('home.faq.q3.question'), answer: t('home.faq.q3.answer') },
    { question: t('home.faq.q4.question'), answer: t('home.faq.q4.answer') },
    { question: t('home.faq.q5.question'), answer: t('home.faq.q5.answer') },
  ]

  // 更新日志
  const updateLog = [
    t('home.updates.current.item1'),
    t('home.updates.current.item2'),
    t('home.updates.current.item3'),
    t('home.updates.current.item4'),
    t('home.updates.current.item5'),
  ]

  const upcomingFeatures = [
    t('home.updates.upcoming.item1'),
    t('home.updates.upcoming.item2'),
    t('home.updates.upcoming.item3'),
    t('home.updates.upcoming.item4'),
  ]

  return (
    <div className={styles.homePage}>
      {/* ===== Hero横幅区域 ===== */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <div className={styles.heroPattern} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              {t('home.heroBadge')}
            </div>
            <Title level={1} className={styles.heroTitle}>
              <span className="gradient-title">{t('system.name')}</span>
            </Title>
            <Title level={3} className={styles.heroSubtitle}>
              {t('home.heroSubtitle')}
            </Title>
            <Paragraph className={styles.heroDescription}>
              {t('home.heroDescription')}
            </Paragraph>
            <div className={styles.heroButtons}>
              <Button
                type="primary"
                size="large"
                icon={<FormOutlined />}
                onClick={() => navigate('/analysis')}
                className={styles.primaryBtn}
              >
                {t('home.startAnalysis')}
              </Button>
              <Button
                size="large"
                icon={<PhoneOutlined />}
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className={styles.secondaryBtn}
              >
                {t('home.consultExpert')}
              </Button>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>10,000+</span>
                <span className={styles.statLabel}>{t('home.stats.students')}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>85%</span>
                <span className={styles.statLabel}>{t('home.stats.accuracy')}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>50+</span>
                <span className={styles.statLabel}>{t('home.stats.partners')}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.heroVisual}>
            <div className={styles.decorativeCard}>
              <div className={styles.cardHeader}>
                <img src="/logo.png" alt="Logo" className={styles.cardLogo} />
                <span>{t('result.title')}</span>
              </div>
              <div className={styles.scorePreview}>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreValue}>92</span>
                  <span className={styles.scoreLabel}>{t('result.feasibilityScore')}</span>
                </div>
                <div className={styles.scoreDetails}>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>{t('result.schoolAssessment')}</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>{t('result.subjectAnalysis')}</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#d69e2e' }} />
                    <span>{t('result.studyPlan')}</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>{t('result.additionalAdvice')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 核心功能 ===== */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.coreFeatures.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
          <Paragraph className={styles.sectionDesc}>
            {t('home.coreFeatures.subtitle')}
          </Paragraph>
        </div>
        
        <Row gutter={[32, 32]}>
          {coreFeatures.map((feature, index) => (
            <Col xs={24} lg={8} key={index}>
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
                <Title level={3} className={styles.featureTitle}>{feature.title}</Title>
                <ul className={styles.featureList}>
                  {feature.features.map((item, idx) => (
                    <li key={idx}>
                      <CheckCircleOutlined style={{ color: feature.color }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ===== 智能刷题入口 ===== */}
      <section className={styles.quizSection}>
        <Card className={styles.quizCard}>
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={14}>
              <div className={styles.quizContent}>
                <div className={styles.quizBadge}>
                  <ExperimentOutlined /> {t('quiz.newFeature')}
                </div>
                <Title level={2}>
                  <span className="gradient-title">{t('quiz.title')}</span>
                </Title>
                <Paragraph className={styles.quizDesc}>
                  {t('quiz.description')}
                </Paragraph>
                <div className={styles.quizFeatures}>
                  <div className={styles.quizFeatureItem}>
                    <ThunderboltOutlined style={{ color: '#1890ff' }} />
                    <span>{t('quiz.feature1')}</span>
                  </div>
                  <div className={styles.quizFeatureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>{t('quiz.feature2')}</span>
                  </div>
                  <div className={styles.quizFeatureItem}>
                    <BookOutlined style={{ color: '#fa8c16' }} />
                    <span>{t('quiz.feature3')}</span>
                  </div>
                  <div className={styles.quizFeatureItem}>
                    <BarChartOutlined style={{ color: '#722ed1' }} />
                    <span>{t('quiz.feature4')}</span>
                  </div>
                </div>
                <div className={styles.quizButtons}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<FireOutlined />}
                    onClick={() => navigate('/quiz')}
                    className={styles.quizPrimaryBtn}
                  >
                    {t('quiz.startQuiz')}
                  </Button>
                  <Button
                    size="large"
                    icon={<BookOutlined />}
                    onClick={() => navigate('/quiz/wrong-questions')}
                  >
                    {t('quiz.viewWrongQuestions')}
                  </Button>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={10}>
              <div className={styles.quizVisual}>
                <div className={styles.quizStatsCard}>
                  <div className={styles.quizStatItem}>
                    <div className={styles.quizStatIcon} style={{ background: 'rgba(24, 144, 255, 0.1)', color: '#1890ff' }}>
                      📚
                    </div>
                    <div className={styles.quizStatInfo}>
                      <span className={styles.quizStatValue}>12+</span>
                      <span className={styles.quizStatLabel}>{t('quiz.stats.subjects')}</span>
                    </div>
                  </div>
                  <div className={styles.quizStatItem}>
                    <div className={styles.quizStatIcon} style={{ background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a' }}>
                      🎯
                    </div>
                    <div className={styles.quizStatInfo}>
                      <span className={styles.quizStatValue}>4</span>
                      <span className={styles.quizStatLabel}>{t('quiz.stats.difficulties')}</span>
                    </div>
                  </div>
                  <div className={styles.quizStatItem}>
                    <div className={styles.quizStatIcon} style={{ background: 'rgba(250, 140, 22, 0.1)', color: '#fa8c16' }}>
                      ⚡
                    </div>
                    <div className={styles.quizStatInfo}>
                      <span className={styles.quizStatValue}>AI</span>
                      <span className={styles.quizStatLabel}>{t('quiz.stats.aiGenerated')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </section>

      {/* ===== 水平测试入口 ===== */}
      <section className={styles.levelTestSection}>
        <Card className={styles.levelTestCard}>
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={10}>
              <div className={styles.levelTestVisual}>
                <div className={styles.levelTestBadge}>
                  <SafetyOutlined className={styles.levelTestBadgeIcon} />
                </div>
                <div className={styles.levelTestLevels}>
                  {['5**', '5*', '5', '4', '3'].map((level, idx) => (
                    <div 
                      key={level} 
                      className={styles.levelTestLevel}
                      style={{ 
                        animationDelay: `${idx * 0.1}s`,
                        background: idx === 0 ? 'linear-gradient(135deg, #52c41a, #73d13d)' : 
                                   idx === 1 ? 'linear-gradient(135deg, #73d13d, #95de64)' :
                                   idx === 2 ? 'linear-gradient(135deg, #1890ff, #40a9ff)' :
                                   idx === 3 ? 'linear-gradient(135deg, #faad14, #ffc53d)' :
                                   'linear-gradient(135deg, #ff7a45, #ffa940)'
                      }}
                    >
                      {level}
                    </div>
                  ))}
                </div>
              </div>
            </Col>
            <Col xs={24} lg={14}>
              <div className={styles.levelTestContent}>
                <div className={styles.levelTestTag}>
                  <TrophyOutlined /> 全新功能
                </div>
                <Title level={2}>
                  <span className="gradient-title">DSE水平测试</span>
                </Title>
                <Paragraph className={styles.levelTestDesc}>
                  精准评估您在香港DSE课程中的实际学业水平，获取DSE等级预测和个性化学习建议
                </Paragraph>
                <div className={styles.levelTestFeatures}>
                  <div className={styles.levelTestFeatureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>智能AI出题，符合考评局标准</span>
                  </div>
                  <div className={styles.levelTestFeatureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>多维度能力评估，精准定位</span>
                  </div>
                  <div className={styles.levelTestFeatureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>DSE等级预测 (1-5**)</span>
                  </div>
                  <div className={styles.levelTestFeatureItem}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>详细报告和学习建议</span>
                  </div>
                </div>
                <div className={styles.levelTestButtons}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ExperimentOutlined />}
                    onClick={() => navigate('/level-test')}
                    className={styles.levelTestPrimaryBtn}
                  >
                    开始水平测试
                  </Button>
                  <Button
                    size="large"
                    icon={<FileSearchOutlined />}
                    onClick={() => navigate('/level-test/history')}
                  >
                    查看测试记录
                  </Button>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </section>

      {/* ===== 系统优势 ===== */}
      <section className={styles.advantagesSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.advantages.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Row gutter={[24, 24]}>
          {advantages.map((adv, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <div className={`${styles.advantageCard} fade-in stagger-${index + 1}`}>
                <div
                  className={styles.advantageIcon}
                  style={{ background: `${adv.color}15`, color: adv.color }}
                >
                  {adv.icon}
                </div>
                <Title level={4}>{adv.title}</Title>
                <Paragraph className={styles.advantageDesc}>
                  {adv.description}
                </Paragraph>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      {/* ===== 使用流程 ===== */}
      <section className={styles.stepsSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.steps.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
          <Paragraph className={styles.sectionDesc}>
            {t('home.steps.subtitle')}
          </Paragraph>
        </div>
        
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} className={`${styles.stepItem} fade-in stagger-${index + 1}`}>
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepIcon}>{step.icon}</div>
              <div className={styles.stepContent}>
                <Title level={4}>{step.title}</Title>
                <Paragraph>{step.description}</Paragraph>
              </div>
              {index < steps.length - 1 && (
                <div className={styles.stepConnector}>
                  <ArrowRightOutlined />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== 适用人群 ===== */}
      <section className={styles.targetSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.targetUsers.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Row gutter={[32, 32]}>
          {targetUsers.map((user, index) => (
            <Col xs={24} md={8} key={index}>
              <Card className={`${styles.targetCard} fade-in stagger-${index + 1}`}>
                <div className={styles.targetIcon}>{user.icon}</div>
                <Title level={4}>{user.title}</Title>
                <ul className={styles.targetList}>
                  {user.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ===== 技术特色 ===== */}
      <section className={styles.techSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.tech.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Row gutter={[24, 24]}>
          {techFeatures.map((tech, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <div className={`${styles.techCard} fade-in stagger-${index + 1}`}>
                <div className={styles.techIcon}>{tech.icon}</div>
                <Title level={4}>{tech.title}</Title>
                <ul className={styles.techList}>
                  {tech.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      {/* ===== 成功案例 ===== */}
      <section className={styles.casesSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.cases.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Carousel autoplay dots={{ className: styles.carouselDots }}>
          {successCases.map((caseItem, index) => (
            <div key={index}>
              <div className={styles.caseCard}>
                <div className={styles.caseType}>{caseItem.type}</div>
                <div className={styles.caseQuote}>
                  <span className={styles.quoteIcon}>"</span>
                  {caseItem.quote}
                  <span className={styles.quoteIcon}>"</span>
                </div>
                <div className={styles.caseAuthor}>— {caseItem.author}</div>
              </div>
            </div>
          ))}
        </Carousel>

        <div className={styles.partnersSection}>
          <Title level={4}>{t('home.cases.partners.title')}</Title>
          <Paragraph>
            {t('home.cases.partners.desc')}
          </Paragraph>
        </div>
      </section>

      {/* ===== 常见问题 ===== */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>
            <QuestionCircleOutlined /> {t('home.faq.title')}
          </Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Collapse 
          accordion 
          className={styles.faqCollapse}
          expandIconPosition="end"
        >
          {faqs.map((faq, index) => (
            <Panel 
              header={<span className={styles.faqQuestion}>{faq.question}</span>} 
              key={index}
            >
              <Paragraph className={styles.faqAnswer}>{faq.answer}</Paragraph>
            </Panel>
          ))}
        </Collapse>
      </section>

      {/* ===== 联系我们 ===== */}
      <section className={styles.contactSection} id="contact">
        <div className={styles.sectionHeader}>
          <Title level={2}>{t('home.contact.title')}</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Row gutter={[48, 32]}>
          <Col xs={24} lg={12}>
            <div className={styles.contactInfo}>
              <Title level={4}>{t('home.contact.service.title')}</Title>
              <div className={styles.contactItem}>
                <PhoneOutlined />
                <span>{t('home.contact.service.hotline')}</span>
              </div>
              <div className={styles.contactItem}>
                <MailOutlined />
                <span>{t('home.contact.service.email')}</span>
              </div>
              <div className={styles.contactItem}>
                <ClockCircleOutlined />
                <span>{t('home.contact.service.hours')}</span>
              </div>

              <Title level={4} style={{ marginTop: 24 }}>{t('home.contact.address.title')}</Title>
              <a 
                href={socialLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactItemLink}
              >
                <div className={styles.contactItem}>
                  <EnvironmentOutlined />
                  <div>
                    <Text strong>{t('home.contact.address.company')}</Text>
                    <br />
                    <Text>{t('home.contact.address.location')}</Text>
                  </div>
                </div>
              </a>

              <Title level={4} style={{ marginTop: 24 }}>{t('home.contact.social.title')}</Title>
              <div className={styles.socialLinks}>
                <div 
                  className={`${styles.socialItem} ${styles.clickable}`}
                  onClick={() => setWechatModalVisible(true)}
                >
                  <WechatOutlined />
                  <span>{t('home.contact.social.wechat')}</span>
                </div>
                <a 
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItemLink}
                >
                  <div className={styles.socialItem}>
                    <FacebookOutlined />
                    <span>{t('home.contact.social.facebook')}</span>
                  </div>
                </a>
                <a 
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialItemLink}
                >
                  <div className={styles.socialItem}>
                    <InstagramOutlined />
                    <span>{t('home.contact.social.instagram')}</span>
                  </div>
                </a>
              </div>
            </div>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card className={styles.contactFormCard}>
              <Title level={4}>{t('home.contact.form.title')}</Title>
              <Form 
                form={form}
                layout="vertical" 
                className={styles.contactForm}
                onFinish={handleInquirySubmit}
              >
                <Form.Item 
                  label={t('home.contact.form.name')} 
                  name="name"
                  rules={[{ required: true, message: '请输入您的姓名' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder={t('home.contact.form.namePlaceholder')} />
                </Form.Item>
                <Form.Item label={t('home.contact.form.phone')} name="phone">
                  <Input prefix={<PhoneOutlined />} placeholder={t('home.contact.form.phonePlaceholder')} />
                </Form.Item>
                <Form.Item label={t('home.contact.form.email')} name="email">
                  <Input prefix={<MailOutlined />} placeholder={t('home.contact.form.emailPlaceholder')} />
                </Form.Item>
                <Form.Item 
                  label={t('home.contact.form.message')} 
                  name="message"
                  rules={[{ required: true, message: '请输入咨询内容' }]}
                >
                  <Input.TextArea rows={4} placeholder={t('home.contact.form.messagePlaceholder')} />
                </Form.Item>
                <Button type="primary" block size="large" htmlType="submit" loading={submitting}>
                  {t('home.contact.form.submit')}
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </section>

      {/* ===== 更新日志 ===== */}
      <section className={styles.updateSection}>
        <Row gutter={[32, 24]}>
          <Col xs={24} md={12}>
            <Card className={styles.updateCard}>
              <Title level={4}>{t('home.updates.current.title')}</Title>
              <ul className={styles.updateList}>
                {updateLog.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className={styles.updateCard}>
              <Title level={4}>{t('home.updates.upcoming.title')}</Title>
              <ul className={styles.updateList}>
                {upcomingFeatures.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </Card>
          </Col>
        </Row>
      </section>

      {/* ===== CTA区域 ===== */}
      <section className={styles.ctaSection}>
        <Card className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <Title level={2} style={{ color: 'white', marginBottom: 8 }}>
              {t('home.cta.title')}
          </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginBottom: 24 }}>
              {t('system.name')} - {t('system.slogan')}
            </Paragraph>
            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>
              {t('home.cta.subtitle')}
          </Paragraph>
            <div className={styles.ctaButtons}>
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
                {t('home.cta.startFree')}
              </Button>
              <Button
                size="large"
                ghost
                onClick={() => navigate('/login')}
                style={{ 
                  height: 48,
                  paddingInline: 32,
                  borderColor: 'white',
                  color: 'white',
                }}
              >
                {t('home.cta.register')}
          </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* 微信公众号二维码弹窗 */}
      <Modal
        title={t('home.contact.social.wechatModal')}
        open={wechatModalVisible}
        onCancel={() => setWechatModalVisible(false)}
        footer={null}
        centered
        width={360}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img 
            src="/wechat-qrcode.png" 
            alt="微信公众号二维码" 
            style={{ width: '100%', maxWidth: 280, borderRadius: 8 }}
          />
          <Paragraph style={{ marginTop: 16, color: 'var(--text-secondary)' }}>
            {t('home.contact.social.wechatScan')}
          </Paragraph>
        </div>
      </Modal>
    </div>
  )
}

export default HomePage
