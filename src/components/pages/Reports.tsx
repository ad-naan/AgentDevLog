'use client'

import { useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import {
  IconCheck, IconClock, IconAlert, IconCalendar,
  IconReport, IconRefresh, IconSpark,
} from '../icons'
import PageSkeleton from '../PageSkeleton'

export default function Reports() {
  const { s, scope, api } = useStore()
  const toast = useToast()
  const [sel, setSel] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [manualNotes, setManualNotes] = useState('')
  const [showManual, setShowManual] = useState(false)

  if (!s) return <PageSkeleton type="reports" />

  const reports = s.reports.filter((x) => x.scope === scope)
  const r = reports.find((x) => x.id === sel) || reports[0]
  const isWork = scope === 'work'

  const confirm = async () => {
    if (!r) return
    const res = await api(`/api/reports/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    if (res.ok) {
      toast('报告已确认归档', 'success')
    } else {
      toast(await apiError(res), 'error')
    }
  }

  const generate = async (period: 'day' | 'week') => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, period, manualNotes: period === 'week' ? manualNotes : '' }),
      })
      if (!res.ok) {
        toast(await apiError(res), 'error')
        return
      }
      const j = (await res.json()) as { id: number }
      setSel(j.id)
      toast(
        period === 'week' ? '✦ AI 已生成上周周报（按项目量化）' : '✦ AI 已基于真实日志与活动生成今日报告',
        'success',
      )
    } finally {
      setBusy(false)
    }
  }

  const regenerate = () => generate(((r?.basis as { kind?: 'day' | 'week' })?.kind) ?? 'day')

  const plansToTodos = async () => {
    if (!r || adopting) return
    setAdopting(true)
    const titles = r.sections.plans.filter(Boolean).slice(0, 6)
    for (const title of titles) {
      await api('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'P2', due: '明天', scope, source: 'AI 日报', tag: '计划' }),
      })
    }
    setAdopting(false)
    toast(`明日计划已转为 ${titles.length} 个待办`, 'success')
  }

  const manualPanel = (
    <div className="w-full">
      <button
        onClick={() => setShowManual((v) => !v)}
        className="btn-press text-[11.5px] text-faint hover:text-dim flex items-center gap-1.5 py-1">
        <span>{showManual ? '▾' : '▸'}</span>
        <span>补充工作（git 未记录的线下/会议工作，用于周报）</span>
      </button>
      {showManual && (
        <textarea
          value={manualNotes}
          onChange={(e) => setManualNotes(e.target.value)}
          rows={3}
          placeholder={'每行一条，例如：\n- 主导支付模块架构评审，确定 3 个核心接口方案\n- 排查生产环境数据库连接池耗尽问题并完成调优'}
          className="mt-2 w-full rounded-xl bg-inset border border-line px-3 py-2 text-[12px] text-dim leading-relaxed outline-none focus:border-line2 resize-y"
        />
      )}
    </div>
  )

  if (!r) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-card border border-line flex items-center justify-center text-dim mb-1">
          <IconReport className="w-6 h-6" />
        </div>
        <h2 className="text-[17px] font-bold text-txt">暂无报告归档</h2>
        <p className="text-[13px] text-dim">
          {isWork
            ? '基于当前已记录的工作日志、GitHub 提交与 PR 动态，由 AI 自动生成量化结构的工作日报或周报（可直接用于向上汇报）。'
            : '基于生活记录与想做的事，由 AI 提炼经历、感悟与教训，生成面向自我成长的生活复盘（仅自己可见的视角）。'}
        </p>
        {isWork && manualPanel}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => generate('day')}
            disabled={busy}
            className={`btn-press px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-60 shadow-lg ${
              busy ? 'ai-btn-busy' : 'bg-gradient-to-r from-[#5e5ce6] to-[#0a84ff]'
            }`}>
            {busy ? '✦ AI 正在生成中…' : isWork ? '✦ 生成今日日报' : '✦ 生成今日复盘'}
          </button>
          <button
            onClick={() => generate('week')}
            disabled={busy}
            className="btn-press px-4 py-2.5 rounded-xl border border-line text-[13px] font-medium text-dim hover:text-txt hover:bg-white/[0.04] disabled:opacity-60">
            ✦ 生成上周{isWork ? '周报' : '周复盘'}

          </button>
        </div>
      </div>
    )
  }

  const isWeek = (r.basis as { kind?: string })?.kind === 'week'
  const sections = isWeek
    ? isWork
      ? [
          { title: '本周重点项目进度', Icon: IconCheck, color: 'text-accent', dot: 'bg-accent', items: r.sections.done },
          { title: '进行中与未完成', Icon: IconClock, color: 'text-blue', dot: 'bg-blue', items: r.sections.doing },
          { title: '风险与阻塞问题', Icon: IconAlert, color: 'text-red', dot: 'bg-red', items: r.sections.risks },
          { title: '下周计划（含预期产出）', Icon: IconCalendar, color: 'text-purple', dot: 'bg-purple', items: r.sections.plans },
        ]
      : [
          { title: '本周经历与收获', Icon: IconCheck, color: 'text-orange', dot: 'bg-orange', items: r.sections.done },
          { title: '观察与模式', Icon: IconClock, color: 'text-blue', dot: 'bg-blue', items: r.sections.doing },
          { title: '反思与教训', Icon: IconAlert, color: 'text-red', dot: 'bg-red', items: r.sections.risks },
          { title: '下周行动（可验证）', Icon: IconCalendar, color: 'text-purple', dot: 'bg-purple', items: r.sections.plans },
        ]
    : isWork
      ? [
          { title: '今日完成', Icon: IconCheck, color: 'text-accent', dot: 'bg-accent', items: r.sections.done },
          { title: '进行中', Icon: IconClock, color: 'text-blue', dot: 'bg-blue', items: r.sections.doing },
          { title: '风险与阻塞', Icon: IconAlert, color: 'text-red', dot: 'bg-red', items: r.sections.risks },
          { title: '明日计划', Icon: IconCalendar, color: 'text-purple', dot: 'bg-purple', items: r.sections.plans },
        ]
      : [
          { title: '今日经历', Icon: IconCheck, color: 'text-orange', dot: 'bg-orange', items: r.sections.done },
          { title: '观察与感悟', Icon: IconClock, color: 'text-blue', dot: 'bg-blue', items: r.sections.doing },
          { title: '反思与教训', Icon: IconAlert, color: 'text-red', dot: 'bg-red', items: r.sections.risks },
          { title: '明日行动', Icon: IconCalendar, color: 'text-purple', dot: 'bg-purple', items: r.sections.plans },
        ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 h-full min-h-0 max-w-[1400px] mx-auto overflow-hidden">
      {/* 左栏：日报归档列表（对齐 design/e32f7db2） */}
      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-line bg-white/[0.01]">
          <b className="text-[13.5px] font-semibold">{isWork ? '日报归档' : '复盘归档'}</b>
          <button
            onClick={regenerate}
            disabled={busy}
            title="重新生成报告"
            className="btn-press text-faint hover:text-dim p-1">
            <IconRefresh className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {reports.map((x) => {
            const on = x.id === r.id
            return (
              <button
                key={x.id}
                onClick={() => setSel(x.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition-all relative ${
                  on
                    ? 'bg-card-subtle border border-line2 shadow-sm'
                    : 'hover:bg-black/[0.03] border border-transparent'
                }`}
              >
        {on && <span className="absolute left-1 top-2.5 bottom-2.5 w-1 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent)]" />}
                <div className="flex items-center gap-2">
                  <IconReport className="w-3.5 h-3.5 text-faint" />
                  <span className="text-[13px] font-mono font-medium text-txt">{x.date}</span>
                  <span
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      x.status === 'draft'
                        ? 'bg-[rgba(191,90,242,.15)] text-purple border border-[rgba(191,90,242,.25)]'
      : 'bg-accent/15 text-accent border border-accent/25'
                    }`}>
                    {x.status === 'draft' ? 'AI 起草' : '已确认'}
                  </span>
                </div>
                <div className="text-[11.5px] text-dim/70 truncate mt-1 pl-5">{x.summary}</div>
              </button>
            )
          })}
        </div>

        <div className="border-t border-line px-3.5 py-3 flex flex-col gap-2 bg-inset/40">
          {manualPanel}
          <button
            onClick={() => generate('week')}
            disabled={busy}
            className="btn-press w-full py-2 rounded-xl border border-line text-[12px] font-medium text-dim hover:text-txt hover:bg-white/[0.04] disabled:opacity-60">
            ✦ 生成上周周报
          </button>
          <div className="text-[11px] text-faint text-center">共 {reports.length} 篇归档</div>
        </div>
      </div>

      {/* 右栏：日报详情与四象限结构（对齐 design/e32f7db2） */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        {busy ? (
          <div className="bg-card border border-line rounded-2xl flex-1 p-6 fade-up">
            <div className="flex items-center gap-2 text-[12px] text-purple">
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
              AI 正在整合今日日志、GitHub 活动与任务产出生成报告…
            </div>
            <div className="skeleton h-8 w-60 mt-5" />
            <div className="skeleton h-4 w-2/3 mt-3" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border border-line rounded-2xl p-5">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3.5 w-full mt-3" />
                  <div className="skeleton h-3.5 w-4/5 mt-2" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 overflow-y-auto p-6 fade-up flex flex-col">
            {/* 顶栏元信息 */}
            <div className="flex items-center justify-between text-[12px] text-faint border-b border-line pb-3.5">
              <div className="flex items-center gap-2 text-txt font-medium">
                <IconSpark className="w-4 h-4 text-purple" />
                <span>AI 生成{isWeek ? '周报' : '日报'}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <IconClock className="w-3.5 h-3.5 text-faint" />
                <span>生成于 {r.generatedAt}</span>
              </div>
            </div>

            {/* 大标题与数据基础统计 */}
            <div className="mt-4">
              <h1 className="text-[24px] font-bold text-txt flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-inset border border-line flex items-center justify-center text-dim">
                  <IconReport className="w-4.5 h-4.5 text-accent" />
                </span>
                {isWeek ? '周报' : '日报'} · {r.date}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-[12px] text-faint font-mono">
                <span>基于</span>
                <span className="text-dim font-medium">{r.basis.logs} 条日志</span>
                <span>+</span>
                <span className="text-dim font-medium">{r.basis.commits} commits</span>
                <span>+</span>
                <span className="text-dim font-medium">{r.basis.prs} PRs</span>
              </div>
            </div>

            {/* 四象限卡片内容网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 flex-1 items-start">
              {sections.map(({ title, Icon, color, dot, items }) => (
                <div
                  key={title}
                  className="border border-line rounded-2xl p-4.5 bg-inset/40 hover:border-line2 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <b className="text-[13.5px] text-txt font-semibold">{title}</b>
                      <span className="ml-auto text-[11px] font-mono text-faint bg-inset px-2 py-0.5 rounded-full border border-line">
                        {items.length} 项
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {items.map((x, i) => (
                        <li key={i} className="text-[12.5px] text-dim leading-relaxed flex items-start gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 mt-2`} />
                          <span className="flex-1">{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {title.includes('计划') && items.some(Boolean) && (
                    <button
                      onClick={plansToTodos}
                      disabled={adopting}
                      className="btn-press mt-3.5 w-full py-2 rounded-xl border border-[rgba(139,92,246,.3)] text-[12px] text-purple hover:bg-[rgba(139,92,246,.12)] disabled:opacity-50 font-medium">
                      {adopting ? '正在转入…' : '✦ 一键转为明日待办'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部 AI 悬浮操作底栏（高度还原 design/e32f7db2） */}
        <div className="ai-bar rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(94,92,230,0.26)]">
              <IconSpark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <b className="text-[12.5px] text-txt block">AI 正在持续学习你的工作节奏，让日报更懂你。</b>
              <span className="text-[11px] text-dim truncate block">
                基于你的真实日志、代码提交与待办数据，提供更精准的高级总结与建议。
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={regenerate}
              disabled={busy}
              className="btn-press px-4 py-2 rounded-xl border border-line2 text-[12.5px] font-medium text-dim hover:text-txt hover:bg-white/[0.04] disabled:opacity-50 inline-flex items-center gap-1.5">
              <IconRefresh className="w-3.5 h-3.5" />
              重新生成
            </button>
            {!busy && r.status === 'draft' && (
              <button
                onClick={confirm}
          className="btn-press px-5 py-2 rounded-xl bg-accent text-[#04110b] text-[12.5px] font-semibold hover:bg-accent-hover shadow-[0_0_14px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] inline-flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
                确认归档
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
