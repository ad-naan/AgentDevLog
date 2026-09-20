import { useState, type ComponentType, type SVGProps } from 'react'
import { useStore, setState, todayStats, today } from '../store'
import { IconCheck, IconClock, IconAlert, IconCalendar, IconReport, IconGear } from '../icons'

type SecIcon = ComponentType<SVGProps<SVGSVGElement>>

export default function Reports() {
  const s = useStore()
  const [sel, setSel] = useState(() => s.reports[0]?.id || '')
  const reports = s.reports
  const r = reports.find((x) => x.id === sel) || reports[0]
  if (!r) return <p className="text-faint text-[13px] py-10 text-center">暂无日报。</p>

  const confirm = () => setState((d) => { const x = d.reports.find((y) => y.id === r.id); if (x) x.status = 'confirmed' })
  const regenerate = () => {
    const st = todayStats(s)
    const doneItems = s.logs.filter((l) => l.scope === s.scope).flatMap((l) => l.content.split('\n').filter((x) => x.trim().startsWith('- ')).slice(0, 3).map((x) => x.replace(/^-\s*/, '')))
    setState((d) => {
      const x = d.reports.find((y) => y.id === r.id)
      if (!x) return
      x.status = 'draft'
      x.generatedAt = `${today} ${new Date().toTimeString().slice(0, 5)}`
      x.basis = { logs: doneItems.length, commits: st.commits, prs: st.prs }
      if (doneItems.length) x.sections.done = doneItems
      x.sections.plans = ['按今日进展继续推进剩余事项。', '复盘一次今天遇到的问题。']
    })
  }

  const secs: [string, SecIcon, string, string[]][] = [
    ['今日完成', IconCheck, 'text-accent bg-[rgba(61,220,151,.15)]', r.sections.done],
    ['进行中', IconClock, 'text-blue bg-[rgba(88,166,255,.15)]', r.sections.doing],
    ['风险与阻塞', IconAlert, 'text-red bg-[rgba(248,81,73,.15)]', r.sections.risks],
    ['明日计划', IconCalendar, 'text-purple bg-[rgba(188,140,255,.15)]', r.sections.plans],
  ]

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-full min-h-0">
      {/* 归档列表 */}
      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
        <div className="flex items-center px-4 py-3.5 border-b border-line">
          <b className="text-[13.5px]">日报归档</b>
          <span className="ml-auto text-faint text-[12px]"><IconGear className="w-3.5 h-3.5" /></span>
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
          <div className="flex items-center text-[12.5px] text-dim">归档管理 <span className="ml-auto text-faint">›</span></div>
          <div className="text-[11px] text-faint mt-1">共 {reports.length} 篇日报</div>
        </div>
      </div>

      {/* 详情 */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 overflow-y-auto p-6">
          <div className="flex items-center gap-2 text-[12px] text-dim">
            <span className="text-purple">✦</span>AI 生成日报
            <span className="ml-auto inline-flex items-center gap-1.5 text-faint"><IconClock className="w-3 h-3" />生成于 {r.generatedAt}</span>
          </div>
          <h1 className="text-[22px] font-bold mt-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg border border-line2 flex items-center justify-center text-dim"><IconReport className="w-4 h-4" /></span>
            日报 · {r.date}
          </h1>
          <p className="text-[12.5px] text-faint mt-2 flex items-center gap-1.5 flex-wrap">
            <span>⑂</span>基于 <b className="text-accent font-mono">{r.basis.logs}</b> 条日志
            <span className="text-faint">+</span> <b className="text-accent font-mono">{r.basis.commits}</b> commits
            <span className="text-faint">+</span> <b className="text-accent font-mono">{r.basis.prs}</b> PRs
          </p>
          <div className="mt-5 flex flex-col gap-5">
            {secs.map(([title, Icon, cls, items]) => (
              <section key={title}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${cls}`}><Icon className="w-3.5 h-3.5" /></span>
                  <b className="text-[15px]">{title}</b>
                  <span className="text-[11.5px] text-faint">{items.length} 项</span>
                </div>
                <ul className="flex flex-col gap-2 pl-1">
                  {items.map((i, k) => (
                    <li key={k} className={`flex gap-2.5 text-[13.5px] text-[#c9d4e3] leading-relaxed ${cls.split(' ')[0]}`}>
                      <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span className="text-[#c9d4e3]">{i}</span>
                    </li>
                  ))}
                </ul>
                {items.length === 0 && <p className="text-[12px] text-faint">暂无内容</p>}
              </section>
            ))}
          </div>
        </div>

        <div className="ai-bar rounded-2xl px-5 py-4 flex items-center gap-4 shrink-0">
          <span className="w-9 h-9 rounded-full bg-[rgba(139,92,246,.25)] shadow-[0_0_18px_rgba(139,92,246,.6)] shrink-0" />
          <div className="min-w-0">
            <b className="text-[13px] block">AI 正在持续学习你的工作节奏，让日报更懂你。</b>
            <span className="text-[11.5px] text-faint">基于你的项目数据与行为习惯，提供更精准的总结与建议。</span>
          </div>
          <div className="ml-auto flex gap-2.5 shrink-0">
            <button onClick={regenerate} className="px-4 py-2 rounded-lg border border-line2 text-[12.5px] hover:bg-[rgba(255,255,255,.04)]">↻ 重新生成</button>
            <button onClick={confirm} disabled={r.status === 'confirmed'}
              className="px-4 py-2 rounded-lg bg-purple2 text-white text-[12.5px] font-medium disabled:opacity-50">✓ 确认归档</button>
          </div>
        </div>
      </div>
    </div>
  )
}
