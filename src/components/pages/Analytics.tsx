'use client'

import { useState } from 'react'
import { useStore } from '../StoreProvider'
import { heatmap } from '@/lib/types'
import { IconTrend } from '../icons'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const hmCls = (n: number) => n === 0 ? 'bg-[#17242e]' : n < 4 ? 'bg-[#1f4d38]' : n < 8 ? 'bg-[#2e9e63]' : n < 12 ? 'bg-[#3ddc84]' : 'bg-[#7bedb0]'

export default function Analytics() {
  const { s } = useStore()
  const [range, setRange] = useState('最近 30 天')
  const [selDate, setSelDate] = useState<string | null>(null)
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const weeks = range === '最近 7 天' ? 1 : range === '最近 90 天' ? 13 : 5
  const rangeDays = weeks * 7
  const cols = heatmap(s, weeks)
  const cutoff = Date.now() - rangeDays * 864e5
  const totalCommits = Object.values(s.repoCommits).reduce((n, days) =>
    n + Object.entries(days).reduce((a, [d, c]) => a + (new Date(d).getTime() >= cutoff ? c : 0), 0), 0)
  const langTotal = s.settings.languages.reduce((n, l) => n + l[1], 0) || 1

  return (
    <div className="flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-1">
      <div className="flex items-start">
        <div>
          <h1 className="text-[22px] font-bold">你好，{s.user.name.split(' ')[0]}</h1>
          <p className="text-[12.5px] text-dim mt-1">以下是你最近的代码活动，帮助你更好地提升开发效率。</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)}
          className="ml-auto bg-inset border border-line rounded-lg px-3 py-2 text-[12.5px] outline-none">
          {['最近 7 天', '最近 30 天', '最近 90 天'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="bg-card border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-inset border border-line flex items-center justify-center">
              <svg viewBox="0 0 16 16" width={15} height={15} fill="#e6edf3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
            </span>
            <b className="text-[14px]">代码提交热力图</b>
            <span className="text-[11.5px] text-faint ml-2">范围内总提交 <b className="text-accent font-mono">{totalCommits}</b> 次</span>
            <span className="ml-auto text-[11px] text-faint">{range} · {weeks} 列（每列 1 周）</span>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex flex-col justify-between py-px text-[10px] text-faint shrink-0">
              {DAYS.map((d) => <span key={d} className="leading-[16px]">{d}</span>)}
            </div>
            <div className="flex gap-[5px] overflow-x-auto flex-1 pb-1">
              {cols.map((col, i) => (
                <div key={i} className="flex flex-col gap-[5px]">
                  {col.map((c) => (
                    <div key={c.date} title={`${c.date} · ${c.n} commits`} onClick={() => setSelDate(selDate === c.date ? null : c.date)}
                      className={`w-[14px] h-[14px] rounded-[3px] ${hmCls(c.n)} hover:ring-1 hover:ring-accent cursor-pointer ${selDate === c.date ? 'ring-1 ring-accent' : ''}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {selDate && (() => {
            const day = Object.entries(s.repoCommits)
              .map(([repo, days]) => ({ repo, n: days[selDate] ?? 0 }))
              .filter((x) => x.n > 0)
              .sort((a, b) => b.n - a.n)
            const totalDay = day.reduce((n, x) => n + x.n, 0)
            return (
              <div className="fade-up mt-3 rounded-xl border border-line bg-inset p-3.5">
                <div className="flex items-center gap-2 text-[12px]">
                  <b>{selDate}</b>
                  <span className="text-faint">共 <b className="text-accent font-mono">{totalDay}</b> 次提交</span>
                  <button onClick={() => setSelDate(null)} className="ml-auto text-[11px] text-faint hover:text-dim">取消选中</button>
                </div>
                {day.length === 0
                  ? <p className="mt-2 text-[11.5px] text-faint">当日无提交记录</p>
                  : <div className="mt-2 flex flex-col gap-1.5">
                      {day.map((x) => (
                        <div key={x.repo} className="flex items-center gap-2 text-[11.5px]">
                          <span className="text-dim">{x.repo}</span>
                          <span className="ml-auto font-mono text-accent">{x.n}</span>
                        </div>
                      ))}
                    </div>}
              </div>
            )
          })()}
          <div className="flex items-center gap-4 mt-4 text-[10.5px] text-faint">
            <span>无提交</span><i className="w-3 h-3 rounded-[3px] bg-[#17242e] inline-block" />
            <span>少量提交</span><i className="w-3 h-3 rounded-[3px] bg-[#1f4d38] inline-block" />
            <span>中等提交</span><i className="w-3 h-3 rounded-[3px] bg-[#2e9e63] inline-block" />
            <span>大量提交</span><i className="w-3 h-3 rounded-[3px] bg-[#3ddc84] inline-block" />
          </div>
          {totalCommits === 0 && (
            <p className="text-[12px] text-faint mt-3">暂无提交数据 —— 到「设置」添加关注仓库并点击「立即同步」，热力图会填充真实提交记录。</p>
          )}
        </div>

        <div className="bg-card border border-line rounded-2xl p-5">
          <b className="text-[14px]">编程语言分布</b>
          <div className="mt-4 flex flex-col gap-3.5">
            {s.settings.languages.length === 0 && <p className="text-[12px] text-faint">尚未配置（可在 Settings.languages 中维护）。</p>}
            {s.settings.languages.map(([name, , lines]) => {
              const color = name === 'TypeScript' ? '#58a6ff' : name === 'Rust' ? '#f0883e' : name === 'Python' ? '#3ddc97' : name === 'JavaScript' ? '#e3b341' : '#5a6472'
              return (
                <div key={name}>
                  <div className="flex items-center gap-2 text-[12px]">
                    <i className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <b>{name}</b>
                    <span className="ml-auto font-mono text-accent">{Math.round((lines / langTotal) * 100)}%</span>
                    <span className="font-mono text-faint text-[11px]">{lines.toLocaleString()} 行</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-inset mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(lines / langTotal) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <b className="text-[15px]">数据洞察</b>
        <p className="text-[12px] text-dim mt-0.5 mb-3">基于数据库中的真实提交与日志数据</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { t: '活跃天数', badge: '范围内', sub: `${range}内有提交的天数`, v: `${Object.values(s.repoCommits).reduce((n, days) => n + Object.entries(days).filter(([d]) => new Date(d).getTime() >= cutoff && days[d] > 0).length, 0)} 天`, d: '保持稳定的提交节奏有助于形成连续的工作记录。', foot: '数据来自 GitHub 同步' },
            { t: '日均提交', badge: '均值', sub: '范围内平均每日提交数', v: (totalCommits / Math.max(1, rangeDays)).toFixed(1), d: `当前关注 ${s.settings.watchedRepos.length} 个仓库，新功能与修复并行推进。`, foot: '按自然日统计' },
            { t: '关注仓库', badge: '同步源', sub: '当前纳入统计的仓库', v: `${s.settings.watchedRepos.length} 个`, d: '在设置页可以增删关注仓库，同步后热力图与动态流随之更新。', foot: 'GitHub Events API' },
          ].map((c) => (
            <div key={c.t} className="insight-glow border border-[rgba(139,92,246,.25)] rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[rgba(139,92,246,.2)] flex items-center justify-center text-purple text-[12px]">✦</span>
                <b className="text-[13.5px]">{c.t}</b>
                <span className="ml-auto text-[10px] text-purple bg-[rgba(139,92,246,.15)] px-2 py-px rounded-full">{c.badge}</span>
              </div>
              <span className="text-[11px] text-faint">{c.sub}</span>
              <div className="text-center py-3 rounded-xl bg-[rgba(139,92,246,.08)] border border-[rgba(139,92,246,.3)] shadow-[0_0_18px_rgba(139,92,246,.12)]">
                <b className="text-[19px] text-purple font-mono">{c.v}</b>
              </div>
              <p className="text-[11.5px] text-dim leading-relaxed">{c.d}</p>
              <div className="mt-auto flex items-center text-[11px] text-faint">
                <span className="inline-flex items-center gap-1"><IconTrend className="w-3 h-3" />{c.foot}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
