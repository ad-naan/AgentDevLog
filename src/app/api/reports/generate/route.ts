import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { today } from '@/lib/types'
import { agentReport, agentWeeklyReport, type WeeklyProjectInput } from '@/lib/agent'
import { llmErrorResponse } from '@/lib/http'

/** 上周一 ~ 周日（本地时区，ISO 日期字符串） */
function lastWeekRange(): [string, string, Date, Date] {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // 周一=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - 7)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const next = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return [fmt(monday), fmt(sunday), monday, next]
}

export async function POST(req: Request) {
  const userId = await ensureUser()
  const body = await req.json().catch(() => ({}))
  const scope = body.scope === 'life' ? 'life' : 'work'
  const period = body.period === 'week' ? 'week' : 'day'
  const t = today()

  try {
    if (period === 'week') {
      const [from, to, weekStart, weekEnd] = lastWeekRange()
      const [logs, acts, todos] = await Promise.all([
        prisma.log.findMany({ where: { userId, scope } }),
        prisma.activity.findMany({
          where: { userId, scope, ts: { gte: weekStart, lt: weekEnd } },
        }),
        prisma.todo.findMany({ where: { userId, scope } }),
      ])
      const weekLogs = logs.filter((l) => l.date >= from && l.date <= to)
      const closedTodos = todos
        .filter((x) => x.done && x.updatedAt >= weekStart && x.updatedAt < weekEnd)
        .map((x) => x.title)
      const openTodos = todos.filter((x) => !x.done).map((x) => x.title)

      // 按项目（repo）聚合可量化数据
      const byProject = new Map<string, WeeklyProjectInput>()
      for (const a of acts) {
        const key = a.repo || '未归类'
        let p = byProject.get(key)
        if (!p) byProject.set(key, (p = { name: key, commits: 0, prs: 0, samples: [] }))
        if (a.type === 'commit') {
          p.commits++
          if (p.samples.length < 10) p.samples.push(a.title)
        } else if (a.type === 'pr') {
          p.prs++
          p.samples.push(a.title)
        }
      }
      // 日志也归入对应项目（按 tag 粗略关联），无 repo 时作为独立项目展示
      const projects = [...byProject.values()]
      if (weekLogs.length) {
        projects.push({ name: '日志记录', commits: 0, prs: 0, samples: weekLogs.map((l) => l.title) })
      }

      const { summary, sections } = await agentWeeklyReport(userId, scope, {
        range: [from, to],
        projects,
        logs: weekLogs.map((l) => ({ title: l.title, content: l.content })),
        closedTodos,
        openTodos,
      })
      const basis = {
        kind: 'week' as const,
        range: [from, to] as [string, string],
        logs: weekLogs.length,
        commits: acts.filter((a) => a.type === 'commit').length,
        prs: acts.filter((a) => a.type === 'pr').length,
        todos: closedTodos.length,
        projects: projects.map((p) => ({ name: p.name, commits: p.commits, prs: p.prs })),
      }
      const generatedAt = `${t} ${new Date().toTimeString().slice(0, 5)}`
      const report = await prisma.report.upsert({
        where: { userId_date: { userId, date: `${from} 周报` } },
        update: { status: 'draft', summary, sections, basis, generatedAt },
        create: { userId, date: `${from} 周报`, status: 'draft', summary, sections, basis, generatedAt },
      })
      return NextResponse.json(report)
    }

    // ── 日报（原逻辑）──
    const [logs, acts, todos] = await Promise.all([
      prisma.log.findMany({ where: { userId, scope } }),
      prisma.activity.findMany({ where: { userId, scope, ts: { gte: new Date(t) } } }),
      prisma.todo.findMany({ where: { userId, scope } }),
    ])

    const commits = acts.filter((a) => a.type === 'commit').map((a) => ({ title: a.title, repo: a.repo }))
    const prs = acts.filter((a) => a.type === 'pr').map((a) => ({ title: a.title, repo: a.repo }))
    const openTodos = todos.filter((x) => !x.done).map((x) => x.title)

    const { summary, sections } = await agentReport(userId, scope, {
      logs: logs.filter((l) => l.date === t).map((l) => ({ title: l.title, content: l.content })),
      commits, prs, openTodos,
    })
    const basis = { kind: 'day' as const, logs: logs.filter((l) => l.date === t).length, commits: commits.length, prs: prs.length }
    const generatedAt = `${t} ${new Date().toTimeString().slice(0, 5)}`
    const report = await prisma.report.upsert({
      where: { userId_date: { userId, date: t } },
      update: { status: 'draft', summary, sections, basis, generatedAt },
      create: { userId, date: t, status: 'draft', summary, sections, basis, generatedAt },
    })
    return NextResponse.json(report)
  } catch (e) {
    const mapped = llmErrorResponse(e)
    if (mapped) return mapped
    throw e
  }
}
