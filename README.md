# DSE 智能学习平台

<div align="center">

![DSE Smart Learning](https://img.shields.io/badge/DSE-Smart%20Learning-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=for-the-badge&logo=typescript)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare)

**一站式香港 DSE 升学辅导平台**

智能分析 · AI 刷题 · 个性化学习 · 游戏化激励

[线上演示](https://dse-29x.pages.dev) · [后端仓库](https://github.com/Jordanyungchotan/dse-rag-worker)

</div>

---

## 🎯 项目简介

DSE 智能学习平台是为香港中学生打造的一站式升学辅导系统，涵盖：

- **升学分析**：JUPAS 大学申请 + 插班可行性评估
- **智能刷题**：RAG 题库检索 + AI 动态生成
- **水平测试**：自适应难度 + 学习诊断
- **游戏化学习**：积分系统 + 成就徽章 + 排行榜

## ✨ 核心功能

### 📊 升学分析系统

| 功能 | 描述 |
|------|------|
| **JUPAS 大学申请分析** | 基于 Best 5/6 成绩计算，匹配 8 大院校课程要求 |
| **插班可行性评估** | 规则引擎 + AI 混合分析，评估中学插班成功率 |
| **科目强弱诊断** | 识别学习差距，生成针对性提升建议 |
| **AI 增强报告** | DeepSeek/Qwen 加持，提供深度分析与规划 |

### 📝 智能刷题系统

| 功能 | 描述 |
|------|------|
| **题库优先** | 从 D1 数据库检索真题，用户级去重 |
| **AI 补题** | 题库不足时 AI 动态生成，自动入库复用 |
| **多科目支持** | 中文、英文、数学、通识、物理、化学等 |
| **实时反馈** | 即时判题 + 答案解析 + 错题收集 |

### 🎯 水平测试

| 功能 | 描述 |
|------|------|
| **自适应测试** | 根据表现动态调整难度 |
| **能力诊断** | 生成详细能力雷达图 |
| **学习建议** | AI 分析薄弱环节，推荐学习路径 |

### 🎮 游戏化激励

| 功能 | 描述 |
|------|------|
| **积分系统** | 学习行为驱动，非签到币 |
| **成就徽章** | 首次刷题、连续学习、高正确率等 |
| **多维排行榜** | 积分榜、学习强度榜、连续学习榜 |
| **积分商城** | 积分兑换学习资源 |
| **学习推荐** | 基于用户画像的个性化推荐 |

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                      │
│                   (React + TypeScript)                   │
├─────────────────────────────────────────────────────────┤
│  UI Layer: Ant Design 5 + CSS Modules                   │
│  State: Zustand                                          │
│  Router: React Router v6                                 │
│  Charts: Recharts                                        │
│  i18n: 中文繁体 / 中文简体 / English                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Workers                      │
│                (dse-rag-questions API)                   │
├─────────────────────────────────────────────────────────┤
│  Framework: Hono.js                                      │
│  Database: Cloudflare D1 (SQLite)                       │
│  Cache: Cloudflare KV                                    │
│  AI: DeepSeek / Qwen API                                │
└─────────────────────────────────────────────────────────┘
```

## 📱 页面总览

### 学习功能
- `QuizSetupPage` - 刷题设置（科目/难度/题数）
- `QuizPage` - 刷题答题界面
- `QuizResultPage` - 刷题结果 + AI 推荐
- `QuizHistoryPage` - 刷题历史记录
- `LevelTestSetupPage` - 水平测试设置
- `LevelTestPage` - 水平测试答题
- `LevelTestReportPage` - 测试报告 + 能力诊断
- `WrongQuestionsPage` - 错题本

### 升学分析
- `AnalysisFormPage` - 插班分析表单
- `ResultPage` - JUPAS 分析结果
- `TransferResultPage` - 插班分析结果（V2）
- `UniversityAnalysisPage` - 大学申请分析
- `HistoryPage` - 分析历史记录

### 用户中心
- `PointsPage` - 积分概览 + 每日任务
- `PointsMallPage` - 积分商城
- `AchievementsPage` - 成就徽章
- `LeaderboardPage` - 多维排行榜
- `LearningProfilePage` - 学习档案
- `UserSettingsPage` - 个人设置

### 社区功能
- `CommunityPage` - 帖子列表
- `PostDetailPage` - 帖子详情
- `NewPostPage` - 发布新帖
- `FriendsPage` - 好友列表
- `MessagesPage` - 私信

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm / yarn / pnpm

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/Jordanyungchotan/DSE-chaban.git
cd DSE-chaban/DSE--4

# 安装依赖
cd frontend && npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 配置 API 地址

# 启动开发服务器
npm run dev
```

### 环境变量

```env
# 后端 API 地址
VITE_RAG_API_URL=https://dse-rag-questions.jordanyungchotan.workers.dev

# API Token（可选）
VITE_RAG_API_TOKEN=your_token

# 启用 RAG 服务
VITE_USE_RAG_SERVICE=true
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 部署到 Cloudflare Pages
# 已配置 GitHub 自动部署
git push origin main
```

## 📊 数据流向

```
用户学习行为
     │
     ▼
┌─────────────────┐
│ learning_events │ ← 原始学习记录
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  point_events   │ ← 积分事件（带完整上下文）
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
排行榜     学习推荐
```

## 🔗 相关仓库

| 仓库 | 说明 |
|------|------|
| [dse-rag-worker](https://github.com/Jordanyungchotan/dse-rag-worker) | 后端 API（Cloudflare Worker） |

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

<div align="center">

**DSE 智能学习平台** - 让学习更高效、更有趣 🎓

Made with ❤️ in Hong Kong

</div>
