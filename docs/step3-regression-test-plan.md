# Step 3 回测方案文档

> 本文档作为 Step 3 的正式验收依据，由本地启动服务后人工执行。

---

## 一、回测目标

| 编号 | 验收项 | 说明 |
|------|--------|------|
| T1 | CSD Pass/Fail 识别 | 公民与社会发展科只接受 `pass` / `fail`，不接受等级制 |
| T2 | 科目来源一致性 | 所有科目必须来自 `shared/domain/subjects.ts` |
| T3 | 成绩体系一致性 | 普通科目使用等级制，CSD 使用 Pass/Fail |
| T4 | 年级/等级组合 | 不同年级与等级组合不应引发异常 |
| T5 | 输出结构完整性 | 返回结构包含 `riskLevel` / `summary` / `advice` 等必要字段 |

---

## 二、接口清单

| 功能 | 接口路径 | 方法 |
|------|----------|------|
| 插班分析 | `/api/analysis/submit` | POST |
| 大学申请分析 | `/api/analysis/university` | POST |

---

## 三、插班分析回测用例

### 用例 T-1：标准必修科目 + CSD 达标

**输入**

```json
{
  "enrollmentDate": "2026-09-01",
  "semester": "2026-2027-1",
  "grade": "S4",
  "age": 15,
  "currentSchool": "测试中学",
  "subjects": [
    { "subject": "中文", "currentScore": "4", "targetScore": "5" },
    { "subject": "英文", "currentScore": "5", "targetScore": "5*" },
    { "subject": "数学", "currentScore": "5*", "targetScore": "5**" },
    { "subject": "公民与社会发展", "currentScore": "pass", "targetScore": "pass" }
  ],
  "targetSchools": ["皇仁书院"],
  "notes": ""
}
```

**调用接口**

```
POST /api/analysis/submit
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.overallAssessment.feasibilityScore` | 数值 0-100 |
| `result.overallAssessment.feasibilityLevel` | A/B/C/D/E 之一 |
| `result.subjectAnalyses` | 数组，包含 4 个科目 |
| `result.subjectAnalyses[3].subject` | `公民与社会发展` |
| `result.subjectAnalyses[3].ruleAnalysis.current.riskLevel` | `low` |
| `result.subjectAnalyses[3].ruleAnalysis.current.summary` | 包含「已达到课程要求」字样 |
| 无 pattern/enum mismatch 错误 | ✅ |

---

### 用例 T-2：CSD 未达标 + 高年级

**输入**

```json
{
  "enrollmentDate": "2026-09-01",
  "semester": "2026-2027-1",
  "grade": "S5",
  "age": 16,
  "currentSchool": "测试中学",
  "subjects": [
    { "subject": "中文", "currentScore": "3", "targetScore": "4" },
    { "subject": "英文", "currentScore": "3", "targetScore": "4" },
    { "subject": "数学", "currentScore": "4", "targetScore": "5" },
    { "subject": "公民与社会发展", "currentScore": "fail", "targetScore": "pass" }
  ],
  "targetSchools": ["拔萃男书院"],
  "notes": "高年级插班测试"
}
```

**调用接口**

```
POST /api/analysis/submit
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.subjectAnalyses[3].ruleAnalysis.current.riskLevel` | `high` |
| `result.subjectAnalyses[3].ruleAnalysis.current.summary` | 包含「尚未达标」字样 |
| `result.subjectAnalyses[3].ruleAnalysis.current.advice` | 包含「优先补救」字样 |
| `result.subjectAnalyses[3].ruleAnalysis.target.riskLevel` | `low` |
| 无异常抛出 | ✅ |

---

### 用例 T-3：必修 + 选修科目组合 + 中低年级

**输入**

