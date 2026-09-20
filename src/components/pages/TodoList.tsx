'use client'

import { useMemo, useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast } from '../Toast'
import type { TodoDTO, Priority } from '@/lib/types'
import { IconCalendar, IconLink, IconFlame, IconSpark, IconClock, IconCheck, IconClose, IconPlus, IconArrow, IconAlert } from '../icons'

const P_CLS: Record<Priority, string> = {
  P0: 'bg-[rgba(218,54,51,.15)] text-red',
  P1: 'bg-[rgba(240,136,62,.15)] text-orange',
  P2: 'bg-[rgba(88,166,255,.15)] text-blue',
}
const SRC_CLS: Record<string, string> = {
  GitHub: 'text-dim', Linear: 'text-purple', 产品: 'text-purple', 文档: 'text-blue', 手动: 'text-faint', 'AI 拆解': 'text-purple',
}
const TAG_DOT: Record<string, string> = {
  前端: 'bg-blue', 后端: 'bg-accent', 产品: 'bg-purple', 设计: 'bg-orange', 运维: 'bg-[#5a9ec9]', 文档: 'bg-[#d6c98a]', 生活: 'bg-orange',
}

type Filter = 'all' | 'today' | 'week' | 'high'
const FILTER_LABEL: Record<Filter, string> = { all: '全部', today: '今天', week: '本周', high: '高优先级' }

function TaskCard({ t }: { t: TodoDTO }) {
  const { api } = useStore()
  const toast = useToast()
  const patch = (body: Record<string, unknown>) =>
    api(`/api/todos/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const toggle = () => {
    patch({ done: !t.done })
    if (!t.done) toast(`已完成「${t.title.slice(0, 18)}」`, 'success')
  }
  const remove = () => {
    api(`/api/todos/${t.id}`, { method: 'DELETE' })
    toast('任务已删除')
  }
  const cyclePriority = () => {
    const order: Priority[] = ['P0', 'P1', 'P2']
    patch({ priority: order[(order.indexOf(t.priority) + 1) % order.length] })
  }
  return (
    <div className={`group bg-card border border-line rounded-[10px] px-3.5 py-3 flex gap-3 items-start hover:border-line2 hover:shadow-[0_4px_16px_rgba(0,0,0,.25)] transition-all duration-200 ${t.done ? 'opacity-45' : ''}`}>
      <button onClick={toggle} aria-label={t.done ? '标记未完成' : '标记完成'}
        className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-all duration-200 btn-press
          ${t.done ? 'bg-accent border-accent text-[#04110b] shadow-[0_0_10px_rgba(61,220,151,.5)]' : 'border-line2 hover:border-accent hover:shadow-[0_0_8px_rgba(61,220,151,.35)]'}`}>
        {t.done && <IconCheck className="w-2.5 h-2.5" strokeWidth={2.6} />}
      </button>
      <div className="min-w-0 flex-1">
        <b className={`block text-[13.5px] font-medium transition-all duration-300 ${t.done ? 'line-through text-faint' : ''}`}>{t.title}</b>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <button onClick={cyclePriority} title="点击切换优先级"
            className={`text-[10.5px] font-mono px-1.5 py-px rounded cursor-pointer transition-transform hover:scale-105 ${P_CLS[t.priority]}`}>{t.priority}</button>
          <span className="text-[11px] text-faint inline-flex items-center gap-1"><IconCalendar className="w-3 h-3" />{t.due}</span>
          {t.ref && <span className="text-[11px] text-faint font-mono inline-flex items-center gap-1"><IconLink className="w-3 h-3" />{t.ref}</span>}
          <span className={`text-[11px] flex items-center gap-1 ${SRC_CLS[t.source] || 'text-faint'}`}><i className={`w-1.5 h-1.5 rounded-full ${TAG_DOT[t.tag] || 'bg-dim'}`} />{t.source} · {t.tag}</span>
          <span className={`text-[11px] px-1.5 py-px rounded-full ${t.scope === 'work' ? 'bg-[rgba(61,220,151,.1)] text-accent' : 'bg-[rgba(240,136,62,.12)] text-orange'}`}>{t.scope === 'work' ? '工作' : '生活'}</span>
        </div>
      </div>
      <button onClick={remove} aria-label="删除任务"
        className="opacity-0 group-hover:opacity-100 text-faint hover:text-red transition-all"><IconClose className="w-3 h-3" /></button>
    </div>
  )
}

