# 数据主干对齐规范

> **目标**：确保所有页面展示的数据来源于同一套事实数据，消除前后端数据不一致问题

## 🧱 唯一数据事实源

所有与"学习 / 刷题 / 排名 / 积分 / 档案 / 历史"有关的数据 **只允许** 来源于以下两张表：

| 表名 | 用途 | 写入时机 |
|------|------|----------|
| `question_attempts` | 单题级事实（逐题作答记录） | 每次答题时 INSERT |
| `learning_events` | 行为级汇总（quiz / level-test / analysis） | 每次完成刷题/测试/分析时 INSERT |

### ❌ 禁止的数据源

- `quiz_sessions` / `quiz_results` 表（已废弃）
- 前端 store 计算结果
- session / store 中的临时值
- 页面跳转参数

## 🔗 数据流架构

```
用户答题
    ↓
question_attempts（逐题写入）
    ↓
learning_events（一次行为写入）
    ↓
────────────────────────────────
    ↓
学习档案 (LearningProfilePage)
    ↓
排行榜 (LeaderboardPage)
    ↓
积分系统 (PointsPage)
    ↓
错题本 / 历史记录 (WrongQuestionsPage / QuizHistoryPage)
```

## 📄 各页面数据来源规范

### 1️⃣ PointsPage（我的积分）

| API | 数据来源 | 前端职责 |
|-----|----------|----------|
| `GET /api/points/summary` | `point_events`, `user_point_summary` | 只渲染 |
| `GET /api/points/daily-tasks` | `learning_events` + `user_daily_task_counts` | 只渲染 |
| `GET /api/points/history` | `point_events` | 只渲染 |

**禁止前端计算**：`completed` / `achievedPoints` / `maxPoints` 全部由后端返回

### 2️⃣ LearningProfilePage（学习档案）

| 字段 | 数据来源 |
|------|----------|
| `overview` | `learning_events` 聚合 |
| `subjectMastery` | `question_attempts` 聚合 |
| `topicMastery` | `question_attempts` 聚合 |
| `recentActivity` | `learning_events` 聚合 |
| `currentStreak` | `learning_events` 连续日期计算 |

**禁止前端计算**：正确率、streak、趋势

### 3️⃣ LeaderboardPage（排行榜）

| API | 数据来源 | Score 公式 |
|-----|----------|------------|
| `GET /api/leaderboard/learning` | `learning_events` | `total_questions * 1 + correct_questions * 2 + duration_minutes * 0.1` |
| `GET /api/leaderboard/incentive` | `point_events` | 直接使用 `total_points` |

**禁止前端计算**：rank、score、accuracy

### 4️⃣ QuizHistoryPage（刷题记录）

| API | 数据来源 |
|-----|----------|
| `GET /api/quiz/history` | `learning_events` WHERE `event_type = 'QUIZ'` |

返回结构必须包含后端计算的 `stats`：
```typescript
{
  stats: {
    totalSessions: number,
    totalQuestions: number,
    averageAccuracy: number,
    totalTime: number
  },
  history: QuizHistoryItem[]
}
```

**禁止前端计算**：统计数据

### 5️⃣ LevelTestHistoryPage（水平测试记录）

| API | 数据来源 |
|-----|----------|
| `GET /api/level-test/history` | `learning_events` WHERE `event_type = 'LEVEL_TEST'` |

返回结构必须包含后端计算的 `progressData`

**禁止前端计算**：进步趋势、最佳/最差科目

### 6️⃣ WrongQuestionsPage（错题本）

| API | 数据来源 |
|-----|----------|
| `GET /api/quiz/wrong-questions` | `question_attempts` + `wrong_question_status` |

**禁止前端计算**：`wrongCount`、`status`

## ⚠️ 后端服务文件标注

所有涉及数据读取的后端服务文件头部必须包含以下注释：

```typescript
/**
 * ⚠️ 数据唯一来源：learning_events / question_attempts
 * ⚠️ 禁止从其他表读取刷题或积分依据
 */
```

## 🔍 自检清单

- [ ] 前端页面是否有 `calculateXxx` 函数？（应该删除）
- [ ] 前端页面是否有 mock 数据 fallback？（API 失败应显示空状态，不猜测数据）
- [ ] 后端 API 是否从 `quiz_sessions` 读取？（应改为 `learning_events`）
- [ ] 排名是否在前端计算？（应由后端返回 `rank` 字段）
- [ ] 正确率是否在前端计算？（应由后端返回 `accuracy` 字段）

## 📝 变更日志

- 2026-01-21: 创建数据主干对齐规范文档
