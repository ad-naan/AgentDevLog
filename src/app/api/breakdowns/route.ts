import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'
import { agentBreakdown } from '@/lib/agent'
import { llmErrorResponse } from '@/lib/http'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const b = await req.json()
  const requirement = String(b.requirement || '').trim()
  if (!requirement) return NextResponse.json({ error: 'requirement required' }, { status: 400 })
  const mode = ['标准', '详细', '精简'].includes(b.mode) ? b.mode : '标准'

  try {
    const { modules, tech } = await agentBreakdown(userId, requirement, mode)
    const bd = await prisma.breakdown.create({
      data: { userId, requirement, mode, status: 'done', modules, tech },
    })
    return NextResponse.json(bd)
  } catch (e) {
    const mapped = llmErrorResponse(e)
    if (mapped) return mapped
    throw e
  }
}
