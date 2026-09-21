import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, OAUTH_STATE_COOKIE } from './auth-shared'

// ─── 会话与鉴权：无第三方依赖的 GitHub OAuth + HMAC 签名 Cookie ───
// 设计：会话内容为 base64url(JSON) + "." + base64url(HMAC-SHA256)，
// 服务端用 AUTH_SECRET 校验签名，避免引入会话表；失败一律抛 AuthError。

export { SESSION_COOKIE, OAUTH_STATE_COOKIE }
const MAX_AGE = 60 * 60 * 24 * 30 // 30 天

/** 未登录 / 会话无效 */
export class AuthError extends Error {
  constructor(message = '未登录或会话已失效') {
    super(message)
    this.name = 'AuthError'
  }
}

interface SessionPayload {
  uid: number
  iat: number // 签发时间（秒）
}

function authSecret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET 未配置或过短（至少 16 字符），无法签发会话')
  }
  return s
}

const b64url = (buf: Buffer) => buf.toString('base64url')

function sign(data: string): string {
  return createHmac('sha256', authSecret()).update(data).digest('base64url')
}

/** 生成签名会话字符串 */
export function createSessionToken(uid: number): string {
  const payload: SessionPayload = { uid, iat: Math.floor(Date.now() / 1000) }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  return `${body}.${sign(body)}`
}

/** 校验并解析会话字符串，任何异常返回 null */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  // 定长安全比较，防时序侧信道
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (typeof payload.uid !== 'number' || typeof payload.iat !== 'number') return null
    if (Date.now() / 1000 - payload.iat > MAX_AGE) return null
    return payload
  } catch {
    return null
  }
}

/** 写入会话 Cookie（登录成功后调用） */
export async function setSessionCookie(uid: number): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(uid), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

/** 清除会话 Cookie（登出） */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** 从当前请求的 Cookie 中解析已登录用户 id，未登录抛 AuthError */
export async function getSessionUserId(): Promise<number> {
  const store = await cookies()
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value)
  if (!payload) throw new AuthError()
  return payload.uid
}

/** 生成随机 OAuth state（CSRF 防护） */
export function randomState(): string {
  return randomBytes(16).toString('hex')
}
