'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  IconDashboard, IconLog, IconReport, IconCheck, IconSpark, IconChart,
  IconGear, IconSearch, IconBriefcase, IconHome, Logo, IconBell,
} from './icons'
import { useStore } from './StoreProvider'
import CommandPalette, { useCommandPalette } from './CommandPalette'
import type { Scope } from '@/lib/types'

interface NavItem { href: string; label: string; icon: typeof IconDashboard }

const WORK_NAV: NavItem[] = [
  { href: '/work', label: '工作台', icon: IconDashboard },
  { href: '/work/logs', label: '工作日志', icon: IconLog },
  { href: '/work/reports', label: '报告中心', icon: IconReport },
  { href: '/work/todos', label: 'TodoList', icon: IconCheck },
  { href: '/work/breakdown', label: '需求拆解', icon: IconSpark },
  { href: '/work/analytics', label: '数据看板', icon: IconChart },
]

const LIFE_NAV: NavItem[] = [
  { href: '/life', label: '生活台', icon: IconHome },
  { href: '/life/logs', label: '日记本', icon: IconLog },
  { href: '/life/todos', label: '小心愿', icon: IconCheck },
  { href: '/life/reports', label: '回忆册', icon: IconReport },
]

const TITLES: Record<string, string> = {
  '/work': '今天',
  '/work/logs': '工作日志',
  '/work/reports': '报告中心',
  '/work/todos': '待办清单',
  '/work/breakdown': '需求拆解',
  '/work/analytics': '数据看板',
  '/work/settings': '设置',
  '/life': '今天',
  '/life/logs': '日记本',
  '/life/todos': '小心愿',
  '/life/reports': '回忆册',
  '/life/settings': '设置',
}

/** 从路径推导当前分区 */
export function useZone(): Scope {
  const path = usePathname()
  return path?.startsWith('/life') ? 'life' : 'work'
}

function ZoneSwitch({ zone }: { zone: Scope }) {
  const other = zone === 'work' ? 'life' : 'work'
  return (
    <Link
      href={`/${other}`}
      className={`flex items-center justify-center gap-1.5 mb-3 py-1.5 rounded-xl border text-[12px] font-medium transition-all duration-300 btn-press
        ${zone === 'work'
          ? 'border-orange/25 text-orange hover:bg-orange/10 hover:border-orange/45'
          : 'border-accent/25 text-accent hover:bg-accent/10 hover:border-accent/45'}`}
    >
      {zone === 'work'
        ? <><IconHome className="w-3.5 h-3.5" />下班了 · 去生活</>
        : <><IconBriefcase className="w-3.5 h-3.5" />开始工作</>}
    </Link>
  )
}