```json
{
  "enrollmentDate": "2026-02-01",
  "semester": "2025-2026-2",
  "grade": "S3",
  "age": 14,
  "currentSchool": "测试中学",
  "subjects": [
    { "subject": "中文", "currentScore": "4", "targetScore": "5" },
    { "subject": "英文", "currentScore": "4", "targetScore": "5" },
    { "subject": "数学", "currentScore": "5", "targetScore": "5*" },
    { "subject": "公民与社会发展", "currentScore": "pass", "targetScore": "pass" },
    { "subject": "物理", "currentScore": "4", "targetScore": "5" },
    { "subject": "化学", "currentScore": "3", "targetScore": "4" }
  ],
  "targetSchools": ["圣保罗男女中学", "喇沙书院"],
  "notes": "含选修科目测试"
}
```

**调用接口**

```
POST /api/analysis/submit
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.subjectAnalyses.length` | 6 |
| 所有科目名称 | 均在 `shared/domain/subjects.ts` 定义范围内 |
| CSD 科目 | `riskLevel` 为 `low`（因 pass） |
| 物理/化学 | `riskLevel` 为 `medium`（普通科目 fallback） |
| 无 pattern/UUID 错误 | ✅ |

---

### 用例 T-4：非法 CSD 等级值（负面测试）

**输入**

```json
{
  "enrollmentDate": "2026-09-01",
  "semester": "2026-2027-1",
  "grade": "S4",
  "age": 15,
  "currentSchool": "测试中学",
  "subjects": [
    { "subject": "中文", "currentScore": "4", "targetScore": "5" },
    { "subject": "英文", "currentScore": "4", "targetScore": "5" },
    { "subject": "数学", "currentScore": "4", "targetScore": "5" },
    { "subject": "公民与社会发展", "currentScore": "5*", "targetScore": "5**" }
  ],
  "targetSchools": ["皇仁书院"],
  "notes": ""
}
```

**调用接口**

```
POST /api/analysis/submit
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | **400** |
| `error` | 包含 `Invalid civics status` 字样 |
| 不应进入分析逻辑 | ✅ |

---

## 四、大学申请分析回测用例

### 用例 U-1：标准 DSE 成绩 + CSD 达标

**输入**

```json
{
  "dseResults": [
    { "subject": "中文", "grade": "5" },
    { "subject": "英文", "grade": "5*" },
    { "subject": "数学", "grade": "5**" },
    { "subject": "公民与社会发展", "grade": "pass" },
    { "subject": "物理", "grade": "5" },
    { "subject": "化学", "grade": "4" }
  ],
  "targetUniversities": ["hku", "cuhk"],
  "targetMajors": ["工程学", "计算机科学"],
  "extracurriculars": "学生会主席",
  "careerInterests": ["科技"]
}
```

**调用接口**

```
POST /api/analysis/university
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.bestFive` | 数值（基于最佳 5 科计算） |
| `result.bestSix` | 数值（基于最佳 6 科计算） |
| `result.subjectAnalyses` | 数组，包含 6 个科目 |
| `result.subjectAnalyses` 中 CSD | `riskLevel` 为 `low` |
| `result.admissionAnalysis` | 存在且结构完整 |
| 无 pattern/enum 错误 | ✅ |

---

### 用例 U-2：CSD 未达标 + 多选修科目

**输入**

```json
{
  "dseResults": [
    { "subject": "中文", "grade": "4" },
    { "subject": "英文", "grade": "4" },
    { "subject": "数学", "grade": "5" },
    { "subject": "公民与社会发展", "grade": "fail" },
    { "subject": "经济", "grade": "5" },
    { "subject": "企业会计与财务概论", "grade": "4" },
    { "subject": "历史", "grade": "4" }
  ],
  "targetUniversities": ["polyu", "cityu"],
  "targetMajors": ["商业管理", "会计"],
  "extracurriculars": "",
  "careerInterests": ["商业金融"]
}
```

**调用接口**

```
POST /api/analysis/university
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.subjectAnalyses` 中 CSD | `riskLevel` 为 `high` |
| `result.subjectAnalyses` 中 CSD | `summary` 包含「尚未达标」 |
| `result.subjectAnalyses` 中 CSD | `advice` 包含「优先补救」 |
| 所有科目名称 | 均在 `shared/domain/subjects.ts` 定义范围内 |
| 无异常 | ✅ |

---

### 用例 U-3：边界成绩组合

**输入**

```json
{
  "dseResults": [
    { "subject": "中文", "grade": "2" },
    { "subject": "英文", "grade": "2" },
    { "subject": "数学", "grade": "3" },
    { "subject": "公民与社会发展", "grade": "pass" },
    { "subject": "生物", "grade": "3" }
  ],
  "targetUniversities": ["eduhk", "hkmu"],
  "targetMajors": ["教育"],
  "extracurriculars": "",
  "careerInterests": ["教育"]
}
```

**调用接口**

```
POST /api/analysis/university
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | 200 |
| `result.bestFive` | 数值（即使成绩较低也能正常计算） |
| `result.subjectAnalyses` | 5 个科目均有分析 |
| CSD | `riskLevel` 为 `low` |
| 无崩溃或异常 | ✅ |

