'use client'

import { useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import type { BreakdownDTO } from '@/lib/types'
import { IconSpark, IconCopy, IconCheck } from '../icons'

const MODES: [BreakdownDTO['mode'], string, string][] = [
  ['标准', '◫', '按功能模块拆解'],
  ['详细', '⧗', '细化到具体任务'],
  ['精简', '✦', '只保留核心任务'],
]

export default function Breakdown() {
  const { s, api, refresh } = useStore()
  const toast = useToast()
  const [bd, setBd] = useState<BreakdownDTO>(() => s?.breakdowns[0] || {
    id: 0, requirement: '', mode: '标准', status: 'idle', modules: [], tech: [], createdAt: '',
  })
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adopting, setAdopting] = useState(false)
  const totalDays = bd.modules.reduce((n, m) => n + m.tasks.length, 0)

  const run = async () => {
    if (!bd.requirement.trim() || bd.status === 'running') return
    setError(null)
    setBd({ ...bd, status: 'running' })
    const res = await fetch('/api/breakdowns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement: bd.requirement, mode: bd.mode }),
    })
    if (res.ok) {
      const j = await res.json() as BreakdownDTO
      const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      setBd({ ...bd, status: 'done', modules: j.modules, tech: j.tech, createdAt })
      toast(`✦ AI 拆解完成：${j.modules.length} 个模块 · ${j.modules.reduce((n, m) => n + m.tasks.length, 0)} 个任务`, 'success')
    } else {
      setBd({ ...bd, status: 'idle' })
      setError(await apiError(res))
    }
    await refresh()
  }
  const copyTech = () => {
    navigator.clipboard.writeText(bd.tech.map((x, i) => `${i + 1}. ${x}`).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const toTodos = async () => {
    if (adopting) return
    setAdopting(true)
    const titles = bd.modules.flatMap((m) => m.tasks.map((t) => t.title)).slice(0, 10)
    for (const title of titles) {
      await api('/api/todos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'P2', due: '本周', scope: 'work', source: 'AI 拆解', tag: '产品' }),
      })
    }
    setAdopting(false)
    toast(`已采纳 ${titles.length} 个任务到 TodoList`, 'success')
  }

  return (
    <div className="max-w-[860px] mx-auto flex flex-col gap-4 pb-8">
      <div className="bg-card border border-line rounded-2xl p-5">
        <h1 className="text-[17px] font-bold flex items-center gap-2"><IconSpark className="w-4.5 h-4.5 text-purple" />需求拆解</h1>
        <p className="text-[12px] text-dim mt-1 mb-4">粘贴需求描述，由 LLM 拆解为模块、任务与技术方案，结果保存到数据库。</p>
        <textarea value={bd.requirement} onChange={(e) => setBd({ ...bd, requirement: e.target.value })}
          rows={6} spellCheck={false}
          placeholder={'例如：\n实现商品管理功能\n1. 商品增删改查\n2. 多级分类\n3. 库存预警\n4. 权限控制'}
          className="w-full bg-inset border border-line rounded-xl px-3.5 py-3 text-[13px] font-mono outline-none focus:border-line2 resize-y" />
        {error && (
          <div className="fade-up mt-3 flex items-start gap-2 border border-[rgba(248,81,73,.4)] bg-[rgba(248,81,73,.08)] rounded-xl px-3.5 py-2.5">
            <span className="text-red text-[12px] mt-0.5">✕</span>
            <div className="text-[12px] text-red leading-relaxed">{error}</div>
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-2">
            {MODES.map(([m, ic, d]) => (
              <button key={m} onClick={() => setBd({ ...bd, mode: m })} title={d} disabled={bd.status === 'running'}
                className={`btn-press px-3.5 py-2 rounded-lg border text-[12.5px] ${bd.mode === m
                  ? 'border-purple bg-[rgba(139,92,246,.12)] text-purple' : 'border-line text-dim hover:text-txt'}`}>
                <span className="mr-1.5">{ic}</span>{m}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={bd.status === 'running' || !bd.requirement.trim()}
            className={`btn-press ml-auto px-5 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-60
              ${bd.status === 'running' ? 'ai-btn-busy' : 'bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0]'}`}>
            {bd.status === 'running' ? '✦ AI 拆解中…' : '✦ 开始拆解'}
          </button>
        </div>
      </div>

      {bd.status === 'running' && (
        <div className="bg-card border border-line rounded-2xl p-5 fade-up">
          <div className="flex items-center gap-2">
            <b className="text-[14px]">任务拆解</b>
            <span className="text-[11px] text-faint flex items-center gap-1.5 ml-1">
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple inline-block" />
              正在分析需求
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border border-line rounded-xl p-3.5" style={{ opacity: 1 - i * 0.25 }}>
                <div className="flex items-center gap-3">
                  <div className="skeleton h-3.5 w-32" />
                  <div className="skeleton h-3 w-14 ml-auto" />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="skeleton h-3" style={{ width: `${85 - i * 15}%` }} />
                  <div className="skeleton h-3" style={{ width: `${70 - i * 10}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bd.status === 'done' && bd.modules.length > 0 && (
        <>
          <div className="bg-card border border-line rounded-2xl p-5 fade-up">
            <div className="flex items-center gap-2">
              <b className="text-[14px]">任务拆解</b>
              <span className="text-[11px] text-faint">{bd.modules.length} 个模块 · {totalDays} 个任务</span>
              <span className="ml-auto text-[11px] text-faint font-mono">{bd.createdAt}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {bd.modules.map((m, i) => (
                <div key={m.name} className="border border-line rounded-xl overflow-hidden fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                  <button onClick={() => setCollapsed({ ...collapsed, [i]: !collapsed[i] })}
                    className="w-full flex items-center gap-2.5 px-4 py-3 bg-inset hover:bg-[rgba(255,255,255,.03)] text-left">
                    <span className="font-mono text-[11px] text-purple">{String(i + 1).padStart(2, '0')}</span>
                    <b className="text-[13px]">{m.name}</b>
                    <span className="text-[10.5px] text-faint ml-auto font-mono">{m.tasks.length} 任务</span>
                    <span className="text-faint text-[11px]">{collapsed[i] ? '⌄' : '⌃'}</span>
                  </button>
                  {!collapsed[i] && (
                    <ul className="divide-y divide-line">
                      {m.tasks.map((t) => (
                        <li key={t.title} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-faint text-[11px]">□</span>
                          <span className="text-[12.5px] flex-1">{t.title}</span>
                          <span className="text-[11px] font-mono text-accent bg-[rgba(61,220,151,.1)] px-1.5 py-px rounded">{t.est}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <button onClick={toTodos} disabled={adopting}
              className="btn-press mt-4 px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
              {adopting
                ? <><span className="w-3.5 h-3.5 border-2 border-[#04110b]/30 border-t-[#04110b] rounded-full animate-spin" />采纳中…</>
                : <><IconCheck className="w-3.5 h-3.5" /> 采纳为 TodoList</>}
            </button>
          </div>

          <div className="bg-card border border-line rounded-2xl p-5 fade-up-1">
            <div className="flex items-center gap-2">
              <b className="text-[14px]">技术方案</b>
              <button onClick={copyTech} className="ml-auto text-faint hover:text-dim text-[12px] inline-flex items-center gap-1">
                {copied ? <><IconCheck className="w-3.5 h-3.5 text-accent" />已复制</> : <><IconCopy className="w-3.5 h-3.5" />复制</>}
              </button>
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {bd.tech.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] text-dim leading-relaxed">
                  <span className="w-4.5 h-4.5 rounded-full bg-[rgba(139,92,246,.15)] text-purple text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
