import { useMemo, useState } from 'react'
import { useStore, setState, todoSuggestions, type Todo, type Priority } from '../store'
import { IconCalendar, IconLink, IconFlame, IconSpark } from '../icons'

const P_CLS: Record<Priority, string> = {
  P0: 'bg-[rgba(218,54,51,.15)] text-red',
  P1: 'bg-[rgba(240,136,62,.15)] text-orange',
  P2: 'bg-[rgba(88,166,255,.15)] text-blue',
}
const SRC_CLS: Record<string, string> = {
  GitHub: 'text-dim', Linear: 'text-purple', 产品: 'text-purple', 文档: 'text-blue', 手动: 'text-faint',
}
const TAG_DOT: Record<string, string> = {
  前端: 'bg-blue', 后端: 'bg-accent', 产品: 'bg-purple', 设计: 'bg-orange', 运维: 'bg-[#5a9ec9]', 文档: 'bg-[#d6c98a]', 生活: 'bg-orange',
}

function TaskCard({ t }: { t: Todo }) {
  const toggle = () => setState((s) => {
    const x = s.todos.find((i) => i.id === t.id)
    if (x) { x.done = !x.done; x.updatedAt = Date.now() }
  })
  const remove = () => setState((s) => { s.todos = s.todos.filter((i) => i.id !== t.id) })
  return (
    <div className={`group bg-card border border-line rounded-[10px] px-3.5 py-3 flex gap-3 items-start hover:border-line2 transition-colors ${t.done ? 'opacity-50' : ''}`}>
      <button onClick={toggle} aria-label={t.done ? '标记未完成' : '标记完成'}
        className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0
          ${t.done ? 'bg-accent border-accent text-[#04110b]' : 'border-line2 hover:border-accent'}`}>
        {t.done && <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-6" /></svg>}
      </button>
      <div className="min-w-0 flex-1">
        <b className={`block text-[13.5px] font-medium ${t.done ? 'line-through' : ''}`}>{t.title}</b>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10.5px] font-mono px-1.5 py-px rounded ${P_CLS[t.priority]}`}>{t.priority}</span>
          <span className="text-[11px] text-faint inline-flex items-center gap-1"><IconCalendar className="w-3 h-3" />{t.due}</span>
          {t.ref && <span className="text-[11px] text-faint font-mono inline-flex items-center gap-1"><IconLink className="w-3 h-3" />{t.ref}</span>}
          <span className={`text-[11px] flex items-center gap-1 ${SRC_CLS[t.source]}`}><i className={`w-1.5 h-1.5 rounded-full ${TAG_DOT[t.tag] || 'bg-dim'}`} />{t.source} · {t.tag}</span>
          <span className={`text-[11px] px-1.5 py-px rounded-full ${t.scope === 'work' ? 'bg-[rgba(61,220,151,.1)] text-accent' : 'bg-[rgba(240,136,62,.12)] text-orange'}`}>{t.scope === 'work' ? '工作' : '生活'}</span>
        </div>
      </div>
      <button onClick={remove} aria-label="删除任务"
        className="opacity-0 group-hover:opacity-100 text-faint hover:text-red text-[13px] px-1">✕</button>
    </div>
  )
}

function Group({ title, count, open, onToggle, children }: {
  title: React.ReactNode; count: number; open: boolean; onToggle?: () => void; children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        {title}
        <span className="text-[11px] text-faint bg-[#0d131b] border border-line px-1.5 py-px rounded-full font-mono">{count}</span>
        {onToggle && (
          <button onClick={onToggle} className="ml-auto text-faint hover:text-dim text-[12px]">{open ? '⌃' : '⌄'}</button>
        )}
      </div>
      {open && children}
    </section>
  )
}