function Group({ title, icon, count, open, onToggle, children }: {
  title: string; icon?: React.ReactNode; count: number; open: boolean; onToggle?: () => void; children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <button onClick={onToggle} disabled={!onToggle}
        className="flex items-center gap-2 px-1 text-left group w-fit">
        {icon}
        <b className="text-[13.5px] group-hover:text-txt transition-colors">{title}</b>
        <span className="text-[11px] text-faint bg-inset border border-line px-1.5 py-px rounded-full font-mono">{count}</span>
        {onToggle && <span className={`text-faint text-[10px] transition-transform duration-300 ${open ? '' : '-rotate-90'}`}>⌄</span>}
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden flex flex-col gap-2">{children}</div>
      </div>
    </section>
  )
}

export default function TodoList() {
  const { s, scope, api } = useStore()
  const [openDone, setOpenDone] = useState(true)
  const [openWeek, setOpenWeek] = useState(true)
  const [openToday, setOpenToday] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [draft, setDraft] = useState({ title: '', priority: 'P1' as Priority, due: '今天', tag: scope === 'work' ? '产品' : '生活', source: '手动' })

  const todos = useMemo(() => (s ? s.todos.filter((t) => t.scope === scope) : []), [s, scope])
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = (t: TodoDTO) => t.due.startsWith('今天') || t.due.startsWith(todayStr)
  const isHigh = (t: TodoDTO) => !t.done && (t.priority === 'P0' || t.priority === 'P1')
  const applyFilter = (list: TodoDTO[]) =>
    filter === 'all' ? list
      : filter === 'today' ? list.filter((t) => !t.done && isToday(t))
      : filter === 'week' ? list.filter((t) => !t.done && !isToday(t))
      : list.filter(isHigh)
  const today = applyFilter(todos).filter((t) => !t.done && isToday(t))
  const week = applyFilter(todos).filter((t) => !t.done && !isToday(t))
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

  // 今日聚焦：基于截止时间与优先级的本地规则（非 AI），点击卡片直接切换筛选
  const sugg = (() => {
    const open = todos.filter((t) => !t.done)
    const high = open.filter(isHigh)
    const todayAll = open.filter(isToday)
    const weekOpen = open.filter((t) => !isToday(t))
    const cards: { key: Filter | 'stale'; title: string; n: number; desc: string; items: string[]; action: string; f: Filter }[] = []
    if (high.length) cards.push({ key: 'high', title: '高优先级待办', n: high.length, desc: `有 ${high.length} 个 P0/P1 任务待完成：`, items: high.slice(0, 3).map((t) => t.title), action: '尽快处理', f: 'high' })
    if (todayAll.length) cards.push({ key: 'today', title: '今天到期', n: todayAll.length, desc: `有 ${todayAll.length} 个任务今天到期：`, items: todayAll.slice(0, 3).map((t) => t.title), action: '优先完成', f: 'today' })
    if (weekOpen.length) cards.push({ key: 'week', title: '本周安排', n: weekOpen.length, desc: `有 ${weekOpen.length} 个任务安排在本周：`, items: weekOpen.slice(0, 3).map((t) => t.title), action: '安排时间', f: 'week' })
    return cards
  })()

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4 h-full min-h-0">
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start">
          <div>
            <h1 className="text-[22px] font-bold">TodoList</h1>
            <p className="text-[12.5px] text-dim mt-0.5">专注于重要的事，让{scope === 'work' ? '工作' : '生活'}更有条理。</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="btn-press ml-auto px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:shadow-[0_0_16px_rgba(61,220,151,.4)] transition-shadow">
            <IconPlus className="w-3.5 h-3.5" />新建任务
          </button>
        </div>

        {creating && (
          <div className="bg-card border border-line2 rounded-xl p-4 flex flex-col gap-3 fade-up">
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="任务标题，Enter 保存 / Esc 取消"
              className="w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-line2 focus:shadow-[0_0_10px_rgba(61,220,151,.15)]" />
            <div className="flex gap-2 items-center flex-wrap">
              {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                <button key={p} onClick={() => setDraft({ ...draft, priority: p })}
                  className={`btn-press text-[11px] font-mono px-2 py-1 rounded border transition-colors ${draft.priority === p ? P_CLS[p] + ' border-transparent' : 'border-line text-faint hover:text-dim'}`}>{p}</button>
              ))}
              <input value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2 py-1 text-[11px] w-28 outline-none focus:border-line2" placeholder="截止时间" />
              <select value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2 py-1 text-[11px] outline-none">
                {['产品', '前端', '后端', '设计', '运维', '文档', '生活'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2 py-1 text-[11px] outline-none">
                {['手动', 'GitHub', 'Linear', '产品', '文档'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button onClick={create} className="btn-press ml-auto px-3 py-1.5 rounded-lg bg-accent text-[#04110b] text-[12px] font-semibold">保存</button>
            </div>
          </div>
        )}

        <div className="flex gap-1.5 items-center flex-wrap">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn-press text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200 ${filter === f
                ? 'bg-accent text-[#04110b] border-transparent font-semibold shadow-[0_0_10px_rgba(61,220,151,.35)]'
                : 'border-line text-faint hover:text-dim hover:border-line2'}`}>{FILTER_LABEL[f]}</button>
          ))}
        </div>

        <Group title={scope === 'work' ? '今天 · 高优先' : '今天'} count={today.length} open={openToday} onToggle={() => setOpenToday(!openToday)}
          icon={<IconFlame className="w-4 h-4 text-orange" />}>
          {today.map((t) => <TaskCard key={t.id} t={t} />)}
          {today.length === 0 && <p className="text-[12px] text-faint px-1 py-3">今天没有待办，休息一下。</p>}
        </Group>

        <Group title="本周及以后" count={week.length} open={openWeek} onToggle={() => setOpenWeek(!openWeek)}
          icon={<IconClock className="w-4 h-4 text-blue" />}>
          {week.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>

        <Group title="已完成" count={done.length} open={openDone} onToggle={() => setOpenDone(!openDone)}
          icon={<IconCheck className="w-4 h-4 text-accent" />}>
          {done.map((t) => <TaskCard key={t.id} t={t} />)}
        </Group>
      </div>

      {/* 今日聚焦：本地规则驱动的实时面板，点击卡片即筛选 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="ai-panel border border-line rounded-2xl p-4 flex flex-col gap-1">
          <b className="text-[14px] inline-flex items-center gap-2 text-purple"><IconSpark className="w-4 h-4" />今日聚焦</b>
          <p className="text-[11px] text-faint mt-1">基于截止时间与优先级的本地规则 · 实时更新</p>
        </div>
        <div className="p-1 flex flex-col gap-3">
          {sugg.length === 0 && (
            <div className="border border-dashed border-line rounded-xl p-4 text-center">
              <IconCheck className="w-5 h-5 text-accent mx-auto" />
              <p className="text-[12px] text-faint mt-2">暂无可聚焦的待办，一切尽在掌握</p>
            </div>
          )}
          {sugg.map((g) => (
            <button key={g.key} onClick={() => setFilter(g.f)} title="点击筛选对应任务"
              className="text-left bg-[rgba(139,92,246,.08)] border border-[rgba(139,92,246,.2)] rounded-xl p-3.5 hover:border-[rgba(139,92,246,.45)] hover:bg-[rgba(139,92,246,.13)] transition-all duration-200 group">
              <div className="flex items-center gap-2">
                <b className="text-[13px] text-purple">{g.title}</b>
                <span className="ml-auto text-[10.5px] text-purple bg-[rgba(139,92,246,.18)] px-2 py-px rounded-full font-mono">{g.n} 个</span>
              </div>
              <p className="text-[11.5px] text-dim mt-2 leading-relaxed">{g.desc}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {g.items.map((i) => (
                  <li key={i} className="text-[11.5px] text-[#c9c2e8] flex gap-1.5"><span className="text-purple">•</span>{i}</li>
                ))}
              </ul>
              <span className="mt-2.5 text-[12px] text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">→ {g.action}（筛选）</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
