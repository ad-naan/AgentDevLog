import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/data'

/** 清空全部业务数据（保留用户与设置结构） */
export async function POST() {
  const userId = await ensureUser()
  await prisma.$transaction([
    prisma.log.deleteMany({ where: { userId } }),
    prisma.todo.deleteMany({ where: { userId } }),
    prisma.activity.deleteMany({ where: { userId } }),
    prisma.report.deleteMany({ where: { userId } }),
    prisma.breakdown.deleteMany({ where: { userId } }),
    prisma.repoCommits.deleteMany({ where: { userId } }),
    prisma.settings.update({
      where: { userId },
      data: { watchedRepos: [], githubToken: '', lastSync: new Date(0) },
    }),
  ])
  return NextResponse.json({ ok: true })
}
