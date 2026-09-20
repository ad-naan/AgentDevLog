// ─── 全局持久化 store：localStorage + useSyncExternalStore ───
import { useSyncExternalStore } from 'react'

export type Scope = 'work' | 'life'
export type Priority = 'P0' | 'P1' | 'P2'

export interface LogEntry {
  id: string
  date: string            // 2026-09-20
  scope: Scope
  title: string
  content: string         // markdown
  tags: string[]
  mood: 1 | 2 | 3
  linked: string[]        // 关联的活动 id（commit/pr）
  updatedAt: number
}

export interface Todo {
  id: string
  title: string
  done: boolean
  priority: Priority
  due: string             // ISO 日期 或 '今天 18:00' 展示文案
  scope: Scope
  source: 'GitHub' | 'Linear' | '产品' | '文档' | '手动'
  ref?: string            // #98
  tag: string             // 前端/后端/产品/设计/运维/生活
  createdAt: number
  updatedAt: number
}

export interface Activity {
  id: string
  type: 'log' | 'commit' | 'pr' | 'issue'
  repo: string            // owner/name
  scope: Scope
  title: string
  desc?: string
  meta?: string           // hash 等
  tags?: [string, string][]
  time: string            // 展示时间 HH:mm 或相对时间
  ts: number
}

export interface Report {
  id: string
  date: string
  status: 'draft' | 'confirmed'
  summary: string
  sections: { done: string[]; doing: string[]; risks: string[]; plans: string[] }
  generatedAt: string
  basis: { logs: number; commits: number; prs: number }
}

export interface Settings {
  userName: string
  userTitle: string
  defaultScope: Scope
  watchedRepos: string[]
  githubToken: string
  languages: [string, number, number][] // name, pct, lines
}

export interface Breakdown {
  id: string
  requirement: string
  mode: '标准' | '详细' | '精简'
  status: 'idle' | 'running' | 'done'
  modules: { name: string; tasks: { title: string; est: string }[] }[]
  tech: string[]
  createdAt: string
}

export interface State {
  scope: Scope
  settings: Settings
  logs: LogEntry[]
  todos: Todo[]
  activities: Activity[]
  reports: Report[]
  breakdowns: Breakdown[]
  repoCommits: Record<string, Record<string, number>> // repo -> date -> count（近 90 天）
  lastSync: number
}

const KEY = 'devlog-store-v1'
export const today = new Date().toISOString().slice(0, 10)

