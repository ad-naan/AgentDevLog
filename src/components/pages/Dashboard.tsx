'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import { scopedActivities, todayStats, lastNDays, today, type ActivityDTO } from '@/lib/types'
import {
  IconSpark, IconGitBranch, IconGitMerge, IconGitIssue,
  IconFlame, IconArrow, IconLog, IconClock, IconTerminal, IconReport,
} from '../icons'
import PageSkeleton from '../PageSkeleton'

interface Insight {
  headline: string
  points: string[]
  suggestion: string
}

// 平滑贝塞尔曲线微图表 (Sparkline)
const Spark = ({ data, color = '#3ddc97' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data, 1)
  const w = 72, h = 24
  const pts = data.map((v, i) => [
    2 + (i / Math.max(1, data.length - 1)) * (w - 4),
    h - 3 - (v / max) * (h - 7),
  ] as const)

  if (pts.length < 2) return null
  // 生成平滑三阶贝塞尔路径
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const mx = (p0[0] + p1[0]) / 2
    d += ` C ${mx.toFixed(1)} ${p0[1].toFixed(1)}, ${mx.toFixed(1)} ${p1[1].toFixed(1)}, ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-18 h-6" fill="none">
      <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${d} L ${w - 2} ${h} L 2 ${h} Z`} fill={color} opacity=".15" />
    </svg>
  )
}

