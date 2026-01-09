/**
 * 版本更新提示组件
 * 当检测到新版本时显示更新提示
 */
import React from 'react'
import { Alert, Button, Space } from 'antd'
import { ReloadOutlined, RocketOutlined } from '@ant-design/icons'
import { useVersionCheck } from '../hooks/useVersionCheck'
import { useLanguageStore } from '../stores/languageStore'

const UpdatePrompt: React.FC = () => {
  const { updateAvailable, forceUpdate } = useVersionCheck()
  const { locale } = useLanguageStore()
  const isEnglish = locale === 'en'

  if (!updateAvailable) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: 500,
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: 12,
        overflow: 'hidden'
      }}
    >
      <Alert
        type="info"
        showIcon
        icon={<RocketOutlined />}
        message={
          <Space>
            <span style={{ fontWeight: 600 }}>
              {isEnglish ? 'New version available!' : '发现新版本！'}
            </span>
          </Space>
        }
        description={
          isEnglish 
            ? 'A new version of the app is available. Please refresh to get the latest features and fixes.'
            : '应用有新版本可用，请刷新页面以获取最新功能和修复。'
        }
        action={
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={forceUpdate}
            style={{ marginTop: 8 }}
          >
            {isEnglish ? 'Refresh Now' : '立即刷新'}
          </Button>
        }
      />
    </div>
  )
}

export default UpdatePrompt
