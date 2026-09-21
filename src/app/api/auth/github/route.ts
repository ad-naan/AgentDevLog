import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomState } from '@/lib/auth'
import { OAUTH_STATE_COOKIE } from '@/lib/auth-shared'

// GET /api/auth/github → 跳转到 GitHub 授权页
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID 未配置，无法发起 GitHub 登录', code: 'oauth_not_configured' },
      { status: 500 },
    )
  }

  const origin = process.env.APP_URL || new URL(req.url).origin
  const redirectUri = `${origin.replace(/\/+$/, '')}/api/auth/callback`
  const state = randomState()

  const store = await cookies()
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // 10 分钟内完成授权
  })

  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('scope', 'read:user user:email repo')
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('allow_signup', 'false')

  return NextResponse.redirect(authorize.toString())
}
