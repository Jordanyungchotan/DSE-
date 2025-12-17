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
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'
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

  // 导航菜单项
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/analysis',
      icon: <FormOutlined />,
      label: '开始分析',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
    },
  ]

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: '我的记录',
      onClick: () => navigate('/history'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
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
            <span className={styles.logoIcon}>📚</span>
            <span className={styles.logoText}>DSE插班分析</span>
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
                  <span className={styles.userName}>{user?.name || '用户'}</span>
                </div>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                className={styles.loginBtn}
              >
                登录
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
        title="导航菜单"
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
        <div style={{ padding: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color)' }}>
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
              退出登录
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
              登录 / 注册
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
          <p>© 2024 DSE插班分析系统 | 专业的香港DSE升学辅导平台</p>
          <p className={styles.footerLinks}>
            <Link to="/">关于我们</Link>
            <span className={styles.divider}>|</span>
            <Link to="/">使用条款</Link>
            <span className={styles.divider}>|</span>
            <Link to="/">隐私政策</Link>
          </p>
        </div>
      </Footer>
    </Layout>
  )
}

export default MainLayout

