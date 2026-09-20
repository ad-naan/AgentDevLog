import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { today } from '@/lib/types'
import { agentReport } from '@/lib/agent'
import { llmErrorResponse } from '@/lib/http'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const { scope } = await req.json().catch(() => ({ scope: 'work' }))
  const sc = scope === 'life' ? 'life' : 'work'
  const t = today()

  const [logs, acts, todos] = await Promise.all([
    prisma.log.findMany({ where: { userId, scope: sc } }),
    prisma.activity.findMany({ where: { userId, scope: sc, ts: { gte: new Date(t) } } }),
    prisma.todo.findMany({ where: { userId, scope: sc } }),
  ])

  const commits = acts.filter((a) => a.type === 'commit').map((a) => ({ title: a.title, repo: a.repo }))
  const prs = acts.filter((a) => a.type === 'pr').map((a) => ({ title: a.title, repo: a.repo }))
  const openTodos = todos.filter((x) => !x.done).map((x) => x.title)

  try {
    const { summary, sections } = await agentReport(userId, sc, {
      logs: logs.map((l) => ({ title: l.title, content: l.content })),
      commits, prs, openTodos,
    })
    const basis = { logs: logs.length, commits: commits.length, prs: prs.length }
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
