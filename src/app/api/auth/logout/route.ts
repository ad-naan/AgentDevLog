import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

// POST /api/auth/logout → 清除会话
export async function POST() {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
