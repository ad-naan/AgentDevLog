import { NextResponse } from 'next/server'
import { ensureUser } from '@/lib/data'
import { testLLM } from '@/lib/llm'

export async function POST() {
  const userId = await ensureUser()
  const r = await testLLM(userId)
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
