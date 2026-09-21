import type { SVGProps } from 'react'

// ─── 图标系统 ───
// 统一 24×24 视觉栅格，1.7 圆头描边 + 关键局部双色（fill 低透明度）
// 所有图标在 14–20px 尺寸下均经过视觉平衡调优

type P = SVGProps<SVGSVGElement>

const base = (p: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: 16,
  height: 16,
  'aria-hidden': true,
  ...p,
})

// 工作台：非对称四宫格 + 顶部高光块，打破均质呆板
export const IconDashboard = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="8" height="10" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" className="fill-current opacity-[.14] stroke-none" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="15" width="8" height="6" rx="2" />
    <path d="M6.2 7.5l1.3 1.3-1.3 1.3" strokeWidth="1.5" />
  </svg>
)

// 日志：编辑笔，笔尖双色，书写轨迹线
export const IconLog = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.8 18.2l-3.6.9.9-3.6L16.5 3.5z" />
    <path d="M14.5 5.5l3 3" className="opacity-[.45]" />
  </svg>
)

// 报告：文档 + 折角 + 行文线
export const IconReport = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" className="fill-current opacity-[.12] stroke-none" />
    <path d="M8 13h8M8 17h5" strokeWidth="1.5" className="opacity-[.7]" />
  </svg>
)

// 待办：勾选框 + 挑勾动势
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 11.2l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

// 灵感：四芒星闪光（替代旧十字准星）
export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2.5l1.9 5.3a2 2 0 0 0 1.24 1.2l5.36 1.75-5.36 1.76a2 2 0 0 0-1.24 1.2L12 19l-1.9-5.29a2 2 0 0 0-1.24-1.2L3.5 10.75l5.36-1.75a2 2 0 0 0 1.24-1.2L12 2.5z" />
    <path d="M19 17.5v4M17 19.5h4" strokeWidth="1.4" className="opacity-[.6]" />
  </svg>
)

// 数据：坐标轴 + 平滑上升曲线 + 数据点
export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="M6.5 14.5c2.8 0 3.2-6.5 6-6.5s3.2 4 5.5 4" strokeWidth="1.9" />
    <circle cx="17.9" cy="12" r="1.15" className="fill-current stroke-none" />
    <circle cx="12.4" cy="8" r="1.15" className="fill-current opacity-[.5] stroke-none" />
  </svg>
)

// 设置：精密齿轮
export const IconGear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.1 14.1a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.69 2.69l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.76.32l-.06.06A1.9 1.9 0 1 1 3.64 15.7l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97H2.4a1.9 1.9 0 1 1 0-3.8h.09A1.6 1.6 0 0 0 3.96 8a1.6 1.6 0 0 0-.32-1.76l-.06-.06A1.9 1.9 0 1 1 6.27 3.5l.06.06a1.6 1.6 0 0 0 1.76.32H8.1a1.6 1.6 0 0 0 .97-1.47V2.4a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.9 1.9 0 1 1 2.69 2.69l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.47.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.47.97z" />
  </svg>
)

// 搜索：放大镜 + 双层镜片高光
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M8.2 8.6a4 4 0 0 1 2.4-1.7" strokeWidth="1.4" className="opacity-[.55]" />
    <path d="M20.2 20.2l-3.9-3.9" strokeWidth="2" />
  </svg>
)

// 日历：挂历 + 圆点标记
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <path d="M16 2.2v3.6M8 2.2v3.6M3 9.5h18" />
    <circle cx="8.2" cy="14.8" r="1.3" className="fill-current stroke-none" />
    <circle cx="13" cy="14.8" r="1.3" className="fill-current opacity-[.4] stroke-none" />
    <path d="M16.6 14.8h1.6M6.6 18h4.2" strokeWidth="1.5" className="opacity-[.6]" />
  </svg>
)

// 链接
export const IconLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

// 刷新：圆环箭头
export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
)

// 复制：双层纸
export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <rect x="9" y="9" width="12" height="12" rx="2.5" className="fill-current opacity-[.12] stroke-none" />
    <path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8v.7" />
  </svg>
)

// 心情三档：眉眼细节区分
export const IconMoodBad = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M16.2 16.4s-1.5-2.1-4.2-2.1-4.2 2.1-4.2 2.1" />
    <path d="M7.4 9.2l1.8.9M16.6 9.2l-1.8.9" strokeWidth="1.6" />
  </svg>
)
export const IconMood = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.3 14.4s1.5 1.7 3.7 1.7 3.7-1.7 3.7-1.7" />
    <path d="M9 9.6h.01M15 9.6h.01" strokeWidth="2.2" />
  </svg>
)
export const IconMoodHappy = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13.8s1.5 2.6 4 2.6 4-2.6 4-2.6" />
    <path d="M8.2 8.9l1.6 1.1M15.8 8.9l-1.6 1.1" strokeWidth="1.5" />
  </svg>
)

// 箭头
export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12h15" />
    <path d="M13.5 6l6 6-6 6" />
  </svg>
)

// 警示：三角 + 感叹
export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" strokeWidth="1.9" />
  </svg>
)

// Git：分支 / 合并
export const IconGitBranch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="6" cy="5" r="2.6" className="fill-current opacity-[.2] stroke-none" />
    <circle cx="6" cy="5" r="2.6" />
    <circle cx="6" cy="19" r="2.6" />
    <circle cx="18" cy="8" r="2.6" />
    <path d="M18 10.6a9.5 9.5 0 0 1-9 8.4M6 7.6v8.8" />
  </svg>
)
export const IconGitMerge = (p: P) => (
  <svg {...base(p)}>
    <circle cx="18" cy="18" r="2.6" className="fill-current opacity-[.2] stroke-none" />
    <circle cx="18" cy="18" r="2.6" />
    <circle cx="6" cy="6" r="2.6" />
    <path d="M13.5 6h1.7a2 2 0 0 1 2 2v7M6 8.6v10.8" />
  </svg>
)

