import { Logo } from '@/components/icons'

const ERRORS: Record<string, string> = {
  state: '登录校验失败（state 不匹配），请重试',
  config: '服务端未配置 GitHub OAuth，请联系管理员',
  token: 'GitHub 授权码换取令牌失败，请重试',
  user: '获取 GitHub 用户信息失败，请重试',
  exchange: '登录过程出错，请重试',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const msg = error ? ERRORS[error] || '登录失败，请重试' : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div aria-hidden className="pointer-events-none fixed -top-32 -left-24 w-96 h-96 rounded-full opacity-[.08] sidebar-glow" />
      <div className="relative w-full max-w-sm bg-card border border-line rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-4 text-[20px] font-bold tracking-wide">devlog workspace</h1>
          <p className="mt-1.5 text-[13px] text-faint leading-relaxed">
            开发者工作日志 · TodoList · GitHub 同步
            <br />使用 GitHub 账号登录以继续
          </p>
        </div>

        {msg && (
          <div className="mt-5 text-[12.5px] text-red bg-[rgba(248,81,73,.1)] border border-[rgba(248,81,73,.25)] rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

        <a
          href="/api/auth/github"
          className="btn-press mt-6 w-full flex items-center justify-center gap-2.5 h-11 rounded-xl bg-[#1f6feb] hover:bg-[#2178f0] text-white text-[14px] font-semibold transition-colors"
        >
          <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          使用 GitHub 登录
        </a>

        <p className="mt-4 text-[11px] text-faint text-center leading-relaxed">
          登录即授权读取你的 GitHub 资料与仓库活动，
          <br />用于生成工作日志与周报。
        </p>
      </div>
    </div>
  )
}
