import { NextResponse } from 'next/server'
import { LLMError, LLMNotConfiguredError } from '@/lib/llm'
import { AuthError } from '@/lib/auth'

/** Agent 调用的统一错误转换：未登录 → 401，LLM 未配置 → 409，调用失败 → 502 */
export function llmErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message, code: 'unauthorized' }, { status: 401 })
  }
  if (e instanceof LLMNotConfiguredError) {
    return NextResponse.json({ error: e.message, code: 'llm_not_configured' }, { status: 409 })
  }
  if (e instanceof LLMError) {
    return NextResponse.json({ error: e.message, code: 'llm_error' }, { status: 502 })
  }
  return null
}
