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
      label: '智能刷题',
      children: [
        {
          key: '/quiz',
          icon: <ExperimentOutlined />,
          label: '开始刷题',
        },
        {
          key: '/quiz/wrong-questions',
          icon: <BookOutlined />,
          label: '错题本',
        },
        {
          key: '/quiz/history',
          icon: <HistoryOutlined />,
          label: '刷题记录',
        },
      ],
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
      key: 'history',
      icon: <HistoryOutlined />,
      label: t('nav.myRecords'),
      onClick: () => navigate('/history'),
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
                    size="small"
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
    </Layout>
  )
}

export default MainLayout
