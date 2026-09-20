import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { runAssistant, agentLogTips, type AssistantTurn } from '@/lib/agent'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const body = await req.json().catch(() => ({}))
  const intent = body?.intent ?? 'assistant'

  // 日志写作建议
  if (intent === 'logtips') {
    const draft = {
      title: typeof body?.title === 'string' ? body.title.slice(0, 200) : '',
      content: typeof body?.content === 'string' ? body.content.slice(0, 4000) : '',
    }
    const acts = await prisma.activity.findMany({
      where: { userId, ts: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
      orderBy: { ts: 'desc' }, take: 15,
      select: { type: true, title: true, repo: true },
    })
    const tips = await agentLogTips(
      userId,
      draft,
      acts.map((a) => ({ type: a.type, title: a.title, repo: a.repo })),
    )
    return NextResponse.json({ tips })
  }

  // 工作台助手（默认）
  const sc = body?.scope === 'life' ? 'life' : 'work'
  const turns = Array.isArray(body?.history)
    ? body!.history
      .filter((t: unknown) => {
        const x = t as { role?: string; content?: string }
        return (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string' && x.content.trim()
      })
      .slice(-12)
    : []
  const r = await runAssistant(userId, sc, turns as AssistantTurn[])
  return NextResponse.json(r)
}
