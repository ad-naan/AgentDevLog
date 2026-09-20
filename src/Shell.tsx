import {
  IconDashboard, IconLog, IconReport, IconCheck, IconSpark, IconChart,
  IconGear, IconSearch, IconHome, IconBriefcase,
} from './icons'
import { useStore, setState, type Scope } from './store'

export type PageKey = 'dashboard' | 'log' | 'report' | 'todo' | 'breakdown' | 'analytics' | 'settings'

const NAV: { key: PageKey; label: string; icon: typeof IconDashboard }[] = [
  { key: 'dashboard', label: '工作台', icon: IconDashboard },
  { key: 'log', label: '工作日志', icon: IconLog },
  { key: 'report', label: '报告中心', icon: IconReport },
  { key: 'todo', label: 'TodoList', icon: IconCheck },
  { key: 'breakdown', label: '需求拆解', icon: IconSpark },
  { key: 'analytics', label: '数据看板', icon: IconChart },
]

function ScopeSwitch() {
  const scope = useStore().scope
  const set = (s: Scope) => setState((d) => { d.scope = s })
  return (
    <div className="flex mx-1 mb-2 bg-[#0d131b] border border-line rounded-lg p-0.5" role="tablist">
      {(['work', 'life'] as Scope[]).map((k) => (
        <button key={k} role="tab" aria-selected={scope === k} onClick={() => set(k)}
            className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[12px] font-medium transition-colors
            ${scope === k
              ? k === 'work' ? 'bg-[rgba(61,220,151,.16)] text-accent' : 'bg-[rgba(240,136,62,.16)] text-orange'
              : 'text-faint hover:text-dim'}`}>
          {k === 'work' ? <><IconBriefcase className="w-3.5 h-3.5" />工作</> : <><IconHome className="w-3.5 h-3.5" />生活</>}
        </button>
      ))}
    </div>
  )
}

export default function Sidebar({ page, onNav }: { page: PageKey; onNav: (p: PageKey) => void }) {
  const { settings } = useStore()
  return (
    <aside className="w-[200px] shrink-0 bg-[#0c1017] border-r border-line flex flex-col p-3">
      <div className="px-2 py-2.5 mb-2">
        <span className="text-accent font-mono font-bold text-[20px] leading-none">&gt;_</span>
      </div>
      <ScopeSwitch />
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const on = page === n.key
          return (
            <button key={n.key} onClick={() => onNav(n.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] w-full text-left transition-colors
                ${on ? 'bg-[rgba(61,220,151,.14)] text-accent font-medium' : 'text-dim hover:bg-[rgba(255,255,255,.04)]'}`}>
              <n.icon width={16} height={16} className={on ? 'text-accent' : 'text-[#6b7686]'} />
              {n.label}
            </button>
          )
        })}
        <button onClick={() => onNav('settings')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] w-full text-left transition-colors
            ${page === 'settings' ? 'bg-[rgba(61,220,151,.14)] text-accent font-medium' : 'text-dim hover:bg-[rgba(255,255,255,.04)]'}`}>
          <IconGear width={16} height={16} className={page === 'settings' ? 'text-accent' : 'text-[#6b7686]'} />
          设置
        </button>
      </nav>
      <div className="mt-auto pt-3">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-[#11161f] border border-line">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A8CF7] to-[#6D5AE6] flex items-center justify-center text-[11px] font-bold text-white">
              {settings.userName.trim()[0]?.toUpperCase() || 'U'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#11161f]" />
          </div>
          <div className="min-w-0">
            <b className="block text-[12px] leading-tight">{settings.userName}</b>
            <span className="block text-[10px] text-faint truncate">{settings.userTitle}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

const TITLES: Record<PageKey, string> = {
  dashboard: '~/devlog/today',
  log: '~/devlog/logs',
  report: '~/devlog/reports',
  todo: '~/devlog/todos',
  breakdown: '~/devlog/agent/requirements',
  analytics: '~/devlog/insights',
  settings: '~/devlog/settings',
}

export function TopBar({ page }: { page: PageKey }) {
  const { scope, lastSync, settings } = useStore()
  const syncAgo = Math.max(1, Math.round((Date.now() - lastSync) / 60e3))
  return (
    <div className="h-[56px] shrink-0 border-b border-line flex items-center px-5 gap-3 bg-[#0c1017]">
      <IconHome className="text-dim" width={15} height={15} />
      <span className="font-mono text-[12.5px] text-[#c9d4e0]">{TITLES[page]}</span>
      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${scope === 'work'
        ? 'text-accent bg-[rgba(61,220,151,.1)] border-[rgba(61,220,151,.25)]'
        : 'text-orange bg-[rgba(240,136,62,.1)] border-[rgba(240,136,62,.25)]'}`}>
        {scope === 'work' ? '工作区' : '生活区'}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 h-8 px-3 rounded-full bg-[rgba(61,220,151,.1)] border border-[rgba(61,220,151,.25)]">
          <svg viewBox="0 0 16 16" width={14} height={14} fill="#e6edf3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          <span className="text-[12px] text-[#7bedb0]">GitHub 已同步 · {syncAgo} 分钟前</span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_#3ddc97]" />
        </div>
        <div className="flex items-center gap-2 h-8 px-3 rounded-full bg-[#11161f] border border-line text-faint">
          <IconSearch width={13} height={13} />
          <span className="text-[11.5px] font-mono">Ctrl + K</span>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('nav-settings'))}
          className="w-8 h-8 rounded-full bg-[#11161f] border border-line flex items-center justify-center text-dim hover:text-txt">
          <IconGear width={14} height={14} />
        </button>
      </div>
      <span className="sr-only">{settings.watchedRepos.length} repos watched</span>
    </div>
  )
}
