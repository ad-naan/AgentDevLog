import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-shared'

// 开发期临时放开登录，方便直接调试工作区与生活区。
// 生产环境仍然走完整的会话校验，发布前无需再手动改回开关。
const AUTH_BYPASS = process.env.NODE_ENV !== 'production'

// 轻量网关：仅校验会话 Cookie 是否存在（真正的签名校验在服务端 ensureUser 完成）。
// 未登录：页面重定向到 /login，API 返回 401。已登录访问 /login 则回首页。
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // TODO: UI 开发完成后，如需本地也验证登录流程，可临时改为 false。
  if (AUTH_BYPASS) return NextResponse.next()

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  // OAuth 相关接口始终可访问。
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // 已登录访问登录页时回到工作区。
  if (pathname === '/login') {
    if (hasSession) return NextResponse.redirect(new URL('/work', req.url))
    return NextResponse.next()
  }

  // 未登录页面跳转到登录页；API 返回 401，避免 API 被重定向成 HTML。
  if (!hasSession) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '未登录或会话已失效' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // 排除静态资源与 Next 内部路径；其余全部经过网关
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