// 公文包
export const IconBriefcase = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="7" width="19" height="13.5" rx="2.5" />
    <path d="M16 21V5.5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2V21" />
    <path d="M2.5 12.5h5.2M16.3 12.5h5.2" strokeWidth="1.4" className="opacity-[.55]" />
  </svg>
)

// 火焰：双色焰心
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    <path d="M11.3 19.4a2.8 2.8 0 0 1-1.4-2.4c0-1.1.66-1.7 1.16-2.5.34.86 1.7 1.7 1.7 2.9 0 .9-.66 1.7-1.46 2z" className="fill-current opacity-[.35] stroke-none" />
  </svg>
)

// 灯泡：光丝 + 光芒
export const IconBulb = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10.2 21.5h3.6" />
    <path d="M12 2.5a6.8 6.8 0 0 0-3.9 12.35c.63.46 1 1.18 1 1.96V18h5.8v-1.19c0-.78.37-1.5 1-1.96A6.8 6.8 0 0 0 12 2.5z" />
    <path d="M12 6.2v2M9.4 7.5l1.2 1.2M14.6 7.5l-1.2 1.2" strokeWidth="1.3" className="opacity-[.6]" />
  </svg>
)

// 时钟：指针 + 刻度
export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 1.9" strokeWidth="1.9" />
    <path d="M12 3.4v.9M20.6 12h-.9M12 20.6v-.9M3.4 12h.9" strokeWidth="1.4" className="opacity-[.5]" />
  </svg>
)

// 趋势：双峰折线 + 向上箭头
export const IconTrend = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 17l5.2-6.4 3.6 3L21 4" />
    <path d="M15.5 4H21v5.5" />
  </svg>
)

// 加号
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" strokeWidth="1.9" />
  </svg>
)

// 首页：房子 + 门窗
export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 10.8L12 3.5l8.5 7.3" />
    <path d="M5.5 9.5V19a1.8 1.8 0 0 0 1.8 1.8h9.4A1.8 1.8 0 0 0 18.5 19V9.5" />
    <path d="M10 20.8v-5.4h4v5.4" strokeWidth="1.5" className="opacity-[.6]" />
  </svg>
)

// ─── 新增 ───

// 命令键 ⌘（命令面板）
export const IconCommand = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 9h6v6H9z" />
    <path d="M9 9H7.5a2.25 2.25 0 1 1 0-4.5C10 4.5 9 6.75 9 9zM15 9h1.5a2.25 2.25 0 1 0 0-4.5C14 4.5 15 6.75 15 9zM9 15H7.5a2.25 2.25 0 1 0 0 4.5C10 19.5 9 17.25 9 15zM15 15h1.5a2.25 2.25 0 1 1 0 4.5C14 19.5 15 17.25 15 15z" />
  </svg>
)

// 关闭 ✕
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth="1.9" />
  </svg>
)

// 终端提示符 ›_
export const IconTerminal = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 17l6-5-6-5" />
    <path d="M12 19h8" />
  </svg>
)

// Issue：信息圆 + 缺口
export const IconGitIssue = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4v5.2M12 16.3h.01" strokeWidth="1.9" />
  </svg>
)

// 用户
export const IconUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
)

// 书写光标
export const IconPen = IconLog

// 铃铛通知
export const IconBell = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

// 更多操作（三点）
export const IconMore = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="1.5" className="fill-current stroke-none" />
    <circle cx="18" cy="12" r="1.5" className="fill-current stroke-none" />
    <circle cx="6" cy="12" r="1.5" className="fill-current stroke-none" />
  </svg>
)

// 机器人（AI 拆解）
export const IconRobot = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v3M8 15h.01M16 15h.01M9 18h6" />
  </svg>
)

// 盾牌（安全保护）
export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

// 挂锁（加密安全）
export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1.2" className="fill-current stroke-none" />
  </svg>
)

// 数据库（私有化存储）
export const IconDatabase = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

// 密钥（OAuth PKCE）
export const IconKey = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M21 2l-9.6 9.6M15.5 7.5l2.5 2.5M13 10l2.5 2.5" />
  </svg>
)



// ─── 品牌标识：「终端之眼」───
// 圆角终端窗 + 眼瞳般的提示符，光标呼吸闪烁（见 globals.css .logo-cursor）
export function Logo({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="lg-eye" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4AF0B0" />
          <stop offset="1" stopColor="#2BB673" />
        </linearGradient>
      </defs>
      {/* 终端窗体 */}
      <rect x="4" y="8" width="40" height="32" rx="9" stroke="url(#lg-eye)" strokeWidth="2.4" />
      {/* 窗口状态灯（像眼睛的高光） */}
      <circle cx="12.5" cy="15.5" r="1.6" fill="#3ddc97" />
      <circle cx="17.5" cy="15.5" r="1.6" fill="#3ddc97" opacity=".45" />
      <circle cx="22.5" cy="15.5" r="1.6" fill="#3ddc97" opacity=".2" />
      {/* 提示符 › 作为眼瞳神韵 */}
      <path d="M14 24.5l5.5 4.5-5.5 4.5" stroke="#e6fff3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* 呼吸光标 */}
      <rect x="24" y="28" width="9" height="3.2" rx="1.6" fill="#4AF0B0" className="logo-cursor" />
    </svg>
  )
}
