'use client'

// 生活区 · 日记本：纸页时间线，一篇日记一张纸，点开即写
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import PageSkeleton from '../PageSkeleton'
import { IconPlus } from '../icons'
import { today } from '@/lib/types'
import type { LogDTO } from '@/lib/types'

const MOODS: [number, string, string][] = [
  [5, '😄', '很好'],
  [4, '🙂', '不错'],
  [3, '😐', '平常'],
  [2, '😕', '一般'],
  [1, '😢', '低落'],
]

const WEEK = '日一二三四五六'

const fmtDay = (date: string) => {
  const d = new Date(date + 'T12:00:00')
  return { day: d.getDate(), month: d.getMonth() + 1, week: WEEK[d.getDay()] }
}

const preview = (md: string) => md.replace(/[#>*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim()

export default function LifeLogs() {
  const { s, api } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [newText, setNewText] = useState('')
  const [confirmRip, setConfirmRip] = useState<number | null>(null)
  // 正在撕下的那一页：本地持有到动画播完，避免被 store 刷新打断
  const [ripping, setRipping] = useState<{ item: LogDTO; at: number }[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entries = useMemo(
    () =>
      s
        ? s.logs
            .filter((l) => l.scope === 'life')
            .sort((a, b) => b.date.localeCompare(a.date))
        : ([] as LogDTO[]),
    [s],
  )

  // 时间线渲染序列：撕下的页插回原位置，动画播完才移除
  const pages = useMemo(() => {
    const rows = entries.map((l) => ({ item: l, leaving: ripping.some((r) => r.item.id === l.id) }))
    for (const r of ripping) {
      if (!rows.some((x) => x.item.id === r.item.id)) {
        rows.splice(Math.min(r.at, rows.length), 0, { item: r.item, leaving: true })
      }
    }
    return rows
  }, [entries, ripping])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (!s) return <PageSkeleton type="logs" />

  const patch = (id: number, body: Record<string, unknown>) =>
    api(`/api/logs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  // 防抖保存日记正文
  const saveContent = (id: number, v: string) => {
    setDraft(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => patch(id, { content: v }), 600)
  }

  const openEntry = (l: LogDTO) => {
    setEditing(l.id)
    setDraft(l.content)
  }

  // 撕页：两步确认，3 秒未确认自动还原
  const ripEntry = (l: LogDTO) => {
    if (confirmRip !== l.id) {
      setConfirmRip(l.id)
      setTimeout(() => setConfirmRip((cur) => (cur === l.id ? null : cur)), 3000)
      return
    }
    setConfirmRip(null)
    removeEntry(l)
  }

  const removeEntry = async (l: LogDTO) => {
    // 先让这一页撕下飞走（本地持有），请求同时进行；动画最少播满 520ms
    const at = Math.max(0, entries.findIndex((e) => e.id === l.id))
    setRipping((r) => (r.some((x) => x.item.id === l.id) ? r : [...r, { item: l, at }]))
    const startedAt = Date.now()
    const res = await api(`/api/logs/${l.id}`, { method: 'DELETE' })
    const rest = 520 - (Date.now() - startedAt)
    if (rest > 0) await new Promise((r) => setTimeout(r, rest))
    setRipping((r) => r.filter((x) => x.item.id !== l.id))
    if (res.ok) {
      toast('这页日记撕掉了')
      setEditing(null)
    } else toast(await apiError(res), 'error')
  }

  const createToday = async () => {
    const date = today()
    const existing = entries.find((l) => l.date === date)
    if (existing) {
      openEntry(existing)
      return
    }
    const res = await api('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, scope: 'life', content: newText.trim() }),
    })
    if (!res.ok) {
      toast(await apiError(res), 'error')
      return
    }
    // 接口直接返回创建（或已存在）的日志，用它立即翻开新的一页
    const created = await res.json() as Pick<LogDTO, 'id' | 'content'>
    setCreating(false)
    setNewText('')
    setEditing(created.id)
    setDraft(created.content)
  }


  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-12 flex flex-col gap-6 sm:gap-8">
      <header className="flex items-end justify-between gap-3 pt-5 sm:pt-7">
        <div>
           <h1 className="text-[28px] sm:text-[32px] leading-tight text-txt tracking-[-0.02em]">日记本</h1>
          <p className="text-[12.5px] text-faint mt-1">
            {entries.length > 0 ? `已经写下 ${entries.length} 页` : '第一页，从今天开始'} · 不用写得好，写下就好
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
             className="flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-accent text-[#fdf9f0] text-[12.5px] font-medium btn-press hover:bg-accent-hover transition-all shrink-0"
          >
            <IconPlus width={13} height={13} />写今天的日记
          </button>
        )}
      </header>

      {/* 今日新建 */}
      {creating && (
         <section className="rounded-[22px] border border-accent/25 bg-card p-4 sm:p-6 shadow-[0_8px_26px_rgba(96,80,56,.07)]">
          <textarea
            autoFocus
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="今天过得怎么样？随便聊聊…"
            rows={4}
            className="w-full bg-inset border border-line rounded-xl px-3.5 py-3 text-[13.5px] text-txt placeholder:text-faint outline-none resize-none focus:border-accent/40 transition-colors leading-relaxed"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => { setCreating(false); setNewText('') }}
              className="px-3.5 h-9 rounded-full border border-line text-dim text-[12.5px] hover:text-txt transition-colors"
            >
              先不写了
            </button>
            <button
              onClick={createToday}
              className="ml-auto px-4 h-9 rounded-full bg-accent text-[#fdf9f0] text-[12.5px] font-medium btn-press hover:opacity-90 transition-opacity"
            >
              翻开新的一页
            </button>
          </div>
          <p className="text-[11px] text-faint mt-2.5">提示：也可以在生活台首页用「此刻速记」快速记一笔。</p>
        </section>
      )}

      {/* 时间线 */}
      {pages.length === 0 && !creating ? (
        <div className="rounded-[22px] border border-dashed border-line2 bg-card/45 py-16 text-center">
          <p className="text-[28px] mb-3">📖</p>
          <p className="text-[13px] text-dim">本子还是空的</p>
          <p className="text-[12px] text-faint mt-1">每天一页，回头翻看会感谢现在的自己</p>
        </div>
      ) : (
        <div className="relative pl-6">
          {/* 时间线竖线 */}
          <div aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-line" />
          <div className="flex flex-col gap-5">
            {pages.map(({ item: l, leaving }) => {
              const { day, month, week } = fmtDay(l.date)
              const mood = MOODS.find((m) => m[0] === l.mood)
              const open = editing === l.id
              return (
                <article key={l.id} className={`relative ${leaving ? 'page-rip' : 'spring-in'}`}>
                  {/* 时间线节点 */}
                  <span
                    aria-hidden
                    className={`timeline-dot absolute -left-6 top-5 w-[15px] h-[15px] rounded-full border-2 ${
                      open ? 'is-open bg-accent border-accent' : 'bg-card border-line2'
                    }`}
                  />
                  <div
                    className={`bg-card border rounded-[22px] p-4 sm:p-6 shadow-[0_5px_18px_rgba(96,80,56,.05)] transition-all duration-200 ${
                      open ? 'border-accent/35 paper-open' : 'border-line hover:border-line2'
                    }`}
                  >
                    {/* 纸页抬头 */}
                    <div className="flex items-start gap-2 sm:items-baseline sm:gap-3 mb-4">
                      <span className="text-[26px] leading-none text-txt serif-num">{day}</span>
                      <span className="text-[12px] text-faint">{month}月 · 周{week}</span>
                      {mood && <span title={mood[2]} className="text-[15px]">{mood[1]}</span>}
                      <div className="ml-auto flex max-w-[48%] flex-wrap justify-end gap-1.5">
                        {l.tags.slice(0, 3).map((t) => (
                             <span key={t} className="text-[10.5px] text-dim border border-line rounded-full px-2 py-0.5 bg-card-subtle truncate max-w-[110px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {open ? (
                      <>
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => saveContent(l.id, e.target.value)}
                          placeholder="继续写…"
                          rows={Math.min(16, Math.max(5, draft.split('\n').length + 1))}
                          className="w-full bg-inset border border-line rounded-xl px-3.5 py-3 text-[13.5px] text-txt placeholder:text-faint outline-none resize-y focus:border-accent/40 transition-colors leading-[1.9]"
                        />
                        {/* 心情章 */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="text-[11.5px] text-faint mr-0.5">今天的心情：</span>
                          {MOODS.map(([v, e, label]) => (
                            <button
                              key={v}
                              onClick={() => patch(l.id, { mood: l.mood === v ? 0 : v })}
                              title={label}
                              className={`w-8 h-8 rounded-full text-[15px] flex items-center justify-center border transition-all btn-press ${
                                l.mood === v ? 'border-accent/60 bg-accent/10 scale-110' : 'border-line hover:border-line2'
                              }`}
                            >
                              {e}
                            </button>
                          ))}
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={() => ripEntry(l)}
                              className={`text-[11.5px] transition-colors px-2 py-1 rounded-full border ${
                                confirmRip === l.id
                                  ? 'text-red border-red/40 bg-red/10 confirm-pulse'
                                  : 'text-faint hover:text-red border-transparent'
                              }`}
                            >
                              {confirmRip === l.id ? '确认撕掉？' : '撕掉这页'}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="px-3.5 h-8 rounded-full bg-accent text-[#fdf9f0] text-[12px] font-medium btn-press hover:opacity-90 transition-opacity"
                            >
                              合上本子
                            </button>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-faint mt-2">内容会自动保存，随时合上</p>
                      </>
                    ) : (
                      <button onClick={() => openEntry(l)} className="w-full text-left group">
                        <p className="text-[13.5px] text-txt/90 leading-relaxed">
                          {preview(l.title).slice(0, 80) || <span className="text-faint">这一页只有标题…</span>}
                        </p>
                        {l.content && (
                          <p className="text-[12.5px] text-dim mt-1.5 leading-relaxed line-clamp-2 opacity-80">
                            {preview(l.content).slice(0, 120)}
                          </p>
                        )}
                        <p className="text-[11px] text-faint mt-2 group-hover:text-accent transition-colors">
                          翻开这一页 →
                        </p>
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
