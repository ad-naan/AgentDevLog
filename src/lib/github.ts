import { prisma } from './prisma'

/**
 * 真实 GitHub 同步：拉取关注仓库的公共事件，
 * 以 GitHub 事件 id（extId 唯一键）去重后写入 activities / repoCommits。
 */
export async function syncGithub(userId: number) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devlog-app',
  }
  if (settings.githubToken) headers.Authorization = `Bearer ${settings.githubToken}`

  let fetched = 0
  const errors: string[] = []

  for (const repo of settings.watchedRepos.slice(0, 5)) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/events?per_page=30`, {
        headers,
        next: { revalidate: 0 },
      })
      if (!res.ok) {
        errors.push(`${repo}: HTTP ${res.status}`)
        continue
      }
      const events = (await res.json()) as {
        id: string
        type: string
        created_at: string
        payload?: {
          commits?: { sha: string; message: string }[]
          ref?: string
          pull_request?: { title?: string; merged?: boolean }
          action?: string
          issue?: { title?: string }
        }
      }[]

      for (const e of events) {
        const ts = new Date(e.created_at)
        const day = e.created_at.slice(0, 10)
        let type: 'commit' | 'pr' | 'issue' | null = null
        let title = ''
        let desc: string | undefined
        let meta: string | undefined

        if (e.type === 'PushEvent' && e.payload?.commits?.length) {
          type = 'commit'
          const c = e.payload.commits[e.payload.commits.length - 1]
          title = c.message.split('\n')[0]
          meta = `${c.sha.slice(0, 7)} · ${e.created_at.replace('T', ' ').slice(0, 16)}`
        } else if (e.type === 'PullRequestEvent' && e.payload?.pull_request) {
          type = 'pr'
          title = e.payload.pull_request.title || `PR #${e.id}`
          desc = `${e.payload.action}${e.payload.pull_request.merged ? ' (merged)' : ''}`
          meta = `#${e.id.slice(-4)} · ${e.created_at.replace('T', ' ').slice(0, 16)}`
        } else if (e.type === 'IssuesEvent' && e.payload?.issue) {
          type = 'issue'
          title = e.payload.issue.title
          desc = `issue ${e.payload.action}`
        }
        if (!type) continue

        // extId 唯一键去重：已存在则跳过
        const created = await prisma.activity
          .create({
            data: {
              userId, type, repo, scope: 'work', title, desc, meta, ts,
              extId: `gh:${e.id}`,
            },
          })
          .catch(() => null) // 唯一键冲突 → 已同步过
        fetched += created ? 1 : 0

        // 新入库的 PushEvent 才累计当日提交数
        if (created && type === 'commit') {
          const n = e.payload?.commits?.length || 1
          await prisma.repoCommits.upsert({
            where: { userId_repo_day: { userId, repo, day } },
            update: { count: { increment: n } },
            create: { userId, repo, day, count: n },
          })
        }
      }
    } catch (err) {
      errors.push(`${repo}: ${(err as Error).message}`)
    }
  }

  await prisma.settings.update({ where: { userId }, data: { lastSync: new Date() } })
  return { fetched, errors }
}

