/**
 * DSE插班分析系统 - 后端服务入口
 * 
 * 主要功能：
 * 1. 用户认证（登录/注册）
 * 2. 分析请求处理
 * 3. DeepSeek API集成
 * 4. 历史记录管理
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { authRouter } from './routes/auth.js'
import { analysisRouter } from './routes/analysis.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initDatabase } from './database/init.js'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ===== 中间件配置 =====

// 安全头部
app.use(helmet({
  contentSecurityPolicy: false, // 开发环境禁用
}))

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// 请求体解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 请求频率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: { error: '请求过于频繁，请稍后再试' },
})
app.use('/api', limiter)

// ===== 路由配置 =====

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// 认证路由
app.use('/api/auth', authRouter)

// 分析路由
app.use('/api/analysis', analysisRouter)

// ===== 错误处理 =====
app.use(errorHandler)

// 404处理
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// ===== 启动服务 =====

const startServer = async () => {
  try {
    // 初始化数据库
    await initDatabase()
    console.log('✅ 数据库初始化完成')

    // 启动HTTP服务
    app.listen(PORT, () => {
      console.log(`
🚀 DSE插班分析系统后端服务启动成功！
📍 服务地址: http://localhost:${PORT}
📊 健康检查: http://localhost:${PORT}/api/health
🔐 API文档: http://localhost:${PORT}/api/docs (开发中)
      `)
    })
  } catch (error) {
    console.error('❌ 服务启动失败:', error)
    process.exit(1)
  }
}

startServer()