function Sidebar({ zone }: { zone: Scope }) {
  const path = usePathname()
  const router = useRouter()
  const { s } = useStore()
  const nav = zone === 'work' ? WORK_NAV : LIFE_NAV
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 bg-panel/80 backdrop-blur-xl border-r border-line flex-col p-3.5 relative z-10 select-none">
      {/* 顶部氛围光（极弱、静止） */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 w-60 h-60 rounded-full opacity-[.06] sidebar-glow" />

      {/* 品牌 Logo */}
      <Link href={zone === 'work' ? '/work' : '/life'} className="flex items-center gap-2.5 px-1 py-2 mb-2 group">
        <Logo size={30} className="transition-transform duration-300 group-hover:scale-105" />
        <span className="flex flex-col">
          <b className="text-[14.5px] font-semibold leading-tight tracking-tight text-txt transition-colors">devlog</b>
          <span className="text-[9.5px] text-faint leading-tight tracking-widest uppercase">
            {zone === 'work' ? 'workspace' : 'journal'}
          </span>
        </span>
      </Link>

      <ZoneSwitch zone={zone} />

      {/* 导航菜单项 */}
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const on = path === n.href
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] w-full text-left transition-all duration-300
                ${on
                  ? 'bg-[rgba(52,199,89,.1)] text-txt font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_1px_3px_rgba(0,0,0,.25)]'
                  : 'text-dim hover:bg-white/[0.04] hover:text-txt'}`}>
              {on && <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-full shadow-[0_0_8px_rgba(52,199,89,.5)]" />}
              <n.icon
                width={16}
                height={16}
                className={`shrink-0 transition-colors duration-300 ${on ? 'text-accent' : 'text-faint group-hover:text-dim'}`}
              />
              <span className="flex-1 whitespace-nowrap">{n.label}</span>
            </Link>
          )
        })}

        <Link
          href={`/${zone}/settings`}
          className={`group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] w-full text-left transition-all duration-300
            ${path === `/${zone}/settings`
              ? 'bg-white/[0.08] text-txt font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_1px_3px_rgba(0,0,0,.25)]'
              : 'text-dim hover:bg-white/[0.04] hover:text-txt'}`}>
          {path === `/${zone}/settings` && <span className="absolute left-1 w-1 h-3.5 bg-accent rounded-full" />}
          <IconGear
            width={16}
            height={16}
            className={`shrink-0 transition-all duration-300 ${path === `/${zone}/settings` ? 'text-accent' : 'text-faint group-hover:text-dim group-hover:rotate-45'}`}
          />
          <span className="flex-1">设置</span>
        </Link>
      </nav>

      {/* 底部用户信息 */}
      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card-subtle border border-line transition-all duration-300 hover:border-line2">
          <div className="relative shrink-0">
            {s?.user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
            ) : s ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center text-[11px] font-semibold text-white">
                {(s.user.name || 'U').trim()[0]?.toUpperCase()}
              </div>
            ) : (
              <div className="skeleton w-8 h-8 rounded-full" />
            )}
            {s && <span aria-hidden className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-panel" />}
          </div>
          <div className="min-w-0 flex-1">
            {s ? (
              <>
                <b className="block text-[12px] font-medium leading-tight truncate text-txt">{s.user.name}</b>
                <span className="block text-[10px] text-faint truncate mt-0.5">
                  {s.user.login ? `@${s.user.login}` : s.user.title}
                </span>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="skeleton h-3.5 w-18" />
                <div className="skeleton h-2.5 w-24" />
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title="退出登录"
            className="btn-press shrink-0 text-faint hover:text-red transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]">
            <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
              <path d="M10.5 11 14 8l-3.5-3M14 8H6" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

function TopBar({ zone, onOpenCmd }: { zone: Scope; onOpenCmd: () => void }) {
  const path = usePathname()
  const { s, api } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setNow(Date.now())
    })
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
  }, [])

  const syncAgo = s && now !== null ? Math.max(1, Math.round((now - s.lastSync) / 60e3)) : 1
  const synced = s && s.lastSync > 0

  const doSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      await api('/api/sync', { method: 'POST' })
    } catch {
      /* handled elsewhere */
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="h-[54px] shrink-0 border-b border-line flex items-center px-3 sm:px-5 gap-3.5 bg-panel/70 backdrop-blur-2xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-2.5">
         <span className={`text-[15px] sm:text-[16px] font-semibold tracking-tight text-txt ${zone === 'life' ? 'italic' : ''}`}>
           {TITLES[path] ?? 'devlog'}
         </span>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${zone === 'work'
          ? 'text-blue bg-blue/10'
          : 'text-orange bg-orange/10'}`}>
          {zone === 'work' ? '工作' : '生活'}
        </span>
      </div>

      {/* 居中搜索胶囊 */}
      <div className="mx-auto hidden md:block">
        <button
          onClick={onOpenCmd}
            className="btn-press flex items-center gap-2.5 h-8 px-3.5 rounded-full bg-card border border-line hover:border-line2 text-faint hover:text-dim cursor-pointer w-[240px] lg:w-[280px] transition-all duration-300">
          <IconSearch width={13} height={13} className="shrink-0 text-faint" />
          <span className="text-[12px] truncate flex-1 text-left">搜索任务、日记、文档…</span>
          <kbd className="text-[10px] font-mono text-faint border border-line rounded px-1.5 py-0.5 bg-black/20">⌘ K</kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* GitHub 同步：仅工作区展示 */}
        {zone === 'work' && (
          <button
            onClick={doSync}
            disabled={syncing}
            title="点击立即同步 GitHub 活动"
            className={`btn-press flex items-center gap-2 h-8 px-3 rounded-full border cursor-pointer transition-all duration-300 ${synced
              ? 'bg-accent/8 border-accent/25 hover:border-accent/45'
              : 'bg-card border-line hover:border-line2'} disabled:cursor-wait`}>
            <svg viewBox="0 0 16 16" width={13.5} height={13.5} fill="currentColor" className={syncing ? 'animate-spin text-dim' : 'text-dim'}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span className={`hidden sm:inline text-[11.5px] ${synced ? 'text-accent' : 'text-faint'}`}>
              {syncing ? '同步中…' : synced ? `${syncAgo} 分钟前` : '未同步'}
            </span>
            {synced && !syncing && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot" />}
          </button>
        )}

        {/* 移动端/折叠时的搜索按钮 */}
        <button
          onClick={onOpenCmd}
          className="md:hidden btn-press w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-faint hover:text-txt">
          <IconSearch width={13} height={13} />
        </button>

        {/* 通知铃铛 */}
        <button
          aria-label="通知"
          className="btn-press relative w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-dim hover:text-txt hover:border-line2">
          <IconBell width={14} height={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent/80" />
        </button>

        {/* 设置快捷入口 */}
        <Link
          href={`/${zone}/settings`}
          aria-label="设置"
          className="btn-press w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-dim hover:text-txt hover:border-line2">
          <IconGear width={14} height={14} />
        </Link>
      </div>
    </div>
  )
}

function MobileNav({ zone }: { zone: Scope }) {
  const path = usePathname()
  const nav = zone === 'work' ? WORK_NAV : LIFE_NAV
  const items: NavItem[] = [...nav, { href: `/${zone}/settings`, label: '设置', icon: IconGear }]

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-panel/90 backdrop-blur-2xl px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">
      <div className="flex items-stretch gap-1 overflow-x-auto">
        {items.map((item) => {
          const active = path === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-faint hover:text-dim'}`}
            >
              <Icon width={16} height={16} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const zone = useZone()
  const { open, setOpen } = useCommandPalette()

  return (
    <div className={`h-screen flex flex-col ${zone === 'life' ? 'zone-life' : ''}`}>
      <div className="flex flex-1 min-h-0">
        <Sidebar zone={zone} />
        <main className="flex-1 min-w-0 flex flex-col">
          <TopBar zone={zone} onOpenCmd={() => setOpen(true)} />
          <div className="flex-1 min-h-0 overflow-y-auto main-area pb-16 lg:pb-0">{children}</div>
        </main>
      </div>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <MobileNav zone={zone} />
    </div>
  )
}
