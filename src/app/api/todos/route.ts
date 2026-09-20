import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const b = await req.json()
  const todo = await prisma.todo.create({
    data: {
      userId,
      title: String(b.title || '').trim(),
      priority: ['P0', 'P1', 'P2'].includes(b.priority) ? b.priority : 'P1',
      due: b.due || '今天',
      scope: b.scope === 'life' ? 'life' : 'work',
      source: b.source || '手动',
      tag: b.tag || '产品',
      ref: b.ref || null,
    },
  })
  return NextResponse.json(todo)
}
