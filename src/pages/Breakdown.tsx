import { useState } from 'react'
import { useStore, setState, type Breakdown as BD } from '../store'
import { IconSpark, IconLink, IconReport, IconCopy } from '../icons'

const MODES: [BD['mode'], string, string][] = [
  ['标准', '◫', '按功能模块拆解'],
  ['详细', '⧗', '细化到具体任务'],
  ['精简', '✦', '只保留核心任务'],
]

// 本地规则拆解引擎：按编号需求行 → 模块 → 任务
function breakdownReq(req: string, mode: BD['mode']) {
  const lines = req.split('\n').map((x) => x.trim()).filter(Boolean)
  const head = lines.find((l) => !/^\d/.test(l)) || '需求实现'
  const items = lines.filter((l) => /^\d+[.、]/.test(l)).map((l) => l.replace(/^\d+[.、]\s*/, ''))
  const groups: Record<string, string[]> = {}
  if (items.length === 0) { groups['核心模块'] = [head] } else {
    for (const it of items) {
      const key = /分类/.test(it) ? '分类管理模块'
        : /库存|上下架/.test(it) ? '库存与上下架管理模块'
        : /权限|登录/.test(it) ? '权限与安全模块'
        : /页面|前端|UI/.test(it) ? '前端页面模块'
        : /接口|API/.test(it) ? '接口服务模块'
        : /数据|模型|表|存储/.test(it) ? '数据模型模块'
        : '核心功能模块'
      ;(groups[key] ||= []).push(it)
    }
  }
  const estOf = (t: string) => (/简单|文档|页面/.test(t) ? '0.5d' : /预警|权限|存储/.test(t) ? '1d' : '1d')
  return Object.entries(groups).map(([name, tasks]) => ({
    name,
    tasks: mode === '精简' ? tasks.slice(0, 1).map((t) => ({ title: t, est: estOf(t) }))
      : mode === '详细' ? [
        { title: `${name.replace('模块', '')}方案设计与技术选型`, est: '0.5d' },
        ...tasks.map((t) => ({ title: t, est: estOf(t) })),
        { title: `${name.replace('模块', '')}联调测试与文档补充`, est: '0.5d' },
      ] : tasks.map((t) => ({ title: t, est: estOf(t) })),
  }))
}

function techPlan(req: string): string[] {
  const t = ['技术栈：结合现有仓库技术栈，前后端分离，统一 RESTful API 规范']
  if (/图片|上传/.test(req)) t.push('商品图片：使用 OSS 对象存储，支持多张图片上传')
  if (/分类|多级/.test(req)) t.push('分类管理：自关联表实现多级分类，支持最多3级')
  if (/库存/.test(req)) t.push('库存预警：定时任务 + Redis 缓存，低于阈值时发送通知')
  if (/权限/.test(req)) t.push('权限控制：基于 RBAC 的权限管理，管理员角色具有全部权限')
  if (/接口|API/.test(req)) t.push('接口设计：RESTful API，统一响应格式，支持分页查询')
  if (t.length === 1) t.push('实现策略：先核心链路后边缘功能，逐模块交付并验证')
  return t
}

