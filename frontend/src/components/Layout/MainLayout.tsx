import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button, Drawer, Avatar, Dropdown } from 'antd'
import {
  HomeOutlined,
  FormOutlined,
  HistoryOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  ExperimentOutlined,
  BookOutlined,
  LineChartOutlined,
  TrophyOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  FileSearchOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import LanguageSwitch from '../LanguageSwitch/LanguageSwitch'
import styles from './MainLayout.module.css'

const { Header, Content, Footer } = Layout

/**
 * 主布局组件
 * 包含顶部导航栏、主内容区域和底部版权信息
 */
const MainLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const { t } = useLanguageStore()

  // 导航菜单项
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('nav.home'),
    },
    {
      key: '/analysis',
      icon: <FormOutlined />,
      label: t('nav.analysis'),
    },
    {
      key: 'quiz-group',
      icon: <ExperimentOutlined />,
      label: t('nav.smartQuiz'),
      children: [
        {
          key: '/quiz',
          icon: <ExperimentOutlined />,
          label: t('nav.startQuiz'),
        },
        {
          key: '/quiz/wrong-questions',
          icon: <BookOutlined />,
          label: t('nav.wrongQuestions'),
        },
        {
          key: '/quiz/history',
          icon: <HistoryOutlined />,
          label: t('nav.quizHistory'),
        },
        {
          key: '/quiz/profile',
          icon: <LineChartOutlined />,
          label: t('nav.learningProfile'),
        },
      ],
    },
    {
      key: 'level-test-group',
      icon: <SafetyCertificateOutlined />,
      label: '水平测试',
      children: [
        {
          key: '/level-test',
          icon: <SafetyCertificateOutlined />,
          label: '开始测试',
        },
        {
          key: '/level-test/history',
          icon: <FileSearchOutlined />,
          label: '测试记录',
        },
      ],
    },
    {
      key: '/leaderboard',
      icon: <TrophyOutlined />,
      label: `🏆 ${t('nav.leaderboard')}`,
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: t('nav.history'),
    },
  ]

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <LineChartOutlined />,
      label: t('nav.learningProfile'),
      onClick: () => navigate('/quiz/profile'),
    },
    {
      key: 'achievements',
      icon: <TrophyOutlined />,
      label: t('leaderboard.myRank'),
      onClick: () => navigate('/quiz/profile?tab=achievements'),
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: t('nav.myRecords'),
      onClick: () => navigate('/history'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: () => {
        logout()
        navigate('/')
      },
    },
  ]

  return (
    <Layout className={styles.layout}>
      {/* 背景装饰 */}
      <div className="page-background" />

      {/* 顶部导航栏 */}
      <Header className={styles.header}>
        <div className={styles.headerContent}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <img src="/logo.png" alt="Logo" className={styles.logoImage} />
            <span className={styles.logoText}>{t('system.name')}</span>
          </Link>

          {/* 桌面端导航菜单 */}
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            className={styles.desktopMenu}
          />

          {/* 右侧操作区 */}
          <div className={styles.headerRight}>
            {/* 语言切换 */}
            <LanguageSwitch />

            {isAuthenticated ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <div className={styles.userInfo}>
                  <Avatar
                    key={user?.avatar || 'default-avatar'}
                    size="small"
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                  <span className={styles.userName}>{user?.name || t('common.loading')}</span>
                </div>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                className={styles.loginBtn}
              >
                {t('nav.login')}
              </Button>
            )}

            {/* 移动端菜单按钮 */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className={styles.mobileMenuBtn}
            />
          </div>
        </div>
      </Header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title={t('nav.home')}
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key)
            setMobileMenuOpen(false)
          }}
          style={{ border: 'none' }}
        />
        
        {/* 移动端语言切换 */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <LanguageSwitch />
        </div>
        
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          {isAuthenticated ? (
            <Button
              block
              icon={<LogoutOutlined />}
              onClick={() => {
                logout()
                navigate('/')
                setMobileMenuOpen(false)
              }}
            >
              {t('nav.logout')}
            </Button>
          ) : (
            <Button
              type="primary"
              block
              icon={<LoginOutlined />}
              onClick={() => {
                navigate('/login')
                setMobileMenuOpen(false)
              }}
            >
              {t('nav.login')} / {t('nav.register')}
            </Button>
          )}
        </div>
      </Drawer>

      {/* 主内容区域 */}
      <Content className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </Content>

      {/* 底部版权信息 */}
      <Footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>{t('system.copyright')} | {t('system.slogan')}</p>
          <p className={styles.footerLinks}>
            <Link to="/">{t('footer.aboutUs')}</Link>
            <span className={styles.divider}>|</span>
            <Link to="/">{t('footer.terms')}</Link>
            <span className={styles.divider}>|</span>
            <Link to="/">{t('footer.privacy')}</Link>
          </p>
        </div>
      </Footer>

      {/* 移动端底部导航栏 */}
      <div className={styles.mobileBottomBar}>
        <Link 
          to="/" 
          className={`${styles.bottomNavItem} ${location.pathname === '/' ? styles.active : ''}`}
        >
          <HomeOutlined className={styles.icon} />
          <span>{t('nav.home')}</span>
        </Link>
        <Link 
          to="/quiz" 
          className={`${styles.bottomNavItem} ${location.pathname.startsWith('/quiz') ? styles.active : ''}`}
        >
          <ExperimentOutlined className={styles.icon} />
          <span>{t('nav.startQuiz')}</span>
        </Link>
        <Link 
          to="/level-test" 
          className={`${styles.bottomNavItem} ${location.pathname.startsWith('/level-test') ? styles.active : ''}`}
        >
          <SafetyCertificateOutlined className={styles.icon} />
          <span>测试</span>
        </Link>
        <Link 
          to="/leaderboard" 
          className={`${styles.bottomNavItem} ${location.pathname === '/leaderboard' ? styles.active : ''}`}
        >
          <TrophyOutlined className={styles.icon} />
          <span>{t('nav.leaderboard')}</span>
        </Link>
        {isAuthenticated ? (
          <Link 
            to="/settings" 
            className={`${styles.bottomNavItem} ${location.pathname === '/settings' ? styles.active : ''}`}
          >
            <UserOutlined className={styles.icon} />
            <span>我的</span>
          </Link>
        ) : (
          <Link 
            to="/login" 
            className={`${styles.bottomNavItem} ${location.pathname === '/login' ? styles.active : ''}`}
          >
            <LoginOutlined className={styles.icon} />
            <span>{t('nav.login')}</span>
          </Link>
        )}
      </div>
    </Layout>
  )
}

export default MainLayout
