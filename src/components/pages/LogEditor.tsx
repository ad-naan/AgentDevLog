'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../StoreProvider'
import { apiError } from '../Toast'
import { scopedActivities, today } from '@/lib/types'
import {
  IconBulb, IconSpark, IconMoodBad, IconMood,
  IconMoodHappy, IconCheck, IconClose, IconPlus, IconMore,
} from '../icons'
import PageSkeleton from '../PageSkeleton'

// 生活区日记形式：不止复盘，随笔/好事/心情/一句话都可以
const LIFE_TEMPLATES = [
  {
    name: '自由随笔',
    emoji: '🌿',
    tpl: '# 随笔\n\n想到什么写什么，不用结构，不用完整。\n\n',
  },
  {
    name: '三件好事',
    emoji: '☀️',
    tpl: '# 今日三件好事\n\n1. \n2. \n3. \n\n为什么发生在今天：\n- ',
  },
  {
    name: '心情日记',
    emoji: '🌦️',
    tpl: '# 今日心情\n\n**此刻的感受**：\n\n**发生了什么**：\n\n**我想对自己说**：\n',
  },
  {
    name: '一句话日记',
    emoji: '✏️',
    tpl: '# 一句话\n\n',
  },
  {
    name: '结构复盘',
    emoji: '🔁',
    tpl: '# 今日复盘\n## 1. 今日经历\n- \n\n## 2. 观察与感悟\n- \n\n## 3. 反思与改进\n- ',
  },
] as const

// 今日灵感一问：按日期轮换
const PROMPTS = [
  '今天有什么瞬间让你觉得"还不错"?',
  '最近哪件小事悄悄消耗了你?',
  '如果今天只能留下一张照片，会拍什么?',
  '最近对什么重新产生了好奇?',
  '今天身体感觉怎么样?累在哪里?',
  '有什么想放下但还没放下的?',
  '这个周末最想为自己做的一件事?',
  '最近一次开怀大笑是因为什么?',
] as const

const promptOfDay = (date: string) => {
  let h = 0
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) % 997
  return PROMPTS[h % PROMPTS.length]
}

const TOOLS = [
  { t: 'B', pre: '**', suf: '**', ph: '加粗', cls: 'font-bold' },
  { t: 'I', pre: '*', suf: '*', ph: '斜体', cls: 'italic' },
  { t: '</>', pre: '`', suf: '`', ph: '代码', cls: 'font-mono' },
  { t: '•', pre: '\n- ', suf: '', ph: '列表项', cls: '' },
  { t: '“', pre: '\n> ', suf: '', ph: '引用', cls: '' },
] as const