export default function TodoList() {
  const s = useStore()
  const todos = useMemo(() => s.todos.filter((t) => t.scope === s.scope), [s.todos, s.scope])
  const [openDone, setOpenDone] = useState(true)
  const [openWeek, setOpenWeek] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', priority: 'P1' as Priority, due: '今天', tag: s.scope === 'work' ? '产品' : '生活', source: '手动' as Todo['source'] })

  const isToday = (t: Todo) => t.due.startsWith('今天')
  const isWeek = (t: Todo) => !isToday(t) && !t.done
  const today = todos.filter((t) => !t.done && isToday(t))
  const week = todos.filter(isWeek)
  const done = todos.filter((t) => t.done)
  const sugg = todoSuggestions(s)

  const create = () => {
    if (!draft.title.trim()) return
    setState((d) => { d.todos.unshift({
      id: `t${Date.now()}`, title: draft.title.trim(), done: false,
      priority: draft.priority, due: draft.due, scope: s.scope,
      source: draft.source, tag: draft.tag, createdAt: Date.now(), updatedAt: Date.now(),
    }) })
    setDraft({ ...draft, title: '' })
    setCreating(false)
  }
  const act = (kind: string) => {
    if (kind === 'pin') setState((d) => {
      const stale = d.todos.filter((t) => !t.done && ['t5', 't7'].includes(t.id))
      const pinned = [...stale, ...d.todos.filter((t) => !stale.includes(t))]
      d.todos = pinned
    })
    if (kind === 'merge') setState((d) => {
      const ids = ['t1', 't3', 't4']
      const ms = d.todos.filter((t) => ids.includes(t.id))
      if (ms.length < 2) return
      d.todos = [
        { id: `t${Date.now()}`, title: `[合并] ${ms[0].title} 等稳定性优化`, done: false, priority: 'P0', due: ms[0].due, scope: d.scope, source: '手动', tag: '后端', createdAt: Date.now(), updatedAt: Date.now() },
        ...d.todos.filter((t) => !ids.includes(t.id)),
      ]
    })
    if (kind === 'adopt') setState((d) => {
      for (const t of d.todos) if (!t.done && (t.source === 'GitHub' || t.source === '产品')) t.updatedAt = Date.now()
    })
  }

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 h-full min-h-0">
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start">
          <div>
            <h1 className="text-[22px] font-bold">TodoList</h1>
            <p className="text-[12.5px] text-dim mt-0.5">专注于重要的事，让{s.scope === 'work' ? '工作' : '生活'}更有条理。</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="ml-auto px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold">＋ 新建任务</button>
        </div>

        {creating && (
          <div className="bg-card border border-line2 rounded-xl p-4 flex flex-col gap-3">
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="任务标题，Enter 保存 / Esc 取消"
              className="w-full bg-[#0d131b] border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-line2" />
            <div className="flex gap-2 items-center flex-wrap">
              {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                <button key={p} onClick={() => setDraft({ ...draft, priority: p })}
                  className={`text-[11px] font-mono px-2 py-1 rounded border ${draft.priority === p ? P_CLS[p] + ' border-transparent' : 'border-line text-faint'}`}>{p}</button>
              ))}
              <input value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                className="bg-[#0d131b] border border-line rounded-lg px-2 py-1 text-[11px] w-28 outline-none" placeholder="截止时间" />
              <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as Todo['source'] })}
                className="bg-[#0d131b] border border-line rounded-lg px-2 py-1 text-[11px] outline-none">
                {['手动', 'GitHub', 'Linear', '产品', '文档'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button onClick={create} className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-[#04110b] text-[12px] font-semibold">保存</button>
            </div>
          </div>
        )}

        <Group title={<b className="text-[13.5px] inline-flex items-center gap-1.5"><IconFlame className="w-4 h-4 text-orange" />{s.scope === 'work' ? '今天 · 高优先' : '今天'}</b>} count={today.length} open onToggle={() => {}}>
          {today.map((t) => <TaskCard key={t.id} t={t} />)}
          {today.length === 0 && <p className="text-[12px] text-faint px-1 py-2">今天没有待办，休息一下</p>}
        </Group>

        <Group title={<b className="text-[13.5px] inline-flex items-center gap-1.5"><IconCalendar className="w-4 h-4 text-blue" />本周</b>} count={week.length} open={openWeek} onToggle={() => setOpenWeek(!openWeek)}>
          {week.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>

        <Group title={<b className="text-[13.5px]">✓ 已完成</b>} count={done.length} open={openDone} onToggle={() => setOpenDone(!openDone)}>
          {done.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>
      </div>

      {/* AI 建议面板 */}
      <div className="ai-panel border border-line rounded-2xl flex flex-col min-h-0 overflow-y-auto">
        <div className="p-4 border-b border-[rgba(167,139,250,.15)]">
          <b className="text-[14px] inline-flex items-center gap-2 text-purple"><IconSpark className="w-4 h-4" />AI 建议</b>
          <p className="text-[11px] text-faint mt-1">基于你的任务、项目动态和历史行为</p>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {sugg.map((g) => (
            <div key={g.title} className="bg-[rgba(139,92,246,.08)] border border-[rgba(139,92,246,.2)] rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <b className="text-[13px] text-purple">{g.title}</b>
                <span className="ml-auto text-[10.5px] text-purple bg-[rgba(139,92,246,.18)] px-2 py-px rounded-full">{g.n} 个</span>
              </div>
              <p className="text-[11.5px] text-dim mt-2 leading-relaxed">{g.desc}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {g.items.map((i) => (
                  <li key={i} className="text-[11.5px] text-[#c9c2e8] flex gap-1.5"><span className="text-purple">•</span>{i}</li>
                ))}
              </ul>
              <button onClick={() => act(g.icon)} className="mt-2.5 text-[12px] text-accent hover:underline">→ {g.action}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
