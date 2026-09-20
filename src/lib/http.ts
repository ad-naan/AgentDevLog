import { NextResponse } from 'next/server'
import { LLMError, LLMNotConfiguredError } from '@/lib/llm'

/** Agent 调用的统一错误转换：LLM 未配置 → 409，调用失败 → 502 */
export function llmErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof LLMNotConfiguredError) {
    return NextResponse.json({ error: e.message, code: 'llm_not_configured' }, { status: 409 })
  }
  if (e instanceof LLMError) {
    return NextResponse.json({ error: e.message, code: 'llm_error' }, { status: 502 })
  }
  return null
}