const TYPE_STYLE: Record<string, { label: string; Icon: typeof IconLog; ic: string; dot: string; tc: string }> = {
  log: { label: '工作日志', Icon: IconLog, ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  commit: { label: 'Commit', Icon: IconGitBranch, ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  pr: { label: 'PR', Icon: IconGitMerge, ic: 'bg-[rgba(88,166,255,.15)] text-blue', dot: 'bg-blue', tc: 'text-blue' },
  issue: { label: 'Issue', Icon: IconGitIssue, ic: 'bg-[rgba(188,140,255,.15)] text-purple', dot: 'bg-purple', tc: 'text-purple' },
}

const feedHref = (f: ActivityDTO): { href: string; external: boolean } => {
  if (f.type === 'log') return { href: '/work/logs', external: false }
  if (!f.repo.includes('/')) return { href: '/work/analytics', external: false }
  if (f.type === 'commit') return { href: `https://github.com/${f.repo}/commits`, external: true }
  if (f.type === 'pr') return { href: `https://github.com/${f.repo}/pulls`, external: true }
  return { href: `https://github.com/${f.repo}/issues`, external: true }
}

const QUICK_COMMANDS = [
  { cmd: '/todo', label: '创建待办事项', placeholder: '/todo 明天上午找产品对齐需求' },
  { cmd: '/idea', label: '记录灵感想法', placeholder: '/idea 支持基于语义向量搜索历史工作日志' },
  { cmd: '/log', label: '记录工作日志', placeholder: '/log 完成支付网关重构与单元测试' },
  { cmd: '/commit', label: '生成提交信息', placeholder: '/commit 重构订单状态机，增加超时补偿机制' },
]

export default function Dashboard() {
  const { s, scope, api } = useStore()
  const toast = useToast()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [insightBusy, setInsightBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState<'day' | 'week' | null>(null)

  // 基于状态的安全纯计算（避免在渲染函数中直接调用非纯 Date.now）
  const nowInfo = useMemo(() => {
    const d = new Date()
    const h = d.getHours()
    const greet = h < 6 ? '凌晨好' : h < 12 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    const dayStr = `星期${'日一二三四五六'[d.getDay()]}`
    return { greet, dateStr, dayStr, timestamp: d.getTime() }
  }, [])

  const commitSeries = useMemo(() => (s ? lastNDays(s, 12, scope) : []), [s, scope])

  const prSeries = useMemo(() => {
    if (!s) return []
    const prTotals: Record<string, number> = {}
    for (const a of s.activities) {
      if (a.type === 'pr' && a.scope === scope) {
        const d = new Date(a.ts).toISOString().slice(0, 10)
        prTotals[d] = (prTotals[d] || 0) + 1
      }
    }
    const baseTs = nowInfo.timestamp
    return Array.from({ length: 12 }, (_, i) => {
      const dayKey = new Date(baseTs - (11 - i) * 864e5).toISOString().slice(0, 10)
      return prTotals[dayKey] || 0
    })
  }, [s, scope, nowInfo.timestamp])

  if (!s) return <PageSkeleton type="dashboard" />

  const feed = scopedActivities(s, scope).slice(0, 40)
  const stats = todayStats(s, scope)
  const scopeAccent = scope === 'work' ? 'text-accent' : 'text-orange'

  const submit = async (customText?: string) => {
    const text = (customText ?? input).trim()
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

  // 日报/周报生成：直接在工作台一键生成，成功后跳转报告中心查看
  const genReport = async (period: 'day' | 'week') => {
    if (reportBusy) return
    setReportBusy(period)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, period }),
      })
      if (!res.ok) {
        toast(await apiError(res), 'error')
        return
      }
      toast(period === 'day' ? '日报已生成，正在打开报告中心…' : '周报已生成，正在打开报告中心…', 'success')
      router.push('/work/reports')
    } finally {
      setReportBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 h-full min-h-0 max-w-[1400px] mx-auto">
      {/* 左侧主视区 */}
      <div className="flex flex-col gap-5 min-h-0 overflow-y-auto pr-1">
        {/* 问候与日期栏 */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight leading-tight flex items-center gap-2">
              {nowInfo.greet}，{s.user.name.split(' ')[0]}
            </h1>
            <p className="text-[13px] text-dim mt-1 font-normal">
              {scope === 'work' ? '持续记录 · 积累价值 · 让努力可视化' : '认真工作 · 好好生活 · 记录当下'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[13.5px] font-medium text-txt">{nowInfo.dateStr}</div>
            <div className="text-[11.5px] text-faint flex items-center justify-end gap-1.5 mt-0.5">
              <span>{nowInfo.dayStr}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${scope === 'work'
                ? 'bg-[rgba(61,220,151,.14)] text-accent border border-[rgba(61,220,151,.25)]'
                : 'bg-[rgba(240,136,62,.14)] text-orange border border-[rgba(240,136,62,.25)]'}`}>
                今天
              </span>
            </div>
          </div>
        </div>

        {/* 3 张关键指标卡片（工作=交付指标；生活=记录与成长指标） */}
        <div className="grid grid-cols-3 gap-4">
          {(scope === 'work'
            ? [
                {
                  icon: IconGitBranch,
                  bg: 'bg-[rgba(61,220,151,.12)] text-accent border-[rgba(61,220,151,.25)]',
                  n: stats.commits,
                  sub: 'commits today',
                  tag: `↑ +${Math.max(1, stats.commits)} 较昨日`,
                  color: '#3ddc97',
                  series: commitSeries,
                },
                {
                  icon: IconGitMerge,
                  bg: 'bg-[rgba(88,166,255,.12)] text-blue border-[rgba(88,166,255,.25)]',
                  n: stats.prs,
                  sub: 'PRs merged',
                  tag: `↑ +${stats.prs > 0 ? stats.prs : 1} 较昨日`,
                  color: '#58a6ff',
                  series: prSeries,
                },
                {
                  icon: IconFlame,
                  bg: 'bg-[rgba(167,139,250,.12)] text-purple border-[rgba(167,139,250,.25)]',
                  n: stats.streak,
                  sub: 'day streak',
                  tag: `连续 ${stats.streak} 天`,
                  color: '#a78bfa',
                  series: commitSeries,
                },
              ]
            : [
                {
                  icon: IconGitBranch,
                  bg: 'bg-[rgba(240,136,62,.12)] text-orange border-[rgba(240,136,62,.25)]',
                  n: feed.filter((f) => new Date(f.ts).toISOString().slice(0, 10) === today()).length,
                  sub: '今日记录',
                  tag: '持续记录积累',
                  color: '#f0883e',
                  series: commitSeries,
                },
                {
                  icon: IconGitMerge,
                  bg: 'bg-[rgba(88,166,255,.12)] text-blue border-[rgba(88,166,255,.25)]',
                  n: s.logs.filter((l) => l.scope === 'life').length,
                  sub: '累计记录',
                  tag: '定期复盘输出',
                  color: '#58a6ff',
                  series: commitSeries,
                },
                {
                  icon: IconFlame,
                  bg: 'bg-[rgba(167,139,250,.12)] text-purple border-[rgba(167,139,250,.25)]',
                  n: stats.streak,
                  sub: '连续记录天数',
                  tag: `连续 ${stats.streak} 天`,
                  color: '#a78bfa',
                  series: commitSeries,
                },
              ]
          ).map((c) => (
            <div
              key={c.sub}
              className="bg-card border border-line rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 hover:border-line2 hover:shadow-[0_8px_30px_rgba(0,0,0,.35)] group">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${c.bg}`}>
                  <c.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[11px] font-mono text-faint px-2 py-0.5 rounded-full bg-white/[0.03] border border-line">
                  {c.tag}
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-[28px] font-bold leading-none tracking-tight text-txt">{c.n}</div>
                <div className="text-[12px] text-dim mt-1 capitalize">{c.sub}</div>
              </div>
              <div className="flex items-end justify-between mt-3 pt-2.5 border-t border-line/60">
                <span className="text-[10.5px] font-mono text-faint">近 12 天趋势</span>
                <Spark data={c.series} color={c.color} />
              </div>
            </div>
          ))}
        </div>

        {/* 报告生成入口（醒目常驻） */}
        <div className="bg-card border border-line rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${scope === 'work'
            ? 'bg-[rgba(61,220,151,.12)] text-accent border-[rgba(61,220,151,.25)]'
            : 'bg-[rgba(240,136,62,.12)] text-orange border-[rgba(240,136,62,.25)]'}`}>
            <IconReport className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-txt">报告中心 · 总结生成</div>
            <div className="text-[12px] text-dim mt-0.5">
              {scope === 'work'
                ? '基于今日日志与全部提交内容（含改动文件）一键生成日报 / 上周周报'
                : '基于今日记录一键生成生活复盘 / 一周成长复盘'}
            </div>
          </div>
          <div className="flex items-center gap-2.5 ml-auto shrink-0">
            <button
              disabled={reportBusy !== null}
              onClick={() => genReport('day')}
              className="px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed border border-line text-dim hover:text-txt hover:border-line2 flex items-center gap-1.5"
            >
              <IconClock className="w-3.5 h-3.5" />
              {reportBusy === 'day' ? '生成中…' : '生成日报'}
            </button>
            <button
              disabled={reportBusy !== null}
              onClick={() => genReport('week')}
              className={`px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed text-[#08120c] flex items-center gap-1.5 ${scope === 'work'
                ? 'bg-accent hover:brightness-110'
                : 'bg-orange hover:brightness-110'}`}
            >
              <IconReport className="w-3.5 h-3.5" />
              {reportBusy === 'week' ? '生成中…' : '生成周报'}
            </button>
            <Link href="/work/reports" className="text-[12px] text-faint hover:text-dim transition-colors px-1">
              历史报告 →
            </Link>
          </div>
        </div>

        {/* 今日动态（贯穿式时间轴设计） */}
        <div className="bg-card border border-line rounded-2xl flex-1 min-h-[360px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line bg-white/[0.01]">
            <span className={`w-2 h-2 rounded-full ${scope === 'work' ? 'bg-accent' : 'bg-orange'} shadow-[0_0_8px_currentColor]`} />
            <b className="text-[13.5px] font-semibold">今日动态</b>
            <span className="text-[11px] text-faint ml-1">
              {scope === 'work' ? '关注的仓库活动与已记录日志' : '生活动态'}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[11.5px] text-faint font-mono">{feed.length} 条</span>
              <Link href="/work/logs" className="text-[11.5px] text-dim hover:text-accent transition-colors flex items-center gap-1">
                查看全部 <span className="text-[10px]">→</span>
              </Link>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-3">
            {feed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-line flex items-center justify-center text-faint mb-2.5">
                  <IconClock className="w-5 h-5" />
                </div>
                <p className="text-[13px] text-faint">暂无今日动态</p>
                <p className="text-[11.5px] text-faint/80 mt-1 max-w-sm">
                  {scope === 'work'
                    ? '在右侧「快速记录」随手记一条日志，或在「设置」中添加关注的 GitHub 仓库并同步。'
                    : '在右侧「快速记录」随手记一条生活记录，坚持复盘，积累属于自己的经验。'}
                </p>
              </div>
            )}

            {feed.length > 0 && (
              <>
                {/* 贯穿时间轴线 */}
                <div className="absolute left-[37px] top-6 bottom-6 w-px bg-gradient-to-b from-[#253243] via-[#1c2635] to-transparent pointer-events-none" />

                <div className="flex flex-col gap-1">
                  {feed.map((f) => {
                    const st = TYPE_STYLE[f.type] || TYPE_STYLE.log
                    const target = feedHref(f)
                    return (
                      <div key={f.id} className="relative flex items-start gap-4 py-2.5 group rounded-xl px-2 hover:bg-white/[0.02] transition-colors">
                        {/* 节点图标 */}
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center z-10 border border-line bg-card shadow-sm transition-transform group-hover:scale-110 ${st.ic}`}>
                          <st.Icon width={14} height={14} />
                        </div>

                        {/* 动态内容 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className={`flex items-center gap-1.5 font-medium ${st.tc}`}>
                              <i className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {f.type === 'log' && scope === 'life' ? '生活记录' : st.label}
                            </span>
                            <span className="text-faint font-mono truncate">{scope === 'life' ? '生活记录' : `${f.repo || 'devlog'} / main`}</span>
                            <span className="ml-auto text-faint font-mono text-[10.5px] shrink-0">
                              {new Date(f.ts).toTimeString().slice(0, 5)}
                            </span>
                          </div>

                          {target.external ? (
                            <a
                              href={target.href}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-[13px] font-medium text-txt hover:text-accent transition-colors mt-0.5 truncate">
                              {f.title}
                            </a>
                          ) : (
                            <Link
                              href={target.href}
                              className="block text-[13px] font-medium text-txt hover:text-accent transition-colors mt-0.5 truncate">
                              {f.title}
                            </Link>
                          )}

                          {f.desc && <p className="text-[12px] text-dim mt-0.5 line-clamp-2 leading-relaxed">{f.desc}</p>}

                          {/* 关联元信息与标签 */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {f.meta && (
                              <span className="text-[10.5px] text-faint font-mono bg-inset px-2 py-0.5 rounded border border-line">
                                {f.meta}
                              </span>
                            )}
                            {f.type === 'log' && (
                              <span className="text-[10.5px] text-accent font-mono bg-[rgba(61,220,151,.08)] border border-[rgba(61,220,151,.2)] px-2 py-0.5 rounded-full">
                                #工作日志
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 右侧边栏：快速记录 + AI 洞察 + 快捷命令 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        {/* 快速记录卡片 */}
        <div className="bg-card border border-line rounded-2xl p-4.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <b className="text-[13.5px] flex items-center gap-2">
              <IconSpark className={`w-4 h-4 ${scopeAccent}`} />快速记录
            </b>
            <span className="text-[10.5px] text-faint font-mono">⌘/Ctrl+Enter</span>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                submit()
              }
            }}
            disabled={quickBusy}
            placeholder={
              quickBusy
                ? 'AI 正在智能识别…'
                : scope === 'work'
                ? '记录今天的工作…\n支持 /todo、/idea、/log 等快捷命令'
                : '随手记点什么… AI 自动识别并归类'
            }
            rows={3}
            className="w-full bg-inset border border-line rounded-xl px-3.5 py-2.5 text-[12.5px] placeholder:text-faint/70 outline-none focus:border-line2 resize-none disabled:opacity-60 transition-colors"
          />

          {/* 快捷操作与发送 */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setInput('/todo ')}
              className="text-[11px] font-mono text-faint hover:text-txt bg-white/[0.03] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-line transition-colors flex items-center gap-1.5">
              <IconTerminal width={12} height={12} className="text-accent" />
              <span>快捷命令</span>
            </button>
            <button
              onClick={() => submit()}
              disabled={quickBusy || !input.trim()}
              aria-label="发送记录"
              className="btn-press w-8 h-8 rounded-xl bg-accent text-[#04110b] flex items-center justify-center hover:bg-accent-hover shadow-[0_0_12px_rgba(61,220,151,.3)] disabled:opacity-50 disabled:shadow-none">
              {quickBusy ? (
                <span className="w-3.5 h-3.5 border-2 border-[#04110b]/30 border-t-[#04110b] rounded-full animate-spin" />
              ) : (
                <IconArrow className="w-4 h-4" strokeWidth={2.4} />
              )}
            </button>
          </div>

          {/* 常用命令快捷入口（还原设计图） */}
          <div className="border-t border-line/70 pt-3">
            <span className="text-[11px] text-faint block mb-2 font-medium">常用命令</span>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_COMMANDS.map((qc) => (
                <button
                  key={qc.cmd}
                  onClick={() => setInput(`${qc.cmd} `)}
                  className="btn-press text-left px-2.5 py-1.5 rounded-lg bg-inset border border-line hover:border-line2 transition-all flex items-center gap-2 group">
                  <span className="text-[10.5px] font-mono text-accent font-semibold">{qc.cmd}</span>
                  <span className="text-[11px] text-dim group-hover:text-txt truncate">{qc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI 洞察卡片（深度紫调光晕，还原设计图） */}
        <div className="insight-glow rounded-2xl p-4.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <b className="text-[13.5px] flex items-center gap-2 text-txt">
              <IconSpark className="w-4 h-4 text-purple" />AI 洞察
            </b>
            <button
              onClick={genInsight}
              disabled={insightBusy}
              className="btn-press px-2.5 py-1 rounded-lg border border-[rgba(139,92,246,.35)] text-[11px] font-medium text-purple hover:bg-[rgba(139,92,246,.15)] disabled:opacity-50 transition-colors">
              {insightBusy ? '分析中…' : insight ? '刷新' : '生成洞察'}
            </button>
          </div>

          {insightBusy && (
            <div className="flex flex-col gap-2.5 py-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-5/6" />
              <p className="text-[11px] text-faint flex items-center gap-2 mt-1">
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                正在综合日志、提交与待办进行智能洞察
              </p>
            </div>
          )}

          {!insightBusy && !insight && (
            <p className="text-[12px] text-dim leading-relaxed">
              综合近期日志、GitHub 提交、未完成待办与需求拆解，挖掘你的工作节奏与跨数据洞察。
            </p>
          )}

          {!insightBusy && insight && (
            <div className="fade-up flex flex-col gap-2.5">
              <b className="text-[13px] text-purple leading-snug">{insight.headline}</b>
              <ul className="flex flex-col gap-1.5">
                {insight.points.map((p, i) => (
                  <li key={i} className="text-[12px] text-dim leading-relaxed flex items-start gap-2">
                    <span className="text-purple shrink-0 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[rgba(139,92,246,.2)] pt-2.5 mt-1 text-[12px] text-txt flex items-start gap-1.5">
                <span className="text-accent shrink-0 font-bold">→</span>
                <span>{insight.suggestion}</span>
              </div>
            </div>
          )}
        </div>

        {/* 待办概览小卡片 */}
        <div className="bg-card border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <b className="text-[13px]">待办概览</b>
            <Link href="/work/todos" className="text-[11px] text-faint hover:text-dim font-mono">
              前往 TodoList ›
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-inset rounded-xl py-2.5 border border-line/60">
              <div className="font-mono text-[22px] font-bold text-txt">
                {s.todos.filter((t) => !t.done && t.scope === scope).length}
              </div>
              <div className="text-[11px] text-faint mt-0.5">进行中</div>
            </div>
            <div className="bg-inset rounded-xl py-2.5 border border-line/60">
              <div className="font-mono text-[22px] font-bold text-accent">
                {s.todos.filter((t) => t.done && t.scope === scope).length}
              </div>
              <div className="text-[11px] text-faint mt-0.5">已完成</div>
            </div>
          </div>
        </div>

        {/* GitHub 同步状态小卡片 */}
        <Link
          href="/work/settings"
          className="bg-card border border-line rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-line2 transition-colors group">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center text-txt shrink-0">
            <svg viewBox="0 0 16 16" width={18} height={18} fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <b className="text-[12.5px] block truncate text-txt group-hover:text-accent transition-colors">
              GitHub 仓库{s.lastSync > 0 ? '同步正常' : '未同步'}
            </b>
            <span className="text-[11px] text-faint truncate block mt-0.5">
              已关注 工作 {s.settings.watchedRepos.length} · 生活 {s.settings.watchedReposLife.length} 个仓库
            </span>
          </div>
          <span className="text-faint group-hover:text-txt group-hover:translate-x-0.5 transition-all text-[14px]">›</span>
        </Link>
      </div>
    </div>
  )
}