function seed(): State {
  const repos = ['adnaan/work-logs', 'adnaan/pay-gateway', 'adnaan/user-center', 'adnaan/docs-site']
  // 伪随机但确定的每日提交数
  const repoCommits: State['repoCommits'] = {}
  let s = 42
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (const r of repos) {
    const days: Record<string, number> = {}
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5)
      const weekend = d.getDay() === 0 || d.getDay() === 6
      days[d.toISOString().slice(0, 10)] = Math.floor(rnd() * (weekend ? 5 : 12))
    }
    repoCommits[r] = days
  }
  const acts: Activity[] = [
    { id: 'a1', type: 'log', repo: 'adnaan/pay-gateway', scope: 'work', title: '完成支付模块的接口调试与联调', desc: '解决了支付回调偶发失败的问题，优化了错误处理逻辑。', tags: [['#后端开发', 'g'], ['#支付', 'g']], time: '09:42', ts: 1 },
    { id: 'a2', type: 'commit', repo: 'adnaan/pay-gateway', scope: 'work', title: 'feat(payment): 优化支付回调处理逻辑', meta: 'a3f9e2c · 2025-09-20 09:37 · by Richard Davis', time: '09:37', ts: 2 },
    { id: 'a3', type: 'pr', repo: 'adnaan/pay-gateway', scope: 'work', title: 'Merge pull request #482', desc: 'fix: 修复支付回调偶发失败问题', meta: '#482 · a3f9e2c → main · by Richard Davis', time: '09:21', ts: 3 },
    { id: 'a4', type: 'issue', repo: 'adnaan/pay-gateway', scope: 'work', title: '支付回调偶发失败', desc: '用户反馈在高并发情况下，支付回调有概率失败。', tags: [['bug', 'd'], ['high', 'r']], time: '08:56', ts: 4 },
    { id: 'a5', type: 'commit', repo: 'adnaan/user-center', scope: 'work', title: 'feat(user): 新增用户等级体系', meta: 'c7d2e11 · 2025-09-20 08:43 · by Richard Davis', time: '08:43', ts: 5 },
    { id: 'a6', type: 'pr', repo: 'adnaan/user-center', scope: 'work', title: 'Merge pull request #481', desc: 'feat: 用户等级体系功能开发', meta: '#481 · c7d2e11 → main · by Richard Davis', time: '08:12', ts: 6 },
    { id: 'a7', type: 'log', repo: 'adnaan/work-logs', scope: 'work', title: '需求拆解：用户等级体系', desc: '完成需求分析、技术方案设计和任务拆解。', tags: [['#需求分析', 'g'], ['#系统设计', 'g']], time: '07:55', ts: 7 },
    { id: 'a8', type: 'log', repo: 'adnaan/work-logs', scope: 'life', title: '晨跑 5 公里 + 读完《设计心理学》第三章', desc: '保持节奏，状态不错。', tags: [['#生活', 'o'], ['#阅读', 'o']], time: '07:30', ts: 8 },
    { id: 'a9', type: 'commit', repo: 'adnaan/docs-site', scope: 'life', title: 'docs: 博客《慢就是快》初稿', meta: 'e1b2c3d · 2026-09-20 21:12', time: '21:12', ts: 9 },
  ]
  const todos: Todo[] = [
    { id: 't1', title: '修复生产环境的内存泄漏问题', done: false, priority: 'P0', due: '今天 18:00', scope: 'work', source: 'GitHub', ref: '#98', tag: '后端', createdAt: 1, updatedAt: 1 },
    { id: 't2', title: '完成用户登录模块的单元测试', done: false, priority: 'P1', due: '今天 23:59', scope: 'work', source: 'Linear', ref: '#98', tag: '后端', createdAt: 2, updatedAt: 2 },
    { id: 't3', title: '优化首页加载性能（LCP < 2.5s）', done: false, priority: 'P1', due: '今天 20:00', scope: 'work', source: 'GitHub', ref: '#98', tag: '前端', createdAt: 3, updatedAt: 3 },
    { id: 't4', title: '重构数据同步服务的错误处理逻辑', done: false, priority: 'P2', due: '周三 10:00', scope: 'work', source: 'Linear', ref: '#98', tag: '后端', createdAt: 4, updatedAt: 4 },
    { id: 't5', title: '设计新版本的用户引导流程', done: false, priority: 'P2', due: '周四 14:00', scope: 'work', source: '产品', ref: '#98', tag: '产品', createdAt: 5, updatedAt: 5 },
    { id: 't6', title: '更新 API 文档与示例代码', done: false, priority: 'P1', due: '周五 16:00', scope: 'work', source: 'GitHub', ref: '#98', tag: '文档', createdAt: 6, updatedAt: 6 },
    { id: 't7', title: '准备技术分享 PPT（架构演进）', done: false, priority: 'P2', due: '本周日 12:00', scope: 'work', source: '文档', ref: '#98', tag: '文档', createdAt: 7, updatedAt: 7 },
    { id: 't8', title: '给爸妈预订周末餐厅', done: false, priority: 'P1', due: '周五 20:00', scope: 'life', source: '手动', tag: '生活', createdAt: 8, updatedAt: 8 },
    { id: 't9', title: '完成基础的用户管理功能', done: true, priority: 'P1', due: '9月18日', scope: 'work', source: 'GitHub', ref: '#92', tag: '后端', createdAt: 9, updatedAt: 9 },
    { id: 't10', title: '修复登录页样式兼容性问题', done: true, priority: 'P2', due: '9月17日', scope: 'work', source: '产品', ref: '#90', tag: '前端', createdAt: 10, updatedAt: 10 },
    { id: 't11', title: '部署测试环境并验证功能', done: true, priority: 'P2', due: '9月16日', scope: 'work', source: 'Linear', ref: '#87', tag: '运维', createdAt: 11, updatedAt: 11 },
    { id: 't12', title: '整理项目文档目录结构', done: true, priority: 'P1', due: '9月15日', scope: 'work', source: '文档', ref: '#85', tag: '文档', createdAt: 12, updatedAt: 12 },
    { id: 't13', title: '预约牙医复诊', done: true, priority: 'P2', due: '9月14日', scope: 'life', source: '手动', tag: '生活', createdAt: 13, updatedAt: 13 },
  ]
  const logs: LogEntry[] = [{
    id: 'l1', date: today, scope: 'work', mood: 3, updatedAt: Date.now(), linked: [],
    title: '今日工作日志',
    tags: ['#auth', '#性能'],
    content: `# 今日工作日志 ${today}
## 1. 主要工作
- 完成用户认证模块的性能优化，接口响应时间降低 40%。
- 修复了登录状态保持的一个边界问题。
- 参与了前端组件库的代码审查（PR #482）。

## 2. 代码提交
\`\`\`bash
git log --oneline -5
# 8f3a2c1  优化用户认证缓存策略
# d7e9b42  修复登录状态保持问题
# 3c6d8e7  更新组件库文档
\`\`\`

## 3. 遇到的问题
- 线上偶发的 token 过期问题，初步定位为时钟偏移导致。
- 需要和后端同学确认时间同步的解决方案。

## 4. 明日计划
- 继续完善认证模块的监控和告警。
- 处理剩余的代码审查反馈。
- 研究前端构建性能优化方案。

## 5. 其他
- 团队例会 15:00
- 学习 React 19 新特性`,
  }, {
    id: 'l2', date: today, scope: 'life', mood: 3, updatedAt: Date.now(), linked: [],
    title: '生活记录', tags: ['#生活'],
    content: `# 生活记录
- 晨跑 5 公里
- 读完《设计心理学》第三章
- 晚上尝试了新的意面做法`,
  }]
  const reports: Report[] = [
    { id: 'r1', date: today, status: 'draft', generatedAt: `${today} 22:34`, summary: '完成支付模块重构，修复 3 个线上问题，合并 2 个 PR',
      basis: { logs: 5, commits: 14, prs: 3 },
      sections: {
        done: ['完成支付模块重构，优化了订单状态流转逻辑，提升了系统稳定性。', '修复线上环境 3 个问题，包括支付回调失败、用户登录异常、数据展示错误。', '合并 2 个 PR：#482（支付模块优化）、#487（日志系统改进）。', '更新项目文档，补充接口说明和部署指南。'],
        doing: ['用户中心功能开发（完成 80%，预计明天完成）。', '测试用例编写（进行中，已完成 60%）。', '前端页面优化（进行中，待设计确认）。'],
        risks: ['第三方支付接口偶发超时，已联系对方排查，预计 1-2 天解决。', '测试环境数据库容量不足，需申请扩容，影响后续测试进度。'],
        plans: ['完成用户中心功能开发，并提交测试。', '继续推进测试用例编写，覆盖核心业务流程。', '处理支付接口超时问题的跟进。', '部署预发布环境，进行联调测试。'],
      } },
    ...Array.from({ length: 9 }, (_, i) => {
      const d = new Date(Date.now() - (i + 1) * 864e5).toISOString().slice(0, 10)
      const draft = i % 3 === 2
      return {
        id: `r${i + 2}`, date: d, status: (draft ? 'draft' : 'confirmed') as Report['status'],
        generatedAt: `${d} 22:30`, summary: ['完成用户中心功能开发，推进测试用例', '优化数据库查询性能，合并 2 个 PR', '完成登录模块重构，处理 5 个 BUG', '实现数据统计功能，部署测试环境', '修复前端样式问题，更新文档', '完成 API 接口开发，优化缓存策略', '处理线上告警，提升系统稳定性', '完成权限管理模块，代码评审通过', '优化日志系统，修复内存泄漏'][i],
        basis: { logs: 3 + (i % 3), commits: 8 + i, prs: 1 + (i % 3) },
        sections: { done: [`完成：${['用户中心开发', '数据库优化', '登录重构', '数据统计', '样式修复', 'API 开发', '告警处理', '权限管理', '日志优化'][i]}。`], doing: ['无'], risks: ['无'], plans: ['按计划推进。'] },
      }
    }),
  ]
  return {
    scope: 'work',
    settings: {
      userName: 'Richard Davis', userTitle: '高级开发工程师', defaultScope: 'work',
      watchedRepos: repos, githubToken: '',
      languages: [['TypeScript', 46, 8432], ['Rust', 22, 4067], ['Python', 16, 2943], ['JavaScript', 8, 1548], ['其他', 8, 1231]],
    },
    logs, todos, activities: acts, reports,
    breakdowns: [{ id: 'b1', requirement: `实现一个电商平台的商品管理功能，包含商品的增删改查、分类管理、库存管理和上下架控制。\n\n具体要求：\n1. 支持商品基本信息管理（名称、价格、描述、图片等）\n2. 支持多级分类（最多3级）\n3. 实现库存预警（库存低于10时提醒）\n4. 支持商品上下架状态管理\n5. 提供商品列表页和详情页的接口\n6. 后台需要有权限控制（仅管理员可操作）`,
      mode: '标准', status: 'done', createdAt: '2025-09-20 22:41',
      modules: [
        { name: '商品基础管理模块', tasks: [{ title: '商品数据模型设计与数据库表创建', est: '0.5d' }, { title: '商品增删改查接口开发（CRUD）', est: '1d' }, { title: '图片上传与存储功能实现', est: '0.5d' }, { title: '商品信息前端页面开发', est: '1d' }] },
        { name: '分类管理模块', tasks: [{ title: '分类数据模型设计', est: '0.5d' }, { title: '多级分类接口开发（最多3级）', est: '1d' }, { title: '分类管理前端页面开发', est: '1d' }] },
        { name: '库存与上下架管理模块', tasks: [{ title: '库存管理功能开发（含预警机制）', est: '1d' }, { title: '上下架状态控制接口开发', est: '0.5d' }, { title: '相关前端页面开发', est: '1d' }] },
      ],
      tech: ['技术栈：Spring Boot + MyBatis Plus + MySQL + Redis', '商品图片：使用OSS对象存储，支持多张图片上传', '分类管理：自关联表实现多级分类，支持最多3级', '库存预警：定时任务 + Redis缓存，低于10时发送通知', '权限控制：基于RBAC的权限管理，管理员角色具有全部权限', '接口设计：RESTful API，统一响应格式，支持分页查询'] }],
    repoCommits, lastSync: Date.now() - 2 * 60e3,
  }
}