export default function LogEditor() {
  const { s, scope, api } = useStore()
  const [selDate, setSelDate] = useState(today())
  const [newTag, setNewTag] = useState('')
  const [newDate, setNewDate] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const log = useMemo(
    () => s?.logs.find((l) => l.date === selDate && l.scope === scope),
    [s, selDate, scope],
  )

  // 本地草稿：切换日期/分区时同步一次；编辑期间不被服务端回写打断
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const serverContent = log?.content ?? ''
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(serverContent)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDate, scope])
  useEffect(() => {
    if (!dirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(serverContent)
    }
  }, [serverContent, dirty])
  const history = useMemo(
    () => (s ? s.logs.filter((l) => l.scope === scope).slice().sort((a, b) => b.date.localeCompare(a.date)) : []),
    [s, scope],
  )

  const [tips, setTips] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const acts = useMemo(
    () => (s ? scopedActivities(s, scope).filter((a) => a.type !== 'log').slice(0, 8) : []),
    [s, scope],
  )

  // 卸载兜底：清理防抖定时器（必须位于早退 return 之前，保证 Hook 顺序稳定）
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  if (!s) return <PageSkeleton type="logs" />

  const lines = draft.split('\n')
  const savedAt = log ? new Date(log.updatedAt).toTimeString().slice(0, 5) : ''

  const applyTemplate = (tpl: string) => {
    save(draft ? `${draft}\n\n${tpl}` : tpl)
    requestAnimationFrame(() => {
      const el = taRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  // 防抖持久化：先更新本地草稿，停止输入 600ms 后再落库，避免每键一次请求
  const persist = (v: string) => {
    if (!log) {
      api('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selDate, scope, content: v }),
      })
      return
    }
    api(`/api/logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: v }),
    })
  }

  const save = (v: string) => {
    setDraft(v)
    setDirty(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDirty(false)
      persist(v)
    }, 600)
  }

  const applyWrap = (pre: string, suf: string, ph: string) => {
    const el = taRef.current
    if (!el) return
    const a = el.selectionStart, b = el.selectionEnd
    const inner = el.value.slice(a, b) || ph
    save(el.value.slice(0, a) + pre + inner + suf + el.value.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + pre.length, a + pre.length + inner.length)
    })
  }

  const insertAtCursor = (text: string) => {
    const el = taRef.current
    if (!el) return
    const a = el.selectionStart, b = el.selectionEnd
    const pad = a > 0 && el.value[a - 1] !== '\n' ? '\n' : ''
    save(el.value.slice(0, a) + pad + text + el.value.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + pad.length + text.length, a + pad.length + text.length)
    })
  }

  const genTips = async () => {
    if (aiLoading) return
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'logtips',
          scope,
          title: log?.title || (scope === 'work' ? '今日工作日志' : '生活记录'),
          content: draft,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || await apiError(res))
      setTips((data as { tips?: string[] }).tips || [])
    } catch (e) {
      setTips([])
      setAiError(e instanceof Error ? e.message : '生成失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  const toggleLink = (id: string) =>
    log &&
    api(`/api/logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linked: log.linked.includes(id) ? log.linked.filter((x) => x !== id) : [...log.linked, id],
      }),
    })

  const createFor = async () => {
    const d0 = newDate || today()
    setSelDate(d0)
    setNewDate('')
    if (!s.logs.some((l) => l.date === d0 && l.scope === scope)) {
      await api('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: d0, scope }),
      })
    }
  }

  const addTag = () => {
    const t = newTag.trim()
    if (!t || !log) return
    if (!log.tags.includes(t)) {
      api(`/api/logs/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [...log.tags, t] }),
      })
    }
    setNewTag('')
  }

  const setMood = (m: number) =>
    log &&
    api(`/api/logs/${log.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: m }),
    })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[170px_minmax(0,1fr)_330px] gap-3 lg:gap-4 h-full min-h-0 max-w-[1440px] mx-auto">
      {/* 左栏：日志历史 */}
       <div className="bg-card border border-line rounded-xl lg:rounded-2xl flex flex-col min-h-[180px] lg:min-h-0 overflow-hidden">
        <div className="px-3.5 py-3 border-b border-line flex items-center justify-between">
          <b className="text-[13px] font-semibold">日志历史</b>
          <span className="text-[10.5px] text-faint font-mono bg-inset px-2 py-0.5 rounded-full border border-line">
            {history.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {history.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelDate(l.date)}
              className={`text-left px-3 py-2 rounded-xl transition-all ${
                l.date === selDate
      ? 'bg-accent/15 text-accent font-medium shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]'
                  : 'text-dim hover:bg-white/[0.03] hover:text-txt'
              }`}>
              <b className="block text-[11.5px] font-mono leading-tight">
                {l.date === today() ? `${l.date} · 今天` : l.date}
              </b>
              <span className="block text-[11px] text-faint truncate mt-0.5">{l.title}</span>
            </button>
          ))}
          {history.length === 0 && <p className="text-[11.5px] text-faint p-3 text-center">暂无历史日志</p>}
        </div>
        <div className="p-2.5 border-t border-line flex flex-col gap-2 bg-inset/50">
          <input
            type="date"
            value={newDate}
            max={today()}
            onChange={(e) => setNewDate(e.target.value)}
            className="bg-inset border border-line rounded-lg px-2.5 py-1.5 text-[11.5px] outline-none text-dim focus:border-line2"
          />
          <button
            onClick={createFor}
          className="btn-press w-full py-1.5 rounded-lg text-[12px] font-semibold text-[#04110b] bg-accent hover:bg-accent-hover inline-flex items-center justify-center gap-1.5 shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]">
            <IconPlus className="w-3.5 h-3.5" />新建日志
          </button>
        </div>
      </div>

      {/* 中间：Markdown 编辑器核心区（对齐 design/420cc382） */}
       <div className="bg-card border border-line rounded-xl lg:rounded-2xl flex flex-col min-h-[420px] lg:min-h-0 overflow-hidden shadow-sm">
        {/* 顶部状态栏 */}
         <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-line text-[12px] text-faint bg-white/[0.01]">
           <div className="flex items-center gap-2 font-mono min-w-0">
             <span className="hidden sm:inline text-dim">markdown</span>
             <span className="hidden sm:inline text-line2">·</span>
             <span className="flex items-center gap-1.5 text-accent text-[11px]">
              <i className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot" />
              自动保存
            </span>
          </div>
           <div className="flex items-center gap-2 sm:gap-3 shrink-0">
             <span className="inline-flex items-center gap-1 text-[11px] truncate max-w-[150px]">
              {log ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-accent" />
                  已保存 {savedAt}
                </>
              ) : (
                '未创建'
              )}
            </span>
            <IconMore className="w-3.5 h-3.5 text-faint hover:text-dim cursor-pointer" />
          </div>
        </div>

        {/* 生活区：选择今天的日记形式（空内容时展示） */}
        {scope === 'life' && !draft && (
          <div className="px-4 pt-3.5 pb-1 flex flex-col gap-2 border-b border-line/60 bg-accent/[0.03]">
            <div className="flex items-center gap-2 text-[11.5px] text-dim">
              <span className="text-accent">✦</span>
              <span>今天想怎么记？选一种开始，或直接开写</span>
              <span className="ml-auto italic text-faint">今日一问：{promptOfDay(selDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap pb-2.5">
              {LIFE_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t.tpl)}
                  className="btn-press px-3 py-1.5 rounded-full border border-line bg-card text-[12px] text-dim hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-all">
                  {t.emoji} {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 编辑区域：极简行号与等宽代码 */}
         <div className="flex-1 min-h-0 flex overflow-y-auto">
          <div
            aria-hidden
             className="select-none text-right px-2.5 sm:px-3.5 py-4 font-mono text-[12px] leading-[1.75] text-faint/60 shrink-0 border-r border-line/60">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => save(e.target.value)}
            spellCheck={false}
            placeholder={
              log
                ? ''
                : scope === 'work'
                  ? `${selDate} 还没有日志，在此输入即可自动创建…\n\n# 今日工作日志\n## 1. 主要工作\n- \n\n## 2. 遇到的问题\n- \n\n## 3. 明日计划\n- `
                  : `${selDate} · 想到什么就写什么，一个字也算记录…\n\n今日一问：${promptOfDay(selDate)}`
            }
             className="flex-1 min-h-0 bg-transparent px-3 sm:px-4 py-4 font-mono text-[13px] leading-[1.75] text-txt outline-none resize-none placeholder:text-faint/60"
             style={{ minHeight: `${lines.length * 23 + 32}px` }}
           />
        </div>

        {/* 底部工具栏与标签 */}
         <div className="border-t border-line px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 bg-inset/40 flex-wrap">
          <div className="flex items-center gap-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.t}
                onClick={() => applyWrap(tool.pre, tool.suf, tool.ph)}
                title={`插入 ${tool.ph}`}
                className={`btn-press w-7 h-7 rounded-lg border border-line text-[11px] ${tool.cls} text-dim hover:text-txt hover:border-line2 transition-colors bg-card`}>
                {tool.t}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-line mx-1" />

          {/* 标签列表 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {log?.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] font-mono text-blue bg-[rgba(10,132,255,.1)] border border-[rgba(10,132,255,.25)] px-2 py-0.5 rounded-full flex items-center gap-1">
                #{t}
                <button
                  onClick={() =>
                    log &&
                    api(`/api/logs/${log.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tags: log.tags.filter((x) => x !== t) }),
                    })
                  }
                  aria-label={`删除标签 ${t}`}
                  className="hover:text-red">
                  <IconClose className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="+ 标签"
              className="bg-transparent border border-dashed border-line2 rounded-full px-2.5 py-0.5 text-[11px] w-20 outline-none text-blue placeholder:text-faint focus:border-blue"
            />
          </div>

          {/* 心情选择器 */}
          {log && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-faint">心情：</span>
              {(
                [
                  [IconMoodBad, 1],
                  [IconMood, 2],
                  [IconMoodHappy, 3],
                ] as [typeof IconMood, number][]
              ).map(([E, m]) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  aria-label={`心情 ${m}`}
                  className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-all hover:scale-110 ${
                    log.mood === m
      ? 'border-accent text-accent bg-accent/15 shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]'
                      : 'border-line text-faint hover:text-dim'
                  }`}>
                  <E className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右栏：关联活动 + AI 建议 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        {/* 关联 GitHub 活动 */}
         <div className="bg-card border border-line rounded-xl lg:rounded-2xl flex flex-col min-h-[260px] lg:min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <b className="text-[13.5px]">关联 GitHub 活动</b>
              <p className="text-[11px] text-faint mt-0.5">勾选后关联至今日工作日志</p>
            </div>
            <span className="text-[11.5px] text-faint font-mono">共 {acts.length} 项</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {acts.map((a) => {
              const isChecked = log?.linked.includes(String(a.id)) || false
              return (
                <label
                  key={a.id}
                  className={`flex gap-3 items-start rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                    isChecked ? 'bg-accent/5 border border-accent/20' : 'hover:bg-black/[0.02] border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLink(String(a.id))}
          className="mt-1 accent-accent w-4 h-4 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <b className={`block text-[12.5px] truncate font-medium ${a.type === 'pr' ? 'text-blue' : 'text-txt'}`}>
                      {a.title}
                    </b>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-faint font-mono">
                      <span className="truncate">{a.repo} / main</span>
                      <span className="ml-auto shrink-0 text-[10.5px]">
                        {a.meta || new Date(a.ts).toTimeString().slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </label>
              )
            })}
            {acts.length === 0 && (
              <p className="text-[12px] text-faint p-4 text-center">暂无可关联活动，在设置中同步 GitHub 仓库</p>
            )}
          </div>
        </div>

        {/* AI 建议卡片（对齐设计图） */}
         <div className="insight-glow rounded-xl lg:rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconSpark className="w-4 h-4 text-purple" />
            <b className="text-[13.5px]">AI 建议</b>
            <span className="ml-auto text-[10.5px] text-purple bg-[rgba(139,92,246,.18)] px-2 py-0.5 rounded-full font-medium">
              基于今日工作内容
            </span>
          </div>

          {aiLoading && (
            <div className="flex flex-col gap-2 py-1">
              <p className="text-[12px] text-[#c9c2e8] flex items-center gap-2">
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                AI 正在综合日志与代码活动进行分析…
              </p>
              <div className="flex flex-col gap-2 mt-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-3.5 rounded-md" />
                ))}
              </div>
            </div>
          )}

          {!aiLoading && aiError && (
            <div className="text-[12px] text-red leading-relaxed bg-red/10 border border-red/20 rounded-xl p-3">
              <p className="font-semibold flex items-center gap-1">
                <IconBulb className="w-3.5 h-3.5" />生成建议遇到问题
              </p>
              <p className="text-[11.5px] mt-1 text-red/80">{aiError}</p>
            </div>
          )}

          {!aiLoading && !aiError && tips.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] text-[#cfc8f0] leading-relaxed flex gap-2 items-start bg-[rgba(139,92,246,.1)] p-2.5 rounded-xl border border-[rgba(139,92,246,.25)]">
                <IconBulb className="w-4 h-4 text-purple shrink-0 mt-0.5" />
                <span>你今天的工作效率很高！点击下方建议可直接插入到编辑器光标处：</span>
              </div>
              <ol className="flex flex-col gap-2 mt-1">
                {tips.map((x, i) => (
                  <li
                    key={i}
                    onClick={() => insertAtCursor(`\n- ${x}`)}
                    title="点击插入到光标处"
                    className="flex items-start gap-2.5 text-[12px] text-dim leading-relaxed cursor-pointer hover:text-txt transition-colors group p-2 rounded-xl hover:bg-white/[0.03]">
                    <span className="w-4.5 h-4.5 rounded-full bg-[rgba(139,92,246,.25)] text-purple text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple group-hover:text-white transition-colors">
                      {i + 1}
                    </span>
                    <span className="flex-1">{x}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!aiLoading && !aiError && tips.length === 0 && (
            <p className="text-[12px] text-dim leading-relaxed">
              基于你的提交记录与日志内容，智能分析今日成效并提供明天的工作推进建议。
            </p>
          )}

          <button
            onClick={genTips}
            disabled={aiLoading}
             className="btn-press mt-1 w-full min-h-10 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-[#5e5ce6] to-[#0a84ff] disabled:opacity-60 inline-flex items-center justify-center gap-2 hover:shadow-[0_0_16px_rgba(94,92,230,.4)] transition-all">
            <IconSpark className="w-4 h-4" />
            {aiLoading ? '正在分析…' : tips.length ? '采纳建议 / 重新生成' : '生成 AI 建议'}
          </button>
        </div>
      </div>
    </div>
  )
}
