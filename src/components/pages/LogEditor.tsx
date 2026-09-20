'use client'

import { useMemo, useRef, useState } from 'react'
import { useStore } from '../StoreProvider'
import { scopedActivities, today } from '@/lib/types'
import { IconBulb, IconSpark, IconMoodBad, IconMood, IconMoodHappy, IconCheck, IconClose, IconPlus } from '../icons'

const TOOLS = [
  { t: 'B', pre: '**', suf: '**', ph: '加粗', cls: 'font-bold' },
  { t: 'I', pre: '*', suf: '*', ph: '斜体', cls: 'italic' },
  { t: '<>', pre: '`', suf: '`', ph: '代码', cls: 'font-mono' },
  { t: '•', pre: '\n- ', suf: '', ph: '列表项', cls: '' },
  { t: '“', pre: '\n> ', suf: '', ph: '引用', cls: '' },
] as const

export default function LogEditor() {
  const { s, scope, api } = useStore()
  const [selDate, setSelDate] = useState(today())
  const [newTag, setNewTag] = useState('')
  const [newDate, setNewDate] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const log = useMemo(
    () => s?.logs.find((l) => l.date === selDate && l.scope === scope),
    [s, selDate, scope],
  )
  const history = useMemo(
    () => (s ? s.logs.filter((l) => l.scope === scope).slice().sort((a, b) => b.date.localeCompare(a.date)) : []),
    [s, scope],
  )

  const [tips, setTips] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const acts = useMemo(
    () => (s ? scopedActivities(s, scope).filter((a) => a.type !== 'log').slice(0, 6) : []),
    [s, scope],
  )
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const content = log?.content ?? ''
  const lines = content.split('\n')
  const savedAt = log ? new Date(log.updatedAt).toTimeString().slice(0, 5) : ''

  const save = (v: string) => {
    if (!log) {
      api('/api/logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selDate, scope, content: v }),
      })
      return
    }
    api(`/api/logs/${log.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: v }),
    })
  }

  // 对选区包裹标记；无选区时插入占位文本，并保持选区便于直接输入
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
  // 在光标处插入文本（自动补换行）
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
    setAiLoading(true); setAiError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'logtips',
          title: log?.title || (scope === 'work' ? '今日工作日志' : '生活记录'),
          content,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`)
      setTips((data as { tips?: string[] }).tips || [])
    } catch (e) {
      setTips([])
      setAiError(e instanceof Error ? e.message : '生成失败，请稍后重试')
    } finally {
      setAiLoading(false)
    }
  }

  const toggleLink = (id: string) => log && api(`/api/logs/${log.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: d0, scope }),
      })
    }
  }
  const addTag = () => {
    const t = newTag.trim()
    if (!t || !log) return
    if (!log.tags.includes(t)) {
      api(`/api/logs/${log.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [...log.tags, t] }),
      })
    }
    setNewTag('')
  }
  const setMood = (m: number) => log && api(`/api/logs/${log.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood: m }),
  })

  return (
    <div className="grid grid-cols-[150px_1fr_330px] gap-4 h-full min-h-0">
      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
        <div className="px-3 py-3 border-b border-line flex items-center"><b className="text-[12.5px]">日志历史</b><span className="ml-auto text-[10.5px] text-faint font-mono">{history.length}</span></div>
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
          {history.map((l) => (
            <button key={l.id} onClick={() => setSelDate(l.date)}
              className={`text-left px-2.5 py-2 rounded-lg transition-colors ${l.date === selDate ? 'bg-[rgba(61,220,151,.14)] text-accent' : 'text-dim hover:bg-[rgba(255,255,255,.04)]'}`}>
              <b className="block text-[11.5px] font-mono">{l.date === today() ? `${l.date} · 今天` : l.date}</b>
              <span className="block text-[10.5px] text-faint truncate">{l.title}</span>
            </button>
          ))}
          {history.length === 0 && <p className="text-[11px] text-faint p-2">暂无日志</p>}
        </div>
        <div className="p-2 border-t border-line flex flex-col gap-1.5">
          <input type="date" value={newDate} max={today()} onChange={(e) => setNewDate(e.target.value)}
            className="bg-inset border border-line rounded-md px-2 py-1.5 text-[11px] outline-none text-dim" />
          <button onClick={createFor} className="btn-press w-full py-1.5 rounded-md text-[12px] font-medium text-[#04110b] bg-accent hover:brightness-110 inline-flex items-center justify-center gap-1"><IconPlus className="w-3 h-3" />新建日志</button>
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line text-[11.5px] text-faint">
          <span className="font-mono">markdown</span>
          <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-accent pulse-dot" />自动保存</span>
          <span className="ml-auto inline-flex items-center gap-1">{log ? <><IconCheck className="w-3 h-3 text-accent" />已保存 {savedAt}</> : '未创建'}</span>
        </div>
        <div className="flex-1 min-h-0 flex overflow-y-auto">
          <div aria-hidden className="select-none text-right px-3 py-4 font-mono text-[12.5px] leading-[1.75] text-[#3d4757] shrink-0 border-r border-line">
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea ref={taRef} value={content} onChange={(e) => save(e.target.value)} spellCheck={false}
            placeholder={log ? '' : `${selDate} 还没有日志，直接输入即可自动创建…`}
            className="flex-1 min-h-0 bg-transparent px-4 py-4 font-mono text-[12.5px] leading-[1.75] text-[#c9d4e3] outline-none resize-none placeholder:text-faint"
            style={{ minHeight: `${lines.length * 22 + 32}px` }} />
        </div>
        <div className="border-t border-line px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1">
            {TOOLS.map((tool) => (
              <button key={tool.t} onClick={() => applyWrap(tool.pre, tool.suf, tool.ph)} title={`插入 ${tool.ph}`}
                className={`btn-press w-7 h-7 rounded-md border border-line text-[11px] ${tool.cls} text-dim hover:text-txt hover:border-line2 transition-colors`}>{tool.t}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            {log?.tags.map((t) => (
              <span key={t} className="text-[11px] font-mono text-blue bg-[rgba(88,166,255,.1)] border border-[rgba(88,166,255,.25)] px-2 py-px rounded-full flex items-center gap-1">
                {t}
                <button onClick={() => log && api(`/api/logs/${log.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tags: log.tags.filter((x) => x !== t) }),
                })} aria-label={`删除标签 ${t}`} className="hover:text-red"><IconClose className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="+ 标签" className="bg-transparent border border-dashed border-line2 rounded-full px-2 py-px text-[11px] w-16 outline-none text-blue placeholder:text-faint" />
          </div>
          {log && <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-faint">心情：</span>
            {([[IconMoodBad, 1], [IconMood, 2], [IconMoodHappy, 3]] as [typeof IconMood, number][]).map(([E, m]) => (
              <button key={m} onClick={() => setMood(m)} aria-label={`心情 ${m}`}
                className={`w-7 h-7 rounded-md border inline-flex items-center justify-center transition-all hover:scale-110 ${log.mood === m ? 'border-accent text-accent bg-[rgba(61,220,151,.1)] shadow-[0_0_8px_rgba(61,220,151,.3)]' : 'border-line text-faint'}`}>
                <E className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>}
        </div>
      </div>

      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="bg-card border border-line rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-line">
            <b className="text-[13.5px]">关联活动</b>
            <p className="text-[10.5px] text-faint mt-0.5">勾选后写入日志的 linked 字段</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {acts.map((a) => (
              <label key={a.id} className="flex gap-2.5 items-start rounded-lg px-2.5 py-2 hover:bg-[rgba(255,255,255,.03)] cursor-pointer">
                <input type="checkbox" checked={log?.linked.includes(String(a.id)) || false} onChange={() => toggleLink(String(a.id))}
                  className="mt-1 accent-[#3ddc97]" />
                <div className="min-w-0">
                  <b className={`block text-[12px] truncate ${a.type === 'pr' ? 'text-blue' : ''}`}>{a.title}</b>
                  <span className="block text-[10.5px] text-faint font-mono truncate">{a.repo} / main</span>
                  <span className="block text-[10.5px] text-faint font-mono">{a.meta || new Date(a.ts).toTimeString().slice(0, 5)}</span>
                </div>
              </label>
            ))}
            {acts.length === 0 && <p className="text-[12px] text-faint p-4">暂无可关联的活动，先到设置页添加并同步仓库。</p>}
          </div>
        </div>

        {/* AI 建议：由 /api/ai logtips 真实生成，点击建议可插入到光标处 */}
        <div className="ai-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <IconSpark className="w-3.5 h-3.5 text-purple" />
            <b className="text-[13px]">AI 建议</b>
            <span className="ml-auto text-[10px] text-purple bg-[rgba(139,92,246,.15)] px-2 py-px rounded-full">基于当前日志</span>
          </div>
          {aiLoading && <>
            <p className="text-[12px] text-[#c9c2e8] flex items-center gap-1.5">
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />AI 正在分析你的日志…
            </p>
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-4 rounded-md" />)}
            </div>
          </>}
          {!aiLoading && aiError && <>
            <p className="text-[12px] text-red leading-relaxed flex gap-1.5 items-start">
              <IconBulb className="w-3.5 h-3.5 shrink-0 mt-px" />生成失败：{aiError}
            </p>
            <p className="text-[11px] text-faint">尚未配置 LLM？到设置页填写模型配置后重试。</p>
          </>}
          {!aiLoading && !aiError && tips.length > 0 && <>
            <p className="text-[12px] text-[#c9c2e8] leading-relaxed flex gap-1.5 items-start">
              <IconBulb className="w-3.5 h-3.5 shrink-0 mt-px" />基于你的提交和日志生成，点击建议可插入到光标处：
            </p>
            <ol className="flex flex-col gap-2">
              {tips.map((x, i) => (
                <li key={i} onClick={() => insertAtCursor(`- ${x}`)} title="点击插入到光标处"
                  className="flex gap-2 text-[12px] text-dim leading-relaxed cursor-pointer hover:text-txt transition-colors group">
                  <span className="w-4 h-4 rounded-full bg-[rgba(139,92,246,.25)] text-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[rgba(139,92,246,.45)] transition-colors">{i + 1}</span>
                  {x}
                </li>
              ))}
            </ol>
          </>}
          {!aiLoading && !aiError && tips.length === 0 && (
            <p className="text-[12px] text-faint leading-relaxed flex gap-1.5 items-start">
              <IconBulb className="w-3.5 h-3.5 shrink-0 mt-px" />点击下方按钮，基于当前日志内容生成 AI 建议。
            </p>
          )}
          <button onClick={genTips} disabled={aiLoading}
            className="btn-press mt-1 w-full py-2.5 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0] disabled:opacity-60 inline-flex items-center justify-center gap-1.5 hover:shadow-[0_0_14px_rgba(109,94,240,.4)] transition-shadow">
            <IconSpark className="w-3.5 h-3.5" />{aiLoading ? '生成中…' : tips.length ? '重新生成建议' : '生成建议'}
          </button>
        </div>
      </div>
    </div>
  )
}
