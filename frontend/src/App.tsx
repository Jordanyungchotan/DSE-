import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Spin } from 'antd'
import MainLayout from './components/Layout/MainLayout'

// 懒加载页面组件
const HomePage = lazy(() => import('./pages/HomePage'))
const AnalysisFormPage = lazy(() => import('./pages/AnalysisFormPage'))
const UniversityAnalysisPage = lazy(() => import('./pages/UniversityAnalysisPage'))
const ResultPage = lazy(() => import('./pages/ResultPage'))
const UniversityResultPage = lazy(() => import('./pages/UniversityResultPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

// 智能刷题页面
const QuizSetupPage = lazy(() => import('./pages/QuizSetupPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const QuizResultPage = lazy(() => import('./pages/QuizResultPage'))
const WrongQuestionsPage = lazy(() => import('./pages/WrongQuestionsPage'))
const QuizHistoryPage = lazy(() => import('./pages/QuizHistoryPage'))
const LearningProfilePage = lazy(() => import('./pages/LearningProfilePage'))

// 管理员后台页面
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))

// 加载中组件
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: 'var(--bg-primary)'
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
)

/**
 * DSE插班分析系统 - 主应用组件
 * 
 * 路由结构:
 * - / : 首页，展示系统介绍和功能入口
 * - /analysis : 分析表单页，填写学生信息
 * - /result/:id : 分析结果页，展示AI分析报告
 * - /history : 历史记录页，查看过往分析
 * - /login : 登录/注册页
 * - /quiz : 智能刷题配置页
 * - /quiz/practice : 答题页面
 * - /quiz/result : 刷题结果页
 */
function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* 登录页面 - 独立布局 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 管理员后台 - 独立布局 */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        
        {/* 主布局路由 */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="analysis" element={<AnalysisFormPage />} />
          <Route path="analysis/university" element={<UniversityAnalysisPage />} />
          <Route path="result/:id" element={<ResultPage />} />
          <Route path="result/university/:id" element={<UniversityResultPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="quiz" element={<QuizSetupPage />} />
          <Route path="quiz/practice" element={<QuizPage />} />
          <Route path="quiz/result" element={<QuizResultPage />} />
          <Route path="quiz/wrong-questions" element={<WrongQuestionsPage />} />
          <Route path="quiz/history" element={<QuizHistoryPage />} />
          <Route path="quiz/profile" element={<LearningProfilePage />} />
        </Route>
        
        {/* 404重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App

