'use client'

// ─── 全局命令面板（Ctrl+K）：导航 / 切换分区 / 立即同步 / 快速入口 ───
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconDashboard, IconLog, IconReport, IconCheck, IconSpark, IconChart,
  IconGear, IconSearch, IconBriefcase, IconHome, IconRefresh, IconTerminal,
} from './icons'
import { useStore } from './StoreProvider'
import type { Scope } from '@/lib/types'

interface Cmd {
  id: string
  label: string
  hint: string
  keywords: string
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
  run: () => void | Promise<void>
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}

function CommandPaletteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { scope, api } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const nav = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  const cmds = useMemo<Cmd[]>(() => {
    const work = scope === 'work'
    const zone = work ? '/work' : '/life'
    const base: Cmd[] = [
      { id: 'dash', label: work ? '前往 工作台' : '前往 生活台', hint: work ? '→ ~/devlog/today' : '→ journal/today', keywords: 'dashboard home 今日 首页 journal', icon: work ? IconDashboard : IconHome, run: () => nav(zone) },
      { id: 'logs', label: work ? '前往 工作日志' : '前往 日记本', hint: work ? '→ ~/devlog/logs' : '→ journal/entries', keywords: 'log 日志 日记 编辑 记录', icon: IconLog, run: () => nav(`${zone}/logs`) },
      { id: 'todos', label: work ? '前往 TodoList' : '前往 小心愿', hint: work ? '→ ~/devlog/todos' : '→ journal/wishes', keywords: 'todo 待办 任务 心愿', icon: IconCheck, run: () => nav(`${zone}/todos`) },
      { id: 'reports', label: work ? '前往 报告中心' : '前往 回忆册', hint: work ? '→ ~/devlog/reports' : '→ journal/memories', keywords: 'report 日报 报告 回忆 复盘 memories', icon: IconReport, run: () => nav(`${zone}/reports`) },
    ]
    if (work) {
      base.push(
        { id: 'bd', label: '前往 需求拆解', hint: '→ ~/devlog/agent/requirements', keywords: 'breakdown 拆解 需求 ai', icon: IconSpark, run: () => nav('/work/breakdown') },
        { id: 'ana', label: '前往 数据看板', hint: '→ ~/devlog/insights', keywords: 'analytics 数据 统计 热力图', icon: IconChart, run: () => nav('/work/analytics') },
      )
    }
    base.push(
      { id: 'set', label: '前往 设置', hint: '→ settings', keywords: 'settings 设置 配置 github llm 时间段', icon: IconGear, run: () => nav(`${zone}/settings`) },
      {
        id: 'scope',
        label: `切换到${work ? '生活' : '工作'}分区`,
        hint: work ? '/work → /life' : '/life → /work',
        keywords: 'scope 分区 切换 work life 工作 生活 下班',
        icon: work ? IconHome : IconBriefcase,
        run: () => nav(work ? '/life' : '/work'),
      },
      {
        id: 'sync',
        label: syncing ? '正在同步 GitHub…' : '立即同步 GitHub',
        hint: 'POST /api/sync',
        keywords: 'sync 同步 github 拉取',
        icon: IconRefresh,
        run: async () => {
          if (syncing) return
          setSyncing(true)
          try { await api('/api/sync', { method: 'POST' }) } finally { setSyncing(false); onClose() }
        },
      },
      {
        id: 'ai',
        label: '打开 AI 助手',
        hint: '右下角 · devlog agent',
        keywords: 'ai 助手 assistant agent 对话',
        icon: IconTerminal,
        run: () => { window.dispatchEvent(new CustomEvent('open-assistant')); onClose() },
      },
    )
    return base
  }, [nav, scope, api, syncing, onClose])

  const hits = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return cmds
    return cmds.filter((c) => (c.label + ' ' + c.keywords + ' ' + c.hint).toLowerCase().includes(k))
  }, [q, cmds])

  const activeIdx = Math.min(sel, Math.max(0, hits.length - 1))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const onKey = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((i) => (i + 1) % Math.max(1, hits.length))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((i) => (i - 1 + hits.length) % Math.max(1, hits.length))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const c = hits[activeIdx]
      if (c) await c.run()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] px-4"
      style={{ background: 'rgba(4,7,12,.65)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="命令面板">
      <div
        className="w-full max-w-[540px] rounded-2xl border border-line2 bg-[#0e141f] shadow-[0_24px_80px_-16px_rgba(0,0,0,.9),0_0_0_1px_rgba(52,199,89,.08)] cmd-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}>
        <div className="flex items-center gap-3 px-4.5 h-[52px] border-b border-line bg-inset/30">
          <IconSearch width={16} height={16} className="text-accent shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
            }}
            placeholder="搜索命令、页面或操作动作…"
            className="flex-1 bg-transparent outline-none text-[13.5px] text-txt placeholder:text-faint font-sans"
          />
          <kbd className="text-[10px] font-mono text-faint border border-line rounded px-1.5 py-0.5 bg-black/20">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2">
          {hits.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-faint font-mono">
              未找到与 &quot;{q}&quot; 相关的命令
            </div>
          )}
          {hits.map((c, i) => {
            const isSelected = i === activeIdx
            return (
              <button
                key={c.id}
                data-idx={i}
                onClick={() => c.run()}
                onMouseEnter={() => setSel(i)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-[rgba(52,199,89,.12)]' : 'hover:bg-white/[0.02]'
                }`}>
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'border-[rgba(52,199,89,.35)] text-accent bg-[rgba(52,199,89,.1)]'
                      : 'border-line text-faint bg-[#111823]'
                  }`}>
                  <c.icon width={15} height={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] font-medium truncate ${isSelected ? 'text-txt' : 'text-dim'}`}>
                    {c.label}
                  </span>
                  <span className="block text-[11px] font-mono text-faint truncate">{c.hint}</span>
                </span>
                {isSelected && <IconTerminal width={13} height={13} className="text-accent shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4 px-4.5 h-9 border-t border-line bg-[#090d14] text-[10.5px] font-mono text-faint">
          <span>↑↓ 选择</span>
          <span>↵ 执行</span>
          <span className="ml-auto">devlog · cmd</span>
        </div>
      </div>
    </div>
  )
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <CommandPaletteModal onClose={onClose} />
}

export type { Scope }
