// ─── 共享类型与工具（服务端/客户端通用）───

export type Scope = 'work' | 'life'
export type Priority = 'P0' | 'P1' | 'P2'

export interface LogDTO {
  id: number
  date: string
  scope: Scope
  title: string
  content: string
  tags: string[]
  mood: number
  linked: string[]
  updatedAt: number
}

export interface TodoDTO {
  id: number
  title: string
  done: boolean
  priority: Priority
  due: string
  scope: Scope
  source: string
  ref?: string | null
  tag: string
  createdAt: number
  updatedAt: number
}

export interface ActivityDTO {
  id: number
  type: 'log' | 'commit' | 'pr' | 'issue'
  repo: string
  scope: Scope
  title: string
  desc?: string | null
  meta?: string | null
  tags?: [string, string][] | null
  ts: number
}

export interface ReportDTO {
  id: number
  date: string
  /** work=面向上级的汇报 | life=面向自我的复盘，两套报告互不混杂 */
  scope: Scope
  status: 'draft' | 'confirmed'
  summary: string
  sections: { done: string[]; doing: string[]; risks: string[]; plans: string[] }
  generatedAt: string
  basis: {
    logs: number
    commits: number
    prs: number
    kind?: 'day' | 'week'
    range?: [string, string]
    todos?: number
    projects?: { name: string; commits: number; prs: number }[]
  }
}

export interface BreakdownDTO {
  id: number
  requirement: string
  mode: '标准' | '详细' | '精简'
  status: 'idle' | 'running' | 'done'
  modules: { name: string; tasks: { title: string; est: string }[] }[]
  tech: string[]
  createdAt: string
}

export interface AppState {
  user: { name: string; title: string; login?: string | null; avatar?: string | null }
  settings: {
    workStart: string
    workEnd: string
    watchedRepos: string[]
    /** 生活分区关注的仓库（个人项目等），同步后归入 life 分区 */
    watchedReposLife: string[]
    githubToken: string
    githubUser: string
    languages: [string, number, number][]
    llmBaseUrl: string
    llmModel: string
    llmApiKey: string
  }
  logs: LogDTO[]
  todos: TodoDTO[]
  activities: ActivityDTO[]
  reports: ReportDTO[]
  breakdowns: BreakdownDTO[]
  repoCommits: Record<string, Record<string, number>>
  lastSync: number
}

export const today = () => new Date().toISOString().slice(0, 10)

// ─── 客户端派生数据（scope 为 UI 状态，由调用方传入）───
/** 按分区取关注仓库列表 */
export const watchedReposFor = (s: AppState, scope: Scope) =>
  scope === 'life' ? s.settings.watchedReposLife : s.settings.watchedRepos

export function scopedActivities(s: AppState, scope: Scope) {
  const repos = watchedReposFor(s, scope)
  return s.activities
    .filter((a) => a.scope === scope)
    .filter((a) => a.type === 'log' || repos.includes(a.repo))
    .sort((a, b) => b.ts - a.ts)
}

export function todayStats(s: AppState, scope: Scope) {
  const t = today()
  const acts = scopedActivities(s, scope).filter((a) => new Date(a.ts).toISOString().slice(0, 10) === t)
  const commits = acts.filter((a) => a.type === 'commit').length
  const prs = acts.filter((a) => a.type === 'pr').length
  const total = dailyTotals(s, scope)
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    if ((total[d] || 0) > 0) streak++
    else if (i > 0) break
  }
  const open = s.todos.filter((x) => !x.done && x.scope === scope).length
  return { commits, prs, streak, open }
}

/**
 * 每日活跃量（驱动趋势/热力图/连续天数）。
 * 工作区 = 关注仓库的 commit 数；生活区 = 生活仓库 commit 数 + 当日生活记录条数。
 */
export function dailyTotals(s: AppState, scope: Scope = 'work'): Record<string, number> {
  const total: Record<string, number> = {}
  for (const repo of watchedReposFor(s, scope)) {
    const days = s.repoCommits[repo] || {}
    for (const [d, n] of Object.entries(days)) total[d] = (total[d] || 0) + n
  }
  if (scope === 'life') {
    for (const l of s.logs) {
      if (l.scope === 'life') total[l.date] = (total[l.date] || 0) + 1
    }
  }
  return total
}

export function lastNDays(s: AppState, n: number, scope: Scope = 'work'): number[] {
  const total = dailyTotals(s, scope)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10)
    return total[d] || 0
  })
}

export function heatmap(s: AppState, weeks = 26, scope: Scope = 'work'): { date: string; n: number }[][] {
  const total = dailyTotals(s, scope)
  const cols: { date: string; n: number }[][] = []
  const todayIdx = (new Date().getDay() + 6) % 7
  for (let c = weeks - 1; c >= 0; c--) {
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
