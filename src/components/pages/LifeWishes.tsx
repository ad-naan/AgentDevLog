'use client'

// 生活区 · 小心愿：便利贴卡片墙，许愿、实现、放手
import { useMemo, useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import PageSkeleton from '../PageSkeleton'
import { IconPlus, IconClose } from '../icons'
import type { TodoDTO } from '@/lib/types'

// 念想强度 → 便利贴色系（纸感暖色）
const LEVELS = [
  { key: 'P2', label: '随缘', cls: 'bg-[#f2ead8] border-[rgba(72,60,44,.14)]', dot: 'bg-[#b9a77f]' },
  { key: 'P1', label: '有空就去', cls: 'bg-[#f6e3d3] border-[rgba(180,87,62,.22)]', dot: 'bg-[#cf8b6e]' },
  { key: 'P0', label: '特别想', cls: 'bg-[#f3d9cf] border-[rgba(180,87,62,.35)]', dot: 'bg-accent' },
] as const

const PIN = ['📌', '✨', '🌿', '🍀', '⭐️', '🕯️']

const since = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 864e5)
  if (d <= 0) return '今天'
  if (d === 1) return '昨天'
  if (d < 30) return `${d} 天前`
  if (d < 365) return `${Math.floor(d / 30)} 个月前`
  return `${Math.floor(d / 365)} 年前`
}

const pinOf = (id: number) => PIN[id % PIN.length]

export default function LifeWishes() {
  const { s, api } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')
  const [level, setLevel] = useState<'P0' | 'P1' | 'P2'>('P1')
  const [busy, setBusy] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const wishes = useMemo(
    () => (s ? s.todos.filter((t) => t.scope === 'life' && !t.done).sort((a, b) => b.createdAt - a.createdAt) : []),
    [s],
  )
  const granted = useMemo(
    () => (s ? s.todos.filter((t) => t.scope === 'life' && t.done).sort((a, b) => b.updatedAt - a.updatedAt) : []),
    [s],
  )

  if (!s) return <PageSkeleton type="todos" />

  const patch = (t: TodoDTO, body: Record<string, unknown>) =>
    api(`/api/todos/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const make = async () => {
    const title = text.trim()
    if (!title || busy) return
    setBusy(true)
    try {
      const res = await api('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scope: 'life', priority: level, tag: 'wish' }),
      })
      if (!res.ok) {
        toast(await apiError(res), 'error')
        return
      }
      setText('')
      toast('许愿成功，贴到墙上了 ✨', 'success')
    } finally {
      setBusy(false)
    }
  }

  const grant = (t: TodoDTO) => {
    patch(t, { done: true })
    toast(`「${t.title.slice(0, 16)}」实现啦 🎉`, 'success')
  }

  const letGo = async (t: TodoDTO) => {
    const res = await api(`/api/todos/${t.id}`, { method: 'DELETE' })
    if (res.ok) toast('放手也是一种整理')
  }

  const total = wishes.length + granted.length
  const rate = total > 0 ? Math.round((granted.length / total) * 100) : 0

  return (
    <div className="max-w-[880px] mx-auto pb-10 flex flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-[24px] text-txt leading-snug">小心愿</h1>
        <p className="text-[12.5px] text-faint mt-1 italic">
          {total > 0
            ? `贴了 ${total} 个心愿，实现了 ${granted.length} 个（${rate}%）`
            : '心里想了很久的事，先贴上墙再说'}
        </p>
      </header>

      {/* 许愿 */}
      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && make()}
            placeholder="想去的地方、想学的东西、想见的人…"
            className="flex-1 bg-inset border border-line rounded-xl px-3.5 h-10 text-[13.5px] text-txt placeholder:text-faint outline-none focus:border-accent/40 transition-colors"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {LEVELS.map((lv) => (
              <button
                key={lv.key}
                onClick={() => setLevel(lv.key as 'P0' | 'P1' | 'P2')}
                className={`px-2.5 h-8 rounded-full text-[11.5px] border transition-all btn-press ${
                  level === lv.key ? 'border-accent/50 text-accent bg-accent/10' : 'border-line text-faint hover:text-dim'
                }`}
              >
                {lv.label}
              </button>
            ))}
            <button
              onClick={make}
              disabled={busy || !text.trim()}
              className="ml-1 px-4 h-9 rounded-full bg-accent text-[#fdf9f0] text-[12.5px] font-medium btn-press hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <IconPlus width={12} height={12} />许愿
            </button>
          </div>
        </div>
      </section>

      {/* 心愿墙：CSS 多列瀑布 */}
      {wishes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line2 bg-card/50 py-16 text-center">
          <p className="text-[28px] mb-3">🌠</p>
          <p className="text-[13px] text-dim">墙上还空着</p>
          <p className="text-[12px] text-faint mt-1 italic">不用是宏大的愿望，小到「周末去公园野餐」也很好</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
          {wishes.map((t) => {
            const lv = LEVELS.find((l) => l.key === t.priority) ?? LEVELS[1]
            return (
              <div
                key={t.id}
                className={`break-inside-avoid rounded-xl border px-4 py-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[0.4deg] ${lv.cls}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[15px] leading-none">{pinOf(t.id)}</span>
                  <button
                    onClick={() => letGo(t)}
                    title="放手"
                    className="text-faint shrink-0 transition-colors hover:text-red"
                  >
                    <IconClose width={12} height={12} />
                  </button>
                </div>
                <p className="text-[13.5px] text-txt leading-relaxed whitespace-pre-wrap">{t.title}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-dim/80">
                    <span className={`w-1.5 h-1.5 rounded-full ${lv.dot}`} />
                    {lv.label} · {since(t.createdAt)}
                  </span>
                  <button
                    onClick={() => grant(t)}
                    className="text-[11.5px] text-accent hover:underline underline-offset-2 transition-all"
                  >
                    实现啦
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 已实现 */}
      {granted.length > 0 && (
        <section className="rounded-2xl border border-line bg-card/60 overflow-hidden">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-card-subtle/60 transition-colors"
          >
            <span>🎉</span>
            <b className="text-[13px] font-semibold text-txt">已实现的心愿</b>
            <span className="text-[11px] text-faint font-normal">{granted.length} 个</span>
            <span className="ml-auto text-[11.5px] text-faint">{showDone ? '收起' : '展开'}</span>
          </button>
          {showDone && (
            <ul className="px-5 pb-4 flex flex-col gap-2 border-t border-line pt-3.5">
              {granted.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="text-dim/60 line-through decoration-faint">{t.title}</span>
                  <span className="ml-auto text-[10.5px] text-faint shrink-0 italic">{since(t.updatedAt)}实现</span>
                  <button onClick={() => patch(t, { done: false })} className="text-[10.5px] text-faint hover:text-accent transition-colors shrink-0">
                    再许一次
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
