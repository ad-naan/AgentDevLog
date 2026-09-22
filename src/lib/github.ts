import { prisma } from './prisma'

const GH = 'https://api.github.com'

// ── GitHub 类型 ──
interface EventItem {
  id: string
  type: string
  created_at: string
  actor?: { login?: string }
  payload?: {
    pull_request?: { title?: string; merged?: boolean }
    action?: string
    issue?: { title?: string }
  }
}
interface BranchItem { name: string }
interface CommitListItem {
  sha: string
  commit?: { message?: string; author?: { date?: string } }
  author?: { login?: string }
}
interface CommitDetail {
  files?: { filename?: string; status?: string; additions?: number; deletions?: number }[]
}

/** 单个请求封装：失败返回 null（由调用方记入 errors） */
async function gh<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const r = await fetch(url, { headers, next: { revalidate: 0 } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

/** 并发受限的 map：避免一次打满 GitHub API 限流 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

interface NewCommit {
  repo: string
  scope: 'work' | 'life'
  sha: string
  ts: Date
  day: string
  title: string
  desc: string | null
}

/** 把 commit 详情（提交正文 + 改动文件清单）压缩为分析用摘要 */
function buildCommitDesc(message: string, files?: CommitDetail['files']): string | null {
  const body = message
    .split('\n')
    .slice(1)
    .map((x) => x.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 600)
  const fileLines = (files || [])
    .slice(0, 15)
    .map((f) => `· ${f.filename ?? '?'}${f.additions != null ? ` (+${f.additions}/-${f.deletions ?? 0})` : ''}`)
    .join('\n')
  const desc = `${body ? body + '\n' : ''}${fileLines ? `改动文件：\n${fileLines}` : ''}`.trim()
  return desc ? desc.slice(0, 1600) : null
}

/**
 * 真实 GitHub 同步（并行版）：
 * - 提交：枚举仓库全部分支（最多 12 条），按分支逐 commit 拉取，
 *   新增 commit 再补拉详情（提交正文 + 改动文件）供报告深入分析；
 * - PR / Issue：走 Events API；
 * - 新增关注仓库自动回填最近 14 天（since 与仓库无关）；
 * - extId 唯一键去重（commit: ghc:repo:sha；事件: gh:id），批量 createMany。
 */
export async function syncGithub(userId: number) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devlog-app',
  }
  if (settings.githubToken) headers.Authorization = `Bearer ${settings.githubToken}`
  const ghUser = settings.githubUser.trim().toLowerCase()
  const since = new Date(Math.max(settings.lastSync.getTime(), Date.now() - 14 * 864e5))
  const sinceISO = since.toISOString()

  const errors: string[] = []
  let fetched = 0

  // 预载已同步 extId，命中直接跳过
  const existing = new Set(
    (await prisma.activity.findMany({ where: { userId }, select: { extId: true } }))
      .map((a) => a.extId)
      .filter((v): v is string => v !== null),
  )

  // 清理旧版「push 事件型」commit 记录，避免与逐 commit 记录双份计数
  await prisma.activity.deleteMany({
    where: { userId, type: 'commit', extId: { startsWith: 'gh:' }, ts: { gte: since } },
  })

  const groups: [string[], 'work' | 'life'][] = [
    [settings.watchedRepos, 'work'],
    [settings.watchedReposLife, 'life'],
  ]
  const repos = groups.flatMap(([rs, sc]) => rs.map((r) => [r, sc] as const))

  const newCommits: NewCommit[] = []

  await mapLimit(repos, 6, async ([repo, scope]) => {
    // PR/Issue 事件与分支列表并行获取
    const [events, branches] = await Promise.all([
      gh<EventItem[]>(`${GH}/repos/${repo}/events?per_page=100`, headers),
      gh<BranchItem[]>(`${GH}/repos/${repo}/branches?per_page=100`, headers),
    ])
    if (!events && !branches) {
      errors.push(`${repo}: 无法访问（检查仓库名/Token 权限）`)
      return
    }

    // ── PR / Issue 事件 ──
    const evRows: {
      userId: number
      type: 'pr' | 'issue'
      repo: string
      scope: 'work' | 'life'
      title: string
      desc: string | undefined
      meta: string | undefined
      ts: Date
      extId: string
    }[] = []
    for (const e of events || []) {
      if (ghUser && (e.actor?.login || '').toLowerCase() !== ghUser) continue
      const ts = new Date(e.created_at)
      let type: 'pr' | 'issue' | null = null
      let title = ''
      let desc: string | undefined
      let meta: string | undefined
      if (e.type === 'PullRequestEvent' && e.payload?.pull_request) {
        type = 'pr'
        title = e.payload.pull_request.title || `PR #${e.id}`
        desc = `${e.payload.action}${e.payload.pull_request.merged ? ' (merged)' : ''}`
        meta = `#${e.id.slice(-4)} · ${e.created_at.replace('T', ' ').slice(0, 16)}`
      } else if (e.type === 'IssuesEvent' && e.payload?.issue) {
        type = 'issue'
        title = e.payload.issue.title || `Issue #${e.id}`
        desc = `issue ${e.payload.action}`
      }
      if (!type || existing.has(`gh:${e.id}`)) continue
      evRows.push({ userId, type, repo, scope, title, desc, meta, ts, extId: `gh:${e.id}` })
    }
    if (evRows.length) {
      const r = await prisma.activity.createMany({ data: evRows, skipDuplicates: true })
      fetched += r.count
      for (const row of evRows) existing.add(String((row as { extId?: string }).extId))
    }

    // ── 全分支 commit 同步 ──
    const branchNames = (branches || []).map((b) => b.name).filter(Boolean).slice(0, 12)
    const lists = await mapLimit(branchNames, 6, (b) =>
      gh<CommitListItem[]>(
        `${GH}/repos/${repo}/commits?sha=${encodeURIComponent(b)}&since=${sinceISO}&per_page=100`,
        headers,
      ),
    )
    // 跨分支按 sha 去重后收集新增 commit
    const seen = new Set<string>()
    const candidates: { sha: string; ts: Date; message: string }[] = []
    for (const list of lists) {
      for (const c of list || []) {
        if (ghUser && (c.author?.login || '').toLowerCase() !== ghUser) continue
        const ts = new Date(c.commit?.author?.date || Date.now())
        if (ts < since || seen.has(c.sha)) continue
        seen.add(c.sha)
        if (existing.has(`ghc:${repo}:${c.sha}`)) continue
        candidates.push({ sha: c.sha, ts, message: c.commit?.message || '' })
      }
    }
    if (!candidates.length) return

    // 前 40 条新增 commit 补拉详情（提交正文 + 改动文件），其余只存标题
    const DETAIL_CAP = 40
    const detailed = await mapLimit(candidates.slice(0, DETAIL_CAP), 6, async (c) => ({
      ...c,
      files: (await gh<CommitDetail>(`${GH}/repos/${repo}/commits/${c.sha}`, headers))?.files,
    }))
    const push = (c: { sha: string; ts: Date; message: string }, files?: CommitDetail['files']) => {
      newCommits.push({
        repo,
        scope,
        sha: c.sha,
        ts: c.ts,
        day: c.ts.toISOString().slice(0, 10),
        title: c.message.split('\n')[0].slice(0, 200) || `commit ${c.sha.slice(0, 7)}`,
        desc: buildCommitDesc(c.message, files),
      })
    }
    for (const c of detailed) push(c, c.files)
    for (const c of candidates.slice(DETAIL_CAP)) push(c)
  })

  // 批量落库 commit 活动
  if (newCommits.length) {
    const r = await prisma.activity.createMany({
      data: newCommits.map((c) => ({
        userId,
        type: 'commit' as const,
        repo: c.repo,
        scope: c.scope,
        title: c.title,
        desc: c.desc,
        meta: `${c.sha.slice(0, 7)} · ${c.ts.toISOString().replace('T', ' ').slice(0, 16)}`,
        ts: c.ts,
        extId: `ghc:${c.repo}:${c.sha}`,
      })),
      skipDuplicates: true,
    })
    fetched += r.count
    // 聚合后按 (repo, day) 一次性累加提交数
    const dayCounts = new Map<string, number>()
    for (const c of newCommits) {
      const k = `${c.repo}|${c.day}`
      dayCounts.set(k, (dayCounts.get(k) || 0) + 1)
    }
    for (const [k, n] of dayCounts) {
      const [repo, day] = k.split('|')
      await prisma.repoCommits.upsert({
        where: { userId_repo_day: { userId, repo, day } },
        update: { count: { increment: n } },
        create: { userId, repo, day, count: n },
      })
    }
  }

  await prisma.settings.update({ where: { userId }, data: { lastSync: new Date() } })
  return { fetched, errors }
}
