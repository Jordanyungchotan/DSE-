// 简体中文
export const zhCN = {
  // 通用
  common: {
    loading: '加载中...',
    submit: '提交',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '提示',
    notSelected: '未选择',
    questions: '题',
    generatingQuestions: '正在生成题目...',
  },

  // 导航
  nav: {
    home: '首页',
    analysis: '开始分析',
    history: '历史记录',
    login: '登录',
    logout: '退出登录',
    register: '注册',
    myRecords: '我的记录',
    // 智能刷题导航
    smartQuiz: '智能刷题',
    startQuiz: '开始刷题',
    wrongQuestions: '错题本',
    quizHistory: '刷题记录',
    learningProfile: '学习档案',
    leaderboard: '排行榜',
    // 水平测试导航
    levelTest: '水平测试',
    startLevelTest: '开始测试',
    levelTestHistory: '测试记录',
    // 学习中心
    learningCenter: '学习中心',
    // 积分系统
    points: '积分',
    myPoints: '我的积分',
    pointsMall: '积分商城',
    analysisHistory: '分析记录',
    accountSettings: '账户设置',
    myRanking: '我的排名',
    // 社交系统
    social: '社交',
    community: '量子纠缠',
    friends: '好友',
    messages: '消息',
    notifications: '通知',
  },

  // 系统名称
  system: {
    name: '香港质心教育',
    shortName: '质心教育',
    slogan: '专业的香港DSE升学辅导平台',
    copyright: '© 2024 香港质心教育',
  },

  // 首页
  home: {
    // Hero区域
    heroBadge: '🎓 精准分析 · 智能规划 · 升学无忧',
    heroSubtitle: '您的专属升学规划专家',
    heroDescription: '我们是一站式DSE升学规划平台，结合先进的人工智能技术与香港本地教育数据，为学生提供个性化的升学路径分析和专业建议。无论您是中四至中六的插班生，还是即将面临大学选择的毕业生，我们的系统都能为您提供精准、科学的升学指导。',
    startAnalysis: '🚀 立即开始分析',
    consultExpert: '预约专家咨询',
    stats: {
      students: '服务学生',
      accuracy: '分析准确率',
      partners: '合作机构',
    },

    // 核心功能
    coreFeatures: {
      title: '核心功能',
      subtitle: '三大核心模块，全方位覆盖您的升学需求',
      transfer: {
        title: '智能插班分析',
        feature1: '精准评估：根据学生成绩、年级和年龄，分析目标学校的插班成功率',
        feature2: '个性化推荐：结合居住地点和交通偏好，智能推荐最适合的学校',
        feature3: '时间规划：制定科学的插班准备时间表和学习计划',
      },
      university: {
        title: '大学申请分析',
        feature1: '录取概率预测：基于DSE成绩和目标专业，计算入读成功率',
        feature2: '专业匹配推荐：结合就业趋势和个人兴趣，推荐最适合的大学专业',
        feature3: '职业前景分析：提供各专业的就业市场趋势和薪资水平预测',
      },
      data: {
        title: '全方位数据支持',
        feature1: '香港本地教育数据库：整合香港中学和大学的最新录取数据',
        feature2: '实时趋势分析：追踪DSE考试动态和大学招生政策变化',
        feature3: '个性化报告：生成详细的PDF分析报告，支持一键下载',
      },
    },

    // 系统优势
    advantages: {
      title: '系统优势',
      scientific: {
        title: '科学分析',
        desc: '基于深度学习和机器学习算法，确保分析结果的准确性。整合香港教育局公开数据和历年录取统计，定期更新模型，适应教育政策变化。',
      },
      precise: {
        title: '精准定位',
        desc: '考虑学生的学术能力、兴趣偏好和职业规划，结合家庭背景和地理位置的实际情况，提供多维度、多层次的升学建议。',
      },
      smart: {
        title: '智能推荐',
        desc: 'AI驱动的学校与专业匹配算法，基于就业趋势的职业生涯规划，个性化的学习提升策略。',
      },
      optimize: {
        title: '持续优化',
        desc: '用户反馈驱动的系统改进，定期更新就业市场分析数据，与香港教育专家合作优化算法。',
      },
    },

    // 使用步骤
    steps: {
      title: '如何使用系统',
      subtitle: '简单四步，开启您的智能升学之旅',
      step1: {
        title: '选择分析类型',
        desc: '插班分析：适合寻求转学的学生\n大学申请分析：适合准备升读大学的学生',
      },
      step2: {
        title: '填写详细信息',
        desc: '个人基本信息、学术成绩数据、目标学校/专业偏好、居住地点和交通偏好',
      },
      step3: {
        title: '获取智能分析',
        desc: '系统自动分析并提供详细报告，查看录取成功率和推荐选项，下载个性化建议',
      },
      step4: {
        title: '实施与跟进',
        desc: '根据建议制定学习计划，定期更新成绩数据重新评估，获得持续的升学规划支持',
      },
    },

    // 适用人群
    targetUsers: {
      title: '适用人群',
      transfer: {
        title: 'DSE插班生',
        item1: '正在寻求转学机会的中学生',
        item2: '希望进入更好学习环境的学生',
        item3: '需要专业插班指导和规划的家庭',
      },
      university: {
        title: '大学申请者',
        item1: '即将参加DSE考试的中六学生',
        item2: '面临大学专业选择的毕业生',
        item3: '需要了解就业前景的升学决策者',
      },
      parents: {
        title: '家长与教育工作者',
        item1: '希望为孩子提供科学升学指导的家长',
        item2: '需要数据分析支持的教育顾问',
        item3: '补习班和学校升学指导老师',
      },
    },

    // 技术特色
    tech: {
      title: '技术特色',
      ai: {
        title: '先进AI技术',
        item1: '集成DeepSeek大型语言模型',
        item2: '本地化训练的教育分析算法',
        item3: '实时数据处理和模式识别',
      },
      security: {
        title: '数据安全与隐私',
        item1: '端到端数据加密',
        item2: '符合GDPR和香港隐私条例',
        item3: '严格的访问控制和权限管理',
      },
      platform: {
        title: '多平台支持',
        item1: '响应式网页设计，适配各种设备',
        item2: '移动端优化，随时随地访问',
        item3: '无需安装，浏览器直接使用',
      },
      local: {
        title: '本地化服务',
        item1: '专注于香港教育体系',
        item2: '中英文双语界面',
        item3: '本地化数据源和支持团队',
      },
    },

    // 成功案例
    cases: {
      title: '成功案例',
      case1: {
        quote: '通过系统分析，我成功从B2中学转入B1中学，系统提供的学习计划让我的数学成绩提升了两个等级！',
        author: '中五学生陈同学',
        type: '插班成功案例',
      },
      case2: {
        quote: '原本对大学专业很迷茫，系统根据我的兴趣和成绩推荐了数据科学专业，现在我已在港大就读相关课程！',
        author: '2024年毕业生李同学',
        type: '大学申请案例',
      },
      case3: {
        quote: '作为教育顾问，这个系统帮助我为学生提供更科学的升学建议，家长和学生的满意度大幅提升。',
        author: '资深教育顾问王老师',
        type: '专业使用案例',
      },
      partners: {
        title: '🏆 合作机构',
        desc: '与香港多家知名补习班和教育机构合作，获得香港教育界专业人士推荐，定期为学校提供集体分析服务',
      },
    },

    // 常见问题
    faq: {
      title: '常见问题',
      q1: {
        question: '系统如何确保分析准确性？',
        answer: '我们整合了香港教育局的官方数据、历年DSE成绩统计、大学录取分数和就业市场报告，结合AI算法进行多维度分析，准确率达85%以上。',
      },
      q2: {
        question: '需要多长时间获得分析结果？',
        answer: '一般情况下，提交信息后5-10分钟即可获得详细分析报告。复杂分析可能需要15分钟。',
      },
      q3: {
        question: '如何更新我的成绩信息？',
        answer: '登录账户后，可以在"历史记录"页面查看之前的分析，并可以重新提交最新成绩进行评估，系统会自动生成新的建议报告。',
      },
      q4: {
        question: '系统收费吗？',
        answer: '我们提供基础免费分析服务。首次注册用户可获得完整的分析体验，包括详细的报告和建议。',
      },
      q5: {
        question: '分析报告可以下载吗？',
        answer: '是的，所有分析报告都支持一键下载为PDF格式，方便您保存和打印，也可以分享给家长或老师参考。',
      },
    },

    // 联系我们
    contact: {
      title: '联系我们',
      service: {
        title: '📞 客户服务',
        hotline: '服务热线：(852) 2711 1288',
        email: '客服邮箱：wengzudan@eduzhixin.com',
        hours: '在线咨询：周二至周日 10:00-19:00',
      },
      address: {
        title: '🏢 办公地址',
        company: '香港质心教育',
        location: '香港九龙弥敦道761号太子蓝马之城3楼B室',
      },
      social: {
        title: '📱 关注我们',
        wechat: '质心教育DSE',
        facebook: '香港质心教育',
        instagram: '@centerofmass_hk',
        wechatModal: '微信公众号',
        wechatScan: '扫描二维码关注我们的微信公众号',
      },
      form: {
        title: '📝 在线咨询',
        name: '您的姓名',
        phone: '联系电话',
        email: '电子邮箱',
        message: '咨询内容',
        namePlaceholder: '请输入您的姓名',
        phonePlaceholder: '请输入联系电话',
        emailPlaceholder: '请输入电子邮箱',
        messagePlaceholder: '请描述您的问题或需求...',
        submit: '提交咨询',
      },
    },

    // 更新日志
    updates: {
      current: {
        title: '📋 最新版本 v2.5（2024年更新）',
        item1: '✅ 新增大学申请分析模块',
        item2: '✅ 智能学校推荐功能上线',
        item3: '✅ 就业趋势数据分析增强',
        item4: '✅ 用户界面全面优化',
        item5: '✅ 多语言支持（简体/繁体/英文）',
      },
      upcoming: {
        title: '🔮 即将上线功能',
        item1: '🔄 实时DSE模拟考试分析',
        item2: '🔄 大学面试模拟训练',
        item3: '🔄 家长监控与报告分享',
        item4: '🔄 智能学习资源推荐',
      },
    },

    // CTA
    cta: {
      title: '让数据说话，让未来更清晰',
      subtitle: '用科技为教育赋能，让每个学生都能找到最适合自己的升学之路',
      startFree: '🚀 免费开始分析',
      register: '👇 免费注册体验',
    },
    
    // 水平测试卡片
    levelTest: {
      newFeature: '全新功能',
      title: 'DSE水平测试',
      description: '精准评估您在香港DSE课程中的实际学业水平，获取DSE等级预测和个性化学习建议',
      feature1: '智能AI出题，符合考评局标准',
      feature2: '多维度能力评估，精准定位',
      feature3: 'DSE等级预测 (1-5**)',
      feature4: '详细报告和学习建议',
      startButton: '开始水平测试',
      viewHistoryButton: '查看测试记录',
    },
  },

  // 分析页面
  analysis: {
    title: 'DSE插班分析',
    universityTitle: '大学申请分析',
    description: '请完整填写以下信息，系统将为您生成专业的分析报告',
    selectType: '选择分析类型',
    transfer: '插班分析',
    university: '大学申请分析',
    
    form: {
      enrollmentDate: '插班日期',
      grade: '年级',
      age: '年龄',
      currentSchool: '当前学校',
      targetSchools: '目标学校',
      subjects: '科目成绩',
      currentScore: '当前成绩',
      targetScore: '目标成绩',
      addSubject: '添加科目',
      removeSubject: '删除科目',
    },

    universityForm: {
      dseScores: 'DSE成绩',
      targetUniversities: '目标大学',
      targetMajors: '目标专业',
      personalBackground: '个人背景',
      extracurricular: '课外活动',
      awards: '获奖经历',
    },

    submitAnalysis: '提交分析',
    analyzing: '正在分析...',
  },

  // 结果页面
  result: {
    title: '分析报告',
    overallAssessment: '综合评估',
    feasibilityScore: '可行性评分',
    subjectAnalysis: '科目分析',
    schoolAssessment: '学校评估',
    studyPlan: '学习计划',
    additionalAdvice: '额外建议',
    downloadPDF: '下载PDF报告',
    shareResult: '分享结果',
    newAnalysis: '新建分析',
    
    university: {
      admissionChance: '录取概率',
      programRecommendations: '专业推荐',
      applicationStrategy: '申请策略',
      improvementSuggestions: '提升建议',
    },
  },

  // 历史记录
  history: {
    title: '历史记录',
    noRecords: '暂无分析记录',
    viewDetail: '查看详情',
    deleteRecord: '删除记录',
    confirmDelete: '确定要删除这条记录吗？',
    analysisDate: '分析日期',
    analysisType: '分析类型',
  },

  // 登录注册
  auth: {
    loginTitle: '登录账户',
    registerTitle: '注册账户',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    name: '姓名',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账户？',
    hasAccount: '已有账户？',
    loginNow: '立即登录',
    registerNow: '立即注册',
    loginSuccess: '登录成功',
    registerSuccess: '注册成功',
    loginFailed: '登录失败',
    registerFailed: '注册失败',
    login: '立即登录',
    loginToViewRank: '登录后查看你的排名',
  },

  // 页脚
  footer: {
    aboutUs: '关于我们',
    terms: '使用条款',
    privacy: '隐私政策',
    contact: '联系我们',
  },

  // 语言
  language: {
    zhCN: '简体中文',
    zhTW: '繁體中文',
    en: 'English',
  },

  // 智能刷题系统
  quiz: {
    // 首页卡片
    title: 'DSE智能刷题系统',
    newFeature: '全新功能',
    description: '基于DeepSeek AI的动态题目生成，每次刷题都会根据您的配置实时生成符合DSE考试标准的题目。支持中四至中六年级，涵盖核心科目和主要选修科目。',
    feature1: 'AI动态生成题目',
    feature2: '即时批改与解析',
    feature3: '错题本追踪复习',
    feature4: '学习进度报告',
    startQuiz: '立即刷题',
    viewWrongQuestions: '查看错题本',
    stats: {
      subjects: '支持科目',
      difficulties: '难度级别',
      aiGenerated: '智能生成',
    },
    
    // 刷题配置
    config: {
      title: '刷题配置',
      subject: '科目',
      subjectDesc: '选择您想要练习的科目',
      grade: '年级',
      difficulty: '难度',
      difficultyDesc: '根据您的水平选择合适的难度',
      questionCount: '题目数量',
      questionCountDesc: '选择本次练习的题目数量',
      start: '开始刷题',
      scienceElectives: '理科选修',
      artsElectives: '文科选修',
      aiGenerated: 'AI智能生成',
      aiGeneratedDesc: '题目将根据DSE近五年考试标准实时生成，每次练习都是全新题目',
      features: '刷题特色',
      modules: '知识模块',
      modulesDesc: '选择想要练习的知识模块（可多选，不选则随机）',
      compulsory: '必修部分',
      elective: '选修部分（四选二）',
    },
    
    // 警告消息
    warnings: {
      selectSubject: '请选择一个科目',
      selectGrade: '请选择年级',
      selectDifficulty: '请选择难度',
    },
    
    // 加载提示
    loadingTips: {
      selecting: '正在从题库中精选题目...',
      adjusting: '正在根据您的年级调整难度...',
      generating: '正在生成答案解析...',
      optimizing: '正在优化题目内容...',
      almostDone: '即将完成，请稍候...',
    },
    
    // AI生成
    aiGenerating: 'AI 智能生成中',
    generatingHint: '题目将根据 DSE 真题标准实时生成，包含详细答案解析',
    targetAccuracy: '目标正确率',
    
    // 特色
    features: {
      dseStandard: '符合DSE考试标准',
      aiGenerated: 'AI动态生成题目',
      instantGrading: '即时批改与解析',
      detailedReport: '详细学习报告',
      pauseResume: '随时暂停继续',
    },
    
    // 年级
    grades: {
      f4: '中四',
      f5: '中五',
      f6: '中六',
    },
    
    // 年级描述
    gradeDescs: {
      f4: 'DSE第一年课程',
      f5: 'DSE第二年课程',
      f6: 'DSE第三年/应考年',
    },
    
    // 难度
    difficulties: {
      basic: '基础',
      standard: '标准',
      challenging: '挑战',
      exam: '考试难度',
    },
    
    // 难度描述
    difficultyDescs: {
      basic: '基础知识巩固',
      standard: '常规练习难度',
      challenging: '能力提升训练',
      exam: 'DSE真题模拟',
    },
    
    // 题目数量标签
    countLabels: {
      quick: '快速练习',
      standard: '标准练习',
      deep: '深度练习',
      mock: '模拟测试',
    },
    countSuffix: '题',
    
    // 科目
    subjects: {
      math: '数学',
      chinese: '中国语文',
      english: '英国语文',
      physics: '物理',
      chemistry: '化学',
      biology: '生物',
      mathM1: '数学M1',
      mathM2: '数学M2',
    },
    
    // 答题页面
    question: '第 {current} 题 / 共 {total} 题',
    timeRemaining: '剩余时间',
    submitAnswer: '提交答案',
    nextQuestion: '下一题',
    finishQuiz: '完成测验',
    correct: '回答正确',
    incorrect: '回答错误',
    correctAnswer: '正确答案',
    incorrectAnswer: '答案不正确',
    explanation: '解析',
    pleaseAnswer: '请先选择或输入答案',
    timeWarning: '⏰ 剩余时间不足1分钟！',
    timeUp: '时间到！自动提交答案...',
    favorited: '已收藏题目',
    unfavorited: '已取消收藏',
    
    // 结果页面
    result: {
      title: '刷题结果',
      score: '得分',
      accuracy: '正确率',
      time: '用时',
      correct: '正确',
      incorrect: '错误',
      review: '查看解析',
      retry: '重新刷题',
      backHome: '返回首页',
    },
    
    // 错题本
    wrongBook: {
      title: '错题本',
      empty: '暂无错题记录',
      subject: '科目',
      topic: '知识点',
      addedAt: '添加时间',
      yourAnswer: '你的答案',
      correctAnswer: '正确答案',
      review: '复习',
      delete: '删除',
      mastered: '已掌握',
    },
    
    // 刷题历史
    history: {
      title: '刷题记录',
      empty: '暂无刷题记录',
      date: '日期',
      subject: '科目',
      difficulty: '难度',
      score: '得分',
      accuracy: '正确率',
      view: '查看详情',
    },
  },

  // 水平测试
  levelTest: {
    title: 'DSE水平测试',
    subtitle: '精准评估您在香港DSE课程中的实际学业水平，获取个性化学习建议',
    testNotFound: '测试不存在或已过期',
    timeUp: '时间到！正在自动提交...',
    points: '分',
    
    // 题型
    questionTypes: {
      choice: '选择题',
      short: '短答题',
      long: '论述题',
    },
    
    // 确认提交
    confirmSubmit: {
      title: '确认提交',
      continue: '继续答题',
      answered: '已答题目',
      unanswered: '未答题目',
      marked: '标记待检查',
      warning: '您还有 {count} 道题未作答，确定要提交吗？',
    },
    
    // 批改提示
    gradingTips: {
      wait: '批改需要一些时间，请耐心等待...',
      ai: '系统正在使用AI对您的答案进行评估',
    },
    
    // 测试须知
    testNotice: {
      title: '测试须知',
      tip1: '测试开始后请确保网络稳定，系统会每30秒自动保存进度',
      tip2: '测试题目包含选择题（40%）、短答题（40%）、论述题（20%）',
      tip3: '请在规定时间内完成测试，超时将自动提交',
      tip4: '测试结果将生成详细的分析报告和学习建议',
    },
    
    // DSE等级说明
    dseLevels: {
      title: 'DSE等级说明',
      '5star2': '优异',
      '5star': '优良',
      '5': '良好',
      '4': '中等',
      '3': '基本达标',
      '2': '部分达标',
      '1': '未达标',
      'U': '不予评级',
    },
    
    // 特性介绍
    features: {
      aiTitle: '智能AI出题',
      aiDesc: '基于DeepSeek AI，严格遵循香港考评局DSE课程纲要生成题目',
      multiTitle: '多维度评估',
      multiDesc: '选择题、短答题、论述题综合评估，全面了解知识掌握情况',
      predictTitle: 'DSE等级预测',
      predictDesc: '根据测试表现预测DSE等级（1-5**），提供精准定位',
    },
    
    // 设置页
    setup: {
      startTest: '开始测试',
      selectGrade: '选择年级',
      selectSubject: '选择科目',
      selectType: '选择测试类型',
      selectBoth: '请先选择年级和科目',
      coreSubjects: '核心科目',
      electiveSubjects: '选修科目',
      quickTest: '基础测试',
      quickDesc: '15-20题，约30分钟',
      fullTest: '完整评估',
      fullDesc: '25-30题，约60分钟',
      recommended: '推荐',
      pleaseSelectGrade: '请选择年级',
      pleaseSelectSubject: '请选择科目',
      noQuestionsError: '该科目暂无题目，请选择其他科目',
      generateFailed: '生成测试失败',
    },
    
    // 测试进行中
    progress: {
      question: '第 {current} 题',
      questionCard: '答题卡',
      answered: '已答',
      marked: '标记',
      current: '当前',
      submitTest: '提交测试',
      markQuestion: '标记',
      previousQuestion: '上一题',
      nextQuestion: '下一题',
      relatedTopics: '相关知识点',
      pleaseAnswer: '请输入答案...',
      pleaseAnswerLong: '请详细作答...',
    },
    
    // 测试提交
    submit: {
      submitting: '正在提交答案...',
      grading: '正在批改试卷...',
      gradingMC: '正在评估选择题...',
      gradingSA: '正在分析简答题...',
      gradingLA: '正在评估论述题...',
      generatingReport: '正在生成学习报告...',
      almostDone: '即将完成...',
      completed: '批改完成！正在跳转到报告页面...',
      success: '测试已提交！',
      failed: '提交失败',
    },
    
    // 报告页
    report: {
      title: '水平测试报告',
      overallScore: '综合得分',
      predictedLevel: '预测DSE等级',
      timeSpent: '答题用时',
      correctRate: '正确率',
      totalQuestions: '总题数',
      correctCount: '答对题数',
      
      // 能力分析
      abilityAnalysis: '能力分析',
      knowledge: '知识',
      application: '应用',
      analysis: '分析',
      synthesis: '综合',
      evaluation: '评估',
      
      // 优劣势
      strengths: '优势领域',
      weaknesses: '待提升领域',
      
      // 建议
      recommendations: '学习建议',
      priority: '优先级',
      topic: '知识点',
      resources: '推荐资源',
      
      // 题目详情
      questionDetails: '题目详情',
      yourAnswer: '你的答案',
      correctAnswer: '正确答案',
      notAnswered: '未作答',
      feedback: '评价',
      
      // 操作
      backToSetup: '返回测试设置',
      backHome: '返回首页',
      retakeTest: '重新测试',
    },
    
    // 历史记录
    history: {
      title: '测试记录',
      empty: '暂无测试记录',
      testDate: '测试日期',
      subject: '科目',
      grade: '年级',
      score: '得分',
      level: '等级',
      viewReport: '查看报告',
    },
  },

  // 排行榜
  leaderboard: {
    title: '刷题排行榜',
    overall: '综合榜',
    subject: '科目榜',
    speed: '速度榜',
    
    // 筛选
    filter: {
      timeRange: '时间范围',
      grade: '年级',
      difficulty: '难度',
      subject: '科目',
      all: '全部',
      daily: '今日',
      weekly: '本周',
      monthly: '本月',
      allTime: '总榜',
    },
    
    // 排名
    rank: '排名',
    user: '用户',
    score: '得分',
    accuracy: '正确率',
    avgTime: '平均用时',
    questions: '题目数',
    
    // 用户卡片
    myRank: '我的排名',
    notRanked: '暂无排名',
    totalSessions: '刷题次数',
    totalQuestions: '总题目数',
    avgAccuracy: '平均正确率',
    
    // 状态
    loading: '加载中...',
    empty: '暂无数据',
    error: '加载失败',
    completeToJoin: '完成一次刷题即可加入排名',
    beFirstToRank: '成为第一个上榜的用户吧！',
  },

  // 积分系统
  points: {
    title: '积分中心',
    myPoints: '我的积分',
    totalPoints: '总积分',
    availablePoints: '可用积分',
    level: '等级',
    levelNames: {
      1: '学习新手',
      2: '进步达人',
      3: '学霸精英',
      4: 'DSE高手',
      5: '状元之星',
    },
    toNextLevel: '距离下一等级还需',
    pointsUnit: '积分',
    
    // 签到
    dailyCheckin: '每日签到',
    checkinSuccess: '签到成功！获得',
    alreadyCheckedIn: '今日已签到',
    checkedIn: '今日已签到 ✓',
    checkinButton: '每日签到 +10积分',
    checkinProcessing: '正在签到中…',
    
    // 统计
    statistics: '积分统计',
    earnPoints: '获取积分',
    recentActivity: '最近积分记录',
    viewAll: '查看全部',
    noRecords: '暂无积分记录，快去学习获取积分吧！',
    completed: '已完成',
    
    // 规则
    rules: {
      dailyLogin: '每日登录',
      completePractice: '完成刷题',
      completeTest: '完成测试',
      highScore: '测试高分',
      streak5: '连续答对5题',
      streak10: '连续答对10题',
      times: '次',
    },
    
    // 快捷入口
    quickActions: '快捷入口',
    goPractice: '去刷题',
    goTest: '水平测试',
    goMall: '积分商城',
    perTime: '每次',
    exchangeGifts: '兑换好礼',
    
    // 商城
    mall: {
      title: '积分商城',
      availableBalance: '积分可用',
      itemList: '商品列表',
      myOrders: '我的订单',
      exchange: '立即兑换',
      insufficientPoints: '积分不足',
      confirmExchange: '确认兑换',
      exchangeSuccess: '兑换成功！订单号：',
      productName: '商品名称',
      requiredPoints: '所需积分',
      currentPoints: '当前积分',
      afterExchange: '兑换后余额',
      receiverInfo: '收货信息（实物商品必填）',
      receiverPlaceholder: '请填写收货地址、联系方式等',
      stock: '库存',
      stockSufficient: '库存充足',
      remaining: '剩余',
      soldOut: '已售罄',
      virtual: '虚拟商品',
      digital: '数字商品',
      physical: '实物商品',
      orderStatus: {
        pending: '待处理',
        paid: '已扣积分',
        fulfilled: '已完成',
        cancelled: '已取消',
      },
      noItems: '商城暂无商品，敬请期待！',
      noOrders: '暂无订单记录',
    },
  },
}

export default zhCN
