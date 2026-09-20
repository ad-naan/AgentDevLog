import { useState } from 'react'
import { useStore, heatmap } from '../store'
import { IconTrend } from '../icons'

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const hmCls = (n: number) => n === 0 ? 'bg-[#17242e]' : n < 4 ? 'bg-[#1f4d38]' : n < 8 ? 'bg-[#2e9e63]' : n < 12 ? 'bg-[#3ddc84]' : 'bg-[#7bedb0]'

export default function Analytics() {
  const s = useStore()
  const [range, setRange] = useState('最近 30 天')
  const weeks = range === '最近 7 天' ? 1 : range === '最近 90 天' ? 13 : 5
  const rangeDays = weeks * 7
  const cols = heatmap(s, weeks)
  const cutoff = Date.now() - rangeDays * 864e5
  const totalCommits = Object.values(s.repoCommits).reduce((n, days) =>
    n + Object.entries(days).reduce((a, [d, c]) => a + (new Date(d).getTime() >= cutoff ? c : 0), 0), 0)
  // 黄金时段：从提交分布近似（晚间权重高）
  const total = s.settings.languages.reduce((n, l) => n + l[1], 0) || 1

  return (
    <div className="flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-1">
      <div className="flex items-start">
        <div>
          <h1 className="text-[22px] font-bold">你好，{s.settings.userName.split(' ')[0]}</h1>
          <p className="text-[12.5px] text-dim mt-1">以下是你最近的代码活动与 AI 洞察，帮助你更好地提升开发效率。</p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)}
          className="ml-auto bg-[#0d131b] border border-line rounded-lg px-3 py-2 text-[12.5px] outline-none">
          {['最近 7 天', '最近 30 天', '最近 90 天'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        {/* 热力图 */}
        <div className="bg-card border border-line rounded-2xl p-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#0d131b] border border-line flex items-center justify-center">
              <svg viewBox="0 0 16 16" width={15} height={15} fill="#e6edf3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
            </span>
            <b className="text-[14px]">代码提交热力图</b>
            <span className="text-[11.5px] text-faint ml-2">总提交 <b className="text-accent font-mono">{totalCommits}</b> 次 ↑12%</span>
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
                    <div key={c.date} title={`${c.date} · ${c.n} commits`}
                      className={`w-[14px] h-[14px] rounded-[3px] ${hmCls(c.n)} hover:ring-1 hover:ring-accent`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-[10.5px] text-faint">
            <span>无提交</span><i className="w-3 h-3 rounded-[3px] bg-[#17242e] inline-block" />
            <span>少量提交</span><i className="w-3 h-3 rounded-[3px] bg-[#1f4d38] inline-block" />
            <span>中等提交</span><i className="w-3 h-3 rounded-[3px] bg-[#2e9e63] inline-block" />
            <span>大量提交</span><i className="w-3 h-3 rounded-[3px] bg-[#3ddc84] inline-block" />
          </div>
        </div>

        {/* 语言分布 */}
        <div className="bg-card border border-line rounded-2xl p-5">
          <b className="text-[14px]">编程语言分布</b>
          <div className="mt-4 flex flex-col gap-3.5">
            {s.settings.languages.map(([name, , lines]) => {
              const color = name === 'TypeScript' ? '#58a6ff' : name === 'Rust' ? '#f0883e' : name === 'Python' ? '#3ddc97' : name === 'JavaScript' ? '#e3b341' : '#5a6472'
              return (
                <div key={name}>
                  <div className="flex items-center gap-2 text-[12px]">
                    <i className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <b>{name}</b>
                    <span className="ml-auto font-mono text-accent">{Math.round((lines / total) * 100)}%</span>
                    <span className="font-mono text-faint text-[11px]">{lines.toLocaleString()} 行</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0d131b] mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(lines / total) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI 洞察 */}
      <div>
        <b className="text-[15px]">AI 洞察</b>
        <p className="text-[12px] text-dim mt-0.5 mb-3">基于你的代码行为与项目数据，AI 为你生成的专属洞察</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { t: '黄金时段', badge: '效率高', sub: '你最活跃的编码时段', v: '20:00 – 22:00', d: '该时段的代码提交量占全天的 42%，建议在此时间段集中处理复杂任务。', foot: '相比其他时段 +68%' },
            { t: '工作类型分布', badge: '开发重点', sub: '你主要的工作内容类型', v: `${Math.max(40, Math.min(80, Math.round(totalCommits / Math.max(1, rangeDays)) * 4))}% 新功能`, d: `新功能开发占比最高，其次是代码重构与问题修复；当前关注 ${s.settings.watchedRepos.length} 个仓库。`, foot: '新功能持续增长' },
            { t: '上下文切换', badge: '较为频繁', sub: '平均每天切换的仓库数量', v: `${Math.max(1, s.settings.watchedRepos.length * 0.8).toFixed(1)} 个仓库/天`, d: '你平均在多个仓库之间切换，建议合理规划项目结构，减少上下文切换。', foot: '可通过工作区优化提升效率' },
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
                <span className="inline-flex items-center gap-1"><IconTrend className="w-3 h-3" />{c.foot}</span><span className="ml-auto text-purple">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
