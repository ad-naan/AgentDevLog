'use client'

// 生活区 · 回忆册：不是汇报，是翻看自己的痕迹（记录热力、心情、实现的愿望、随机一页旧日记）
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useStore } from '../StoreProvider'
import PageSkeleton from '../PageSkeleton'
import { IconFlame } from '../icons'
import { heatmap, todayStats, today } from '@/lib/types'
import type { LogDTO } from '@/lib/types'

const MOOD_FACE: Record<number, string> = { 5: '😄', 4: '🙂', 3: '😐', 2: '😕', 1: '😢' }

const preview = (md: string) => md.replace(/[#>*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim()

export default function LifeReview() {
  const { s } = useStore()
  const [seed, setSeed] = useState(0)

  const grid = useMemo(() => (s ? heatmap(s, 18, 'life') : []), [s])
  const stats = useMemo(() => (s ? todayStats(s, 'life') : null), [s])

  const diaries = useMemo(
    () => (s ? s.logs.filter((l) => l.scope === 'life') : ([] as LogDTO[])),
    [s],
  )
  const wishes = useMemo(() => (s ? s.todos.filter((t) => t.scope === 'life') : []), [s])

  const moodDist = useMemo(() => {
    const dist: Record<number, number> = {}
    for (const l of diaries) if (l.mood >= 1 && l.mood <= 5) dist[l.mood] = (dist[l.mood] || 0) + 1
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    return { dist, total }
  }, [diaries])

  // 随机翻一页旧日记（不含今天）
  const memory = useMemo(() => {
    const old = diaries.filter((l) => l.date !== today() && (l.content || l.title))
    if (old.length === 0) return null
    return old[(seed * 7919 + old.length) % old.length]
  }, [diaries, seed])

  if (!s || !stats) return <PageSkeleton type="dashboard" />

  const granted = wishes.filter((t) => t.done).length
  const wishRate = wishes.length > 0 ? Math.round((granted / wishes.length) * 100) : 0
  const monthCount = diaries.filter((l) => l.date.slice(0, 7) === today().slice(0, 7)).length

  const heat = (n: number) =>
    n === 0
      ? 'bg-[rgba(72,60,44,.07)]'
      : n === 1
        ? 'bg-[rgba(180,87,62,.28)]'
        : n === 2
          ? 'bg-[rgba(180,87,62,.5)]'
          : 'bg-[rgba(180,87,62,.78)]'

  return (
    <div className="max-w-[880px] mx-auto px-4 sm:px-6 pb-12 flex flex-col gap-7 sm:gap-9">
      <header className="pt-5 sm:pt-7">
        <h1 className="text-[28px] sm:text-[32px] leading-tight text-txt tracking-[-0.02em]">回忆册</h1>
        <p className="text-[12.5px] text-faint mt-1">记下的日子都算数 · 翻一翻，看见自己</p>
      </header>

      {/* 数字一览：三张小卡 */}
      <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-4">
        {[
          { label: '连续记录', value: `${stats.streak}`, unit: '天', icon: '🔥' },
          { label: '这个月的日记', value: `${monthCount}`, unit: '页', icon: '📖' },
          { label: '愿望实现率', value: `${wishRate}`, unit: '%', icon: '🌟' },
        ].map((c) => (
          <div key={c.label} className="px-3 sm:px-5 first:pl-0 last:pr-0 flex items-center gap-2.5 sm:gap-3">
            <span className="text-[19px] sm:text-[22px]">{c.icon}</span>
            <div>
                <b className="block text-[21px] sm:text-[24px] leading-none text-txt serif-num">
                {c.value}
                <span className="text-[11.5px] text-faint font-normal ml-1">{c.unit}</span>
              </b>
              <span className="block text-[11.5px] text-faint mt-1.5">{c.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 记录热力：纸上的红点 */}
      <section className="rounded-[22px] border border-line bg-card p-4 sm:p-6 shadow-[0_5px_18px_rgba(96,80,56,.05)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13.5px] font-semibold text-txt">留下痕迹的日子</h2>
          <div className="flex items-center gap-1.5 text-[10px] text-faint">
            <span>少</span>
            {[0, 1, 2, 3].map((n) => (
              <span key={n} className={`w-2.5 h-2.5 rounded-[3px] ${heat(n)}`} />
            ))}
            <span>多</span>
          </div>
        </div>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((d) => (
                <span
                  key={d.date}
                  title={`${d.date} · ${d.n ? `${d.n} 条记录` : '没有记录'}`}
                  className={`w-[11px] h-[11px] rounded-[3px] ${heat(Math.min(3, d.n))} transition-colors`}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 心情分布 */}
        <section className="rounded-[22px] border border-line bg-card p-4 sm:p-6 shadow-[0_5px_18px_rgba(96,80,56,.05)]">
          <h2 className="text-[13.5px] font-semibold text-txt mb-4">心情的形状</h2>
          {moodDist.total === 0 ? (
            <p className="text-[12.5px] text-faint py-6 text-center">在日记里盖个心情章，这里就有形状了</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[5, 4, 3, 2, 1].map((m) => {
                const n = moodDist.dist[m] || 0
                const pct = Math.round((n / moodDist.total) * 100)
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-[15px] w-6 text-center">{MOOD_FACE[m]}</span>
                    <div className="flex-1 h-[9px] rounded-full bg-inset border border-line overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10.5px] text-faint w-9 text-right">{n} 次</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 随机一页旧日记 */}
        <section className="rounded-[22px] border border-line bg-card p-4 sm:p-6 shadow-[0_5px_18px_rgba(96,80,56,.05)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13.5px] font-semibold text-txt">随手翻一页</h2>
            <button
              onClick={() => setSeed((v) => v + 1)}
              className="text-[11.5px] text-accent hover:underline underline-offset-2 transition-all"
            >
              再翻一页
            </button>
          </div>
          {memory ? (
            <Link href="/life/logs" className="group flex-1 flex flex-col">
              <span className="text-[11px] text-faint mb-2 serif-num">
                {memory.date.replace(/-/g, '.')} · {MOOD_FACE[memory.mood] ?? '✍️'}
              </span>
              <p className="text-[13px] text-txt/90 leading-relaxed group-hover:text-accent transition-colors line-clamp-6">
                {preview(memory.content || memory.title).slice(0, 180) || '……'}
              </p>
              <span className="text-[11px] text-faint mt-auto pt-3 group-hover:text-accent transition-colors">
                去日记本看全文 →
              </span>
            </Link>
          ) : (
            <p className="text-[12.5px] text-faint py-6 text-center">多写几页日记，这里就能翻到过去</p>
          )}
        </section>
      </div>

      {/* 已实现的心愿摘录 */}
      {granted > 0 && (
        <section className="rounded-[22px] border border-line bg-card p-4 sm:p-6 shadow-[0_5px_18px_rgba(96,80,56,.05)]">
          <h2 className="text-[13.5px] font-semibold text-txt mb-3.5 flex items-center gap-2">
            <IconFlame width={14} height={14} className="text-accent" />
            实现过的 {granted} 个心愿
          </h2>
          <div className="flex flex-wrap gap-2">
            {wishes
              .filter((t) => t.done)
              .slice(0, 24)
              .map((t) => (
                <span
                  key={t.id}
                  className="text-[12px] text-dim border border-line bg-card-subtle rounded-full px-3 py-1.5 line-through decoration-faint"
                >
                  {t.title}
                </span>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
