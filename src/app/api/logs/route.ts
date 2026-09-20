import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { today } from '@/lib/types'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const b = await req.json()
  const scope = b.scope === 'life' ? 'life' : 'work'
  const date = typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : today()
  const existing = await prisma.log.findFirst({ where: { userId, date, scope } })
  if (existing) return NextResponse.json(existing)
  const log = await prisma.log.create({
    data: {
      userId, date, scope,
      title: b.title || (scope === 'work' ? '今日工作日志' : '生活记录'),
      content: b.content ?? `# ${date} ${scope === 'work' ? '工作日志' : '生活记录'}\n`,
      tags: [], mood: 3, linked: [],
    },
  })
  return NextResponse.json(log)
}
