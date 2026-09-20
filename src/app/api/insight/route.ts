import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { agentInsight } from '@/lib/agent'
import { llmErrorResponse } from '@/lib/http'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const { scope } = await req.json().catch(() => ({ scope: 'work' }))
  const sc = scope === 'life' ? 'life' : 'work'
  const since = new Date(Date.now() - 7 * 864e5)

  const [logs, acts, todos, breakdowns] = await Promise.all([
    prisma.log.findMany({
      where: { userId, scope: sc, date: { gte: since.toISOString().slice(0, 10) } },
      orderBy: { date: 'desc' }, take: 10,
    }),
    prisma.activity.findMany({ where: { userId, scope: sc, ts: { gte: since } }, orderBy: { ts: 'desc' }, take: 30 }),
    prisma.todo.findMany({ where: { userId, scope: sc, done: false } }),
    prisma.breakdown.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 3 }),
  ])

  try {
    const insight = await agentInsight(userId, sc, {
      recentLogs: logs.map((l) => ({ date: l.date, title: l.title, content: l.content })),
      recentActivities: acts.map((a) => ({ type: a.type, title: a.title, repo: a.repo, ts: a.ts.toISOString() })),
      openTodos: todos.map((t) => ({ title: t.title, priority: t.priority, due: t.due })),
      breakdowns: breakdowns.map((b) => ({ requirement: b.requirement, modules: Array.isArray(b.modules) ? b.modules.length : 0 })),
    })
    return NextResponse.json(insight)
  } catch (e) {
    const mapped = llmErrorResponse(e)
    if (mapped) return mapped
    throw e
  }
}