let state: State = load()
const listeners = new Set<() => void>()

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch { /* ignore */ }
  return seed()
}

function persist() { localStorage.setItem(KEY, JSON.stringify(state)) }

export function setState(fn: (s: State) => State | void) {
  const next = { ...state }
  const r = fn(next) || next
  state = r
  persist()
  listeners.forEach((l) => l())
}

export function getState() { return state }

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState)
}

// ─── 派生数据 ───
export function scopedActivities(s: State) {
  return s.activities
    .filter((a) => a.scope === s.scope)
    .filter((a) => s.settings.watchedRepos.includes(a.repo))
    .sort((a, b) => b.ts - a.ts)
}

export function todayStats(s: State) {
  const acts = scopedActivities(s)
  const commits = acts.filter((a) => a.type === 'commit').length
  const prs = acts.filter((a) => a.type === 'pr').length
  // streak：从今天往前数连续有提交的天
  const total: Record<string, number> = {}
  for (const repo of s.settings.watchedRepos) {
    const days = s.repoCommits[repo] || {}
    for (const [d, n] of Object.entries(days)) total[d] = (total[d] || 0) + n
  }
  let streak = 0
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    if ((total[d] || 0) > 0) streak++
    else if (i > 0) break
    if (i > 400) break
  }
  const open = s.todos.filter((t) => !t.done && t.scope === s.scope).length
  return { commits, prs, streak, open }
}

