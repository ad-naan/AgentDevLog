import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId, AuthError } from '@/lib/auth'

// GET /api/auth/me → 当前登录用户（未登录 401）
export async function GET() {
  try {
    const userId = await getSessionUserId()
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, title: true, login: true, avatar: true },
    })
    return NextResponse.json(user)
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    throw e
  }
}