export default function Breakdown() {
  const s = useStore()
  const [bd, setBd] = useState<BD>(() => s.breakdowns[0] || {
    id: 'b0', requirement: '', mode: '标准', status: 'idle', modules: [], tech: [], createdAt: '',
  })
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const totalDays = bd.modules.reduce((n, m) => n + m.tasks.length, 0)
  const [copied, setCopied] = useState(false)

  const run = () => {
    if (!bd.requirement.trim()) return
    setBd({ ...bd, status: 'running' })
    setTimeout(() => setBd({
      ...bd, status: 'done', tech: techPlan(bd.requirement),
      modules: breakdownReq(bd.requirement, bd.mode),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }), 700)
  }
  const copyTech = () => {
    navigator.clipboard?.writeText(bd.tech.map((t, i) => `${i + 1}. ${t}`).join('\n'))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  const toTodos = () => {
    setState((d) => {
      for (const m of bd.modules) for (const t of m.tasks) {
        if (d.todos.some((x) => x.title === t.title)) continue
        d.todos.unshift({
          id: `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: t.title, done: false,
          priority: 'P1', due: '本周', scope: d.scope, source: '手动', tag: '产品',
          createdAt: Date.now(), updatedAt: Date.now(),
        })
      }
    })
  }

  return (
    <div className="grid grid-cols-[440px_1fr] gap-4 h-full min-h-0">
      {/* 左栏：输入 */}
      <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple2 flex items-center justify-center shrink-0"><IconSpark className="w-5 h-5 text-purple" /></div>
          <div>
            <b className="text-[15px] block">AI 需求拆解</b>
            <p className="text-[11.5px] text-dim mt-0.5 leading-relaxed">将复杂需求拆解为可执行的开发任务，提升协作效率</p>
          </div>
        </div>

        <div>
          <b className="text-[13px]">需求输入</b>
          <div className="flex gap-1.5 mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[rgba(88,166,255,.4)] text-blue inline-flex items-center gap-1"><IconLink className="w-3 h-3" />issue #120</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[rgba(139,92,246,.4)] text-purple">🤖 agent</span>
          </div>
          <textarea value={bd.requirement} onChange={(e) => setBd({ ...bd, requirement: e.target.value.slice(0, 2000) })} rows={10}
            placeholder="粘贴需求描述，支持 1. 2. 3. 编号列表，AI 会按编号拆解…"
            className="mt-2 w-full bg-[#0d131b] border border-line rounded-xl px-3.5 py-3 text-[12.5px] leading-relaxed outline-none focus:border-purple/50 resize-none font-mono" />
          <div className="text-right text-[10.5px] text-faint font-mono mt-1">{bd.requirement.length}/2000</div>
        </div>

        <div>
          <b className="text-[13px]">拆解模式</b>
          <div className="mt-2 flex flex-col gap-2">
            {MODES.map(([m, icon, d]) => (
              <button key={m} onClick={() => setBd({ ...bd, mode: m })}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors
                  ${bd.mode === m ? 'border-purple bg-[rgba(139,92,246,.1)] shadow-[0_0_14px_rgba(139,92,246,.12)]' : 'border-line hover:border-line2'}`}>
                <span className={bd.mode === m ? 'text-purple' : 'text-faint'}>{icon}</span>
                <b className="text-[13px]">{m}</b>
                <span className="text-[11.5px] text-faint">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={run} disabled={bd.status === 'running' || !bd.requirement.trim()}
          className="w-full py-3 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[#8b5cf6] to-[#6D5EF0] disabled:opacity-50 flex items-center justify-center gap-2">
          {bd.status === 'running'
            ? <><i className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />拆解中…</>
            : <>✦ 开始拆解 →</>}
        </button>
      </div>

      {/* 右栏：结果 */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line">
            <span className="text-purple">✦</span>
            <b className="text-[13.5px]">AI 生成的任务树</b>
            {bd.status === 'done' && (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[10.5px] text-accent bg-[rgba(61,220,151,.12)] px-2 py-px rounded-full">拆解完成</span>
                <span className="text-[10.5px] text-faint font-mono">{bd.createdAt}</span>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {bd.status !== 'done' && <p className="text-[12.5px] text-faint py-10 text-center">输入需求并点击「开始拆解」，任务树会在这里生成。</p>}
            {bd.modules.map((m, i) => {
              const days = m.tasks.reduce((n, t) => n + parseFloat(t.est), 0)
              const col = collapsed[i]
              return (
                <div key={m.name} className="mb-1">
                  <button onClick={() => setCollapsed({ ...collapsed, [i]: !col })}
                    className="w-full flex items-center gap-2.5 py-2.5 text-left">
                    {col ? <span className="text-faint text-[11px]">›</span> : <span className="text-accent text-[11px] w-[11px]">▾</span>}
                    <b className="text-[13.5px] font-mono text-blue">{i + 1}.</b>
                    <b className="text-[13.5px]">{m.name}</b>
                    <span className="text-[10px] px-1.5 py-px rounded bg-[rgba(88,166,255,.14)] text-blue">模块</span>
                    <span className="ml-auto font-mono text-[12px]"><b className="text-accent">{m.tasks.length}</b> <span className="text-orange">{days}d</span></span>
                  </button>
                  {!col && (
                    <div className="ml-[22px] border-l border-line pl-0">
                      {m.tasks.map((t, k) => (
                        <div key={k} className="relative flex items-center gap-2 py-1.5 pl-4">
                          <span className="absolute left-0 top-1/2 w-3 border-t border-line" />
                          <span className="text-[12.5px] text-dim flex-1">{i + 1}.{k + 1} {t.title}</span>
                          <span className="font-mono text-[11.5px] text-orange">{t.est}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-card border border-line rounded-2xl">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
            <b className="text-[13.5px] inline-flex items-center gap-1.5"><IconReport className="w-4 h-4 text-purple" />技术方案要点</b>
            <button onClick={copyTech} className="ml-auto text-faint hover:text-txt text-[12px]">{copied ? '已复制 ✓' : <span className="inline-flex items-center gap-1"><IconCopy className="w-3 h-3" />复制</span>}</button>
          </div>
          <ol className="px-5 py-3 flex flex-col gap-2">
            {bd.tech.map((t, i) => {
              const [k, ...rest] = t.split('：')
              return (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed">
                  <span className="font-mono text-orange shrink-0">{i + 1}.</span>
                  <span><b className="text-accent">{k}</b>{rest.length ? '：' : ''}{rest.join('：')}</span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="flex items-center gap-3 px-1 pb-1">
          <span className="text-[12px] text-dim shrink-0">任务拆解进度</span>
          <div className="flex-1 h-1.5 rounded-full bg-[#0d131b] overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: bd.status === 'done' ? '100%' : '0%' }} />
          </div>
          <span className="text-[11.5px] font-mono text-faint">{bd.status === 'done' ? `${bd.modules.length}/${bd.modules.length} 模块 · ${totalDays} 任务` : '0/0 模块'}</span>
          <button disabled={bd.status !== 'done'} onClick={toTodos}
            className="px-4 py-2 rounded-lg border border-line2 text-[12.5px] disabled:opacity-40 hover:bg-[rgba(255,255,255,.04)] inline-flex items-center gap-1.5"><IconReport className="w-3.5 h-3.5" />生成技术方案</button>
          <button disabled={bd.status !== 'done'} onClick={toTodos}
            className="px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[12.5px] font-semibold disabled:opacity-40">→ 转 Issue / Todo</button>
        </div>
      </div>
    </div>
  )
}