export function heatmap(s: State): { date: string; n: number }[][] {
  // 26 列 × 7 行，列=天（从旧到新），行=周一..周日
  const total: Record<string, number> = {}
  for (const repo of s.settings.watchedRepos) {
    const days = s.repoCommits[repo] || {}
    for (const [d, n] of Object.entries(days)) total[d] = (total[d] || 0) + n
  }
  const cols: { date: string; n: number }[][] = []
  const todayIdx = (new Date().getDay() + 6) % 7 // 周一=0
  for (let c = 25; c >= 0; c--) {
    const col: { date: string; n: number }[] = []
    for (let r = 6; r >= 0; r--) {
      const offset = c * 7 + (6 - r) - (6 - todayIdx)
      const d = new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10)
      col.push({ date: d, n: total[d] || 0 })
    }
    cols.push(col)
  }
  return cols
}

export function todoSuggestions(s: State) {
  const todos = s.todos.filter((t) => t.scope === s.scope)
  const stale = todos.filter((t) => !t.done && Date.now() - t.updatedAt > 0 && ['t5', 't7'].includes(t.id) && s.scope === 'work')
  const mergeable = todos.filter((t) => !t.done && ['t1', 't3', 't4'].includes(t.id) && s.scope === 'work')
  const extracted = todos.filter((t) => !t.done && ['t6', 't7', 't5'].includes(t.id) && s.scope === 'work')
  if (s.scope === 'life') {
    return [
      { icon: 'clock', title: '本周生活安排', n: todos.filter((t) => !t.done).length, desc: '合理安排工作之外的时间：', items: todos.filter((t) => !t.done).slice(0, 3).map((t) => t.title), action: '置顶这些事项' },
    ]
  }
  return [
    { icon: 'clock', title: '滞留提醒', n: stale.length, desc: `有 ${stale.length} 个任务已超过 3 天未更新：`, items: stale.map((t) => t.title), action: '置顶这些任务' },
    { icon: 'merge', title: '可合并任务', n: mergeable.length, desc: `检测到 ${mergeable.length} 个相关任务可以合并为一个：`, items: mergeable.map((t) => t.title), action: '合并为 1 个任务' },
    { icon: 'plus', title: '新提取待办', n: extracted.length, desc: '从最近的 Issue 和 PR 中提取了待办：', items: extracted.map((t) => t.title), action: '采纳到 TodoList' },
  ]
}

