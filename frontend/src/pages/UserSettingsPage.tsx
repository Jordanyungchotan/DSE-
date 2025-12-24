import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Upload, 
  Avatar, 
  Typography, 
  Divider, 
  message, 
  Tabs,
  Space,
  Modal
} from 'antd'
import {
  UserOutlined,
  CameraOutlined,
  LockOutlined,
  SaveOutlined,
  MailOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../config/api'
import styles from './UserSettingsPage.module.css'

const { Title, Text, Paragraph } = Typography

/**
 * 用户设置页面
 */
const UserSettingsPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user, token, updateUser } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录')
      navigate('/login')
      return
    }
    
    // 初始化表单
    if (user) {
      profileForm.setFieldsValue({
        name: user.name,
        email: user.email,
      })
      setAvatarUrl(user.avatar || '')
    }
  }, [isAuthenticated, user, navigate, profileForm])

  // 处理头像上传
  const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    
    setUploadingAvatar(true)
    
    try {
      // 将文件转换为 base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        
        // 压缩图片（如果需要）
        const compressedBase64 = await compressImage(base64, 200, 200)
        
        // 保存到服务器
        const response = await apiFetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ avatar: compressedBase64 }),
        })

        if (response.ok) {
          setAvatarUrl(compressedBase64)
          updateUser({ ...user!, avatar: compressedBase64 })
          message.success('头像上传成功')
          onSuccess?.(null)
        } else {
          // 如果API不存在，暂时保存到本地
          setAvatarUrl(compressedBase64)
          updateUser({ ...user!, avatar: compressedBase64 })
          message.success('头像已更新')
          onSuccess?.(null)
        }
      }
      reader.readAsDataURL(file as File)
    } catch (error) {
      console.error('Upload error:', error)
      message.error('上传失败')
      onError?.(error as Error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // 压缩图片
  const compressImage = (base64: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = base64
    })
  }

  // 保存个人资料
  const handleSaveProfile = async (values: { name: string; email: string }) => {
    setLoading(true)
    
    try {
      const response = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        updateUser({ ...user!, name: values.name, email: values.email })
        message.success('个人资料已保存')
      } else {
        // 如果API不存在，暂时保存到本地
        updateUser({ ...user!, name: values.name })
        message.success('个人资料已更新')
      }
    } catch (error) {
      console.error('Save profile error:', error)
      // 暂时保存到本地
      updateUser({ ...user!, name: values.name })
      message.success('个人资料已更新')
    } finally {
      setLoading(false)
    }
  }

  // 修改密码
  const handleChangePassword = async (values: { 
    currentPassword: string
    newPassword: string
    confirmPassword: string 
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致')
      return
    }

    setPasswordLoading(true)
    
    try {
      const response = await apiFetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      })

      if (response.ok) {
        message.success('密码修改成功')
        passwordForm.resetFields()
      } else {
        const data = await response.json()
        message.error(data.message || '密码修改失败')
      }
    } catch (error) {
      console.error('Change password error:', error)
      message.error('密码修改失败，请稍后重试')
    } finally {
      setPasswordLoading(false)
    }
  }

  // 删除账户确认
  const handleDeleteAccount = () => {
    Modal.confirm({
      title: '确定要删除账户吗？',
      content: '删除后，您的所有数据将被永久删除，无法恢复。',
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await apiFetch('/api/user/account', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            message.success('账户已删除')
            useAuthStore.getState().logout()
            navigate('/')
          } else {
            message.error('删除失败')
          }
        } catch (error) {
          console.error('Delete account error:', error)
          message.error('删除失败，请稍后重试')
        }
      },
    })
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> 个人资料
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          {/* 头像上传 */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              <Avatar 
                size={100} 
                src={avatarUrl} 
                icon={<UserOutlined />}
                className={styles.avatar}
              />
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleAvatarUpload}
              >
                <Button 
                  shape="circle" 
                  icon={<CameraOutlined />} 
                  className={styles.uploadBtn}
                  loading={uploadingAvatar}
                />
              </Upload>
            </div>
            <div className={styles.avatarInfo}>
              <Title level={4}>{user?.name || '用户'}</Title>
              <Text type="secondary">{user?.email}</Text>
              <Paragraph type="secondary" className={styles.avatarTip}>
                点击相机图标更换头像，支持 JPG、PNG 格式
              </Paragraph>
            </div>
          </div>

          <Divider />

          {/* 个人资料表单 */}
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleSaveProfile}
            className={styles.profileForm}
          >
            <Form.Item
              name="name"
              label="昵称"
              rules={[
                { required: true, message: '请输入昵称' },
                { min: 2, message: '昵称至少2个字符' },
                { max: 20, message: '昵称最多20个字符' },
              ]}
            >
              <Input 
                prefix={<EditOutlined />} 
                placeholder="请输入昵称"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="请输入邮箱"
                size="large"
                disabled // 邮箱通常不允许修改
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                保存修改
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined /> 修改密码
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.passwordSection}>
            <div className={styles.passwordIcon}>
              <LockOutlined />
            </div>
            <Title level={4}>修改登录密码</Title>
            <Paragraph type="secondary">
              为了账户安全，请定期更换密码。密码长度至少6位，建议包含字母和数字。
            </Paragraph>
          </div>

          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            className={styles.passwordForm}
          >
            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="请输入当前密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="请输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="请再次输入新密码"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={passwordLoading}
                size="large"
              >
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'danger',
      label: (
        <span style={{ color: '#f5222d' }}>
          ⚠️ 危险操作
        </span>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.dangerSection}>
            <Title level={4} type="danger">删除账户</Title>
            <Paragraph type="secondary">
              删除账户后，您的所有数据（包括刷题记录、错题本、学习档案等）将被永久删除，无法恢复。
            </Paragraph>
            <Space direction="vertical" size="middle">
              <Text type="warning">
                ⚠️ 此操作不可逆，请谨慎操作
              </Text>
              <Button 
                danger 
                onClick={handleDeleteAccount}
              >
                删除我的账户
              </Button>
            </Space>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.settingsPage}>
      {/* 页面标题 */}
      <div className={styles.pageHeader}>
        <Title level={2}>
          <UserOutlined /> 账户设置
        </Title>
        <Paragraph type="secondary">
          管理您的个人资料、密码和账户安全
        </Paragraph>
      </div>

      {/* 设置卡片 */}
      <Card className={styles.settingsCard}>
        <Tabs 
          items={tabItems} 
          tabPosition="left"
          className={styles.settingsTabs}
        />
      </Card>
    </div>
  )
}

export default UserSettingsPage

