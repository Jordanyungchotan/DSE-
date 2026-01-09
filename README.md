# DSE 升学分析系统

一个基于 Web 的香港 DSE（中学文凭考试）补习班插班分析与建议系统，通过 AI 智能分析学生情况，提供个性化的插班和成绩提升建议。

![DSE Analysis System](https://img.shields.io/badge/DSE-Analysis%20System-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6)

## 🌟 功能特点

### 📝 用户输入模块
- **插班时间选择**：日历选择器，支持选择目标插班日期和学期
- **学生信息录入**：年级、年龄、当前学校等基本信息
- **科目成绩管理**：支持所有 DSE 科目的成绩和目标录入
- **目标学校选择**：香港主要中学列表，按地区分类

### 🤖 AI 智能分析
- **DeepSeek API 集成**：利用先进 AI 技术进行深度分析
- **插班可行性评估**：综合评分和详细分析
- **科目强弱项诊断**：识别学习差距，提供针对性建议
- **目标学校录取评估**：根据学校要求对比分析

### 📊 结果展示
- **综合评估卡片**：可视化展示插班成功概率
- **雷达图分析**：直观展示各科目成绩分布
- **学习计划建议**：个性化时间规划表
- **PDF 报告导出**：支持下载完整分析报告

### 👤 用户管理
- **账号系统**：注册/登录功能
- **历史记录**：保存和管理分析记录
- **进度追踪**：跟踪学习进展

## 🛠️ 技术栈

### 前端
- **React 18** + **TypeScript**
- **Vite** - 现代化构建工具
- **Ant Design 5** - UI 组件库
- **Recharts** - 图表可视化
- **Zustand** - 状态管理
- **React Router v6** - 路由管理

### 后端
- **Node.js** + **Express**
- **TypeScript**
- **SQLite** (better-sqlite3) - 轻量级数据库
- **JWT** - 认证授权
- **Zod** - 数据验证

### AI 集成
- **DeepSeek API** - AI 分析引擎

## 📁 项目结构

```
dse-consulting-system/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   │   └── Layout/      # 布局组件
│   │   ├── pages/           # 页面组件
│   │   ├── stores/          # Zustand 状态管理
│   │   ├── styles/          # 全局样式
│   │   └── main.tsx         # 入口文件
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # 后端代码
│   ├── src/
│   │   ├── database/        # 数据库初始化
│   │   ├── middleware/      # 中间件
│   │   ├── routes/          # 路由定义
│   │   ├── services/        # 业务逻辑
│   │   └── index.ts         # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── package.json              # 工作区配置
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd dse-consulting-system

# 安装所有依赖
npm run install:all
```

### 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# 服务器配置
PORT=5000
NODE_ENV=development

# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 数据库配置
DATABASE_PATH=./data/dse_consulting.db

# 跨域配置
CORS_ORIGIN=http://localhost:3000
```

### 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:5000
```

### 构建生产版本

```bash
npm run build
```

## 📖 API 文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| PUT | `/api/auth/me` | 更新用户信息 |

### 分析接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/analysis/submit` | 提交分析请求 |
| GET | `/api/analysis/result/:id` | 获取分析结果 |
| GET | `/api/analysis/history` | 获取历史记录 |
| DELETE | `/api/analysis/history/:id` | 删除历史记录 |
| GET | `/api/analysis/subjects` | 获取科目列表 |
| GET | `/api/analysis/grades` | 获取成绩等级 |
| GET | `/api/analysis/schools` | 获取学校列表 |

## 🎨 界面预览

系统包含以下主要页面：

1. **首页** - 系统介绍和功能入口
2. **分析表单** - 四步式表单填写学生信息
3. **分析结果** - 详细的 AI 分析报告展示
4. **历史记录** - 管理过往分析记录
5. **登录/注册** - 用户认证页面

## 🔧 配置说明

### DeepSeek API 配置

1. 访问 [DeepSeek 官网](https://www.deepseek.com/) 注册账号
2. 获取 API Key
3. 在 `.env` 文件中配置 `DEEPSEEK_API_KEY`

> 注意：如未配置 API Key，系统将使用模拟数据进行演示

### 数据库配置

系统默认使用 SQLite 数据库，数据文件存储在 `backend/data/` 目录下。如需使用其他数据库，请修改数据库配置。

## 📝 开发计划

- [x] Phase 1: 基础框架搭建
- [x] Phase 2: 核心功能实现
- [x] Phase 3: AI 集成
- [x] Phase 4: 用户管理
- [ ] Phase 5: 移动端优化
- [ ] Phase 6: 多语言支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**DSE 插班分析系统** - 专业的香港 DSE 升学辅导平台 📚