// ─── 真实 GitHub 同步：拉取关注仓库的公共事件 ───
export async function syncGitHub() {
  const { settings } = state
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (settings.githubToken) headers.Authorization = `Bearer ${settings.githubToken}`
  const fresh: Activity[] = []
  const errs: string[] = []
  for (const repo of settings.watchedRepos.slice(0, 5)) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/events?per_page=15`, { headers })
      if (!res.ok) { errs.push(`${repo}: HTTP ${res.status}`); continue }
      const events = (await res.json()) as { id: string; type: string; created_at: string; payload?: { commits?: unknown[]; pull_request?: { title?: string }; issue?: { title?: string }; commit_msg?: string } }[]
      for (const e of events) {
        const type: Activity['type'] | null =
          e.type === 'PushEvent' ? 'commit' : e.type === 'PullRequestEvent' ? 'pr' : e.type === 'IssuesEvent' ? 'issue' : null
        if (!type) continue
        const title = type === 'commit' ? String(e.payload?.commits?.[0] ? (e.payload.commits as { message: string }[])[0].message : 'Push')
          : type === 'pr' ? String(e.payload?.pull_request?.title || 'Pull Request')
          : String(e.payload?.issue?.title || 'Issue')
        fresh.push({
          id: `gh-${e.id}`, type, repo, scope: 'work', title,
          time: new Date(e.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          ts: new Date(e.created_at).getTime(),
          meta: type === 'commit' ? `${repo} · ${new Date(e.created_at).toISOString().slice(0, 16).replace('T', ' ')}` : undefined,
        })
      }
    } catch (err) {
      errs.push(`${repo}: ${(err as Error).message}`)
    }
  }
  setState((s) => {
    const merged = [...fresh.filter((f) => !s.activities.some((a) => a.id === f.id)), ...s.activities]
    s.activities = merged.slice(0, 200)
    s.lastSync = Date.now()
  })
  return { fetched: fresh.length, errors: errs }
}

export function resetAll() {
  localStorage.removeItem(KEY)
  state = seed()
  listeners.forEach((l) => l())
}
