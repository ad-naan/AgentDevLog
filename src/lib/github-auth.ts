import { prisma } from './prisma'

const TOKEN_URL = 'https://github.com/login/oauth/access_token'

/**
 * GitHub token 端点返回的载荷。
 * - 长期令牌（OAuth App `gho_` / PAT `ghp_`）：只有 access_token，永不自动过期；
 * - 过期型用户令牌（GitHub App `ghu_`）：额外带 expires_in(28800s) + refresh_token(`ghr_`, 6 个月)，
 *   每次用 refresh_token 换新时，旧的 access_token 与 refresh_token 会同时作废（一次性轮换）。
 */
interface GhTokenPayload {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

/** 提前续期窗口：到期前 5 分钟就换新，避免「请求发出时还有效、返回时已失效」的竞态 */
const RENEW_WINDOW_MS = 5 * 60e3

export interface GithubCredential {
  /** 当前可用的 access token（空字符串 = 尚未授权） */
  token: string
  /** 本次调用是否真的完成了续期换新 */
  renewed: boolean
  /** access token 到期时间戳；null = 长期令牌 */
  expiresAt: number | null
  /** 是否具备自动续期能力（持有未过期的 refresh token） */
  autoRenew: boolean
}

/** OAuth 客户端是否已配置（GitHub App 与 OAuth App 共用同一组环境变量） */
export const oauthConfigured = () =>
  Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)

async function requestToken(body: Record<string, string>): Promise<GhTokenPayload> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) return {}
  return (await res.json().catch(() => ({}))) as GhTokenPayload
}

/** 授权码换 token（GitHub App 开启「用户令牌过期」时会一并返回 refresh token） */
export function exchangeCode(code: string, redirectUri: string): Promise<GhTokenPayload> {
  return requestToken({
    client_id: process.env.GITHUB_CLIENT_ID ?? '',
    client_secret: process.env.GITHUB_CLIENT_SECRET ?? '',
    code,
    redirect_uri: redirectUri,
  })
}

/**
 * token 载荷 → 落库字段。
 * refresh token 缺席时一并清空续期元数据：这样「长期令牌」与「续期凭据已作废」在库里
 * 都表现为干净的空值，不会留下一个永远换不动的 refresh token 反复重试。
 */
export function tokenPersistData(p: GhTokenPayload) {
  const now = Date.now()
  return {
    githubToken: p.access_token ?? '',
    githubRefreshToken: p.refresh_token ?? '',
    githubTokenExpiresAt: p.expires_in ? new Date(now + p.expires_in * 1000) : null,
    githubRefreshExpiresAt: p.refresh_token_expires_in
      ? new Date(now + p.refresh_token_expires_in * 1000)
      : null,
  }
}

/** 用 refresh token 换新 token；GitHub 会在响应里给出轮换后的新 refresh token */
async function refreshAtGithub(refreshToken: string): Promise<GhTokenPayload | null> {
  if (!oauthConfigured()) return null
  const p = await requestToken({
    client_id: process.env.GITHUB_CLIENT_ID ?? '',
    client_secret: process.env.GITHUB_CLIENT_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  return p.access_token ? p : null
}

/**
 * 取当前可用的 GitHub 凭据，必要时静默续期。
 *
 * - 长期令牌（无 expiresAt）不打扰 GitHub，直接返回；
 * - 过期型令牌在到期前 5 分钟自动换新；
 * - `force` 供 401 兜底：即使未到期也强制换一次（应对令牌被提前撤销或时钟偏差）。
 *
 * 落库用「refresh token 未变」作为乐观锁：refresh token 是一次性轮换的，
 * 若并发请求已抢先完成轮换，本次就直接采用库里的最新令牌，绝不重复消费同一个 refresh token。
 */
export async function resolveGithubCredential(
  userId: number,
  opts?: { force?: boolean },
): Promise<GithubCredential> {
  const s = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  const expiresAt = s.githubTokenExpiresAt?.getTime() ?? null
  const refreshExpiresAt = s.githubRefreshExpiresAt?.getTime() ?? null
  const autoRenew =
    Boolean(s.githubRefreshToken) && (refreshExpiresAt === null || refreshExpiresAt > Date.now())

  const current: GithubCredential = { token: s.githubToken, renewed: false, expiresAt, autoRenew }
  if (!autoRenew) return current

  const dueSoon = expiresAt !== null && expiresAt - Date.now() <= RENEW_WINDOW_MS
  // 长期令牌只有被强制要求时（401 兜底）才去换新
  if (!dueSoon && !opts?.force) return current

  const payload = await refreshAtGithub(s.githubRefreshToken).catch(() => null)
  if (!payload?.access_token) return current

  const data = tokenPersistData(payload)
  // 乐观锁：仅当 refresh token 仍是我们读到的那个才写入，避免并发重复轮换导致凭据互相作废
  const written = await prisma.settings.updateMany({
    where: { userId, githubRefreshToken: s.githubRefreshToken },
    data,
  })
  if (written.count === 0) {
    const latest = await prisma.settings.findUniqueOrThrow({ where: { userId } })
    return {
      token: latest.githubToken,
      renewed: true,
      expiresAt: latest.githubTokenExpiresAt?.getTime() ?? null,
      autoRenew: true,
    }
  }
  return {
    token: data.githubToken,
    renewed: true,
    expiresAt: data.githubTokenExpiresAt?.getTime() ?? null,
    autoRenew: true,
  }
}
