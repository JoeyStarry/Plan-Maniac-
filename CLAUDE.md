# Plan Maniac V1 — 项目上下文

## 项目概述
Plan Maniac 是一款商业化计划管理应用（Web + Mobile），核心功能是通过 AI 助手 Pico 帮助用户制定和管理个人计划。

## 当前状态
- **前端 Demo 已完成** — `plan-maniac-web/`（React + TypeScript + Vite + Ant Design）
- **后端尚未开始** — 下一步创建 `plan-maniac-api/`
- **商业化架构方案已制定** — 详见 `.claude/plans/swirling-foraging-moler.md`

## 技术栈
- 前端：React 19 + TypeScript + Vite + Ant Design + dayjs + @dnd-kit
- 后端（待建）：NestJS + Prisma + PostgreSQL + Redis
- AI：国产大模型（DeepSeek / 通义千问 / 文心一言），多模型切换，SSE 流式
- 认证：JWT + Refresh Token
- 云：AWS (EC2/RDS/S3/CloudFront)
- CI/CD：Docker + GitHub Actions

## 前端 Demo 页面（6 个）
1. Login — 登录/注册/忘记密码（`src/pages/Login/`）
2. Home — 日历首页，月视图 + 日计划查看（`src/pages/Home/`）
3. Today — 当日计划管理，拖拽排序 + 颜色标记 + 完成奖励（`src/pages/Today/`）
4. PlanChat — 计划分类选择，词云风格按钮布局（`src/pages/PlanChat/`）
5. Chat — Pico AI 聊天，模拟对话流程（`src/pages/Chat/`）
6. Profile — 用户信息，头像/昵称/积分/积分商城（`src/pages/Profile/`）

## 下一步待执行：后端基础架构（第一阶段）
1. 初始化 NestJS 项目 `plan-maniac-api/`
2. docker-compose.yml（PostgreSQL + Redis）
3. Prisma Schema（12 张表）
4. Auth 模块（注册/登录/JWT/刷新）
5. User 模块（个人信息 CRUD）
6. Plan 模块（计划 CRUD + 排序 + 完成）
7. Category 模块（分类管理）
8. Points 模块（积分系统）
9. Swagger API 文档
10. 测试覆盖

## 关键约定
- 主题色：`#667eea`（渐变到 `#764ba2`）
- API 响应格式：`{ code: 0, data, message }`
- Plan 颜色标记：red / yellow / white
- Plan 来源：user（手动创建）/ pico（AI 生成）
- 用户唯一 ID 格式：`PM-YYYYMMDD-XXXX`
