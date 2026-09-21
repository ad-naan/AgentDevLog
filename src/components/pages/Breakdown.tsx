'use client'

import { useState } from 'react'
import { useStore } from '../StoreProvider'
import { useToast, apiError } from '../Toast'
import type { BreakdownDTO } from '@/lib/types'
import { IconSpark, IconCopy, IconCheck, IconRobot, IconLink } from '../icons'

const MODES: [BreakdownDTO['mode'], string, string][] = [
  ['标准', '◫', '按功能模块拆解'],
  ['详细', '⧗', '细化到具体任务'],
  ['精简', '✦', '只保留核心任务'],
]

export default function Breakdown() {
  const { s, api, refresh } = useStore()
  const toast = useToast()
  const [bd, setBd] = useState<BreakdownDTO>(
    () =>
      s?.breakdowns[0] || {
        id: 0,
        requirement:
          '实现一个电商平台的商品管理功能，包含商品的增删改查、分类管理、库存管理和上下架控制。\n\n具体要求：\n1. 支持商品基本信息管理（名称、价格、描述、图片等）\n2. 支持多级分类（最多3级）\n3. 实现库存预警（库存低于10时提醒）\n4. 支持商品上下架状态管理\n5. 提供商品列表页和详情页的接口\n6. 后台需要有权限控制（仅管理员可操作）',
        mode: '标准',
        status: 'done',
        modules: [
          {
            name: '商品基础管理模块',
            tasks: [
              { title: '商品数据模型设计与数据库表创建', est: '0.5d' },
              { title: '商品增删改查接口开发 (CRUD)', est: '1d' },
              { title: '图片上传与存储功能实现', est: '0.5d' },
              { title: '商品信息前端页面开发', est: '1d' },
            ],
          },
          {
            name: '分类管理模块',
            tasks: [
              { title: '分类数据模型设计与树形结构支持', est: '0.5d' },
              { title: '多级分类接口开发 (最多3级)', est: '1d' },
              { title: '分类管理前端级联页面开发', est: '1d' },
            ],
          },
          {
            name: '库存与上下架管理模块',
            tasks: [
              { title: '库存管理与预警通知机制开发', est: '1d' },
              { title: '上下架状态控制接口开发', est: '0.5d' },
              { title: '相关前端状态联动页面开发', est: '1d' },
            ],
          },
        ],
        tech: [
          '技术栈: Next.js 16 + React 19 + TypeScript + PostgreSQL + Prisma',
          '商品图片: 使用对象存储或云存储，支持多张图片上传与 WebP 压缩',
          '分类管理: 自关联实现多级分类，支持最多 3 级树状展开',
          '库存预警: 定时任务 + Redis/内存缓存，低于阈值时触发自动提醒',
          '权限控制: 基于 RBAC 的权限管理，仅指定权限角色可执行上下架',
          '接口设计: RESTful API，统一响应格式与参数校验，支持游标分页查询',
        ],
        createdAt: '2026-09-20 22:41',
      },
  )

  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adopting, setAdopting] = useState(false)

  const tkey = (mi: number, ti: number) => `${mi}-${ti}`
  const allKeys = () => bd.modules.flatMap((m, mi) => m.tasks.map((_, ti) => tkey(mi, ti)))

  const [checked, setChecked] = useState<Set<string>>(() => new Set(allKeys()))

  const selectedCount = bd.status === 'done' ? allKeys().filter((k) => checked.has(k)).length : 0
  const toggleTask = (k: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const totalTasks = bd.modules.reduce((n, m) => n + m.tasks.length, 0)

  const run = async () => {
    if (!bd.requirement.trim() || bd.status === 'running') return
    setError(null)
    setBd({ ...bd, status: 'running' })
    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: bd.requirement, mode: bd.mode }),
      })
      if (res.ok) {
        const j = (await res.json()) as BreakdownDTO
        const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
        setBd({ ...bd, status: 'done', modules: j.modules, tech: j.tech, createdAt })
        setChecked(new Set(j.modules.flatMap((m, mi) => m.tasks.map((_, ti) => tkey(mi, ti)))))
        toast(
          `✦ AI 拆解完成：${j.modules.length} 个模块 · ${j.modules.reduce((n, m) => n + m.tasks.length, 0)} 个任务`,
          'success',
        )
      } else {
        setBd({ ...bd, status: 'idle' })
        setError(await apiError(res))
      }
    } catch {
      setBd({ ...bd, status: 'idle' })
      setError('网络请求失败，请稍后重试')
    }
    await refresh()
  }

  const toTodos = async () => {
    if (adopting || selectedCount === 0) return
    setAdopting(true)
    const titles = bd.modules
      .flatMap((m, mi) => m.tasks.map((t, ti) => ({ title: t.title, k: tkey(mi, ti) })))
      .filter((x) => checked.has(x.k))
      .map((x) => x.title)
    for (const title of titles) {
      await api('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'P2', due: '本周', scope: 'work', source: 'AI 拆解', tag: '产品' }),
      })
    }
    setAdopting(false)
    toast(`已将 ${titles.length} 个拆解任务采纳到 TodoList`, 'success')
  }

  const copyTech = () => {
    navigator.clipboard.writeText(bd.tech.map((x, i) => `${i + 1}. ${x}`).join('\n'))
    setCopied(true)
    toast('已复制技术方案要点', 'info')
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full min-h-0 max-w-[1400px] mx-auto overflow-y-auto pr-1">
      {/* 左栏：需求输入与模式选择（对齐 design/471cdf05） */}
      <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4.5 min-h-0 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[rgba(139,92,246,.15)] border border-[rgba(139,92,246,.3)] flex items-center justify-center text-purple">
              <IconRobot className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-txt">AI 需求拆解</h1>
              <p className="text-[12px] text-dim mt-0.5">将复杂需求拆解为可执行的开发任务，提升团队协作效率</p>
            </div>
          </div>
        </div>

        {/* 需求输入区 */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-txt flex items-center gap-1.5">
              <IconSpark className="w-3.5 h-3.5 text-accent" />
              需求输入
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-blue bg-blue/10 border border-blue/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <IconLink className="w-2.5 h-2.5" />
                issue #120
              </span>
              <span className="text-[11px] font-mono text-purple bg-purple/10 border border-purple/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                🤖 agent
              </span>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              value={bd.requirement}
              onChange={(e) => setBd({ ...bd, requirement: e.target.value })}
              rows={12}
              spellCheck={false}
              placeholder="粘贴需求描述、PRD 片段或用户故事，AI 将自动分析并建立模块任务树…"
              className="w-full h-full min-h-[240px] bg-inset border border-line rounded-xl px-4 py-3 text-[13px] leading-relaxed font-sans outline-none focus:border-accent focus:shadow-[0_0_12px_rgba(61,220,151,.1)] resize-none"
            />
            <div className="absolute right-3.5 bottom-3 text-[11px] font-mono text-faint">
              {bd.requirement.length}/2000
            </div>
          </div>
        </div>

        {error && (
          <div className="fade-up flex items-start gap-2 border border-red/30 bg-red/10 rounded-xl p-3 text-[12px] text-red">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        {/* 拆解模式卡片组 */}
        <div>
          <span className="text-[12px] font-semibold text-txt block mb-2.5">拆解模式</span>
          <div className="grid grid-cols-3 gap-2.5">
            {MODES.map(([m, ic, d]) => {
              const active = bd.mode === m
              return (
                <button
                  key={m}
                  onClick={() => setBd({ ...bd, mode: m })}
                  disabled={bd.status === 'running'}
                  className={`btn-press p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    active
                      ? 'border-purple bg-[rgba(139,92,246,.14)] shadow-[0_0_14px_rgba(139,92,246,.25)]'
                      : 'border-line bg-inset hover:border-line2 text-dim'
                  }`}>
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[13px] font-bold ${active ? 'text-purple' : 'text-txt'}`}>
                      {m}
                    </span>
                    <span className="text-[12px] opacity-70">{ic}</span>
                  </div>
                  <span className="text-[11px] text-faint mt-1.5 leading-snug">{d}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 开始拆解按钮 */}
        <button
          onClick={run}
          disabled={bd.status === 'running' || !bd.requirement.trim()}
          className={`btn-press w-full py-3 rounded-xl text-white text-[13.5px] font-semibold disabled:opacity-60 shadow-lg ${
            bd.status === 'running'
              ? 'ai-btn-busy'
              : 'bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0] hover:shadow-[0_0_20px_rgba(109,94,240,.4)]'
          }`}>
          {bd.status === 'running' ? '✦ AI 正在智能拆解中…' : '✦ 开始拆解 →'}
        </button>
      </div>

      {/* 右栏：AI 生成的任务树与技术方案要点（对齐 design/471cdf05） */}
      <div className="flex flex-col gap-4.5 min-h-0 overflow-y-auto">
        {bd.status === 'running' && (
          <div className="bg-card border border-line rounded-2xl p-6 fade-up">
            <div className="flex items-center gap-2">
              <IconSpark className="w-4 h-4 text-purple" />
              <b className="text-[14px]">AI 正在生成任务树</b>
              <span className="text-[11.5px] text-faint flex items-center gap-1.5 ml-auto">
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                <span className="dot-breath w-1.5 h-1.5 rounded-full bg-purple" />
                分析架构中
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border border-line rounded-xl p-4">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-5/6 mt-3" />
                  <div className="skeleton h-3 w-2/3 mt-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {bd.status === 'done' && bd.modules.length > 0 && (
          <>
            {/* 任务树卡片 */}
            <div className="bg-card border border-line rounded-2xl p-5 fade-up flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <IconSpark className="w-4 h-4 text-purple" />
                  <b className="text-[14px]">AI 生成的任务树</b>
                  <span className="text-[11px] text-accent bg-[rgba(61,220,151,.12)] border border-[rgba(61,220,151,.25)] px-2 py-0.5 rounded-full font-medium">
                    拆解完成
                  </span>
                </div>
                <span className="text-[11px] text-faint font-mono">{bd.createdAt}</span>
              </div>

              {/* 模块列表与树状展开 */}
              <div className="flex flex-col gap-2.5 mt-1">
                {bd.modules.map((m, i) => {
                  const isColl = collapsed[i]
                  return (
                    <div key={m.name} className="border border-line rounded-xl overflow-hidden bg-inset/30">
                      {/* 模块标题栏 */}
                      <button
                        onClick={() => setCollapsed({ ...collapsed, [i]: !isColl })}
                        className="w-full flex items-center gap-2.5 px-4 py-3 bg-inset/80 hover:bg-white/[0.03] text-left transition-colors cursor-pointer select-none">
                        <span className="text-faint text-[10px] transition-transform duration-200">
                          {isColl ? '▸' : '▾'}
                        </span>
                        <span className="text-[11px] font-mono text-purple bg-[rgba(139,92,246,.15)] px-1.5 py-0.5 rounded font-bold">
                          模块 {i + 1}
                        </span>
                        <b className="text-[13.5px] text-txt font-semibold">{m.name}</b>
                        <span className="text-[11px] font-mono text-orange font-bold ml-auto bg-orange/10 px-2 py-0.5 rounded border border-orange/20">
                          {m.tasks.reduce((sum, t) => sum + parseFloat(t.est || '1'), 0)}d
                        </span>
                      </button>

                      {/* 子任务列表（带有枝干树线样式） */}
                      {!isColl && (
                        <div className="px-4 py-2 flex flex-col divide-y divide-line/40">
                          {m.tasks.map((t, ti) => {
                            const k = tkey(i, ti)
                            const isTaskChecked = checked.has(k)
                            return (
                              <div
                                key={t.title}
                                className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] px-2 rounded-lg transition-colors group">
                                <span className="text-faint font-mono text-[11px] shrink-0 select-none">
                                  └─ {i + 1}.{ti + 1}
                                </span>
                                <button
                                  onClick={() => toggleTask(k)}
                                  aria-label={isTaskChecked ? '取消' : '勾选'}
                                  className={`w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center shrink-0 transition-all btn-press ${
                                    isTaskChecked
                                      ? 'bg-accent border-accent text-[#04110b] shadow-[0_0_8px_rgba(61,220,151,.4)]'
                                      : 'border-line2 group-hover:border-accent'
                                  }`}>
                                  {isTaskChecked && <IconCheck className="w-2.5 h-2.5" strokeWidth={2.8} />}
                                </button>
                                <span
                                  className={`text-[12.5px] flex-1 leading-snug transition-colors ${
                                    isTaskChecked ? 'text-txt' : 'text-faint'
                                  }`}>
                                  {t.title}
                                </span>
                                <span className="text-[11px] font-mono text-orange bg-orange/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                                  {t.est}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 技术方案要点卡片（对齐设计图） */}
            <div className="bg-card border border-line rounded-2xl p-5 fade-up flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <b className="text-[13.5px] flex items-center gap-2">
                  <span className="text-accent">📄</span>技术方案要点
                </b>
                <button
                  onClick={copyTech}
                  className="btn-press text-[11.5px] text-faint hover:text-txt flex items-center gap-1.5 bg-inset px-2.5 py-1 rounded-lg border border-line transition-colors">
                  {copied ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5 text-accent" />
                      已复制
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3.5 h-3.5" />
                      复制
                    </>
                  )}
                </button>
              </div>

              <div className="bg-inset border border-line rounded-xl p-3.5 font-mono text-[12px] leading-relaxed text-dim flex flex-col gap-2">
                {bd.tech.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-purple font-semibold">{idx + 1}.</span>
                    <span className="text-txt/90">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部进度与转入待办操作栏 */}
            <div className="bg-card border border-line rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-dim font-medium">任务拆解进度</span>
                <div className="w-28 h-2 rounded-full bg-inset overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent shadow-[0_0_8px_#3ddc97]"
                    style={{ width: `${(selectedCount / Math.max(1, totalTasks)) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-faint">
                  {selectedCount}/{totalTasks} 任务
                </span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  onClick={copyTech}
                  className="btn-press px-3.5 py-2 rounded-xl border border-line text-[12.5px] font-medium text-dim hover:text-txt hover:bg-white/[0.04]">
                  生成技术方案
                </button>
                <button
                  onClick={toTodos}
                  disabled={adopting || selectedCount === 0}
                  className="btn-press px-4 py-2 rounded-xl bg-accent text-[#04110b] text-[12.5px] font-semibold hover:bg-accent-hover shadow-[0_0_14px_rgba(61,220,151,.35)] disabled:opacity-50 inline-flex items-center gap-1.5">
                  {adopting ? (
                    '正在转入…'
                  ) : (
                    <>
                      <IconCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
                      转 Issue / Todo
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
