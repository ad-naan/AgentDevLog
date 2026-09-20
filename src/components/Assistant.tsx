'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from './StoreProvider'
import { IconSpark } from './icons'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

export default function Assistant() {
  const { scope, refresh, s } = useStore()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: '你好，我是工作台 AI 助手。可以直接说「帮我记一条待办：明天评审 PRD」「生成今天的日报」「把这段需求拆解一下：…」，我会直接执行并联动日志、待办、报告和需求拆解。' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const llmOn = !!(s?.settings.llmBaseUrl && s?.settings.llmModel && s?.settings.llmApiKey)

  // 命令面板 / 全局唤起
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener('open-assistant', on)
    return () => window.removeEventListener('open-assistant', on)
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    const history = [...msgs, { role: 'user' as const, content: text }]
    setMsgs(history)
    setBusy(true)
    try {
      const r = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, history: history.map(({ role, content }) => ({ role, content })) }),
      })
      const j = await r.json() as { reply: string; actions: string[] }
      setMsgs((m) => [...m, { role: 'assistant', content: j.reply, actions: j.actions }])
      if (j.actions?.length) await refresh() // 工具改动过数据 → 全局状态刷新，各页联动
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: '请求失败，请稍后重试。' }])
    } finally {
      setBusy(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }))
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button onClick={() => setOpen(!open)} aria-label="AI 助手"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all
          ${open ? 'rotate-45' : 'animate-none'}
          ${llmOn
          ? 'bg-gradient-to-br from-[#6D5EF0] to-[#4F7CF0] text-white'
          : 'bg-[#11161f] border border-line text-faint'}`}>
        <IconSpark className="w-5 h-5" />
      </button>

      {/* 面板 */}
      {open && (
        <div className="fixed bottom-22 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[460px]
          bg-card border border-line2 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line shrink-0">
            <IconSpark className="w-4 h-4 text-purple" />
            <b className="text-[13px]">AI 助手</b>
            <span className={`text-[10px] px-2 py-px rounded-full ${llmOn
              ? 'bg-[rgba(61,220,151,.12)] text-accent' : 'bg-[#1a2230] text-faint'}`}>
              {llmOn ? '已联动全部功能' : '未配置 LLM'}
            </span>
            <button onClick={() => setOpen(false)} className="ml-auto text-faint hover:text-dim text-[15px] leading-none">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[88%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`rounded-xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap
                  ${m.role === 'user' ? 'bg-[#2a3547] text-txt' : 'bg-inset border border-line text-dim'}`}>
                  {m.content}
                </div>
                {m.actions?.map((a, k) => (
                  <div key={k} className="mt-1 flex items-start gap-1.5 text-[11px] text-accent">
                    <span>✓</span><span className="leading-snug">{a}</span>
                  </div>
                ))}
              </div>
            ))}
            {busy && (
              <div className="self-start bg-inset border border-line rounded-xl px-3 py-2 text-[12px] text-faint animate-pulse">
                思考与执行中…
              </div>
            )}
          </div>

          <div className="p-3 border-t border-line shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={llmOn ? '例如：生成今天的日报，然后把计划转成待办' : '请先在设置中配置 LLM'}
                disabled={!llmOn}
                className="flex-1 bg-inset border border-line rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-line2 disabled:opacity-50" />
              <button onClick={send} disabled={busy || !llmOn}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0] text-white text-[12.5px] font-semibold disabled:opacity-50">
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
