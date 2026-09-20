import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof b.done === 'boolean') data.done = b.done
  if (b.title) data.title = String(b.title)
  if (b.priority) data.priority = b.priority
  if (b.due !== undefined) data.due = b.due
  if (b.tag) data.tag = b.tag
  const todo = await prisma.todo.update({ where: { id: Number(id) }, data })
  return NextResponse.json(todo)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  await prisma.todo.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
