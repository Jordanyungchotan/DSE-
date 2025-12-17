import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Tabs,
  message,
  Divider,
  Checkbox,
} from 'antd'
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import styles from './LoginPage.module.css'

const { Title, Text, Paragraph } = Typography

/**
 * 登录/注册页面
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login')
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const { login, register, loading } = useAuthStore()

  /**
   * 处理登录
   */
  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password)
      message.success('登录成功！')
      navigate('/')
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      } else {
        message.error('登录失败，请检查邮箱和密码')
      }
    }
  }

  /**
   * 处理注册
   */
  const handleRegister = async (values: {
    name: string
    email: string
    password: string
  }) => {
    try {
      await register(values.name, values.email, values.password)
      message.success('注册成功！')
      navigate('/')
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      } else {
        message.error('注册失败，请稍后重试')
      }
    }
  }

  // Tab配置
  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form
          form={loginForm}
          layout="vertical"
          onFinish={handleLogin}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱地址"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <div className={styles.formExtras}>
              <Checkbox>记住我</Checkbox>
              <Link to="/" className={styles.forgotLink}>
                忘记密码？
              </Link>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegister}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, message: '姓名至少2个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="姓名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱地址"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[
              { pattern: /^[0-9]{8}$/, message: '请输入有效的香港电话号码' },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="电话号码（选填）"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="设置密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('请阅读并同意用户协议')),
              },
            ]}
          >
            <Checkbox>
              我已阅读并同意{' '}
              <Link to="/">用户协议</Link> 和{' '}
              <Link to="/">隐私政策</Link>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ]

  return (
    <div className={styles.loginPage}>
      {/* 背景装饰 */}
      <div className={styles.background}>
        <div className={styles.bgShape1} />
        <div className={styles.bgShape2} />
        <div className={styles.bgShape3} />
      </div>

      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        className={styles.backBtn}
      >
        返回首页
      </Button>

      {/* 登录卡片 */}
      <Card className={styles.loginCard}>
        {/* Logo和标题 */}
        <div className={styles.cardHeader}>
          <span className={styles.logo}>📚</span>
          <Title level={2} className="gradient-title">
            DSE插班分析
          </Title>
          <Paragraph type="secondary">
            登录以保存您的分析记录和个人设置
          </Paragraph>
        </div>

        <Divider />

        {/* 登录/注册表单 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
          className={styles.authTabs}
        />

        {/* 第三方登录 */}
        <div className={styles.socialLogin}>
          <Divider>
            <Text type="secondary">或</Text>
          </Divider>
          <Text type="secondary" className={styles.guestText}>
            无需登录也可使用基础分析功能
          </Text>
          <Button
            size="large"
            block
            onClick={() => navigate('/analysis')}
          >
            直接开始分析
          </Button>
        </div>
      </Card>

      {/* 底部信息 */}
      <div className={styles.footer}>
        <Text type="secondary">
          © 2024 DSE插班分析系统 | 专业的香港DSE升学辅导平台
        </Text>
      </div>
    </div>
  )
}

export default LoginPage

