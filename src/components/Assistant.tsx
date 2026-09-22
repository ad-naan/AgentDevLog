'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from './StoreProvider'
import { IconSpark, IconClose } from './icons'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

const QUICK_PROMPTS = [
  '帮我生成今天的日报',
  '记一条待办：明天上午评审 PRD',
  '总结今日的工作产出与提交',
]

export default function Assistant() {
  const { scope, refresh, s } = useStore()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        '你好，我是工作台 AI 助手。可以直接向我下达指令，例如「帮我记一条待办：明天评审 PRD」「生成今天的日报」「把这段需求拆解一下：…」，我会自动执行并联动各页面数据。',
    },
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

  const send = async (customPrompt?: string) => {
    const text = (customPrompt ?? input).trim()
    if (!text || busy) return
    setInput('')
    const history = [...msgs, { role: 'user' as const, content: text }]
    setMsgs(history)
    setBusy(true)
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, history: history.map(({ role, content }) => ({ role, content })) }),
      })
      const j = (await r.json()) as { reply: string; actions: string[] }
      setMsgs((m) => [...m, { role: 'assistant', content: j.reply, actions: j.actions }])
      if (j.actions?.length) await refresh()
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: '请求失败，请稍后重试。' }])
    } finally {
      setBusy(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }))
    }
  }

  return (
    <>
      {/* 悬浮微光触发器 */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="AI 助手"
        className={`fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full flex items-center justify-center transition-all duration-300 btn-press cursor-pointer ${
          open ? 'rotate-90 bg-[#1e2535] text-txt shadow-xl' : ''
        } ${
          llmOn
            ? 'bg-gradient-to-br from-[#5e5ce6] to-[#0a84ff] text-white shadow-[0_0_24px_rgba(94,92,230,.3)] hover:shadow-[0_0_32px_rgba(94,92,230,.4)]'
            : 'bg-[#121826] border border-line text-faint hover:text-txt shadow-lg'
        }`}>
        <IconSpark className="w-5.5 h-5.5" />
      </button>

      {/* 弹出的对话面板 */}
      {open && (
        <div className="fixed bottom-22 right-6 z-50 w-[400px] max-w-[calc(100vw-2.5rem)] h-[500px] bg-card border border-line2 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,.6)] flex flex-col overflow-hidden cmd-pop">
          {/* 面板头部 */}
          <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b border-line bg-inset/50 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[rgba(139,92,246,.2)] flex items-center justify-center text-purple">
              <IconSpark className="w-4 h-4" />
            </div>
            <div>
              <b className="text-[13.5px] text-txt block leading-tight">DevLog 智能助手</b>
              <span className="text-[10.5px] text-faint block">全局联动 · 任务执行</span>
            </div>
            <span
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                llmOn
                  ? 'bg-[rgba(52,199,89,.12)] text-accent border border-[rgba(52,199,89,.25)]'
                  : 'bg-white/[0.04] text-faint border border-line'
              }`}>
              {llmOn ? 'LLM 已连接' : '未配置 LLM'}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-faint hover:text-txt p-1 rounded-lg hover:bg-white/[0.05] transition-colors ml-1">
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 消息对话区 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[88%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-[#5f50ea] to-[#456de0] text-white font-medium'
                      : 'bg-inset border border-line text-txt/90'
                  }`}>
                  {m.content}
                </div>
                {m.actions?.map((a, k) => (
                  <div key={k} className="mt-1 flex items-start gap-1.5 text-[11px] text-accent font-medium pl-1">
                    <span>✓</span>
                    <span className="leading-snug">{a}</span>
                  </div>
                ))}
              </div>
            ))}

            {busy && (
              <div className="self-start bg-inset border border-line rounded-2xl px-4 py-2.5 text-[12px] text-purple flex items-center gap-2">
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span>AI 正在思考与联动执行…</span>
              </div>
            )}
          </div>

          {/* 常用快捷提示词 */}
          {msgs.length <= 2 && (
            <div className="px-3.5 pb-2 flex gap-1.5 flex-wrap">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  onClick={() => send(qp)}
                  disabled={busy}
                  className="btn-press text-[11px] text-dim hover:text-txt bg-inset border border-line hover:border-line2 px-2.5 py-1 rounded-full transition-colors">
                  {qp}
                </button>
              ))}
            </div>
          )}

          {/* 底部输入框 */}
          <div className="p-3 border-t border-line bg-inset/40 shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={llmOn ? '输入指令，Enter 发送…' : '请先在「设置」中配置 LLM'}
                disabled={!llmOn}
                className="flex-1 bg-inset border border-line rounded-xl px-3.5 py-2 text-[12.5px] outline-none focus:border-accent disabled:opacity-50 transition-colors placeholder:text-faint"
              />
              <button
                onClick={() => send()}
                disabled={busy || !llmOn || !input.trim()}
                className="btn-press px-4 py-2 rounded-xl bg-gradient-to-r from-[#5e5ce6] to-[#0a84ff] text-white text-[12.5px] font-semibold disabled:opacity-50 hover:shadow-[0_0_12px_rgba(94,92,230,.22)] transition-all">
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
