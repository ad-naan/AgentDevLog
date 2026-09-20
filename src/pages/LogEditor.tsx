import { useMemo, useState } from 'react'
import { useStore, setState, scopedActivities, today } from '../store'
import { IconBulb, IconSpark, IconMoodBad, IconMood, IconMoodHappy, IconCheck } from '../icons'

export default function LogEditor() {
  const s = useStore()
  const log = useMemo(
    () => s.logs.find((l) => l.date === today && l.scope === s.scope) || s.logs.find((l) => l.scope === s.scope),
    [s.logs, s.scope],
  )
  const [draft, setDraft] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const acts = scopedActivities(s).filter((a) => a.type !== 'log').slice(0, 6)
  const linked = log?.linked || []
  const content = draft ?? log?.content ?? ''
  const lines = content.split('\n')
  const savedAt = log ? new Date(log.updatedAt).toTimeString().slice(0, 5) : ''

  const save = (v: string) => {
    setDraft(v)
    setState((d) => {
      let l = d.logs.find((x) => x.date === today && x.scope === d.scope)
      if (!l) {
        l = { id: `l${Date.now()}`, date: today, scope: d.scope, title: d.scope === 'work' ? '今日工作日志' : '生活记录', content: '', tags: [], mood: 3, linked: [], updatedAt: Date.now() }
        d.logs.unshift(l)
      }
      l.content = v
      l.updatedAt = Date.now()
    })
  }
  const toggleLink = (id: string) => setState((d) => {
    const l = d.logs.find((x) => x.date === today && x.scope === d.scope) ||
      (d.logs.unshift({ id: `l${Date.now()}`, date: today, scope: d.scope, title: '今日日志', content: '', tags: [], mood: 3, linked: [], updatedAt: Date.now() }), d.logs[0])
    l.linked = l.linked.includes(id) ? l.linked.filter((x) => x !== id) : [...l.linked, id]
    l.updatedAt = Date.now()
  })
  const addTag = () => {
    const t = newTag.trim()
    if (!t || !log) return
    setState((d) => { const l = d.logs.find((x) => x.id === log.id); if (l && !l.tags.includes(t)) l.tags.push(t) })
    setNewTag('')
  }
  const setMood = (m: 1 | 2 | 3) => log && setState((d) => { const l = d.logs.find((x) => x.id === log.id); if (l) l.mood = m })

  const suggestions = s.scope === 'work' ? [
    '建议在明天优先处理 token 过期问题，可能涉及到后端时间同步配置。',
    `今天共 ${acts.filter((a) => a.type === 'commit').length} 次 commit，可以考虑为改动补充对应的单元测试。`,
    '继续保持良好的提交频率，当前代码质量和工作节奏都很稳定。',
  ] : [
    `今天记录了 ${s.logs.filter((l) => l.scope === 'life').length} 条生活记录，坚持记录真好。`,
    '别忘了给待办里的生活事项留出时间。',
    '试着在睡前写下一条明日计划吧。',
  ]
  const adopt = () => save(content + `\n\n## AI 建议（采纳）\n${suggestions.map((x, i) => `${i + 1}. ${x}`).join('\n')}`)

  if (!log) return <p className="text-faint text-[13px] py-10 text-center">当前分区还没有日志。</p>

  return (
    <div className="grid grid-cols-[1fr_330px] gap-4 h-full min-h-0">
      {/* 编辑器 */}
      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line text-[11.5px] text-faint">
          <span className="font-mono">markdown</span>
          <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-accent" />自动保存</span>
          <span className="ml-auto inline-flex items-center gap-1"><IconCheck className="w-3 h-3 text-accent" />已保存 {savedAt}</span>
          <span className="text-faint">⋮</span>
        </div>
        <div className="flex-1 min-h-0 flex overflow-y-auto">
          <div aria-hidden className="select-none text-right px-3 py-4 font-mono text-[12.5px] leading-[1.75] text-[#3d4757] shrink-0 border-r border-line">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea value={content} onChange={(e) => save(e.target.value)} spellCheck={false}
            className="flex-1 min-h-0 bg-transparent px-4 py-4 font-mono text-[12.5px] leading-[1.75] text-[#c9d4e3] outline-none resize-none"
            style={{ minHeight: `${lines.length * 22 + 32}px` }} />
        </div>
        <div className="border-t border-line px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1">
            {([['B', 'font-bold'], ['I', 'italic'], ['<>', 'font-mono']] as const).map(([t, c]) => (
              <button key={t} onClick={() => save(content + (t === 'B' ? '**加粗**' : t === 'I' ? '*斜体*' : '\n```\n代码块\n```\n'))}
                className={`w-7 h-7 rounded-md border border-line text-[11px] ${c} text-dim hover:text-txt hover:border-line2`}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            {log.tags.map((t) => (
              <span key={t} className="text-[11px] font-mono text-blue bg-[rgba(88,166,255,.1)] border border-[rgba(88,166,255,.25)] px-2 py-px rounded-full flex items-center gap-1">
                {t}
                <button onClick={() => setState((d) => { const l = d.logs.find((x) => x.id === log.id); if (l) l.tags = l.tags.filter((x) => x !== t) })}
                  className="hover:text-red">✕</button>
              </span>
            ))}
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="+ 标签" className="bg-transparent border border-dashed border-line2 rounded-full px-2 py-px text-[11px] w-16 outline-none text-blue placeholder:text-faint" />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-faint">心情：</span>
            {([[IconMoodBad, 1], [IconMood, 2], [IconMoodHappy, 3]] as [typeof IconMood, 1 | 2 | 3][]).map(([E, m]) => (
              <button key={m} onClick={() => setMood(m)}
                className={`w-7 h-7 rounded-md border inline-flex items-center justify-center ${log.mood === m ? 'border-accent text-accent' : 'border-line text-faint'}`}><E className="w-4 h-4" /></button>
            ))}
          </div>
        </div>
      </div>

      {/* 右栏 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="bg-card border border-line rounded-2xl flex flex-col">
          <div className="flex items-center px-4 py-3 border-b border-line">
            <b className="text-[13px] flex items-center gap-2"><span className="text-faint">⑂</span>关联 GitHub 活动</b>
            <span className="ml-auto text-[11.5px] text-dim">查看全部 →</span>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {acts.map((a) => {
              const on = linked.includes(a.id)
              return (
                <label key={a.id} className="flex gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-[rgba(255,255,255,.02)]">
                  <input type="checkbox" checked={on} onChange={() => toggleLink(a.id)} className="mt-1 accent-[#3ddc97]" />
                  <div className="min-w-0">
                    <b className={`block text-[12px] truncate ${a.type === 'pr' ? 'text-blue' : ''}`}>{a.title}</b>
                    <span className="block text-[10.5px] text-faint font-mono truncate">{a.repo} / main</span>
                    <span className="block text-[10.5px] text-faint font-mono">{a.meta || a.time} · <span className="text-accent">+48</span> <span className="text-red">−12</span></span>
                  </div>
                </label>
              )
            })}
            {acts.length === 0 && <p className="text-[12px] text-faint p-4">暂无可关联的活动，先到设置页添加并同步仓库。</p>}
          </div>
        </div>

        <div className="ai-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-purple">✦</span>
            <b className="text-[13px]">AI 建议</b>
            <span className="ml-auto text-[10px] text-purple bg-[rgba(139,92,246,.15)] px-2 py-px rounded-full">基于今日工作内容</span>
          </div>
          <p className="text-[12px] text-[#c9c2e8] leading-relaxed flex gap-1.5 items-start">
            <IconBulb className="w-3.5 h-3.5 shrink-0 mt-px" />你今天的状态不错！基于你的提交和日志，AI 为你提供以下建议：
          </p>
          <ol className="flex flex-col gap-2">
            {suggestions.map((x, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-dim leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-[rgba(139,92,246,.25)] text-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {x}
              </li>
            ))}
          </ol>
          <button onClick={adopt}
            className="mt-1 w-full py-2.5 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0]">
            <IconSpark className="w-3.5 h-3.5" /> 采纳建议
          </button>
        </div>
      </div>
    </div>
  )
}
