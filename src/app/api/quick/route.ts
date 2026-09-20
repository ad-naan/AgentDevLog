import { NextResponse } from 'next/server'
import { ensureUser, loadState } from '@/lib/data'
import { agentQuickCapture } from '@/lib/agent'
import { llmErrorResponse } from '@/lib/http'

export async function POST(req: Request) {
  const userId = await ensureUser()
  const { text, scope } = await req.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }
  try {
    const result = await agentQuickCapture(userId, text.trim(), scope === 'life' ? 'life' : 'work')
    const state = await loadState()
    return NextResponse.json({ result, state })
  } catch (e) {
    const mapped = llmErrorResponse(e)
    if (mapped) return mapped
    throw e
  }
}
