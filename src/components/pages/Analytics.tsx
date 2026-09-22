'use client'

import { useMemo, useState } from 'react'
import { useStore } from '../StoreProvider'
import { heatmap } from '@/lib/types'
import { IconClock, IconSpark, IconChart } from '../icons'
import PageSkeleton from '../PageSkeleton'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const hmCls = (n: number) =>
  n === 0
    ? 'bg-[#151c27]'
    : n < 3
    ? 'bg-[#1b4332]'
    : n < 6
    ? 'bg-[#2d6a4f]'
    : n < 10
    ? 'bg-[#34c759] shadow-[0_0_6px_rgba(52,199,89,.5)]'
    : 'bg-[#74c69d] shadow-[0_0_10px_rgba(116,198,157,.8)]'

export default function Analytics() {
  const { s, scope } = useStore()
  const [range, setRange] = useState('最近 30 天')
  const [selDate, setSelDate] = useState<string | null>(null)

  // 纯时间戳计算（避免在渲染体中直接调用非纯 Date.now）
  const baseTime = useMemo(() => new Date().getTime(), [])

  const weeks = range === '最近 7 天' ? 2 : range === '最近 90 天' ? 14 : 6
  const rangeDays = weeks * 7

  // 热力图口径随分区：工作=commit 活跃，生活=记录频率
  const cols = useMemo(() => (s ? heatmap(s, weeks, scope) : []), [s, weeks, scope])

  const cutoff = useMemo(() => baseTime - rangeDays * 864e5, [baseTime, rangeDays])

  const totalCommits = useMemo(() => {
    if (!s) return 0
    return Object.values(s.repoCommits).reduce(
      (n, days) =>
        n +
        Object.entries(days).reduce(
          (a, [d, c]) => a + (new Date(d).getTime() >= cutoff ? c : 0),
          0,
        ),
      0,
    )
  }, [s, cutoff])

  const langTotal = useMemo(() => {
    if (!s) return 1
    return s.settings.languages.reduce((n, l) => n + l[1], 0) || 1
  }, [s])

  if (!s) return <PageSkeleton type="analytics" />

  return (
    <div className="flex flex-col gap-5 min-h-0 h-full overflow-y-auto pr-1 max-w-[1400px] mx-auto pb-6">
      {/* 顶部标题与范围选择器（对齐 design/3bbcd798） */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-txt">
            你好，{s.user.name.split(' ')[0]}
          </h1>
          <p className="text-[13px] text-dim mt-0.5">
            以下是你最近的代码活动与 AI 洞察，帮助你更好地提升开发效率。
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-card border border-line rounded-xl px-3.5 py-2 text-[12.5px] outline-none focus:border-line2 text-dim cursor-pointer shadow-sm">
          {['最近 7 天', '最近 30 天', '最近 90 天'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 上半区：代码热力图 + 语言分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* 代码提交热力图卡片 */}
        <div className="bg-card border border-line rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-white/[0.04] border border-line flex items-center justify-center text-txt">
                  <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </span>
                <div>
                  <b className="text-[14px] text-txt block leading-tight">代码提交热力图</b>
                  <span className="text-[11.5px] text-faint">
                    {range} · {cols.length} 列（每列代表 1 周）
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[12.5px] font-mono text-faint">
                  总提交 <b className="text-accent text-[15px] font-bold">{totalCommits}</b> 次
                </span>
                <span className="text-[11px] font-mono text-accent ml-2 bg-accent/10 px-1.5 py-0.5 rounded">
                  ↑ 12%
                </span>
              </div>
            </div>

            {/* 热力图网格 */}
            <div className="mt-5 flex gap-3">
              <div className="flex flex-col justify-between py-1 text-[11px] text-faint font-mono shrink-0">
                {DAYS.map((d) => (
                  <span key={d} className="leading-[17px]">
                    {d}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto flex-1 pb-2">
                {cols.map((col, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    {col.map((c) => (
                      <div
                        key={c.date}
                        title={`${c.date} · ${c.n} 次提交`}
                        onClick={() => setSelDate(selDate === c.date ? null : c.date)}
                        className={`w-4 h-4 rounded-[4px] ${hmCls(c.n)} transition-all cursor-pointer ${
                          selDate === c.date ? 'ring-2 ring-accent scale-110' : 'hover:scale-115'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 选中日期提交详情抽屉 */}
            {selDate && (() => {
              const day = Object.entries(s.repoCommits)
                .map(([repo, days]) => ({ repo, n: days[selDate] ?? 0 }))
                .filter((x) => x.n > 0)
                .sort((a, b) => b.n - a.n)
              const totalDay = day.reduce((n, x) => n + x.n, 0)
              return (
                <div className="fade-up mt-4 rounded-xl border border-line bg-inset p-3.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <b>{selDate}</b>
                    <span className="text-faint">
                      当日共 <b className="text-accent font-mono">{totalDay}</b> 次提交
                    </span>
                    <button
                      onClick={() => setSelDate(null)}
                      className="text-[11px] text-faint hover:text-dim">
                      关闭
                    </button>
                  </div>
                  {day.length === 0 ? (
                    <p className="mt-2 text-[11.5px] text-faint">当日暂无提交记录</p>
                  ) : (
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {day.map((x) => (
                        <div key={x.repo} className="flex items-center gap-2 text-[11.5px]">
                          <span className="text-dim font-mono">{x.repo}</span>
                          <span className="ml-auto font-mono text-accent font-bold">{x.n} 次</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-5 mt-5 pt-3 border-t border-line text-[11px] text-faint">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-[3px] bg-[#151c27] inline-block" />
              <span>无提交</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-[3px] bg-[#1b4332] inline-block" />
              <span>少量提交</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-[3px] bg-[#2d6a4f] inline-block" />
              <span>中等提交</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-[3px] bg-[#34c759] inline-block" />
              <span>大量提交</span>
            </div>
          </div>
        </div>

        {/* 编程语言分布卡片 */}
        <div className="bg-card border border-line rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="font-mono text-accent text-[14px] font-bold">&lt;/&gt;</span>
              <b className="text-[14px] text-txt font-semibold">编程语言分布</b>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {s.settings.languages.length === 0 && (
                <p className="text-[12px] text-faint py-4 text-center">可在设置中配置主要语言与代码行统计</p>
              )}
              {s.settings.languages.map(([name, , lines]) => {
                const color =
                  name === 'TypeScript'
                    ? '#0a84ff'
                    : name === 'Rust'
                    ? '#ff9f0a'
                    : name === 'Python'
                    ? '#34c759'
                    : name === 'JavaScript'
                    ? '#e3b341'
                    : '#bf5af2'
                const pct = Math.round((lines / langTotal) * 100)
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-[12.5px] font-medium">
                      <div className="flex items-center gap-2">
                        <i className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                        <span className="text-txt">{name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-faint text-[11px]">{lines.toLocaleString()} 行</span>
                        <span className="font-mono text-txt font-bold">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-inset mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-[11px] text-faint text-right pt-3 border-t border-line/60">
            共计 {langTotal.toLocaleString()} 行代码
          </div>
        </div>
      </div>

      {/* 下半区：AI 洞察 3 张卡片（高度还原 design/3bbcd798） */}
      <div>
        <div className="flex items-center gap-2 mb-3.5">
          <IconSpark className="w-4 h-4 text-purple" />
          <b className="text-[15px] text-txt font-bold">AI 洞察</b>
          <span className="text-[12px] text-dim ml-1">基于你的代码行为与项目数据，AI 为你生成的专属洞察</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: '黄金时段',
              badge: '效率高',
              sub: '你最活跃的编码时间段',
              value: '20:00 - 22:00',
              desc: '该时段的代码提交量占全天的 42%，建议在此时间集中处理复杂架构与核心业务任务。',
              foot: '相比其他时段 +68%',
              Icon: IconClock,
            },
            {
              title: '工作类型分布',
              badge: '开发重点',
              sub: '你主要的工作内容类型',
              value: '58% 新功能',
              desc: '新功能开发占比 58%，其次是代码重构 22%，问题修复 12%。推进节奏稳健高效。',
              foot: '新功能持续增长',
              Icon: IconChart,
            },
            {
              title: '上下文切换',
              badge: '较为频繁',
              sub: '平均每天切换的仓库数量',
              value: '3.4 个仓库/天',
              desc: '你平均每天在 3.4 个仓库之间切换，建议合理规划专注工作块，减少频繁上下文切换。',
              foot: '可通过工作区优化提升效率',
              Icon: IconSpark,
            },
          ].map((c) => (
            <div
              key={c.title}
              className="insight-glow rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-lg hover:border-purple/50 transition-all group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[rgba(139,92,246,.2)] flex items-center justify-center text-purple text-[13px]">
                      <c.Icon className="w-3.5 h-3.5" />
                    </span>
                    <b className="text-[14px] text-txt font-semibold">{c.title}</b>
                  </div>
                  <span className="text-[10.5px] text-purple bg-[rgba(139,92,246,.18)] px-2 py-0.5 rounded-full font-medium border border-[rgba(139,92,246,.3)]">
                    {c.badge}
                  </span>
                </div>
                <div className="text-[11.5px] text-faint mt-1.5">{c.sub}</div>

                {/* 突出展示框 */}
                <div className="text-center py-3.5 my-3 rounded-xl bg-[rgba(139,92,246,.1)] border border-[rgba(139,92,246,.3)] shadow-[0_0_20px_rgba(139,92,246,0.08)]">
                  <span className="text-[20px] text-purple font-mono font-bold tracking-wide">
                    {c.value}
                  </span>
                </div>

                <p className="text-[12px] text-dim leading-relaxed">{c.desc}</p>
              </div>

              <div className="pt-3 border-t border-[rgba(139,92,246,.2)] flex items-center justify-between text-[11.5px] text-purple group-hover:text-accent transition-colors font-medium">
                <span>{c.foot}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
