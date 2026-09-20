'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import { scopedActivities, todayStats, lastNDays, type ActivityDTO } from '@/lib/types'
import { IconSpark, IconGitBranch, IconGitMerge, IconGitIssue, IconFlame, IconArrow, IconLog, IconRefresh } from '../icons'

interface Insight {
  headline: string
  points: string[]
  suggestion: string
}

const Spark = ({ data, color = '#3ddc97' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data, 1)
  const w = 64, h = 22
  const pts = data.map((v, i) => [2 + (i / Math.max(1, data.length - 1)) * (w - 4), h - 3 - (v / max) * (h - 6)] as const)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-16 h-5" fill="none">
      <path d={d} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L${w - 2} ${h} L2 ${h} Z`} fill={color} opacity=".14" />
    </svg>
  )
}

const TYPE_STYLE: Record<string, { label: string; Icon: typeof IconLog; ic: string; dot: string; tc: string }> = {
  log: { label: '工作日志', Icon: IconLog, ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  commit: { label: 'Commit', Icon: IconGitBranch, ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  pr: { label: 'PR', Icon: IconGitMerge, ic: 'bg-[rgba(88,166,255,.15)] text-blue', dot: 'bg-blue', tc: 'text-blue' },
  issue: { label: 'Issue', Icon: IconGitIssue, ic: 'bg-[rgba(188,140,255,.15)] text-purple', dot: 'bg-purple', tc: 'text-purple' },
}

/** 动态条目的真实跳转目标：日志 → 日志页；GitHub 活动 → 对应外链 */
const feedHref = (f: ActivityDTO): { href: string; external: boolean } => {
  if (f.type === 'log') return { href: '/logs', external: false }
  if (!f.repo.includes('/')) return { href: '/analytics', external: false }
  if (f.type === 'commit') return { href: `https://github.com/${f.repo}/commits`, external: true }
  if (f.type === 'pr') return { href: `https://github.com/${f.repo}/pulls`, external: true }
  return { href: `https://github.com/${f.repo}/issues`, external: true }
}

