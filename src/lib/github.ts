import { prisma } from './prisma'
import { resolveGithubCredential } from './github-auth'

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
  commit?: { message?: string; author?: { date?: string; name?: string; email?: string } }
  author?: { login?: string } | null
}
interface CommitDetail {
  files?: { filename?: string; status?: string; additions?: number; deletions?: number }[]
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 同步过程中的跨请求状态：区分「凭据失效」与「临时故障」，二者都不应推进同步水位 */
interface SyncContext {
  /** 401：token 过期或被撤销，必须由用户重新授权 */
  authFailed: boolean
  /** 限流 / 5xx / 网络异常：本次结果不完整，下次需补拉 */
  hardFailure: boolean
  /**
   * 401 兜底续期：返回换新后的 token，null 表示无法续期（没有 refresh token 或已过期）。
   * 同一次同步内所有并发请求共享同一次换新 —— refresh token 是一次性的，绝不能并发消费。
   */
  renew?: () => Promise<string | null>
}

/**
 * 单个请求封装：失败返回 null（由调用方记入 errors）。
 * 限流/5xx/网络错误自动指数退避重试（最多 3 次尝试），4xx 不重试。
 * 401（凭据失效）与重试耗尽（持续限流）会写入 ctx，供上层决定是否推进同步水位。
 */
async function gh<T>(url: string, headers: Record<string, string>, ctx: SyncContext): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers, next: { revalidate: 0 } })
      if (r.ok) return (await r.json()) as T
      // 401 = 凭据失效：先用 refresh token 静默换新并原地重试；
      // 换新后依然 401（或压根没有 refresh token）才判定为需要用户重新授权。
      if (r.status === 401) {
        const renewed = ctx.renew ? await ctx.renew() : null
        // 比较请求头而非「是否换过」：并发请求共享同一次换新，只有第一个能改到新 token
        if (renewed && headers.Authorization !== `Bearer ${renewed}`) {
          headers.Authorization = `Bearer ${renewed}`
          continue
        }
        ctx.authFailed = true
        ctx.hardFailure = true
        return null
      }
      // 404 = 仓库不存在/已改名/无权限：重试也拿不到数据，不算临时故障
      if (r.status === 404) return null
      // 其余 4xx 不重试（403 既可能是限流也可能是权限不足，走下面的退避）
      if (r.status < 500 && r.status !== 403) return null
      const retryAfter = Number(r.headers.get('retry-after') || 0)
      const waitMs = retryAfter > 0 && retryAfter < 60
        ? retryAfter * 1000
        : 1500 * 2 ** attempt
      await sleep(waitMs)
    } catch {
      if (attempt === 2) {
        ctx.hardFailure = true
        return null
      }
      await sleep(1500 * 2 ** attempt)
    }
  }
  // 重试耗尽（持续限流或 5xx）
  ctx.hardFailure = true
  return null
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
 * - 提交：枚举仓库全部分支（最多 30 条），按分支逐 commit 拉取，
 *   新增 commit 再补拉详情（提交正文 + 改动文件）供报告深入分析；
 * - PR / Issue：走 Events API；
 * - 新增关注仓库自动回填最近 14 天（since 与仓库无关）；
 * - extId 唯一键去重（commit: ghc:repo:sha；事件: gh:id），批量 createMany；
 * - 同步水位：仅在本次无临时性故障（401 / 限流 / 5xx）时推进 lastSync，
 *   避免部分仓库失败时，其时间窗内的提交被静默漏掉。
 */
