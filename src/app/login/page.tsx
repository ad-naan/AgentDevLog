import {
  Logo,
  IconGitBranch,
  IconSpark,
  IconCheck,
  IconTerminal,
  IconShield,
  IconLock,
  IconDatabase,
  IconKey,
  IconAlert,
  IconArrow,
} from '@/components/icons'

const ERRORS: Record<string, string> = {
  state: '登录校验失败（state 参数不匹配），请重新尝试',
  config: '服务端未配置 GitHub OAuth（请检查 .env 中的 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）',
  token: 'GitHub 授权码换取令牌失败，请检查网络后重试',
  user: '获取 GitHub 用户个人资料失败，请重试',
  exchange: 'OAuth 会话创建失败，请检查数据库连接或重试',
}

const HIGHLIGHTS = [
  {
    icon: IconGitBranch,
    accent: 'text-accent border-[rgba(61,220,151,.25)] bg-[rgba(61,220,151,.08)]',
    title: '自动化 Git 与活动流同步',
    desc: '自动聚合关联仓库的 Push、PR、Issue 与 Commit，告别手动记录',
  },
  {
    icon: IconSpark,
    accent: 'text-purple border-[rgba(167,139,250,.25)] bg-[rgba(167,139,250,.08)]',
    title: '四象限 AI 智能工作周/日报',
    desc: '基于真实活动自动提炼已完成、进行中、阻塞风险与下一步计划',
  },
  {
    icon: IconCheck,
    accent: 'text-blue border-[rgba(88,166,255,.25)] bg-[rgba(88,166,255,.08)]',
    title: '工程师专属高敏捷 TodoList',
    desc: '支持 P0/P1/P2 智能分级、AI 待办精炼与需求一键拆解',
  },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMsg = error ? ERRORS[error] || '登录验证失败，请稍后重试' : ''

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-[#06090f] text-txt select-none overflow-x-hidden">
      {/* 极简工程点阵网格背景 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* 氛围级径向泛光：左侧薄荷绿、右侧科技紫 */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-48 -left-48 w-[640px] h-[640px] rounded-full opacity-[0.12] blur-[140px]"
        style={{
          background: 'radial-gradient(circle, #3ddc97 0%, rgba(61,220,151,0) 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-48 -right-48 w-[720px] h-[720px] rounded-full opacity-[0.14] blur-[150px]"
        style={{
          background: 'radial-gradient(circle, #7c3aed 0%, rgba(124,58,237,0) 70%)',
        }}
      />

      {/* 主体架构：桌面端双栏分屏，移动端优雅折叠 */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* ─── 左侧：产品工程矩阵与实时终端遥测（占据 7 栏） ─── */}
        <div className="lg:col-span-7 flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#06090f]/60 backdrop-blur-md">
          {/* 顶栏品牌标识与状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_0_20px_rgba(61,220,151,0.15)]">
                <Logo size={32} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold tracking-tight text-txt font-mono">
                    devlog
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-dim">
                    v2.4.0
                  </span>
                </div>
                <span className="text-[11px] text-faint tracking-wide">
                  Developer Productivity Platform
                </span>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.22] text-accent text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span className="text-[11px] tracking-wide font-medium">SYSTEMS OPERATIONAL</span>
            </div>
          </div>

          {/* 核心展示区：仿真工程终端与实时遥测视窗 */}
          <div className="my-10 lg:my-14 flex flex-col gap-6 max-w-[620px]">
            <div>
              <div className="inline-flex items-center gap-2 text-accent text-[11px] font-mono tracking-widest uppercase mb-3">
                <IconTerminal className="w-3.5 h-3.5" />
                <span>Deterministic Work Log Engine</span>
              </div>
              <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-txt leading-tight">
                让每一次提交与复盘，<br className="hidden sm:inline" />
                都沉淀为清晰的工程资产。
              </h1>
              <p className="mt-3 text-[14px] text-dim leading-relaxed">
                专为高产出开发者与工程团队打造。基于真实 Git 提交轨迹与任务流，零干扰捕获工程脉络，AI 一键生成高质感交付简报。
              </p>
            </div>

            {/* 仿真工程终端监视窗 */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#090e18]/90 shadow-2xl backdrop-blur-xl overflow-hidden font-mono text-[12px]">
              {/* 终端标题栏 */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                  <span className="ml-2 text-[11px] text-dim font-sans">
                    daemon/git-telemetry-worker (pid: 4892)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-faint">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>14ms latency</span>
                </div>
              </div>

              {/* 终端内容日志流 */}
              <div className="p-4 flex flex-col gap-2.5 text-dim">
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-faint">[09:41:02]</span>
                  <span className="text-accent font-bold">› github.stream</span>
                  <span className="text-txt">captured push to origin/main (3 commits, +142 -18)</span>
                </div>
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-faint">[09:41:03]</span>
                  <span className="text-purple font-bold">› ai.synthesize</span>
                  <span className="text-txt">extracted 4-quadrant summary · 2 deliverables ready</span>
                </div>
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-faint">[09:41:04]</span>
                  <span className="text-blue font-bold">› p0.scheduler</span>
                  <span className="text-txt">scheduled 4 urgent tasks · context switched 0 times</span>
                </div>

                {/* 性能指标栏 */}
                <div className="mt-2 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-faint">SYNC RATE</div>
                    <div className="text-[13px] font-bold text-accent mt-0.5">Realtime</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-faint">MODEL ENGINE</div>
                    <div className="text-[13px] font-bold text-purple mt-0.5">DeepSeek-R1</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-faint">DATABASE</div>
                    <div className="text-[13px] font-bold text-blue mt-0.5">PostgreSQL</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 大核心能力卡片（使用精确 SVG 图标，绝对无 emoji） */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col gap-2">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${item.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12.5px] font-medium text-txt leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-faint leading-snug mt-1">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 左下角：架构承诺说明 */}
          <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/[0.06] text-[11.5px] text-faint">
            <div className="flex items-center gap-2">
              <IconShield className="w-4 h-4 text-accent" />
              <span>数据完全私有本地存储</span>
            </div>
            <div className="flex items-center gap-2">
              <IconDatabase className="w-4 h-4 text-blue" />
              <span>标准 PostgreSQL 架构</span>
            </div>
            <div className="flex items-center gap-2">
              <IconLock className="w-4 h-4 text-purple" />
              <span>无第三方追踪与数据窃取</span>
            </div>
          </div>
        </div>

        {/* ─── 右侧：专属身份认证通道（占据 5 栏） ─── */}
        <div className="lg:col-span-5 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 bg-[#080d17]/80 backdrop-blur-2xl">
          <div className="w-full max-w-[400px] flex flex-col gap-6">
            {/* 认证区域标题头 */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.08] text-dim text-[11px] font-mono w-fit">
                <IconKey className="w-3.5 h-3.5 text-accent" />
                <span>OAUTH 2.0 PKCE GATEWAY</span>
              </div>
              <h2 className="text-[24px] font-bold tracking-tight text-txt">
                登入 DevLog 工作台
              </h2>
              <p className="text-[13px] text-dim leading-relaxed">
                通过你的 GitHub 账号直接验证。系统将自动配置私有会话并安全建立数据通道。
              </p>
            </div>

            {/* 错误告警横条（如有） */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red/10 border border-red/25 text-red text-[12px] flex items-start gap-2.5 leading-relaxed fade-up">
                <IconAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* GitHub 登录核心操作按钮（顶级手感与精致微动效） */}
            <div className="flex flex-col gap-3">
              <a
                href="/api/auth/github"
                className="btn-press group relative flex items-center justify-center gap-3 h-12 w-full rounded-xl bg-white hover:bg-[#f3f4f6] text-[#090d14] text-[14px] font-semibold tracking-wide shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:shadow-[0_0_36px_rgba(255,255,255,0.32)] transition-all cursor-pointer">
                {/* 官方极简 GitHub Monochrome Vector */}
                <svg
                  viewBox="0 0 16 16"
                  width={20}
                  height={20}
                  fill="currentColor"
                  className="transition-transform group-hover:scale-105"
                  aria-hidden>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span>使用 GitHub 账号继续</span>
                <IconArrow className="w-4 h-4 text-[#090d14]/70 group-hover:translate-x-1 transition-transform" />
              </a>

              <p className="text-[11.5px] text-faint text-center leading-relaxed">
                仅需 GitHub 基础公有读取权限，无需提交任何密码或敏感 Token。
              </p>
            </div>

            {/* 安全规范与技术指标详情框 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
              <div className="text-[11px] font-mono text-dim tracking-wider uppercase flex items-center justify-between border-b border-white/[0.04] pb-2">
                <span>SECURITY STANDARDS</span>
                <span className="text-accent font-semibold">VERIFIED</span>
              </div>

              <div className="flex flex-col gap-2.5 text-[12px] text-dim">
                <div className="flex items-start gap-2.5">
                  <IconKey className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-txt">PKCE 授权规范</span>
                    <span className="text-faint text-[11px] block mt-0.5">
                      标准 Authorization Code 握手，规避中间人截获
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <IconLock className="w-3.5 h-3.5 text-purple shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-txt">HMAC-SHA256 签名</span>
                    <span className="text-faint text-[11px] block mt-0.5">
                      会话 Cookie 仅客户端持有，具备防篡改校验保护
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <IconDatabase className="w-3.5 h-3.5 text-blue shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-txt">自托管本地数据库</span>
                    <span className="text-faint text-[11px] block mt-0.5">
                      所有数据严格存储在你的专属 PostgreSQL 实例中
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部环境与版本标识 */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-faint font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>SSL Encrypted</span>
              </div>
              <span>DevLog Enterprise · 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
