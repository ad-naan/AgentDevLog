import { useState } from 'react'
import { useStore, setState, scopedActivities, todayStats, today } from '../store'
import { IconCheck, IconSpark, IconLog, IconPlus, IconGitBranch, IconGitMerge, IconFlame, IconArrow } from '../icons'

const Spark = ({ color = '#3ddc97' }: { color?: string }) => (
  <svg viewBox="0 0 64 22" className="w-16 h-5" fill="none">
    <path id="sparkline" d="M2 18 L10 15 L18 16 L26 10 L34 12 L42 7 L50 9 L62 3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M2 18 L10 15 L18 16 L26 10 L34 12 L42 7 L50 9 L62 3 L62 22 L2 22 Z" fill={color} opacity=".14" />
  </svg>
)

const TAG_CLS: Record<string, string> = {
  g: 'text-accent bg-[rgba(61,220,151,.12)]',
  b: 'text-blue bg-[rgba(88,166,255,.12)]',
  p: 'text-purple bg-[rgba(188,140,255,.12)]',
  r: 'text-red bg-[rgba(248,81,73,.15)]',
  d: 'text-dim bg-[rgba(255,255,255,.07)]',
  o: 'text-orange bg-[rgba(240,136,62,.14)]',
}
const TYPE_STYLE: Record<string, { label: string; icon: string; ic: string; dot: string; tc: string }> = {
  log: { label: '工作日志', icon: '✎', ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  commit: { label: 'Commit', icon: '⑂', ic: 'bg-[rgba(61,220,151,.15)] text-accent', dot: 'bg-accent', tc: 'text-accent' },
  pr: { label: 'PR', icon: '⑃', ic: 'bg-[rgba(88,166,255,.15)] text-blue', dot: 'bg-blue', tc: 'text-blue' },
  issue: { label: 'Issue', icon: '◎', ic: 'bg-[rgba(188,140,255,.15)] text-purple', dot: 'bg-purple', tc: 'text-purple' },
}

export default function Dashboard() {
  const s = useStore()
  const feed = scopedActivities(s)
  const stats = todayStats(s)
  const now = new Date()
  const hour = now.getHours()
  const greet = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const scopeAccent = s.scope === 'work' ? 'text-accent' : 'text-orange'
  const [input, setInput] = useState('')

  const submit = () => {
    const text = input.trim()
    if (!text) return
    let body = text, scope = s.settings.defaultScope as 'work' | 'life'
    const cmd = text.match(/^\/(todo|idea|log|commit)\s+/)
    if (cmd) {
      body = text.slice(cmd[0].length)
      if (cmd[1] === 'todo') {
        setState((d) => { d.todos.unshift({ id: `t${Date.now()}`, title: body, done: false, priority: 'P1', due: '今天', scope, source: '手动', tag: scope === 'work' ? '产品' : '生活', createdAt: Date.now(), updatedAt: Date.now() }) })
        setInput(''); return
      }
      if (cmd[1] === 'idea' || cmd[1] === 'log') {
        setState((d) => { d.logs.unshift({ id: `l${Date.now()}`, date: today, scope, title: body, content: `# ${body}`, tags: [], mood: 3, linked: [], updatedAt: Date.now() }) })
        setInput(''); return
      }
    }
    // 普通文本 → 今日日志追加一段
    setState((d) => {
      let log = d.logs.find((l) => l.date === today && l.scope === scope)
      if (!log) {
        log = { id: `l${Date.now()}`, date: today, scope, title: scope === 'work' ? '今日工作日志' : '生活记录', content: '', tags: [], mood: 3, linked: [], updatedAt: Date.now() }
        d.logs.unshift(log)
      }
      log.content += `\n- ${body}`
      log.updatedAt = Date.now()
      const repo = d.settings.watchedRepos[0] || 'local/notes'
      d.activities.unshift({ id: `a${Date.now()}`, type: 'log', repo, scope, title: body, time: now.toTimeString().slice(0, 5), ts: Date.now() })
    })
    setInput('')
  }

  return (
    <div className="grid grid-cols-[1fr_290px] gap-4 h-full min-h-0">
      {/* 左列 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start">
          <div>
            <h1 className="text-[22px] font-bold leading-tight">
              {greet}，{s.settings.userName.split(' ')[0]}
            </h1>
            <p className="text-[12.5px] text-dim mt-1">
              {s.scope === 'work' ? '持续记录 · 积累价值 · 让努力可视化' : '认真工作 · 好好生活 · 记录当下'}
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[13px] font-medium">{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日</div>
            <div className="text-[11px] text-faint flex justify-end gap-1.5 items-center mt-0.5">
              {'日一二三四五六'[now.getDay()] + ''} 星期{'日一二三四五六'[now.getDay()]}
              <span className={`px-2 py-px rounded-full text-[10px] ${s.scope === 'work' ? 'bg-[rgba(61,220,151,.14)] text-accent' : 'bg-[rgba(240,136,62,.14)] text-orange'}`}>今天</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: IconGitBranch, bg: 'bg-[rgba(61,220,151,.14)] text-accent', n: stats.commits, l: 'commits today', c: '#3ddc97' },
            { icon: IconGitMerge, bg: 'bg-[rgba(88,166,255,.14)] text-blue', n: stats.prs, l: 'PRs merged', c: '#58a6ff' },
            { icon: IconFlame, bg: 'bg-[rgba(188,140,255,.14)] text-purple', n: stats.streak, l: 'day streak', c: '#bc8cff' },
          ].map((x) => (
            <div key={x.l} className="bg-card border border-line rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${x.bg}`}><x.icon className="w-[18px] h-[18px]" /></div>
              <div className="font-mono text-[26px] font-bold leading-tight mt-2.5">{x.n}</div>
              <div className="text-[12px] text-dim">{x.l}</div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-[11px] font-mono text-faint">近 90 天趋势</span>
                <Spark color={x.c} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-line rounded-2xl flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-line">
            <span className={scopeAccent}>◷</span>
            <b className="text-[14px]">今日动态</b>
            <span className="text-[11px] text-faint">{s.scope === 'work' ? '仅统计关注的仓库' : '生活动态'}</span>
            <span className="ml-auto text-[12px] text-dim font-mono">{feed.length} 条</span>
          </div>
          <div className="relative flex-1 overflow-y-auto px-5 py-2">
            {feed.length === 0 && (
              <p className="text-[13px] text-faint py-10 text-center">
                暂无动态。到「设置」里添加关注的仓库并同步，或在这里快速记录一条。
              </p>
            )}
            <div className="absolute left-[38px] top-4 bottom-4 w-px bg-[#223042]" />
            {feed.map((f) => {
              const st = TYPE_STYLE[f.type]
              return (
                <div key={f.id} className="relative flex gap-4 py-3">
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] z-10 border border-line ${st.ic}`}>{st.icon}</div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`flex items-center gap-1 ${st.tc}`}><i className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{f.type === 'log' && s.scope === 'life' ? '生活记录' : st.label}</span>
                      <span className="text-faint font-mono text-[10px] truncate">{f.repo}</span>
                      <span className="ml-auto font-mono text-faint">{f.time}</span>
                    </div>
                    <b className="block text-[13.5px] font-semibold mt-1">{f.title}</b>
                    {f.desc && <p className="text-[12px] text-dim mt-0.5 leading-relaxed">{f.desc}</p>}
                    {f.meta && <div className="font-mono text-[11px] text-faint mt-1">{f.meta}</div>}
                    {f.tags && f.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {f.tags.map(([t, c]) => <span key={t} className={`font-mono text-[10px] px-2 py-px rounded-full ${TAG_CLS[c] || TAG_CLS.d}`}>{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 右列 */}
      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
        <div className="bg-card border border-line rounded-2xl p-4">
          <b className="text-[13.5px] flex items-center gap-2"><IconSpark className={`w-4 h-4 ${scopeAccent}`} />快速记录</b>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
            placeholder={s.scope === 'work' ? '记录今天的工作...' : '记录生活的一点一滴...'} rows={3}
            className="mt-3 w-full bg-[#0d131b] border border-line rounded-xl px-3 py-2.5 text-[12.5px] placeholder:text-faint outline-none focus:border-line2 resize-none" />
          <p className="text-[10.5px] text-faint mt-1.5">支持 /todo、/idea 等快捷命令 · ⌘/Ctrl+Enter 发送</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-faint font-mono">/ 使用 / 快速命令</span>
            <button onClick={submit} aria-label="记录" className="w-8 h-8 rounded-lg bg-accent text-[#04110b] flex items-center justify-center"><IconArrow className="w-4 h-4" strokeWidth={2.2} /></button>
          </div>
        </div>

        <div className="bg-card border border-line rounded-2xl p-4">
          <b className="text-[13.5px]">常用命令</b>
          <div className="mt-3 flex flex-col gap-1">
            {[
              { c: '/todo', d: '创建待办事项', ic: IconCheck, cls: 'bg-[rgba(61,220,151,.15)] text-accent' },
              { c: '/idea', d: '记录灵感想法', ic: IconSpark, cls: 'bg-[rgba(88,166,255,.15)] text-blue' },
              { c: '/log', d: '记录工作日志', ic: IconLog, cls: 'bg-[rgba(188,140,255,.15)] text-purple' },
              { c: '/commit', d: '生成提交信息', ic: IconPlus, cls: 'bg-[rgba(240,136,62,.15)] text-orange' },
            ].map((c) => (
              <button key={c.c} onClick={() => setInput(c.c + ' ')} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[rgba(255,255,255,.03)] text-left">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.cls}`}><c.ic width={13} height={13} /></span>
                <div className="min-w-0">
                  <b className="font-mono text-[12px] block">{c.c}</b>
                  <span className="text-[10.5px] text-faint">{c.d}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-line rounded-2xl p-4">
          <b className="text-[13.5px]">待办概览</b>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#0d131b] rounded-xl py-3">
              <div className="font-mono text-[20px] font-bold">{s.todos.filter((t) => !t.done && t.scope === s.scope).length}</div>
              <div className="text-[10.5px] text-faint">进行中</div>
            </div>
            <div className="bg-[#0d131b] rounded-xl py-3">
              <div className="font-mono text-[20px] font-bold text-accent">{s.todos.filter((t) => t.done && t.scope === s.scope).length}</div>
              <div className="text-[10.5px] text-faint">已完成</div>
            </div>
          </div>
        </div>

        <div className="bg-[#11161f] border border-line rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <svg viewBox="0 0 16 16" width={22} height={22} fill="#e6edf3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          <div className="min-w-0">
            <b className="text-[12.5px] block">GitHub 仓库同步正常</b>
            <span className="text-[10.5px] text-faint">{s.settings.watchedRepos.length} 个关注仓库 · 最近同步 1 分钟前</span>
          </div>
          <span className="ml-auto text-faint">›</span>
        </div>
      </div>
    </div>
  )
}
