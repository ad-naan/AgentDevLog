import { prisma } from './prisma'

/**
 * 真实 GitHub 同步：拉取关注仓库的公共事件，
 * 以 GitHub 事件 id（extId 唯一键）去重后写入 activities / repoCommits。
 */
export async function syncGithub(userId: number) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  const headersBase: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devlog-app',
  }
  if (settings.githubToken) headersBase.Authorization = `Bearer ${settings.githubToken}`
  const ghUser = settings.githubUser.trim().toLowerCase()
  const since = settings.lastSync > new Date(Date.now() - 14 * 864e5)
    ? new Date(Date.now() - 14 * 864e5)
    : settings.lastSync

  let fetched = 0
  const errors: string[] = []
  // 预载已同步的 extId，命中直接跳过，避免 create 撞唯一键产生 prisma:error 日志
  const existing = new Set(
    (await prisma.activity.findMany({ where: { userId }, select: { extId: true } }))
      .map((a) => a.extId)
      .filter((v): v is string => v !== null),
  )

  for (const repo of settings.watchedRepos.slice(0, 5)) {
    const headers: Record<string, string> = headersBase
    // 先取仓库可见性：私有仓库的 PushEvent 走下方 Commits API 兜底（逐 commit 记录），
    // 避免「push 活动记录 + commit 记录」双份计数
    let isPrivate = false
    try {
      const rr = await fetch(`https://api.github.com/repos/${repo}`, { headers, next: { revalidate: 3600 } })
      if (rr.ok) isPrivate = ((await rr.json()) as { private?: boolean }).private === true
    } catch { /* 可见性获取失败按公开仓库处理 */ }
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/events?per_page=100`, {
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
        actor?: { login?: string }
        payload?: {
          commits?: { sha: string; message: string }[]
          ref?: string
          head?: string
          before?: string
          size?: number
          pull_request?: { title?: string; merged?: boolean }
          action?: string
          issue?: { title?: string }
        }
      }[]

      for (const e of events) {
        // 按配置的 GitHub 用户名过滤，只保留本人的推送/PR/Issue
        if (ghUser && (e.actor?.login || '').toLowerCase() !== ghUser) continue
        const ts = new Date(e.created_at)
        const day = e.created_at.slice(0, 10)
        let type: 'commit' | 'pr' | 'issue' | null = null
        let title = ''
        let desc: string | undefined
        let meta: string | undefined

        let commitCount = 0 // 本次 push 的真实 commit 数（用于 repoCommits 统计）
        if (e.type === 'PushEvent') {
          if (isPrivate) continue // 私有仓库：由 Commits 兜底统一记录
          type = 'commit'
          let commits = e.payload?.commits || []
          const head = e.payload?.head || ''
          if (!commits.length) {
            // 私有仓库：Events API 隐去 commits/size，
            // 用 compare API 拿回本次 push 的完整 commit 列表（before...head）
            const before = e.payload?.before || ''
            if (head && before && !/^0+$/.test(before)) {
              const cr = await fetch(
                `https://api.github.com/repos/${repo}/compare/${before}...${head}`,
                { headers, next: { revalidate: 0 } },
              )
              if (cr.ok) {
                commits = (
                  (await cr.json()) as {
                    commits?: { sha: string; commit?: { message?: string } }[]
                  }
                ).commits?.map((c) => ({ sha: c.sha, message: c.commit?.message || '' })) || []
              }
            }
            // compare 不可用（新分支等）→ 退化为只取 head 这一条 commit
            if (!commits.length && head) {
              const cr = await fetch(`https://api.github.com/repos/${repo}/commits/${head}`, {
                headers,
                next: { revalidate: 0 },
              })
              if (cr.ok) {
                const j = (await cr.json()) as { sha?: string; commit?: { message?: string } }
                commits = [{ sha: j.sha || head, message: j.commit?.message || '' } as { sha: string; message: string }]
              }
            }
          }
          if (!commits.length && !head) { type = null } else {
            const list = commits.length ? commits : [{ sha: head, message: `push ${head.slice(0, 7)}` }]
            commitCount = list.length
            // 标题取最后一条 commit；desc 汇总本次 push 的全部 commit
            const last = list[list.length - 1]
            title = (last.message || '').split('\n')[0] || `push ${(last.sha || head).slice(0, 7)}`
            if (list.length > 1) {
              desc = list
                .map((c) => `· ${(c.message || '').split('\n')[0]}`)
                .join('\n')
                .slice(0, 500)
            }
            meta = `${(last.sha || head).slice(0, 7)} · ${commitCount} commits · ${e.created_at.replace('T', ' ').slice(0, 16)}`
          }
        } else if (e.type === 'PullRequestEvent' && e.payload?.pull_request) {
          type = 'pr'
          title = e.payload.pull_request.title || `PR #${e.id}`
          desc = `${e.payload.action}${e.payload.pull_request.merged ? ' (merged)' : ''}`
          meta = `#${e.id.slice(-4)} · ${e.created_at.replace('T', ' ').slice(0, 16)}`
        } else if (e.type === 'IssuesEvent' && e.payload?.issue) {
          type = 'issue'
          title = e.payload.issue.title || `Issue #${e.id}`
          desc = `issue ${e.payload.action}`
        }
        if (!type) continue

        // extId 唯一键去重：已存在则跳过（预载集合，不触发数据库错误）
        if (existing.has(`gh:${e.id}`)) continue
        const created = await prisma.activity
          .create({
            data: {
              userId, type, repo, scope: 'work', title, desc, meta, ts,
              extId: `gh:${e.id}`,
            },
          })
          .catch(() => null) // 并发兜底
        fetched += created ? 1 : 0
        if (created) existing.add(`gh:${e.id}`)

        // 新入库的 PushEvent 才累计当日提交数（真实条数，未知时按 1 次推送计）
        if (created && type === 'commit') {
          const n = commitCount || 1
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

    // ── 私有仓库兜底：Events API 对私有仓库不返回 PushEvent，
    //    逐 commit 补拉（extId: ghc:repo:sha 去重），
    //    并清理窗口内旧的 push 事件记录，避免双份计数 ──
    if (!isPrivate) continue
    try {
      const cr = await fetch(
        `https://api.github.com/repos/${repo}/commits?since=${since.toISOString()}&per_page=100`,
        { headers, next: { revalidate: 0 } },
      )
      if (cr.ok) {
        await prisma.activity.deleteMany({
          where: {
            userId, repo, type: 'commit',
            extId: { startsWith: 'gh:' },
            ts: { gte: since },
          },
        })
        const commits = (await cr.json()) as {
          sha: string
          commit?: { message?: string; author?: { date?: string } }
          author?: { login?: string }
        }[]
        for (const c of commits) {
          if (ghUser && (c.author?.login || '').toLowerCase() !== ghUser) continue
          const ts = new Date(c.commit?.author?.date || Date.now())
          if (ts < since) continue
          const day = ts.toISOString().slice(0, 10)
          const title = (c.commit?.message || '').split('\n')[0].slice(0, 200) || `commit ${c.sha.slice(0, 7)}`
          const extId = `ghc:${repo}:${c.sha}`
          if (existing.has(extId)) continue
          const created = await prisma.activity
            .create({
              data: {
                userId, type: 'commit', repo, scope: 'work', title,
                meta: `${c.sha.slice(0, 7)} · ${ts.toISOString().replace('T', ' ').slice(0, 16)}`,
                ts, extId,
              },
            })
            .catch(() => null) // 并发兜底
          fetched += created ? 1 : 0
          if (created) existing.add(extId)
          if (created) {
            await prisma.repoCommits.upsert({
              where: { userId_repo_day: { userId, repo, day } },
              update: { count: { increment: 1 } },
              create: { userId, repo, day, count: 1 },
            })
          }
        }
      }
    } catch (err) {
      errors.push(`${repo} (commits): ${(err as Error).message}`)
    }
  }

  await prisma.settings.update({ where: { userId }, data: { lastSync: new Date() } })
  return { fetched, errors }
}