---

### 用例 U-4：非法普通科目使用 Pass/Fail（负面测试）

**输入**

```json
{
  "dseResults": [
    { "subject": "中文", "grade": "pass" },
    { "subject": "英文", "grade": "5" },
    { "subject": "数学", "grade": "5" },
    { "subject": "公民与社会发展", "grade": "pass" }
  ],
  "targetUniversities": ["hku"],
  "targetMajors": ["文学"],
  "extracurriculars": "",
  "careerInterests": []
}
```

**调用接口**

```
POST /api/analysis/university
Content-Type: application/json
```

**期望结果**

| 字段 | 期望值 |
|------|--------|
| HTTP Status | **400** |
| `error` | 包含 `Invalid grade value` 字样 |
| 不应进入分析逻辑 | ✅ |

---

## 五、验收检查清单

### 5.1 插班分析验收

| 编号 | 检查项 | 用例覆盖 | 通过 |
|------|--------|----------|------|
| T1-1 | CSD = pass 时 riskLevel = low | T-1, T-3 | ☐ |
| T1-2 | CSD = fail 时 riskLevel = high | T-2 | ☐ |
| T1-3 | CSD 使用等级值时返回 400 | T-4 | ☐ |
| T2-1 | 所有科目名称来自 shared/domain | T-1, T-2, T-3 | ☐ |
| T3-1 | 普通科目 riskLevel = medium | T-3 | ☐ |
| T4-1 | S3 年级不报错 | T-3 | ☐ |
| T4-2 | S5 年级不报错 | T-2 | ☐ |
| T5-1 | 输出包含完整结构 | T-1, T-2, T-3 | ☐ |

### 5.2 大学申请分析验收

| 编号 | 检查项 | 用例覆盖 | 通过 |
|------|--------|----------|------|
| U1-1 | CSD = pass 时 riskLevel = low | U-1, U-3 | ☐ |
| U1-2 | CSD = fail 时 riskLevel = high | U-2 | ☐ |
| U1-3 | 普通科目使用 pass/fail 返回 400 | U-4 | ☐ |
| U2-1 | 所有科目名称来自 shared/domain | U-1, U-2, U-3 | ☐ |
| U3-1 | bestFive/bestSix 正确计算 | U-1, U-2, U-3 | ☐ |
| U4-1 | 边界成绩不崩溃 | U-3 | ☐ |
| U5-1 | 输出包含 subjectAnalyses | U-1, U-2, U-3 | ☐ |

---

## 六、执行步骤

1. **启动后端服务**
   ```bash
   cd backend && npm install && npm run dev:node
   # 或使用 wrangler dev
   ```

2. **使用工具发送请求**（curl / Postman / 前端页面）

3. **逐个执行用例**，记录实际返回值

4. **对照期望结果**，在检查清单中标记通过/失败

5. **若有失败项**，记录错误信息并反馈

---

## 七、回测通过标准

- ✅ 所有正向用例返回 200 且结构完整
- ✅ 所有负向用例返回 400 且错误信息准确
- ✅ CSD 分析完全由规则表驱动（riskLevel 正确）
- ✅ 无 pattern / UUID / enum mismatch 错误
- ✅ 插班与大学分析共用相同的科目与成绩校验逻辑

---

*文档版本：v1.0*  
*生成时间：2026-01-20*
