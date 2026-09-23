import Link from 'next/link'
import { Logo, IconGitBranch, IconSpark, IconCheck, IconAlert } from '@/components/icons'

const ERRORS: Record<string, string> = {
  state: '登录校验失败（state 参数不匹配），请重新尝试',
  config: '服务端未配置 GitHub OAuth（请检查 .env 中的 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）',
  token: 'GitHub 授权码换取令牌失败，请检查网络后重试',
  user: '获取 GitHub 用户个人资料失败，请重试',
  exchange: 'OAuth 会话创建失败，请检查数据库连接或重试',
}

const FEATURES = [
  { icon: IconGitBranch, title: 'Git 活动自动同步', desc: 'Push、PR、Issue 自动聚合成日志' },
  { icon: IconSpark, title: 'AI 日报周报', desc: '基于真实活动提炼四象限总结' },
  { icon: IconCheck, title: '工程待办', desc: 'P0/P1/P2 分级与 AI 拆解' },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMsg = error ? ERRORS[error] || '登录验证失败，请稍后重试' : ''

  return (
    <div className="min-h-screen relative flex flex-col bg-bg text-txt select-none overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />
      {/* 单一柔和泛光 */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-64 -left-40 w-[760px] h-[760px] rounded-full opacity-[0.1] blur-[150px]"
        style={{ background: 'radial-gradient(circle, rgba(52,199,89,0.35) 0%, rgba(52,199,89,0) 70%)' }} />

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* 左侧：品牌与产品简介 */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <Logo size={28} />
            </div>
            <span className="text-[16px] font-bold tracking-tight font-mono">devlog</span>
          </div>

          <div className="max-w-[480px]">
            <h1 className="text-[32px] xl:text-[36px] font-extrabold tracking-tight leading-[1.25]">
              让每一次提交与复盘，
              <br />
              都沉淀为工程资产。
            </h1>
            <p className="mt-4 text-[14px] text-dim leading-relaxed">
              基于真实 Git 活动与任务流，零干扰记录工作脉络，AI 一键生成可交付的日报与周报。
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.title} className="flex items-start gap-3.5">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium">{f.title}</div>
                      <div className="text-[12px] text-dim mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[12px] text-dim">数据存储于你自己的数据库 · 无第三方追踪</div>
        </div>

        {/* 右侧：登录 */}
        <div className="flex flex-col justify-center items-center p-8 sm:p-12">
          <div className="w-full max-w-[360px] flex flex-col gap-6">
            {/* 移动端品牌 */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <Logo size={24} />
              </div>
              <span className="text-[15px] font-bold font-mono">devlog</span>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] font-bold tracking-tight">登录工作台</h2>
              <p className="text-[13px] text-dim leading-relaxed">
                使用 GitHub 账号验证身份，登录后即可继续你的日志与待办。
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red/10 border border-red/25 text-red text-[12px] flex items-start gap-2.5 leading-relaxed fade-up">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Link
              href="/api/auth/github"
              className="btn-press group relative flex items-center justify-center gap-3 h-12 w-full rounded-xl bg-white hover:bg-[#f3f4f6] text-[#090d14] text-[14px] font-semibold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:shadow-[0_0_32px_rgba(255,255,255,0.22)] transition-all cursor-pointer">
              <svg viewBox="0 0 16 16" width={20} height={20} fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>使用 GitHub 登录</span>
            </Link>

            <p className="text-[11.5px] text-faint text-center leading-relaxed">
              仅使用 GitHub 基础读取权限，不会获取你的密码。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