export async function syncGithub(userId: number) {
  const settings = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devlog-app',
  }
  const ghUser = settings.githubUser.trim().toLowerCase()
  // 先取一份「一定可用」的凭据：过期型用户令牌（GitHub App，8 小时有效）会在到期前 5 分钟自动续期
  const credential = await resolveGithubCredential(userId)
  if (credential.token) headers.Authorization = `Bearer ${credential.token}`
  // 本次同步的凭据/故障状态，决定是否推进同步水位
  const ctx: SyncContext = { authFailed: false, hardFailure: false }
  // 401 兜底续期：整次同步只换新一次，6 路并发共享同一个 Promise
  let renewing: Promise<string | null> | null = null
  ctx.renew = () => {
    if (!renewing) {
      renewing = resolveGithubCredential(userId, { force: true })
        .then((c) => (c.renewed ? c.token : null))
        .catch(() => null)
    }
    return renewing
  }
  // since = 上次同步时间（留 10 分钟重叠窗口防时钟偏差/同步期间推送），上限放宽到 90 天。
  // 超过 90 天未同步视为放弃，避免单次请求量爆炸。
  const since = new Date(Math.max(settings.lastSync.getTime() - 10 * 60e3, Date.now() - 90 * 864e5))
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
    // PR/Issue 事件与分支列表并行获取（分支翻页，最多 300 条）
    const [events, branches] = await Promise.all([
      gh<EventItem[]>(`${GH}/repos/${repo}/events?per_page=100`, headers, ctx),
      (async () => {
        const all: BranchItem[] = []
        for (let p = 1; p <= 3; p++) {
          const page = await gh<BranchItem[]>(`${GH}/repos/${repo}/branches?per_page=100&page=${p}`, headers, ctx)
          if (!page) return all.length ? all : null
          all.push(...page)
          if (page.length < 100) break
        }
        return all
      })(),
    ])
    if (!events && !branches) {
      errors.push(`${repo}: 无法访问（检查仓库名/Token 权限）`)
      return
    }
    // 分支列表失败时降级：改用仓库默认分支，保证主开发线的提交不丢
    let branchNames: string[]
    if (branches) {
      branchNames = branches.map((b) => b.name).filter(Boolean).slice(0, 30)
    } else {
      const info = await gh<{ default_branch?: string }>(`${GH}/repos/${repo}`, headers, ctx)
      if (info?.default_branch) {
        branchNames = [info.default_branch]
        errors.push(`${repo}: 分支列表获取失败，已降级为仅同步默认分支 ${info.default_branch}`)
      } else {
        branchNames = []
        errors.push(`${repo}: 分支列表获取失败（可能被限流），本次未同步该仓库提交`)
      }
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
    const lists = await mapLimit(branchNames, 6, async (b) => {
      // 翻页取最近 3 页（300 条），避免窗口内提交超过 100 条被截断
      const all: CommitListItem[] = []
      for (let p = 1; p <= 3; p++) {
        const page = await gh<CommitListItem[]>(
          `${GH}/repos/${repo}/commits?sha=${encodeURIComponent(b)}&since=${sinceISO}&per_page=100&page=${p}`,
          headers,
          ctx,
        )
        if (!page) break
        all.push(...page)
        if (page.length < 100) break
      }
      return all
    })
    // 跨分支按 sha 去重后收集新增 commit
    const seen = new Set<string>()
    const candidates: { sha: string; ts: Date; message: string }[] = []
    for (const list of lists) {
      for (const c of list || []) {
        // 作者过滤：跳过明确关联了「其他账号」的提交（协作仓库里同事的提交）；
        // author 为 null（git 邮箱未绑定 GitHub 账号）的提交保留，否则会漏掉
        const login = c.author?.login?.toLowerCase()
        if (ghUser && login && login !== ghUser) continue
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
      files: (await gh<CommitDetail>(`${GH}/repos/${repo}/commits/${c.sha}`, headers, ctx))?.files,
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

  // 凭据失效时，逐仓库的「无法访问」噪音没有意义 → 归一为一条可执行的提示
  const finalErrors = ctx.authFailed
    ? [credential.autoRenew
        ? 'GitHub 授权已失效（令牌被撤销或权限不足）。请重新登录 GitHub 完成授权。'
        : credential.expiresAt !== null
          ? 'GitHub 自动续期已失效：刷新令牌（refresh token，有效期 6 个月）已到期。请重新登录 GitHub 完成授权，即可再次开启自动续期。'
          : 'GitHub 授权已失效（令牌已过期或被撤销）。请重新登录 GitHub 完成授权，或在「设置 → GitHub」粘贴新的 Personal Access Token']
    : errors

  // 仅在本次无临时性故障时才推进同步水位：否则失败仓库在该时间窗内的提交会被永久跳过。
  // （extId 唯一键保证重扫不会产生重复数据，所以「保守不推进」是安全的方向）
  if (!ctx.hardFailure) {
    // 同步成功 → 顺带清掉可能残留的「授权失效」标记
    await prisma.settings.update({
      where: { userId },
      data: { lastSync: new Date(), githubAuthFailed: false },
    })
  } else if (!ctx.authFailed) {
    finalErrors.push('本次同步未完整完成（GitHub 限流或网络异常），已保留同步时间点，下次会自动补拉')
  }

  // 授权失效必然伴随 hardFailure，单独落库以便设置页跨会话提示「重新授权」
  if (ctx.authFailed) {
    await prisma.settings.update({ where: { userId }, data: { githubAuthFailed: true } })
  }

  return { fetched, errors: finalErrors, authFailed: ctx.authFailed }
}
