'use client'

import { useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import { IconCheck, IconClock, IconAlert, IconCalendar, IconReport, IconGear } from '../icons'

export default function Reports() {
  const { s, scope, api } = useStore()
  const toast = useToast()
  const [sel, setSel] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [adopting, setAdopting] = useState(false)
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const reports = s.reports
  const r = reports.find((x) => x.id === sel) || reports[0]

  const confirm = async () => {
    if (!r) return
    const res = await api(`/api/reports/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    res.ok ? toast('报告已确认归档', 'success') : toast(await apiError(res), 'error')
  }
  const regenerate = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      if (!res.ok) {
        toast(await apiError(res), 'error')
        return
      }
      const j = await res.json() as { id: number }
      setSel(j.id)
      toast('✦ AI 已基于真实日志与活动生成今日报告', 'success')
    } finally {
      setBusy(false)
      await new Promise((ok) => setTimeout(ok, 350)) // 让骨架屏动画完整呈现
    }
  }
  const plansToTodos = async () => {
    if (!r || adopting) return
    setAdopting(true)
    const titles = r.sections.plans.filter(Boolean).slice(0, 6)
    for (const title of titles) {
      await api('/api/todos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'P2', due: '明天', scope, source: 'AI 日报', tag: '计划' }),
      })
    }
    setAdopting(false)
    toast(`明日计划已转为 ${titles.length} 个待办`, 'success')
  }

  if (!r) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-faint text-[13px]">还没有报告。</p>
      <button onClick={regenerate} disabled={busy}
        className={`btn-press px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60 ${busy ? 'ai-btn-busy' : 'bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0]'}`}>
        {busy ? '✦ AI 生成中…' : '✦ 生成今日报告'}
      </button>
    </div>
  )

  const secs: [string, typeof IconCheck, string, string[]][] = [
    ['今日完成', IconCheck, 'text-accent bg-[rgba(61,220,151,.15)]', r.sections.done],
    ['进行中', IconClock, 'text-blue bg-[rgba(88,166,255,.15)]', r.sections.doing],
    ['风险与阻塞', IconAlert, 'text-red bg-[rgba(248,81,73,.15)]', r.sections.risks],
    ['明日计划', IconCalendar, 'text-purple bg-[rgba(188,140,255,.15)]', r.sections.plans],
  ]

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-full min-h-0">
      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
        <div className="flex items-center px-4 py-3.5 border-b border-line">
          <b className="text-[13.5px]">报告归档</b>
          <button onClick={regenerate} disabled={busy} title="重新生成今日报告"
            className={`btn-press ml-auto text-faint hover:text-dim ${busy ? 'animate-pulse' : ''}`}>
            <IconGear className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {reports.map((x) => {
            const on = x.id === r.id
            return (
              <button key={x.id} onClick={() => setSel(x.id)}
                className={`relative w-full text-left rounded-lg px-3 py-2.5 mb-1 ${on ? 'bg-[#182131]' : 'hover:bg-[rgba(255,255,255,.03)]'}`}>
                {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent rounded-full" />}
                <div className="flex items-center gap-2">
                  <span className="text-faint text-[12px]"><IconReport className="w-3.5 h-3.5" /></span>
                  <span className="text-[13px] font-medium">{x.date}</span>
                  <span className={`ml-auto text-[10px] px-2 py-px rounded-full ${x.status === 'draft'
                    ? 'bg-[rgba(167,139,250,.15)] text-purple' : 'bg-[rgba(52,211,153,.14)] text-accent'}`}>
                    {x.status === 'draft' ? 'AI 起草' : '已确认'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-faint text-[11px]">⑂</span>
                  <span className="text-[11.5px] text-faint truncate">{x.summary}</span>
                </div>
              </button>
            )
          })}
        </div>
        <div className="border-t border-line px-4 py-3">
          <div className="text-[11px] text-faint mt-1">共 {reports.length} 篇报告</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-0">
        {busy ? (
          <div className="bg-card border border-line rounded-2xl flex-1 p-6 fade-up">
            <div className="flex items-center gap-2 text-[12px] text-purple">
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              AI 正在综合日志、GitHub 活动与待办生成报告…
            </div>
            <div className="skeleton h-7 w-48 mt-4" />
            <div className="skeleton h-4 w-2/3 mt-4" />
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border border-line rounded-xl p-4">
                  <div className="skeleton h-3.5 w-24" />
                  <div className="skeleton h-3 w-full mt-3" />
                  <div className="skeleton h-3 w-4/5 mt-2" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 overflow-y-auto p-6 fade-up">
            <div className="flex items-center gap-2 text-[12px] text-dim">
              <span className="text-purple">✦</span>AI 生成报告
              <span className="ml-auto inline-flex items-center gap-1.5 text-faint"><IconClock className="w-3 h-3" />生成于 {r.generatedAt}</span>
            </div>
            <h1 className="text-[22px] font-bold mt-3 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg border border-line2 flex items-center justify-center text-dim"><IconReport className="w-4 h-4" /></span>
              {r.date} 日报
            </h1>
            <p className="text-[13px] text-dim mt-3">{r.summary}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[['日志条目', r.basis.logs], ['Commits', r.basis.commits], ['PRs', r.basis.prs]].map(([l, n]) => (
                <div key={l as string} className="bg-inset rounded-xl px-4 py-3">
                  <div className="font-mono text-[20px] font-bold">{n as number}</div>
                  <div className="text-[11px] text-faint">{l as string}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {secs.map(([title, Ic, cls, items]) => (
                <div key={title} className="border border-line rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${cls}`}><Ic className="w-3.5 h-3.5" /></span>
                    <b className="text-[13px]">{title}</b>
                    <span className="ml-auto text-[11px] text-faint font-mono">{items.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((x, i) => (
                      <li key={i} className="text-[12.5px] text-dim leading-relaxed flex gap-1.5"><span className="text-faint">·</span>{x}</li>
                    ))}
                  </ul>
                  {title === '明日计划' && items.some(Boolean) && (
                    <button onClick={plansToTodos} disabled={adopting}
                      className="btn-press mt-3 w-full py-1.5 rounded-lg border border-[#4a3a80] text-[11.5px] text-purple hover:bg-[rgba(139,92,246,.12)] disabled:opacity-60">
                      {adopting ? '转入中…' : '✦ 一键转为明日待办'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="ai-bar rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <span className="text-purple">✦</span>
          <span className="text-[12.5px] text-dim">内容由服务端基于数据库中的真实日志与 GitHub 活动生成</span>
          {!busy && r.status === 'draft' && (
            <button onClick={confirm} className="btn-press ml-auto px-4 py-1.5 rounded-lg bg-accent text-[#04110b] text-[12.5px] font-semibold">确认无误</button>
          )}
          <button onClick={regenerate} disabled={busy}
            className={`btn-press ${!busy && r.status === 'draft' ? '' : 'ml-auto '}px-4 py-1.5 rounded-lg border border-line2 text-[12.5px] hover:bg-[rgba(255,255,255,.05)] disabled:opacity-50`}>
            {busy ? '生成中…' : '重新生成'}
          </button>
        </div>
      </div>
    </div>
  )
}
