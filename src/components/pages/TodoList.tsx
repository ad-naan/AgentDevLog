'use client'

import { useMemo, useState } from 'react'
import { useStore } from '../StoreProvider'
import type { TodoDTO, Priority } from '@/lib/types'
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

function TaskCard({ t }: { t: TodoDTO }) {
  const { api } = useStore()
  const toggle = () => api(`/api/todos/${t.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: !t.done }),
  })
  const remove = () => api(`/api/todos/${t.id}`, { method: 'DELETE' })
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
          <span className={`text-[11px] flex items-center gap-1 ${SRC_CLS[t.source] || 'text-faint'}`}><i className={`w-1.5 h-1.5 rounded-full ${TAG_DOT[t.tag] || 'bg-dim'}`} />{t.source} · {t.tag}</span>
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
        <span className="text-[11px] text-faint bg-inset border border-line px-1.5 py-px rounded-full font-mono">{count}</span>
        {onToggle && <button onClick={onToggle} className="ml-auto text-faint hover:text-dim text-[12px]">{open ? '⌃' : '⌄'}</button>}
      </div>
      {open && children}
    </section>
  )
}

export default function TodoList() {
  const { s, scope, api } = useStore()
  const [openDone, setOpenDone] = useState(true)
  const [openWeek, setOpenWeek] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', priority: 'P1' as Priority, due: '今天', tag: scope === 'work' ? '产品' : '生活', source: '手动' })

  const todos = useMemo(() => (s ? s.todos.filter((t) => t.scope === scope) : []), [s, scope])
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = (t: TodoDTO) => t.due.startsWith('今天') || t.due.startsWith(todayStr)
  const today = todos.filter((t) => !t.done && isToday(t))
  const week = todos.filter((t) => !isToday(t) && !t.done)
  const done = todos.filter((t) => t.done)

  const create = async () => {
    if (!draft.title.trim()) return
    await api('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, title: draft.title.trim(), scope }),
    })
    setDraft({ ...draft, title: '' })
    setCreating(false)
  }

  const sugg = scope === 'life'
    ? [{ icon: 'clock', title: '本周生活安排', n: todos.filter((t) => !t.done).length, desc: '合理安排工作之外的时间：', items: todos.filter((t) => !t.done).slice(0, 3).map((t) => t.title), action: '查看工作台' }]
    : [
      { icon: 'clock', title: '滞留提醒', n: todos.filter((t) => !t.done && Date.now() - t.updatedAt > 3 * 864e5).length, desc: '有任务已超过 3 天未更新：', items: todos.filter((t) => !t.done && Date.now() - t.updatedAt > 3 * 864e5).slice(0, 3).map((t) => t.title), action: '尽快处理' },
      { icon: 'flame', title: '高优先级', n: todos.filter((t) => !t.done && t.priority === 'P0').length, desc: '以下 P0 任务需要优先推进：', items: todos.filter((t) => !t.done && t.priority === 'P0').slice(0, 3).map((t) => t.title), action: '优先完成' },
      { icon: 'spark', title: '今日新增', n: todos.filter((t) => new Date(t.createdAt).toISOString().slice(0, 10) === todayStr).length, desc: '今天创建的任务：', items: todos.filter((t) => new Date(t.createdAt).toISOString().slice(0, 10) === todayStr).slice(0, 3).map((t) => t.title), action: '安排时间' },
    ]

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 h-full min-h-0">
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start">
          <div>
            <h1 className="text-[22px] font-bold">TodoList</h1>
            <p className="text-[12.5px] text-dim mt-0.5">专注于重要的事，让{scope === 'work' ? '工作' : '生活'}更有条理。</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="ml-auto px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold">＋ 新建任务</button>
        </div>

        {creating && (
          <div className="bg-card border border-line2 rounded-xl p-4 flex flex-col gap-3">
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="任务标题，Enter 保存 / Esc 取消"
              className="w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-line2" />
            <div className="flex gap-2 items-center flex-wrap">
              {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                <button key={p} onClick={() => setDraft({ ...draft, priority: p })}
                  className={`text-[11px] font-mono px-2 py-1 rounded border ${draft.priority === p ? P_CLS[p] + ' border-transparent' : 'border-line text-faint'}`}>{p}</button>
              ))}
              <input value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2 py-1 text-[11px] w-28 outline-none" placeholder="截止时间" />
              <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2 py-1 text-[11px] outline-none">
                {['手动', 'GitHub', 'Linear', '产品', '文档'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button onClick={create} className="ml-auto px-3 py-1.5 rounded-lg bg-accent text-[#04110b] text-[12px] font-semibold">保存</button>
            </div>
          </div>
        )}

        <Group title={<><IconFlame className="w-4 h-4 text-orange inline mr-1" /><b className="text-[13.5px]">今天</b></>} count={today.length} open onToggle={undefined}>
          {today.map((t) => <TaskCard key={t.id} t={t} />)}
          {today.length === 0 && <p className="text-[12px] text-faint px-1 py-3">今天没有待办，新建一个吧。</p>}
        </Group>

        <Group title={<b className="text-[13.5px]">本周及以后</b>} count={week.length} open={openWeek} onToggle={() => setOpenWeek(!openWeek)}>
          {week.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>

        <Group title={<b className="text-[13.5px] text-dim">已完成</b>} count={done.length} open={openDone} onToggle={() => setOpenDone(!openDone)}>
          {done.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>
      </div>

      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="ai-panel border border-line rounded-2xl p-4 flex flex-col gap-1">
          <b className="text-[14px] inline-flex items-center gap-2 text-purple"><IconSpark className="w-4 h-4" />AI 建议</b>
          <p className="text-[11px] text-faint mt-1">基于你的任务与更新时间生成</p>
        </div>
        <div className="p-1 flex flex-col gap-3">
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
              <span className="mt-2.5 text-[12px] text-accent">{g.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