export default function Dashboard() {
  const { s, scope, api } = useStore()
  const toast = useToast()
  const [input, setInput] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [insightBusy, setInsightBusy] = useState(false)
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const feed = scopedActivities(s, scope).slice(0, 40)
  const stats = todayStats(s, scope)
  const now = new Date()
  const hour = now.getHours()
  const greet = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const scopeAccent = scope === 'work' ? 'text-accent' : 'text-orange'
  const commitSeries = lastNDays(s, 12)
  const prTotals: Record<string, number> = {}
  for (const a of s.activities) if (a.type === 'pr') {
    const d = new Date(a.ts).toISOString().slice(0, 10)
    prTotals[d] = (prTotals[d] || 0) + 1
  }
  const prSeries = Array.from({ length: 12 }, (_, i) => prTotals[new Date(Date.now() - (11 - i) * 864e5).toISOString().slice(0, 10)] || 0)

  const submit = async () => {
    const text = input.trim()
    if (!text || quickBusy) return
    setInput('')
    setQuickBusy(true)
    try {
      const res = await api('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, scope }),
      })
      if (!res.ok) {
        setInput(text)
        toast(await apiError(res), 'error')
        return
      }
      const { result } = await res.json() as { result: { kind: 'todo' | 'log'; title: string; priority: string; due: string; reason: string } }
      if (result.kind === 'todo') {
        toast(`✦ AI 识别为待办「${result.title}」（${result.priority} · ${result.due}）`, 'success')
      } else {
        toast(`✦ AI 识别为日志，已记录：${result.title}`, 'success')
      }
    } finally {
      setQuickBusy(false)
    }
  }

  const genInsight = async () => {
    if (insightBusy) return
    setInsightBusy(true)
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      if (!res.ok) {
        setInsight(null)
        toast(await apiError(res), 'error')
        return
      }
      setInsight(await res.json() as Insight)
      toast('已基于日志、活动与待办生成最新洞察', 'info')
    } finally {
      setInsightBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-[1fr_290px] gap-4 h-full min-h-0">
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start">
          <div>
            <h1 className="text-[22px] font-bold leading-tight">{greet}，{s.user.name.split(' ')[0]}</h1>
            <p className="text-[12.5px] text-dim mt-1">
              {scope === 'work' ? '持续记录 · 积累价值 · 让努力可视化' : '认真工作 · 好好生活 · 记录当下'}
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[13px] font-medium">{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日</div>
            <div className="text-[11px] text-faint flex justify-end gap-1.5 items-center mt-0.5">
              星期{'日一二三四五六'[now.getDay()]}
              <span className={`px-2 py-px rounded-full text-[10px] ${scope === 'work' ? 'bg-[rgba(61,220,151,.14)] text-accent' : 'bg-[rgba(240,136,62,.14)] text-orange'}`}>今天</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: IconGitBranch, bg: 'bg-[rgba(61,220,151,.14)] text-accent', n: stats.commits, l: 'commits today', c: '#3ddc97' },
            { icon: IconGitMerge, bg: 'bg-[rgba(88,166,255,.14)] text-blue', n: stats.prs, l: 'PRs merged', c: '#58a6ff' },
            { icon: IconFlame, bg: 'bg-[rgba(188,140,255,.14)] text-purple', n: stats.streak, l: 'day streak', c: '#bc8cff' },
          ].map((x, i) => (
            <div key={x.l} className="bg-card border border-line rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${x.bg}`}><x.icon className="w-[18px] h-[18px]" /></div>
              <div className="font-mono text-[26px] font-bold leading-tight mt-2.5">{x.n}</div>
              <div className="text-[12px] text-dim">{x.l}</div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-[11px] font-mono text-faint">近 12 天趋势</span>
                <Spark data={i === 1 ? prSeries : commitSeries} color={x.c} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line">
            <span className={scopeAccent}>◷</span>
            <b className="text-[14px]">今日动态</b>
            <span className="text-[11px] text-faint">{scope === 'work' ? '仅统计关注的仓库' : '生活动态'}</span>
            <span className="ml-auto text-[12px] text-dim font-mono">{feed.length} 条</span>
          </div>
          <div className="relative flex-1 overflow-y-auto px-5 py-2">
            {feed.length === 0 && (
              <p className="text-[13px] text-faint py-10 text-center">
                暂无动态。到「设置」里添加关注的仓库并同步，或在这里快速记录一条。
              </p>
            )}
            <div className="absolute left-[38px] top-4 bottom-4 w-px bg-[#223042]" />
            {feed.map((f) => {
              const st = TYPE_STYLE[f.type]
              return (
                <div key={f.id} className="relative flex gap-4 py-3">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] z-10 border border-line ${st.ic}`}><st.Icon width={15} height={15} /></div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`flex items-center gap-1 ${st.tc}`}><i className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{f.type === 'log' && scope === 'life' ? '生活记录' : st.label}</span>
                      <span className="text-faint font-mono truncate">{f.repo} / main</span>
                      <span className="ml-auto text-faint font-mono shrink-0">{new Date(f.ts).toTimeString().slice(0, 5)}</span>
                    </div>
                    <b className={`block text-[12.5px] mt-1 truncate ${f.type === 'pr' ? 'text-blue' : ''}`}>{f.title}</b>
                    {f.desc && <p className="text-[11.5px] text-dim mt-0.5 line-clamp-2">{f.desc}</p>}
                    {f.meta && <p className="text-[10.5px] text-faint font-mono mt-0.5 truncate">{f.meta}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="bg-card border border-line rounded-2xl p-4">
          <b className="text-[13.5px] flex items-center gap-2"><IconSpark className={`w-4 h-4 ${scopeAccent}`} />快速记录</b>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
            disabled={quickBusy}
            placeholder={quickBusy ? 'AI 正在识别…' : scope === 'work' ? '记点什么… AI 自动识别待办或日志，如「明天上午找设计对齐首页」' : '记点什么… AI 自动识别待办或日志'} rows={3}
            className="mt-3 w-full bg-inset border border-line rounded-xl px-3 py-2.5 text-[12.5px] placeholder:text-faint outline-none focus:border-line2 resize-none disabled:opacity-60" />
          <p className="text-[10.5px] text-faint mt-1.5">自然语言即可 · AI 自动识别待办/日志与时间 · ⌘/Ctrl+Enter 发送</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-faint font-mono">✦ AI 智能归类</span>
            <button onClick={submit} disabled={quickBusy || !input.trim()} aria-label="记录"
              className="btn-press w-8 h-8 rounded-lg bg-accent text-[#04110b] flex items-center justify-center disabled:opacity-50">
              {quickBusy
                ? <span className="w-4 h-4 border-2 border-[#04110b]/30 border-t-[#04110b] rounded-full animate-spin" />
                : <IconArrow className="w-4 h-4" strokeWidth={2.2} />}
            </button>
          </div>
        </div>

        <div className="insight-glow border border-[#3a2d63] rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <b className="text-[13.5px] flex items-center gap-2"><IconSpark className="w-4 h-4 text-purple" />AI 洞察</b>
            <button onClick={genInsight} disabled={insightBusy}
              className="btn-press ml-auto px-3 py-1.5 rounded-lg border border-[#4a3a80] text-[11.5px] text-purple hover:bg-[rgba(139,92,246,.12)] disabled:opacity-50">
              {insightBusy ? '分析中…' : insight ? '刷新' : '生成洞察'}
            </button>
          </div>
          {insightBusy && (
            <div className="flex flex-col gap-2.5 mt-3">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-1/2" />
              <p className="text-[11px] text-faint flex items-center gap-1.5">
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
                正在综合日志、GitHub 活动与待办分析
              </p>
            </div>
          )}
          {!insightBusy && !insight && (
            <p className="text-[11.5px] text-dim mt-3 leading-relaxed">
              综合近期日志、GitHub 活动、未完成待办与需求拆解，给出跨数据的联动洞察与行动建议。
            </p>
          )}
          {!insightBusy && insight && (
            <div className="fade-up mt-3 flex flex-col gap-2.5">
              <b className="text-[13px] text-purple">{insight.headline}</b>
              <ul className="flex flex-col gap-1.5">
                {insight.points.map((p, i) => (
                  <li key={i} className="stagger-item text-[12px] text-dim leading-relaxed flex gap-1.5" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="text-purple shrink-0">·</span>{p}
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#3a2d63] pt-2.5 mt-0.5 text-[12px] text-txt flex gap-1.5">
                <span className="text-accent shrink-0">→</span>{insight.suggestion}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-line rounded-2xl p-4">
          <b className="text-[13.5px]">待办概览</b>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-inset rounded-xl py-3">
              <div className="font-mono text-[20px] font-bold">{s.todos.filter((t) => !t.done && t.scope === scope).length}</div>
              <div className="text-[10.5px] text-faint">进行中</div>
            </div>
            <div className="bg-inset rounded-xl py-3">
              <div className="font-mono text-[20px] font-bold text-accent">{s.todos.filter((t) => t.done && t.scope === scope).length}</div>
              <div className="text-[10.5px] text-faint">已完成</div>
            </div>
          </div>
        </div>

        <div className="bg-[#11161f] border border-line rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <svg viewBox="0 0 16 16" width={22} height={22} fill="#e6edf3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          <div className="min-w-0">
            <b className="text-[12.5px] block">GitHub 仓库{s.lastSync > 0 ? '同步正常' : '未同步'}</b>
            <span className="text-[10.5px] text-faint">{s.settings.watchedRepos.length} 个关注仓库</span>
          </div>
          <span className="ml-auto text-faint">›</span>
        </div>
      </div>
    </div>
  )
}
