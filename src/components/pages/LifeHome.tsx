'use client'

// 生活区首页：日记感 · 松弛 · 暖色
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import PageSkeleton from '../PageSkeleton'
import { IconHome, IconLog, IconCheck } from '../icons'
import type { LogDTO } from '@/lib/types'
import { scopedActivities, todayStats, heatmap, watchedReposFor } from '@/lib/types'

const MOODS = ['🌤️', '☕️', '📖', '🌿', '🌙', '🍜', '🏃', '🎵'] as const

const greet = () => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function LifeHome() {
  const { s, api } = useStore()
  const toast = useToast()
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [busy, setBusy] = useState(false)
  const now = useMemo(() => new Date().getTime(), [])

  const diaries = useMemo(
    () => (s ? s.logs.filter((l) => l.scope === 'life').sort((a, b) => b.updatedAt - a.updatedAt) : [] as LogDTO[]),
    [s],
  )
  const wishes = useMemo(
    () => (s ? s.todos.filter((t) => t.scope === 'life' && !t.done).slice(0, 5) : []),
    [s],
  )
  // 开源热爱：生活分区关注仓库的提交活动（watchedReposLife 同步而来）
  const oss = useMemo(() => {
    if (!s) return null
    const acts = scopedActivities(s, 'life').filter((a) => a.type !== 'log')
    const repos = watchedReposFor(s, 'life')
    // 近 30 天各仓库 commit 数
    const since = now - 30 * 864e5
    const perRepo: Record<string, number> = {}
    for (const a of acts) {
      if (a.ts >= since && a.type === 'commit') perRepo[a.repo] = (perRepo[a.repo] || 0) + 1
    }
    return {
      acts,
      repos,
      stats: todayStats(s, 'life'),
      heat: heatmap(s, 18, 'life'),
      perRepo: Object.entries(perRepo).sort((x, y) => y[1] - x[1]).slice(0, 5),
    }
  }, [s, now])
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${'日一二三四五六'[d.getDay()]}`
  }, [])

  if (!s) return <PageSkeleton type="dashboard" />

  const submit = async () => {
    const body = [mood, text.trim()].filter(Boolean).join(' ')
    if (!body || busy) return
    setBusy(true)
    setText('')
    try {
      const res = await api('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, scope: 'life' }),
      })
      if (!res.ok) {
        toast(await apiError(res), 'error')
        return
      }
      const { result } = await res.json() as { result: { kind: 'todo' | 'log'; title: string } }
      toast(result.kind === 'todo' ? `记下了小心愿「${result.title}」` : `写进今天的日记：${result.title}`, 'success')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-[880px] mx-auto px-4 sm:px-6 pb-12 flex flex-col gap-8">
      {/* 问候 */}
      <header className="pt-4 sm:pt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
           <h1 className="text-[28px] sm:text-[32px] leading-tight text-txt">
          {greet()}，{s.user.name.split(' ')[0]}
        </h1>
        <p className="text-[13px] text-faint mt-1 serif-num">{todayStr}</p>
      </header>

      {/* 今日速记 */}
      <section className="relative overflow-hidden rounded-[22px] border border-accent/25 bg-card px-4 py-5 sm:p-7 shadow-[0_10px_30px_rgba(96,80,56,.08)]">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 text-dim">
            <IconHome width={15} height={15} className="text-accent" />
            <span className="text-[13px]">此刻，想留下些什么？</span>
          </div>
          <span className="text-[11px] text-faint">写一句也算</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder="比如：傍晚沿江走了半小时，风很舒服…"
          rows={3}
          className="w-full min-h-[118px] bg-inset/70 border border-line rounded-2xl px-4 py-4 text-[15px] text-txt placeholder:text-faint outline-none resize-none focus:border-accent/50 focus:bg-card transition-colors leading-[1.8]"
        />
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? '' : m)}
              aria-pressed={mood === m}
              aria-label={`心情 ${m}`}
              className={`w-9 h-9 rounded-full text-[15px] flex items-center justify-center border transition-all btn-press ${
                mood === m ? 'border-accent/50 bg-accent/10 scale-110' : 'border-line hover:border-line2 hover:bg-card-subtle'
              }`}
            >
              {m}
            </button>
          ))}
          <button
            onClick={submit}
            disabled={busy || !(text.trim() || mood)}
            className="ml-auto w-full sm:w-auto px-5 h-10 rounded-xl bg-accent text-[#fdf9f0] text-[12.5px] font-medium btn-press hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {busy ? '记录中…' : '记下来 ⌘↵'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-5">
        {/* 最近日记 */}
        <section className="border-t border-line pt-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-txt flex items-center gap-2">
              <IconLog width={14} height={14} className="text-accent" />最近的日记
            </h2>
            <Link href="/life/logs" className="text-[12px] text-faint hover:text-dim transition-colors">
              全部 →
            </Link>
          </div>
          {diaries.length === 0 ? (
            <p className="text-[12.5px] text-faint py-8 text-center">还没有日记，从上面写下第一条吧</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {diaries.slice(0, 5).map((d) => (
                <li key={d.id} className="group">
                  <Link href="/life/logs" className="block rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-card-subtle/70">
                    <div className="flex items-baseline gap-2.5">
                      <span className="serif-num text-[11px] text-faint shrink-0">{d.date.slice(5).replace('-', ' / ')}</span>
                      <span className="text-[13px] text-txt/90 group-hover:text-accent transition-colors leading-relaxed">
                        {d.title}
                      </span>
                    </div>
                    {d.content && (
                      <p className="text-[12px] text-dim mt-1 pl-[52px] line-clamp-1 opacity-75">
                        {d.content.replace(/[#>*`\-\n]/g, ' ').slice(0, 60)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 小心愿 */}
        <section className="border-t border-line pt-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-txt flex items-center gap-2">
              <IconCheck width={14} height={14} className="text-accent" />小心愿
            </h2>
            <Link href="/life/todos" className="text-[12px] text-faint hover:text-dim transition-colors">
              全部 →
            </Link>
          </div>
          {wishes.length === 0 ? (
            <p className="text-[12.5px] text-faint py-6 text-center">暂时没有待办的心愿，享受当下</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {wishes.map((t) => (
                <li key={t.id}>
                  <Link href="/life/todos" className="flex items-center gap-2.5 text-[12.5px] text-dim rounded-lg -mx-2 px-2 py-1.5 transition-colors hover:bg-card-subtle/70 hover:text-txt">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 开源热爱：个人项目的提交脉搏 */}
      {oss && oss.repos.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-txt flex items-center gap-2">
              🌱 开源热爱
              <span className="text-[11px] font-normal text-faint">写代码也是一种热爱</span>
            </h2>
            <Link href="/life/settings" className="text-[12px] text-faint hover:text-dim transition-colors">
              管理仓库 →
            </Link>
          </div>

          {/* 热爱数据 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-inset border border-line px-3.5 py-2.5 text-center">
              <b className="block text-[19px] text-accent leading-tight serif-num">{oss.stats.commits}</b>
              <span className="text-[11px] text-faint">今日提交</span>
            </div>
            <div className="rounded-xl bg-inset border border-line px-3.5 py-2.5 text-center">
              <b className="block text-[19px] text-accent leading-tight serif-num">{oss.stats.streak}</b>
              <span className="text-[11px] text-faint">连续热爱天数</span>
            </div>
            <div className="rounded-xl bg-inset border border-line px-3.5 py-2.5 text-center">
              <b className="block text-[19px] text-accent leading-tight serif-num">{oss.perRepo.reduce((n, r) => n + r[1], 0)}</b>
              <span className="text-[11px] text-faint">30 天 commits</span>
            </div>
          </div>

          {/* 迷你热力图（纸面暖赭色） */}
          <div className="flex gap-[3px] overflow-hidden mb-4" aria-hidden>
            {oss.heat.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <span
                    key={cell.date}
                    title={`${cell.date} · ${cell.n} 条`}
                    className="w-[9px] h-[9px] rounded-[2px]"
                    style={{
                      background:
                        cell.n === 0 ? 'rgba(72,60,44,.07)'
                        : cell.n <= 2 ? 'rgba(180,87,62,.28)'
                        : cell.n <= 5 ? 'rgba(180,87,62,.55)'
                        : 'rgba(180,87,62,.85)',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 近期动态 + 项目排行 */}
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-5">
            <div>
              <p className="text-[11.5px] text-faint mb-2.5">最近的热爱足迹</p>
              {oss.acts.length === 0 ? (
                <p className="text-[12.5px] text-faint py-4 text-center">还没有同步到活动，点右上角同步试试</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {oss.acts.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-baseline gap-2.5 text-[12.5px]">
                      <span className="shrink-0 text-[10px] font-mono text-faint">
                        {a.type === 'commit' ? '↑' : a.type === 'pr' ? '⑂' : '◎'}
                      </span>
                      <a
                        href={a.type === 'commit'
                          ? `https://github.com/${a.repo}/commits`
                          : a.type === 'pr'
                            ? `https://github.com/${a.repo}/pulls`
                            : `https://github.com/${a.repo}/issues`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 text-dim hover:text-accent transition-colors truncate"
                      >
                        {a.title}
                      </a>
                      <span className="shrink-0 text-[10px] font-mono text-faint">{a.repo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[11.5px] text-faint mb-2.5">近 30 天项目热度</p>
              {oss.perRepo.length === 0 ? (
                <p className="text-[12.5px] text-faint py-4 text-center">这个月还没提交，灵感在酝酿中</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {oss.perRepo.map(([repo, n]) => {
                    const max = oss.perRepo[0][1] || 1
                    return (
                      <li key={repo} className="flex items-center gap-2.5">
                        <span className="text-[11.5px] font-mono text-dim w-[130px] truncate">{repo}</span>
                        <span className="flex-1 h-[5px] rounded-full bg-inset overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-accent/70"
                            style={{ width: `${Math.round((n / max) * 100)}%` }}
                          />
                        </span>
                        <span className="text-[10.5px] font-mono text-faint w-6 text-right">{n}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
