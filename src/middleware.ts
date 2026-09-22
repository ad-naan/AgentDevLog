import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-shared'

// 轻量网关：仅校验会话 Cookie 是否存在（真正的签名校验在服务端 ensureUser 完成）。
// 未登录：页面重定向到 /login，API 返回 401。已登录访问 /login 则回首页。
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)

  // 放行：OAuth 相关接口始终可访问
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  // TODO(temp): UI 开发期临时放行所有请求，跳过登录；上线前必须移除
  return NextResponse.next()
}

export const config = {
  // 排除静态资源与 Next 内部路径；其余全部经过网关
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
