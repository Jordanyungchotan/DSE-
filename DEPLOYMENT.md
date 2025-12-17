# DSE 插班分析系统 - Cloudflare 部署指南

本指南将帮助您将系统部署到 Cloudflare 平台。

## 📋 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────────────┐ │
│  │  Cloudflare      │      │  Cloudflare Workers      │ │
│  │  Pages           │ ───▶ │  (后端API)               │ │
│  │  (前端静态资源)   │      │  + D1 Database          │ │
│  └──────────────────┘      └──────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 方案一：前端部署到 Cloudflare Pages（推荐先做这步）

### 步骤 1：登录 Cloudflare

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 登录或注册账号

### 步骤 2：创建 Pages 项目

1. 在左侧菜单选择 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**

### 步骤 3：连接 GitHub 仓库

1. 授权 Cloudflare 访问您的 GitHub
2. 选择仓库：`Jordanyungchotan/DSE-`
3. 点击 **Begin setup**

### 步骤 4：配置构建设置

填写以下配置：

| 设置项 | 值 |
|--------|-----|
| **Project name** | `dse-analysis` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `cd frontend && npm install && npm run build` |
| **Build output directory** | `frontend/dist` |
| **Root directory** | `/` |

### 步骤 5：设置环境变量

在 **Environment variables** 部分添加：

| 变量名 | 值 |
|--------|-----|
| `NODE_VERSION` | `18` |
| `VITE_API_URL` | `https://your-backend.workers.dev`（后端部署后填写）|

### 步骤 6：部署

点击 **Save and Deploy**，等待部署完成。

部署成功后，您将获得一个类似 `dse-analysis.pages.dev` 的域名。

---

## 🔧 方案二：后端部署到 Cloudflare Workers

### 前置准备

1. 安装 Wrangler CLI：
```bash
npm install -g wrangler
```

2. 登录 Cloudflare：
```bash
wrangler login
```

### 步骤 1：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create dse-database

# 记录返回的 database_id，类似：
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 步骤 2：创建 Workers 配置

在 `backend/` 目录下已创建 `wrangler.toml`：

```toml
name = "dse-analysis-api"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "dse-database"
database_id = "your-database-id-here"  # 替换为上一步获取的ID

[vars]
DEEPSEEK_API_KEY = ""  # 在 Cloudflare Dashboard 中设置
JWT_SECRET = ""        # 在 Cloudflare Dashboard 中设置
```

### 步骤 3：初始化数据库表

创建 `backend/schema.sql`：

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_info TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON analysis_records(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

执行：
```bash
wrangler d1 execute dse-database --file=./schema.sql
```

### 步骤 4：部署 Workers

```bash
cd backend
wrangler deploy
```

### 步骤 5：设置密钥

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages → 您的 Worker
2. 点击 Settings → Variables
3. 添加以下密钥：
   - `DEEPSEEK_API_KEY`: 您的 DeepSeek API 密钥
   - `JWT_SECRET`: 随机生成的密钥字符串

---

## 🌐 方案三：使用其他平台部署后端（更简单）

如果 Workers 配置复杂，可以考虑：

### Railway（推荐）

1. 访问 [Railway](https://railway.app/)
2. 使用 GitHub 登录
3. New Project → Deploy from GitHub repo
4. 选择您的仓库，设置：
   - Root Directory: `backend`
   - Start Command: `npm run build && npm start`
5. 添加环境变量：
   - `PORT`: `5000`
   - `DEEPSEEK_API_KEY`: 您的密钥
   - `JWT_SECRET`: 随机密钥

### Render

1. 访问 [Render](https://render.com/)
2. New → Web Service
3. 连接 GitHub 仓库
4. 配置：
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

---

## 📝 部署后配置

### 更新前端 API 地址

部署后端后，更新 Cloudflare Pages 的环境变量：

1. 进入 Cloudflare Dashboard → Pages → 您的项目
2. Settings → Environment variables
3. 更新 `VITE_API_URL` 为后端实际地址
4. 重新部署前端

### 自定义域名（可选）

1. 在 Cloudflare Pages 项目中
2. Custom domains → Add domain
3. 输入您的域名
4. 按提示配置 DNS

---

## 🔍 常见问题

### Q: 部署失败怎么办？
A: 检查 Build logs，常见问题：
- Node 版本不对：确保设置 `NODE_VERSION=18`
- 路径错误：确认 Build output directory 正确

### Q: API 请求失败？
A: 检查：
- CORS 配置是否正确
- API 地址是否正确
- 环境变量是否设置

### Q: 如何查看日志？
A: 在 Cloudflare Dashboard → Workers → Logs

---

## 📞 支持

如有问题，请提交 GitHub Issue。

