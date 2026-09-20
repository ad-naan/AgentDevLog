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

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { scope, setScope, api } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const nav = useCallback((href: string) => { router.push(href); onClose() }, [router, onClose])

  const cmds = useMemo<Cmd[]>(() => [
    { id: 'dash', label: '前往 工作台', hint: '→ ~/devlog/today', keywords: 'dashboard home 今日 首页', icon: IconDashboard, run: () => nav('/') },
    { id: 'logs', label: '前往 工作日志', hint: '→ ~/devlog/logs', keywords: 'log 日志 编辑 记录', icon: IconLog, run: () => nav('/logs') },
    { id: 'reports', label: '前往 报告中心', hint: '→ ~/devlog/reports', keywords: 'report 日报 报告', icon: IconReport, run: () => nav('/reports') },
    { id: 'todos', label: '前往 TodoList', hint: '→ ~/devlog/todos', keywords: 'todo 待办 任务', icon: IconCheck, run: () => nav('/todos') },
    { id: 'bd', label: '前往 需求拆解', hint: '→ ~/devlog/agent/requirements', keywords: 'breakdown 拆解 需求 ai', icon: IconSpark, run: () => nav('/breakdown') },
    { id: 'ana', label: '前往 数据看板', hint: '→ ~/devlog/insights', keywords: 'analytics 数据 统计 热力图', icon: IconChart, run: () => nav('/analytics') },
    { id: 'set', label: '前往 设置', hint: '→ ~/devlog/settings', keywords: 'settings 设置 配置 github llm', icon: IconGear, run: () => nav('/settings') },
    {
      id: 'scope', label: `切换到${scope === 'work' ? '生活' : '工作'}分区`,
      hint: scope === 'work' ? 'work → life' : 'life → work',
      keywords: 'scope 分区 切换 work life 工作 生活',
      icon: scope === 'work' ? IconHome : IconBriefcase,
      run: () => { setScope(scope === 'work' ? 'life' : 'work'); onClose() },
    },
    {
      id: 'sync', label: syncing ? '正在同步 GitHub…' : '立即同步 GitHub',
      hint: 'POST /api/sync',
      keywords: 'sync 同步 github 拉取',
      icon: IconRefresh,
      run: async () => {
        if (syncing) return
        setSyncing(true)
        try { await api('/api/sync', { method: 'POST' }) } finally { setSyncing(false); onClose() }
      },
    },
    { id: 'ai', label: '打开 AI 助手', hint: '右下角 · devlog agent', keywords: 'ai 助手 assistant agent 对话', icon: IconTerminal, run: () => { window.dispatchEvent(new CustomEvent('open-assistant')); onClose() } },
  ], [nav, scope, setScope, api, syncing, onClose])

  const hits = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return cmds
    return cmds.filter((c) => (c.label + ' ' + c.keywords + ' ' + c.hint).toLowerCase().includes(k))
  }, [q, cmds])

  useEffect(() => { if (open) { setQ(''); setSel(0); requestAnimationFrame(() => inputRef.current?.focus()) } }, [open])
  useEffect(() => { setSel((i) => Math.min(i, Math.max(0, hits.length - 1))) }, [hits.length])
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const onKey = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => (i + 1) % Math.max(1, hits.length)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => (i - 1 + hits.length) % Math.max(1, hits.length)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const c = hits[sel]
      if (c) await c.run()
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] px-4"
      style={{ background: 'rgba(4,7,12,.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label="命令面板">
      <div className="w-full max-w-[520px] rounded-2xl border border-line2 bg-[#0e141d] shadow-[0_24px_80px_-16px_rgba(0,0,0,.8),0_0_0_1px_rgba(61,220,151,.06)] cmd-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-line">
          <IconSearch width={16} height={16} className="text-accent shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="搜索命令、页面或动作…"
            className="flex-1 bg-transparent outline-none text-[14px] text-txt placeholder:text-faint font-mono" />
          <kbd className="text-[10.5px] font-mono text-faint border border-line rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {hits.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-faint font-mono">no match for &quot;{q}&quot;</div>
          )}
          {hits.map((c, i) => (
            <button key={c.id} data-idx={i} onClick={() => c.run()} onMouseEnter={() => setSel(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === sel ? 'bg-[rgba(61,220,151,.1)]' : ''}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${i === sel
                ? 'border-[rgba(61,220,151,.35)] text-accent bg-[rgba(61,220,151,.08)]'
                : 'border-line text-faint bg-[#111823]'}`}>
                <c.icon width={15} height={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13.5px] truncate ${i === sel ? 'text-txt' : 'text-dim'}`}>{c.label}</span>
                <span className="block text-[11px] font-mono text-faint truncate">{c.hint}</span>
              </span>
              {i === sel && <IconTerminal width={13} height={13} className="text-accent shrink-0" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 h-9 border-t border-line bg-[#0b1017] text-[10.5px] font-mono text-faint">
          <span>↑↓ 选择</span><span>↵ 执行</span><span className="ml-auto">devlog · cmd</span>
        </div>
      </div>
    </div>
  )
}

export type { Scope }
