import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof b.content === 'string') data.content = b.content
  if (Array.isArray(b.tags)) data.tags = b.tags.map(String)
  if (typeof b.mood === 'number') data.mood = b.mood
  if (Array.isArray(b.linked)) data.linked = b.linked.map(String)
  if (b.title) data.title = b.title
  const log = await prisma.log.update({ where: { id: Number(id) }, data })
  return NextResponse.json(log)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  await prisma.log.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
