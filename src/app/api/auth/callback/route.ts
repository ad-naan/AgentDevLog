import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { setSessionCookie } from '@/lib/auth'
import { OAUTH_STATE_COOKIE } from '@/lib/auth-shared'
import { exchangeCode, tokenPersistData } from '@/lib/github-auth'

// GET /api/auth/callback → GitHub 授权回调：校验 state → 换 token → 拉用户 → 落库 → 建会话
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = process.env.APP_URL || url.origin
  const home = `${origin.replace(/\/+$/, '')}/`
  const loginUrl = `${origin.replace(/\/+$/, '')}/login`

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const store = await cookies()
  const savedState = store.get(OAUTH_STATE_COOKIE)?.value
  store.delete(OAUTH_STATE_COOKIE)

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${loginUrl}?error=state`)
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${loginUrl}?error=config`)
  }

  try {
    // 1) code 换 access_token（GitHub App 开启「用户令牌过期」时，这里会一并拿到 refresh token）
    const tokenJson = await exchangeCode(code, `${origin.replace(/\/+$/, '')}/api/auth/callback`)
    const accessToken = tokenJson.access_token
    if (!accessToken) {
      return NextResponse.redirect(`${loginUrl}?error=token`)
    }

    // 2) 拉取 GitHub 用户资料
    const ghHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'devlog-app',
    }
    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders })
    if (!userRes.ok) return NextResponse.redirect(`${loginUrl}?error=user`)
    const gh = (await userRes.json()) as {
      id: number
      login: string
      name?: string | null
      avatar_url?: string | null
      email?: string | null
    }

    // 主邮箱（可能为空，需额外接口）
    let email = gh.email || null
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders })
      if (emailRes.ok) {
        const emails = (await emailRes.json()) as { email: string; primary: boolean; verified: boolean }[]
        email = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email || null
      }
    }

    const githubId = String(gh.id)
    const displayName = gh.name?.trim() || gh.login
    const avatar = gh.avatar_url || null

    // 3) 单用户系统：始终绑定到唯一的那个账号，绝不新建第二个用户。
    //    优先按 githubId 命中；否则复用现有的第一个用户；都没有才创建首个用户。
    const existing =
      (await prisma.user.findUnique({ where: { githubId } })) ||
      (await prisma.user.findFirst({ orderBy: { id: 'asc' } }))

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { githubId, login: gh.login, name: displayName, avatar },
        })
      : await prisma.user.create({
          data: {
            githubId, login: gh.login, name: displayName, avatar,
            email: email ?? undefined,
          },
        })

    // 已存在的用户：更新其 GitHub 凭据（含续期信息），不覆盖手填配置的其它字段。
    // tokenPersistData 在没有 refresh token 时会清空续期字段，因此「长期令牌」也是干净状态。
    const tokenData = tokenPersistData(tokenJson)
    await prisma.settings.upsert({
      where: { userId: user.id },
      update: { ...tokenData, githubUser: gh.login, githubAuthFailed: false },
      create: { userId: user.id, ...tokenData, githubUser: gh.login, githubAuthFailed: false },
    })

    // 4) 建立会话
    await setSessionCookie(user.id)
    return NextResponse.redirect(home)
  } catch {
    return NextResponse.redirect(`${loginUrl}?error=exchange`)
  }
}
