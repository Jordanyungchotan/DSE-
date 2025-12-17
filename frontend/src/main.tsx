import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

// Ant Design 主题配置
const themeConfig = {
  token: {
    // 主色调 - 深蓝渐变
    colorPrimary: '#1a365d',
    colorLink: '#2b6cb0',
    colorSuccess: '#38a169',
    colorWarning: '#d69e2e',
    colorError: '#e53e3e',
    // 圆角配置
    borderRadius: 8,
    // 字体配置
    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    // 间距
    padding: 16,
    margin: 16,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Card: {
      borderRadius: 12,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)

