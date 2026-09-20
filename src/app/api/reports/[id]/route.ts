import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.status === 'draft' || b.status === 'confirmed') data.status = b.status
  if (typeof b.summary === 'string') data.summary = b.summary
  const report = await prisma.report.update({ where: { id: Number(id) }, data })
  return NextResponse.json(report)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureUser()
  const { id } = await params
  await prisma.report.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
