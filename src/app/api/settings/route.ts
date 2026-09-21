import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

export async function PATCH(req: Request) {
  const userId = await ensureUser()
  const b = await req.json()

  // 用户资料（昵称/职位）
  if (typeof b.userName === 'string' || typeof b.userTitle === 'string') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(typeof b.userName === 'string' ? { name: (b.userName as string).trim() || '用户' } : {}),
        ...(typeof b.userTitle === 'string' ? { title: (b.userTitle as string).trim() } : {}),
      },
    })
  }

  const data: Record<string, unknown> = {}
  if (b.defaultScope === 'work' || b.defaultScope === 'life') data.defaultScope = b.defaultScope
  if (Array.isArray(b.watchedRepos)) data.watchedRepos = b.watchedRepos.map(String)
  if (typeof b.githubToken === 'string') data.githubToken = b.githubToken
  if (typeof b.githubUser === 'string') data.githubUser = b.githubUser.trim().replace(/^@/, '')
  for (const k of ['llmBaseUrl', 'llmModel', 'llmApiKey'] as const) {
    if (typeof b[k] === 'string') data[k] = (b[k] as string).trim()
  }
  const settings = await prisma.settings.update({ where: { userId }, data })
  return NextResponse.json({ ok: true, watchedRepos: settings.watchedRepos })
}
