import { prisma } from './prisma'
import type { AppState } from './types'
import { getSessionUserId, AuthError } from './auth'

/**
 * 解析当前登录用户 id，并确保其设置行存在（首次登录已在 OAuth 回调建好）。
 * 未登录时抛 AuthError，由 http.ts 统一转换为 401。
 */
export async function ensureUser() {
  const userId = await getSessionUserId()
  // 会话可能指向已被清理的旧用户（如单用户合并后），此时视为未登录，触发重新登录
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AuthError()
  if (!(await prisma.settings.findUnique({ where: { userId } }))) {
    await prisma.settings.create({ data: { userId } }).catch(() => null)
  }
  return userId
}

/** 序列化：DB 行 → 客户端 DTO，组装完整应用状态 */
export async function loadState(): Promise<AppState> {
  const userId = await ensureUser()
  const [user, settings, logs, todos, activities, reports, breakdowns, commits] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.settings.findUniqueOrThrow({ where: { userId } }),
    prisma.log.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.todo.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.activity.findMany({ where: { userId }, orderBy: { ts: 'desc' }, take: 300 }),
    prisma.report.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.breakdown.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.repoCommits.findMany({ where: { userId } }),
  ])

  const repoCommits: AppState['repoCommits'] = {}
  for (const c of commits) {
    ;(repoCommits[c.repo] ||= {})[c.day] = c.count
  }

  return {
    user: { name: user.name, title: user.title, login: user.login, avatar: user.avatar },
    settings: {
      defaultScope: settings.defaultScope as 'work' | 'life',
      watchedRepos: settings.watchedRepos,
      githubToken: settings.githubToken,
      githubUser: settings.githubUser,
      languages: settings.languages as [string, number, number][],
      llmBaseUrl: settings.llmBaseUrl,
      llmModel: settings.llmModel,
      llmApiKey: settings.llmApiKey,
    },
    logs: logs.map((l) => ({
      id: l.id, date: l.date, scope: l.scope as 'work' | 'life', title: l.title,
      content: l.content, tags: l.tags, mood: l.mood, linked: l.linked, updatedAt: l.updatedAt.getTime(),
    })),
    todos: todos.map((t) => ({
      id: t.id, title: t.title, done: t.done, priority: t.priority as 'P0' | 'P1' | 'P2', due: t.due,
      scope: t.scope as 'work' | 'life', source: t.source, ref: t.ref, tag: t.tag,
      createdAt: t.createdAt.getTime(), updatedAt: t.updatedAt.getTime(),
    })),
    activities: activities.map((a) => ({
      id: a.id, type: a.type as 'log' | 'commit' | 'pr' | 'issue', repo: a.repo,
      scope: a.scope as 'work' | 'life', title: a.title, desc: a.desc, meta: a.meta,
      tags: a.tags as [string, string][] | null, ts: a.ts.getTime(),
    })),
    reports: reports.map((r) => ({
      id: r.id, date: r.date, status: r.status as 'draft' | 'confirmed', summary: r.summary,
      sections: r.sections as AppState['reports'][number]['sections'],
      generatedAt: r.generatedAt, basis: r.basis as AppState['reports'][number]['basis'],
    })),
    breakdowns: breakdowns.map((b) => ({
      id: b.id, requirement: b.requirement, mode: b.mode as '标准' | '详细' | '精简',
      status: b.status as 'idle' | 'running' | 'done',
      modules: b.modules as AppState['breakdowns'][number]['modules'],
      tech: b.tech, createdAt: b.createdAt.toISOString().slice(0, 16).replace('T', ' '),
    })),
    repoCommits,
    lastSync: settings.lastSync.getTime(),
  }
}
