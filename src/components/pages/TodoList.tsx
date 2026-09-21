'use client'

import { useMemo, useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast } from '../Toast'
import type { TodoDTO, Priority } from '@/lib/types'
import {
  IconCalendar, IconLink, IconFlame, IconSpark,
  IconClock, IconCheck, IconClose, IconPlus, IconMore,
} from '../icons'

const P_CLS: Record<Priority, { badge: string; text: string }> = {
  P0: { badge: 'bg-[rgba(248,81,73,.15)] border-[rgba(248,81,73,.3)] text-red', text: 'P0 紧急' },
  P1: { badge: 'bg-[rgba(240,136,62,.15)] border-[rgba(240,136,62,.3)] text-orange', text: 'P1 高' },
  P2: { badge: 'bg-[rgba(88,166,255,.15)] border-[rgba(88,166,255,.3)] text-blue', text: 'P2 中' },
}

const SRC_CLS: Record<string, string> = {
  GitHub: 'text-dim',
  Linear: 'text-purple',
  产品: 'text-purple',
  文档: 'text-blue',
  手动: 'text-faint',
  'AI 拆解': 'text-purple',
}

const TAG_DOT: Record<string, string> = {
  前端: 'bg-blue',
  后端: 'bg-accent',
  产品: 'bg-purple',
  设计: 'bg-orange',
  运维: 'bg-[#5a9ec9]',
  文档: 'bg-[#d6c98a]',
  生活: 'bg-orange',
}

type Filter = 'all' | 'today' | 'week' | 'high'
const FILTER_LABEL: Record<Filter, string> = { all: '全部', today: '今天', week: '本周', high: '高优先级' }

