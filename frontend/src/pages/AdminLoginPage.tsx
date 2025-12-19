import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { LockOutlined, SafetyOutlined } from '@ant-design/icons'
import styles from './AdminLoginPage.module.css'

const { Title, Text } = Typography

const AdminLoginPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { adminKey: string }) => {
    setLoading(true)
    
    // 验证管理员密钥
    if (values.adminKey === 'zhixin2024admin') {
      // 存储到 sessionStorage（关闭浏览器后失效）
      sessionStorage.setItem('adminKey', values.adminKey)
      message.success('登录成功')
      navigate('/admin/dashboard')
    } else {
      message.error('管理员密钥错误')
    }
    
    setLoading(false)
  }

  return (
    <div className={styles.adminLoginPage}>
      <div className={styles.loginContainer}>
        <Card className={styles.loginCard}>
          <div className={styles.logoSection}>
            <SafetyOutlined className={styles.logoIcon} />
            <Title level={3} className={styles.title}>管理员后台</Title>
            <Text type="secondary">质心DSE升学分析系统</Text>
          </div>
          
          <Form
            layout="vertical"
            onFinish={handleLogin}
            className={styles.loginForm}
          >
            <Form.Item
              name="adminKey"
              rules={[{ required: true, message: '请输入管理员密钥' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="管理员密钥"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div className={styles.footer}>
            <Text type="secondary">仅限授权管理员访问</Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default AdminLoginPage

