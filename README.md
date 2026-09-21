# DevLog — 个人工作日志与任务管理

一个面向开发者的个人工作台：日志、待办、任务拆解、周报、GitHub 动态与 AI 助手，全部数据存储在 PostgreSQL 中。

## 技术栈

- **Next.js 16**（App Router）+ **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 6** + **PostgreSQL**

## 功能

- **Dashboard**：快速记录（AI 自动识别待办/日志）、热力图、趋势图
- **Logs**：按日期的日志编辑器，支持 Markdown 工具栏、标签、心情
- **Todos**：待办管理，支持截止时间
- **Breakdown**：需求/功能拆解为可勾选的子任务
- **Reports**：周报生成与查看
- **Analytics**：数据分析
- **GitHub 同步**：关注的仓库动态（Settings 中配置 token 与仓库）
- **AI 助手**：可配置任意 OpenAI 兼容 LLM（BaseUrl / Model / API Key），支持日报生成、待办转换等指令

## 快速开始

```bash
npm install
```

配置环境变量（根目录 `.env`，已被 gitignore）：

```env
DATABASE_URL="postgresql://user:password@host:5432/devlog"
```

同步数据库结构：

```bash
npx prisma db push
```

> 注意：若数据库用户无 CREATEDB 权限（无法创建影子库），请使用 `db push` 而非 `migrate dev`。

启动开发服务器：

```bash
npm run dev
```

打开 http://localhost:3000 。所有页面数据来自 `/api/state`，首次使用无种子数据，直接在页面上录入即可。

## 目录结构

```
src/
├── lib/          # prisma.ts / data.ts / github.ts / llm.ts / agent.ts / types.ts
├── app/
│   ├── api/      # REST 接口：logs / todos / breakdowns / reports / settings /
│   │             # state / sync / reset / quick / insight / ai / llm
│   └── (pages)/  # dashboard / logs / breakdown / todos / reports / analytics / settings
└── components/   # Shell / StoreProvider / CommandPalette / Assistant / Toast / pages/*
```