function TaskCard({ t }: { t: TodoDTO }) {
  const { api } = useStore()
  const toast = useToast()
  const [showMenu, setShowMenu] = useState(false)

  const patch = (body: Record<string, unknown>) =>
    api(`/api/todos/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

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
    <div
      className={`group bg-card border border-line rounded-xl px-4 py-3 flex gap-3.5 items-start hover:border-line2 hover:shadow-[0_4px_20px_rgba(0,0,0,.25)] transition-all duration-200 ${
        t.done ? 'opacity-40 bg-card/60' : ''
      }`}>
      {/* 自定义复选框 */}
      <button
        onClick={toggle}
        aria-label={t.done ? '标记未完成' : '标记完成'}
        className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-all duration-200 btn-press ${
          t.done
            ? 'bg-accent border-accent text-[#04110b] shadow-[0_0_10px_rgba(61,220,151,.6)]'
            : 'border-line2 hover:border-accent hover:shadow-[0_0_8px_rgba(61,220,151,.3)]'
        }`}>
        {t.done && <IconCheck className="w-3 h-3" strokeWidth={2.8} />}
      </button>

      {/* 任务内容 */}
      <div className="min-w-0 flex-1">
        <span
          className={`block text-[13.5px] font-medium leading-snug transition-all duration-200 ${
            t.done ? 'line-through text-faint' : 'text-txt'
          }`}>
          {t.title}
        </span>

        <div className="flex items-center gap-2.5 mt-2 flex-wrap text-[11.5px]">
          {/* 优先级徽章 */}
          <button
            onClick={cyclePriority}
            title="点击循环切换优先级 (P0/P1/P2)"
            className={`font-mono text-[10.5px] font-bold px-2 py-0.5 rounded border transition-transform hover:scale-105 cursor-pointer ${
              P_CLS[t.priority]?.badge || P_CLS.P1.badge
            }`}>
            {t.priority}
          </button>

          {/* 截止时间 */}
          <span className="text-faint inline-flex items-center gap-1">
            <IconCalendar className="w-3 h-3 text-faint" />
            {t.due || '无截止'}
          </span>

          {/* 关联 ID/链接 */}
          {t.ref && (
            <span className="text-faint font-mono inline-flex items-center gap-1 bg-inset px-1.5 py-0.5 rounded border border-line">
              <IconLink className="w-3 h-3 text-blue" />
              {t.ref}
            </span>
          )}

          {/* 来源与类别 */}
          <span className={`inline-flex items-center gap-1.5 ${SRC_CLS[t.source] || 'text-faint'}`}>
            <i className={`w-1.5 h-1.5 rounded-full ${TAG_DOT[t.tag] || 'bg-dim'}`} />
            {t.source} · {t.tag}
          </span>

          {/* 工作/生活分区 */}
          <span
            className={`px-2 py-px rounded-full text-[10.5px] font-medium ${
              t.scope === 'work'
                ? 'bg-[rgba(61,220,151,.1)] text-accent border border-[rgba(61,220,151,.2)]'
                : 'bg-[rgba(240,136,62,.12)] text-orange border border-[rgba(240,136,62,.2)]'
            }`}>
            {t.scope === 'work' ? '工作' : '生活'}
          </span>
        </div>
      </div>

      {/* 快捷操作区 */}
      <div className="flex items-center gap-1 relative shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="更多操作"
          className="opacity-0 group-hover:opacity-100 text-faint hover:text-txt p-1 rounded-lg hover:bg-white/[0.04] transition-all">
          <IconMore className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-7 z-20 w-28 bg-[#141b27] border border-line2 rounded-xl shadow-xl py-1 text-[12px] fade-up">
            <button
              onClick={() => {
                cyclePriority()
                setShowMenu(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/[0.05] text-dim hover:text-txt">
              切换优先级
            </button>
            <button
              onClick={() => {
                remove()
                setShowMenu(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red/10 text-red">
              删除任务
            </button>
          </div>
        )}

        <button
          onClick={remove}
          aria-label="删除任务"
          className="opacity-0 group-hover:opacity-100 text-faint hover:text-red transition-all p-1 rounded-lg hover:bg-white/[0.04]">
          <IconClose className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function Group({
  title,
  icon,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  icon?: React.ReactNode
  count: number
  open: boolean
  onToggle?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <button
        onClick={onToggle}
        disabled={!onToggle}
        className="flex items-center gap-2 px-1 text-left group w-fit cursor-pointer select-none">
        {icon}
        <b className="text-[14px] text-txt group-hover:text-accent transition-colors">{title}</b>
        <span className="text-[11px] font-mono text-faint bg-inset border border-line px-2 py-0.5 rounded-full">
          {count}
        </span>
        {onToggle && (
          <span
            className={`text-faint text-[11px] transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}>
            ⌄
          </span>
        )}
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}>
        <div className="overflow-hidden flex flex-col gap-2">{children}</div>
      </div>
    </section>
  )
}

export default function TodoList() {
  const { s, scope, api } = useStore()
  const toast = useToast()
  const [openDone, setOpenDone] = useState(true)
  const [openWeek, setOpenWeek] = useState(true)
  const [openToday, setOpenToday] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [draft, setDraft] = useState({
    title: '',
    priority: 'P1' as Priority,
    due: '今天 18:00',
    tag: scope === 'work' ? '产品' : '生活',
    source: '手动',
  })

  const todos = useMemo(() => (s ? s.todos.filter((t) => t.scope === scope) : []), [s, scope])

  // 纯日期判断
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const isToday = (t: TodoDTO) => t.due.startsWith('今天') || t.due.startsWith(todayDateStr)
  const isHigh = (t: TodoDTO) => !t.done && (t.priority === 'P0' || t.priority === 'P1')

  const applyFilter = (list: TodoDTO[]) =>
    filter === 'all'
      ? list
      : filter === 'today'
      ? list.filter((t) => !t.done && isToday(t))
      : filter === 'week'
      ? list.filter((t) => !t.done && !isToday(t))
      : list.filter(isHigh)

  const today = applyFilter(todos).filter((t) => !t.done && isToday(t))
  const week = applyFilter(todos).filter((t) => !t.done && !isToday(t))
  const done = todos.filter((t) => t.done)

  const create = async () => {
    if (!draft.title.trim()) return
    await api('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, title: draft.title.trim(), scope }),
    })
    setDraft({ ...draft, title: '' })
    setCreating(false)
    toast('已创建待办任务', 'success')
  }

  // 智能建议列表（对齐 design/874af9b3）
  const suggestions = useMemo(() => {
    const openTasks = todos.filter((t) => !t.done)
    const list: {
      key: string
      title: string
      count: number
      desc: string
      items: string[]
      actionText: string
      onAction: () => void
    }[] = []

    // 1. 滞留提醒
    const stale = openTasks.slice(0, 2)
    if (stale.length > 0) {
      list.push({
        key: 'stale',
        title: '滞留提醒',
        count: stale.length,
        desc: `有 ${stale.length} 个任务待推进：`,
        items: stale.map((t) => t.title),
        actionText: '置顶这些任务',
        onAction: async () => {
          for (const item of stale) {
            await api(`/api/todos/${item.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ priority: 'P0' }),
            })
          }
          toast('已将滞留任务优先级提升为 P0', 'success')
        },
      })
    }

    // 2. 可合并任务
    if (openTasks.length >= 3) {
      const related = openTasks.slice(0, 3)
      list.push({
        key: 'merge',
        title: '可合并任务',
        count: related.length,
        desc: `检测到 ${related.length} 个相关任务可协同处理：`,
        items: related.map((t) => t.title),
        actionText: '聚焦此类任务',
        onAction: () => {
          setFilter('all')
          toast('已为您聚焦相关任务', 'info')
        },
      })
    }

    // 3. 高优先级任务
    const highTasks = openTasks.filter(isHigh)
    if (highTasks.length > 0) {
      list.push({
        key: 'high',
        title: '高优先级待办',
        count: highTasks.length,
        desc: `有 ${highTasks.length} 个 P0/P1 任务需要优先攻坚：`,
        items: highTasks.slice(0, 3).map((t) => t.title),
        actionText: '仅查看高优先',
        onAction: () => setFilter('high'),
      })
    }

    return list
  }, [todos, api, toast])

  if (!s) return <p className="text-faint text-[13px] p-6">加载中…</p>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 h-full min-h-0 max-w-[1400px] mx-auto">
      {/* 左侧任务列表主区 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        {/* 顶部标题栏与新建按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight">TodoList</h1>
            <p className="text-[13px] text-dim mt-0.5">
              专注于重要的事，让{scope === 'work' ? '工作' : '生活'}更有条理。
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="btn-press px-4 py-2 rounded-xl bg-accent text-[#04110b] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-accent-hover shadow-[0_0_16px_rgba(61,220,151,.35)] transition-all">
            <IconPlus className="w-4 h-4" strokeWidth={2.4} />
            新建任务
          </button>
        </div>

        {/* 新建任务展开卡片 */}
        {creating && (
          <div className="bg-card border border-line2 rounded-2xl p-4.5 flex flex-col gap-3 fade-up shadow-xl">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
                if (e.key === 'Escape') setCreating(false)
              }}
              placeholder="任务标题，Enter 保存 / Esc 取消"
              className="w-full bg-inset border border-line rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-accent focus:shadow-[0_0_12px_rgba(61,220,151,.15)] transition-all"
            />
            <div className="flex gap-2 items-center flex-wrap">
              {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setDraft({ ...draft, priority: p })}
                  className={`btn-press text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    draft.priority === p
                      ? P_CLS[p].badge + ' border-transparent font-bold'
                      : 'border-line text-faint hover:text-dim'
                  }`}>
                  {p}
                </button>
              ))}
              <input
                value={draft.due}
                onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2.5 py-1 text-[11.5px] w-32 outline-none focus:border-line2 text-dim"
                placeholder="截止时间"
              />
              <select
                value={draft.tag}
                onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2.5 py-1 text-[11.5px] outline-none text-dim">
                {['产品', '前端', '后端', '设计', '运维', '文档', '生活'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="bg-inset border border-line rounded-lg px-2.5 py-1 text-[11.5px] outline-none text-dim">
                {['手动', 'GitHub', 'Linear', '产品', '文档'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setCreating(false)}
                  className="btn-press px-3 py-1.5 rounded-lg border border-line text-faint hover:text-txt text-[12px]">
                  取消
                </button>
                <button
                  onClick={create}
                  className="btn-press px-3.5 py-1.5 rounded-lg bg-accent text-[#04110b] text-[12px] font-semibold hover:bg-accent-hover">
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 筛选标签条 */}
        <div className="flex gap-2 items-center flex-wrap">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-press text-[12px] px-3 py-1 rounded-full border transition-all duration-200 ${
                filter === f
                  ? 'bg-accent text-[#04110b] border-transparent font-semibold shadow-[0_0_12px_rgba(61,220,151,.3)]'
                  : 'border-line text-faint hover:text-dim hover:border-line2 bg-white/[0.02]'
              }`}>
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {/* 分组列表 */}
        <Group
          title={scope === 'work' ? '🔥 今天 · 高优先' : '🔥 今天'}
          count={today.length}
          open={openToday}
          onToggle={() => setOpenToday(!openToday)}
          icon={<IconFlame className="w-4 h-4 text-orange" />}>
          {today.map((t) => (
            <TaskCard key={t.id} t={t} />
          ))}
          {today.length === 0 && (
            <div className="text-[12px] text-faint py-4 px-3 bg-white/[0.01] border border-dashed border-line rounded-xl text-center">
              今天没有紧急任务，享受专注或休息片刻
            </div>
          )}
        </Group>

        <Group
          title="📅 本周及以后"
          count={week.length}
          open={openWeek}
          onToggle={() => setOpenWeek(!openWeek)}
          icon={<IconClock className="w-4 h-4 text-blue" />}>
          {week.map((t) => (
            <TaskCard key={t.id} t={t} />
          ))}
          {week.length === 0 && (
            <div className="text-[12px] text-faint py-3 px-2 text-center">本周暂无其他安排</div>
          )}
        </Group>

        <Group
          title="✔ 已完成"
          count={done.length}
          open={openDone}
          onToggle={() => setOpenDone(!openDone)}
          icon={<IconCheck className="w-4 h-4 text-accent" />}>
          {done.map((t) => (
            <TaskCard key={t.id} t={t} />
          ))}
        </Group>
      </div>

      {/* 右侧边栏：AI 建议面板（对齐设计图） */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="ai-panel rounded-2xl p-4.5 flex flex-col gap-1 shadow-lg">
          <div className="flex items-center gap-2">
            <IconSpark className="w-4 h-4 text-purple" />
            <b className="text-[14px] text-txt">AI 建议</b>
            <span className="ml-auto text-[10px] text-purple bg-[rgba(139,92,246,.18)] px-2 py-0.5 rounded-full font-medium">
              智能分析
            </span>
          </div>
          <p className="text-[11.5px] text-faint mt-1">基于你的任务、项目动态与历史行为</p>
        </div>

        <div className="flex flex-col gap-3.5">
          {suggestions.length === 0 && (
            <div className="border border-dashed border-line rounded-2xl p-6 text-center">
              <IconCheck className="w-6 h-6 text-accent mx-auto" />
              <p className="text-[12.5px] text-faint mt-2">暂无待处理建议，任务节奏良好</p>
            </div>
          )}

          {suggestions.map((g) => (
            <div
              key={g.key}
              className="bg-[rgba(139,92,246,.07)] border border-[rgba(139,92,246,.2)] rounded-2xl p-4 hover:border-[rgba(139,92,246,.45)] hover:bg-[rgba(139,92,246,.11)] transition-all duration-200 group">
              <div className="flex items-center gap-2">
                <b className="text-[13px] text-purple">{g.title}</b>
                <span className="ml-auto text-[11px] text-purple bg-[rgba(139,92,246,.2)] px-2 py-0.5 rounded-full font-mono font-medium">
                  {g.count} 个
                </span>
              </div>
              <p className="text-[12px] text-dim mt-2 leading-relaxed">{g.desc}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {g.items.map((item, idx) => (
                  <li key={idx} className="text-[11.5px] text-[#cfc8f0] flex items-start gap-2">
                    <span className="text-purple shrink-0 mt-0.5">•</span>
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={g.onAction}
                className="mt-3 text-[12px] text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all font-medium cursor-pointer">
                → {g.actionText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
