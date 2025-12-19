import { useNavigate } from 'react-router-dom'
import { Button, Card, Row, Col, Typography, Collapse, Form, Input, Carousel } from 'antd'
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
} from '@ant-design/icons'
import { useLanguageStore } from '../stores/languageStore'
import styles from './HomePage.module.css'

const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

/**
 * 首页组件 - 质心DSE升学分析系统完整介绍页面
 */
const HomePage = () => {
  const navigate = useNavigate()
  const { t } = useLanguageStore()

  // 核心功能数据
  const coreFeatures = [
    {
      icon: <BankOutlined />,
      title: '智能插班分析',
      features: [
        '精准评估：根据学生成绩、年级和年龄，分析目标学校的插班成功率',
        '个性化推荐：结合居住地点和交通偏好，智能推荐最适合的学校',
        '时间规划：制定科学的插班准备时间表和学习计划',
      ],
      color: '#2b6cb0',
    },
    {
      icon: <TrophyOutlined />,
      title: '大学申请分析',
      features: [
        '录取概率预测：基于DSE成绩和目标专业，计算入读成功率',
        '专业匹配推荐：结合就业趋势和个人兴趣，推荐最适合的大学专业',
        '职业前景分析：提供各专业的就业市场趋势和薪资水平预测',
      ],
      color: '#38a169',
    },
    {
      icon: <BarChartOutlined />,
      title: '全方位数据支持',
      features: [
        '香港本地教育数据库：整合香港中学和大学的最新录取数据',
        '实时趋势分析：追踪DSE考试动态和大学招生政策变化',
        '个性化报告：生成详细的PDF分析报告，支持一键下载',
      ],
      color: '#d69e2e',
    },
  ]

  // 系统优势
  const advantages = [
    {
      icon: <RocketOutlined />,
      title: '科学分析',
      description: '基于深度学习和机器学习算法，确保分析结果的准确性。整合香港教育局公开数据和历年录取统计，定期更新模型，适应教育政策变化。',
      color: '#2b6cb0',
    },
    {
      icon: <FormOutlined />,
      title: '精准定位',
      description: '考虑学生的学术能力、兴趣偏好和职业规划，结合家庭背景和地理位置的实际情况，提供多维度、多层次的升学建议。',
      color: '#38a169',
    },
    {
      icon: <ThunderboltOutlined />,
      title: '智能推荐',
      description: 'AI驱动的学校与专业匹配算法，基于就业趋势的职业生涯规划，个性化的学习提升策略。',
      color: '#d69e2e',
    },
    {
      icon: <LineChartOutlined />,
      title: '持续优化',
      description: '用户反馈驱动的系统改进，定期更新就业市场分析数据，与香港教育专家合作优化算法。',
      color: '#e53e3e',
    },
  ]

  // 技术特色
  const techFeatures = [
    {
      icon: <RocketOutlined />,
      title: '先进AI技术',
      items: ['集成DeepSeek大型语言模型', '本地化训练的教育分析算法', '实时数据处理和模式识别'],
    },
    {
      icon: <SafetyOutlined />,
      title: '数据安全与隐私',
      items: ['端到端数据加密', '符合GDPR和香港隐私条例', '严格的访问控制和权限管理'],
    },
    {
      icon: <GlobalOutlined />,
      title: '多平台支持',
      items: ['响应式网页设计，适配各种设备', '移动端优化，随时随地访问', '无需安装，浏览器直接使用'],
    },
    {
      icon: <EnvironmentOutlined />,
      title: '本地化服务',
      items: ['专注于香港教育体系', '中英文双语界面', '本地化数据源和支持团队'],
    },
  ]

  // 使用步骤数据
  const steps = [
    {
      number: '01',
      icon: <FileSearchOutlined />,
      title: '选择分析类型',
      description: '插班分析：适合寻求转学的学生\n大学申请分析：适合准备升读大学的学生',
    },
    {
      number: '02',
      icon: <FormOutlined />,
      title: '填写详细信息',
      description: '个人基本信息、学术成绩数据、目标学校/专业偏好、居住地点和交通偏好',
    },
    {
      number: '03',
      icon: <ScheduleOutlined />,
      title: '获取智能分析',
      description: '系统自动分析并提供详细报告，查看录取成功率和推荐选项，下载个性化建议',
    },
    {
      number: '04',
      icon: <CheckCircleOutlined />,
      title: '实施与跟进',
      description: '根据建议制定学习计划，定期更新成绩数据重新评估，获得持续的升学规划支持',
    },
  ]

  // 适用人群
  const targetUsers = [
    {
      icon: <UserOutlined />,
      title: 'DSE插班生',
      items: ['正在寻求转学机会的中学生', '希望进入更好学习环境的学生', '需要专业插班指导和规划的家庭'],
    },
    {
      icon: <TrophyOutlined />,
      title: '大学申请者',
      items: ['即将参加DSE考试的中六学生', '面临大学专业选择的毕业生', '需要了解就业前景的升学决策者'],
    },
    {
      icon: <TeamOutlined />,
      title: '家长与教育工作者',
      items: ['希望为孩子提供科学升学指导的家长', '需要数据分析支持的教育顾问', '补习班和学校升学指导老师'],
    },
  ]

  // 成功案例
  const successCases = [
    {
      quote: '通过系统分析，我成功从B2中学转入B1中学，系统提供的学习计划让我的数学成绩提升了两个等级！',
      author: '中五学生陈同学',
      type: '插班成功案例',
    },
    {
      quote: '原本对大学专业很迷茫，系统根据我的兴趣和成绩推荐了数据科学专业，现在我已在港大就读相关课程！',
      author: '2024年毕业生李同学',
      type: '大学申请案例',
    },
    {
      quote: '作为教育顾问，这个系统帮助我为学生提供更科学的升学建议，家长和学生的满意度大幅提升。',
      author: '资深教育顾问王老师',
      type: '专业使用案例',
    },
  ]

  // FAQ数据
  const faqs = [
    {
      question: '系统如何确保分析准确性？',
      answer: '我们整合了香港教育局的官方数据、历年DSE成绩统计、大学录取分数和就业市场报告，结合AI算法进行多维度分析，准确率达85%以上。',
    },
    {
      question: '需要多长时间获得分析结果？',
      answer: '一般情况下，提交信息后5-10分钟即可获得详细分析报告。复杂分析可能需要15分钟。',
    },
    {
      question: '如何更新我的成绩信息？',
      answer: '登录账户后，可以在"历史记录"页面查看之前的分析，并可以重新提交最新成绩进行评估，系统会自动生成新的建议报告。',
    },
    {
      question: '系统收费吗？',
      answer: '我们提供基础免费分析服务。首次注册用户可获得完整的分析体验，包括详细的报告和建议。',
    },
    {
      question: '分析报告可以下载吗？',
      answer: '是的，所有分析报告都支持一键下载为PDF格式，方便您保存和打印，也可以分享给家长或老师参考。',
    },
  ]

  // 更新日志
  const updateLog = [
    '✅ 新增大学申请分析模块',
    '✅ 智能学校推荐功能上线',
    '✅ 就业趋势数据分析增强',
    '✅ 用户界面全面优化',
    '✅ 多语言支持（简体/繁体/英文）',
  ]

  const upcomingFeatures = [
    '🔄 实时DSE模拟考试分析',
    '🔄 大学面试模拟训练',
    '🔄 家长监控与报告分享',
    '🔄 智能学习资源推荐',
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
              🎓 精准分析 · 智能规划 · 升学无忧
            </div>
            <Title level={1} className={styles.heroTitle}>
              <span className="gradient-title">{t('system.name')}</span>
            </Title>
            <Title level={3} className={styles.heroSubtitle}>
              您的专属升学规划专家
            </Title>
            <Paragraph className={styles.heroDescription}>
              我们是一站式DSE升学规划平台，结合先进的人工智能技术与香港本地教育数据，
              为学生提供个性化的升学路径分析和专业建议。无论您是中四至中六的插班生，
              还是即将面临大学选择的毕业生，我们的系统都能为您提供精准、科学的升学指导。
            </Paragraph>
            <div className={styles.heroButtons}>
              <Button
                type="primary"
                size="large"
                icon={<FormOutlined />}
                onClick={() => navigate('/analysis')}
                className={styles.primaryBtn}
              >
                🚀 立即开始分析
              </Button>
              <Button
                size="large"
                icon={<PhoneOutlined />}
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className={styles.secondaryBtn}
              >
                预约专家咨询
              </Button>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>10,000+</span>
                <span className={styles.statLabel}>服务学生</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>85%</span>
                <span className={styles.statLabel}>分析准确率</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>50+</span>
                <span className={styles.statLabel}>合作机构</span>
              </div>
            </div>
          </div>
          
          <div className={styles.heroVisual}>
            <div className={styles.decorativeCard}>
              <div className={styles.cardHeader}>
                <img src="/logo.png" alt="Logo" className={styles.cardLogo} />
                <span>智能分析报告</span>
              </div>
              <div className={styles.scorePreview}>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreValue}>92</span>
                  <span className={styles.scoreLabel}>可行性评分</span>
                </div>
                <div className={styles.scoreDetails}>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>目标学校匹配度高</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>学术成绩达标</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#d69e2e' }} />
                    <span>部分科目需提升</span>
                  </div>
                  <div className={styles.scoreItem}>
                    <CheckCircleOutlined style={{ color: '#38a169' }} />
                    <span>升学规划清晰</span>
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
          <Title level={2}>核心功能</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
          <Paragraph className={styles.sectionDesc}>
            三大核心模块，全方位覆盖您的升学需求
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

      {/* ===== 系统优势 ===== */}
      <section className={styles.advantagesSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>系统优势</Title>
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
          <Title level={2}>如何使用系统</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
          <Paragraph className={styles.sectionDesc}>
            简单四步，开启您的智能升学之旅
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
          <Title level={2}>适用人群</Title>
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
          <Title level={2}>技术特色</Title>
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
          <Title level={2}>成功案例</Title>
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
          <Title level={4}>🏆 合作机构</Title>
          <Paragraph>
            与香港多家知名补习班和教育机构合作，获得香港教育界专业人士推荐，定期为学校提供集体分析服务
          </Paragraph>
        </div>
      </section>

      {/* ===== 常见问题 ===== */}
      <section className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <Title level={2}>
            <QuestionCircleOutlined /> 常见问题
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
          <Title level={2}>联系我们</Title>
          <div className="custom-divider" style={{ width: '60px', margin: '16px auto' }} />
        </div>
        
        <Row gutter={[48, 32]}>
          <Col xs={24} lg={12}>
            <div className={styles.contactInfo}>
              <Title level={4}>📞 客户服务</Title>
              <div className={styles.contactItem}>
                <PhoneOutlined />
                <span>服务热线：(852) 2711 1288</span>
              </div>
              <div className={styles.contactItem}>
                <MailOutlined />
                <span>客服邮箱：support@centroid-dse.hk</span>
              </div>
              <div className={styles.contactItem}>
                <ClockCircleOutlined />
                <span>在线咨询：周二至周日 10:00-19:00</span>
              </div>

              <Title level={4} style={{ marginTop: 24 }}>🏢 办公地址</Title>
              <div className={styles.contactItem}>
                <EnvironmentOutlined />
                <div>
                  <Text strong>Center of Mass education tech. limited</Text>
                  <br />
                  <Text>香港九龙弥敦道761号太子蓝马之城3楼B室</Text>
                </div>
              </div>

              <Title level={4} style={{ marginTop: 24 }}>📱 关注我们</Title>
              <div className={styles.socialLinks}>
                <div className={styles.socialItem}>
                  <WechatOutlined />
                  <span>质心教育DSE</span>
                </div>
                <div className={styles.socialItem}>
                  <FacebookOutlined />
                  <span>香港质心教育</span>
                </div>
                <div className={styles.socialItem}>
                  <InstagramOutlined />
                  <span>@centerofmass_hk</span>
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card className={styles.contactFormCard}>
              <Title level={4}>📝 在线咨询</Title>
              <Form layout="vertical" className={styles.contactForm}>
                <Form.Item label="您的姓名" name="name">
                  <Input prefix={<UserOutlined />} placeholder="请输入您的姓名" />
                </Form.Item>
                <Form.Item label="联系电话" name="phone">
                  <Input prefix={<PhoneOutlined />} placeholder="请输入联系电话" />
                </Form.Item>
                <Form.Item label="电子邮箱" name="email">
                  <Input prefix={<MailOutlined />} placeholder="请输入电子邮箱" />
                </Form.Item>
                <Form.Item label="咨询内容" name="message">
                  <Input.TextArea rows={4} placeholder="请描述您的问题或需求..." />
                </Form.Item>
                <Button type="primary" block size="large">
                  提交咨询
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
              <Title level={4}>📋 最新版本 v2.5（2024年更新）</Title>
              <ul className={styles.updateList}>
                {updateLog.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className={styles.updateCard}>
              <Title level={4}>🔮 即将上线功能</Title>
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
              让数据说话，让未来更清晰
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', marginBottom: 24 }}>
              {t('system.name')} - 为每个香港学生的梦想保驾护航
            </Paragraph>
            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>
              用科技为教育赋能，让每个学生都能找到最适合自己的升学之路
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
                🚀 免费开始分析
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
                👇 免费注册体验
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

export default HomePage
