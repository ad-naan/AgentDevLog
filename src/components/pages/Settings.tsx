'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../StoreProvider'
import type { Scope } from '@/lib/types'
import { IconGear, IconSpark, IconClose } from '../icons'
import PageSkeleton from '../PageSkeleton'

export default function Settings() {
  const { s, refresh, api } = useStore()
  const router = useRouter()
  const [repoInput, setRepoInput] = useState('')
  const [repoInputLife, setRepoInputLife] = useState('')
  const [token, setToken] = useState('')
  const [ghUser, setGhUser] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [llmBaseUrl, setLlmBaseUrl] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmStatus, setLlmStatus] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!s) return <PageSkeleton type="settings" />

  const validRepo = /^[\w.-]+\/[\w.-]+$/
  const patch = (body: Record<string, unknown>) =>
    api('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const normalizeRepo = (v: string) =>
    v.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')

  const addRepo = async (scope: Scope) => {
    const raw = scope === 'work' ? repoInput : repoInputLife
    const r = normalizeRepo(raw)
    const cur = scope === 'work' ? s.settings.watchedRepos : s.settings.watchedReposLife
    const key = scope === 'work' ? 'watchedRepos' : 'watchedReposLife'
    if (!validRepo.test(r) || cur.includes(r)) return
    await patch({ [key]: [...cur, r] })
    if (scope === 'work') setRepoInput('')
    else setRepoInputLife('')
    // 添加后立即同步（自动回填最近 14 天活动），确保新仓库即刻被监控
    setBusy(true)
    setStatus(`已添加 ${r}，正在同步该仓库最近活动…`)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const j = (await res.json()) as { fetched: number; errors: string[] }
      await refresh()
      setStatus(
        j.errors.length
          ? `已添加 ${r}；本次同步 ${j.fetched} 条活动，部分仓库失败：${j.errors.join('；')}`
          : `已添加 ${r} 并完成监控，本次同步 ${j.fetched} 条真实活动`,
      )
    } catch {
      setStatus(`已添加 ${r}，但同步失败，请稍后点击「立即同步」重试`)
    }
    setBusy(false)
  }

  const removeRepo = (r: string, scope: Scope) => {
    const cur = scope === 'work' ? s.settings.watchedRepos : s.settings.watchedReposLife
    const key = scope === 'work' ? 'watchedRepos' : 'watchedReposLife'
    patch({ [key]: cur.filter((x) => x !== r) })
  }

  const doSync = async () => {
    setBusy(true)
    setStatus(null)
    if (token.trim()) await patch({ githubToken: token.trim() })
    if (ghUser.trim()) await patch({ githubUser: ghUser.trim().replace(/^@/, '') })
    const r = await fetch('/api/sync', { method: 'POST' })
    const j = (await r.json()) as { fetched: number; errors: string[] }
    await refresh()
    setBusy(false)
    setStatus(
      j.errors.length
        ? `拉取 ${j.fetched} 条真实活动；部分仓库失败：${j.errors.join('；')}（公共仓库可不填 token，私有仓库或限流时需填）`
        : `同步完成：从 GitHub 拉取 ${j.fetched} 条真实活动`,
    )
  }

  const saveProfile = async () => {
    await patch({ userName: name || s.user.name, userTitle: title || s.user.title })
    setStatus('个人信息已成功保存')
  }

  const saveLLM = async () => {
    setLlmBusy(true)
    setLlmStatus(null)
    await patch({
      llmBaseUrl: llmBaseUrl || s.settings.llmBaseUrl,
      llmModel: llmModel || s.settings.llmModel,
      llmApiKey: llmApiKey || s.settings.llmApiKey,
    })
    const r = await fetch('/api/llm/test', { method: 'POST' })
    const j = (await r.json()) as { ok: boolean; message: string }
    setLlmBusy(false)
    setLlmStatus(j.message)
  }

  const reset = async () => {
    if (!confirm('确定清空数据库中所有业务数据吗？')) return
    await api('/api/reset', { method: 'POST' })
    setStatus('已清空所有数据')
    router.refresh()
  }

  return (
    <div className="max-w-[840px] mx-auto flex flex-col gap-5 pb-12">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-card border border-line flex items-center justify-center text-accent">
          <IconGear className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-txt">工作台设置</h1>
          <p className="text-[13px] text-dim mt-0.5">配置个人资料、工作时段、关注仓库与 AI 模型服务</p>
        </div>
      </div>

      {/* 个人信息卡片 */}
      <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="text-[15px] font-bold text-txt mb-1">个人信息</h2>
        <p className="text-[12px] text-dim mb-4">用于问候语、日志署名与侧栏展示（持久化保存在 PostgreSQL）。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[12px] text-dim font-medium">昵称</span>
            <input
              value={name || s.user.name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] outline-none focus:border-accent transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-dim font-medium">职位</span>
            <input
              value={title || s.user.title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] outline-none focus:border-accent transition-colors"
            />
          </label>
        </div>
        <button
          onClick={saveProfile}
          className="btn-press mt-4 px-4 py-2 rounded-xl bg-accent text-[#04110b] text-[12.5px] font-semibold hover:bg-accent-hover shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]">
          保存个人信息
        </button>
      </section>

      {/* 工作时段 */}
      <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="text-[15px] font-bold text-txt mb-1">工作时段</h2>
        <p className="text-[12px] text-dim mb-4">
          打开应用时，处于工作时段内自动进入工作区，之外自动进入生活区（按本机时间判断）。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-dim font-medium">上班</span>
            <input
              type="time"
              value={workStart || s.settings.workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="bg-inset border border-line rounded-xl px-3 py-1.5 text-[13px] outline-none focus:border-accent transition-colors font-mono"
            />
          </label>
          <span className="text-faint">→</span>
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-dim font-medium">下班</span>
            <input
              type="time"
              value={workEnd || s.settings.workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="bg-inset border border-line rounded-xl px-3 py-1.5 text-[13px] outline-none focus:border-accent transition-colors font-mono"
            />
          </label>
          <button
            onClick={() => patch({ workStart: workStart || s.settings.workStart, workEnd: workEnd || s.settings.workEnd })}
            className="btn-press px-4 py-2 rounded-xl bg-accent/12 border border-accent/30 text-accent text-[12.5px] font-semibold hover:bg-accent/20 transition-all">
            保存时段
          </button>
        </div>
      </section>

      {/* 关注的 GitHub 仓库：按分区隔离 */}
      <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="text-[15px] font-bold text-txt mb-1">关注的 GitHub 仓库</h2>
        <p className="text-[12px] text-dim mb-4">
          仓库按分区隔离：同步后工作仓库的动态进入工作分区，生活仓库（个人项目等）进入生活分区，互不混杂。格式：
          <code className="font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded ml-1">owner/repo</code>
        </p>
        {([
          ['work', '工作仓库', '统计进工作区的活动、提交与热力图', repoInput, setRepoInput],
          ['life', '生活仓库', '个人/开源项目，统计进生活区', repoInputLife, setRepoInputLife],
        ] as [Scope, string, string, string, (v: string) => void][]).map(([scope, label, hint, input, setInput]) => {
          const repos = scope === 'work' ? s.settings.watchedRepos : s.settings.watchedReposLife
          return (
            <div key={scope} className={scope === 'life' ? 'mt-4' : ''}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    scope === 'work'
                      ? 'text-accent border-accent/40 bg-accent/10'
                      : 'text-orange border-orange/40 bg-orange/10'
                  }`}>
                  {label}
                </span>
                <span className="text-[11px] text-faint">{hint}</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRepo(scope)}
                  placeholder="例如：vercel/next.js"
                  className={`flex-1 bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none transition-colors ${
                    scope === 'work' ? 'focus:border-accent' : 'focus:border-orange'
                  }`}
                />
                <button
                  onClick={() => addRepo(scope)}
                  className="btn-press px-4 py-2 rounded-xl border border-line2 text-[13px] hover:bg-white/[0.05] font-medium">
                  添加
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {repos.map((r) => (
                  <div
                    key={r}
                    className="flex items-center gap-3 bg-inset border border-line rounded-xl px-3.5 py-2.5 hover:border-line2 transition-colors">
                    <svg viewBox="0 0 16 16" width={15} height={15} fill="#8b94a3">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 8.0 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span className="font-mono text-[13px] text-txt">{r}</span>
                    <span
                      className={`text-[10.5px] px-1.5 py-0.5 rounded border ${
                        scope === 'work'
                          ? 'text-accent border-accent/40 bg-accent/10'
                          : 'text-orange border-orange/40 bg-orange/10'
                      }`}>
                      {scope === 'work' ? '工作' : '生活'}
                    </span>
                    <button
                      onClick={() => removeRepo(r, scope)}
                      className="btn-press ml-auto text-faint hover:text-red p-1 rounded transition-colors">
                      <IconClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {repos.length === 0 && (
                  <p className="text-[12px] text-faint py-3 text-center border border-dashed border-line rounded-xl">
                    暂无{scope === 'work' ? '工作' : '生活'}关注仓库，添加后同步的动态将归入
                    {scope === 'work' ? '工作' : '生活'}分区。
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {/* AI / LLM 配置 */}
      <section className="insight-glow rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <IconSpark className="w-4 h-4 text-purple" />
          <h2 className="text-[15px] font-bold text-txt">AI / LLM 模型服务</h2>
          <span
            className={`ml-auto text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
              s.settings.llmBaseUrl && s.settings.llmModel && s.settings.llmApiKey
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-white/[0.04] text-faint border border-line'
            }`}>
            {s.settings.llmBaseUrl && s.settings.llmModel && s.settings.llmApiKey ? 'LLM 已就绪' : '本地规则模式'}
          </span>
        </div>
        <p className="text-[12px] text-dim mb-4">
          兼容 OpenAI 协议接口（如 DeepSeek / Qwen / OpenAI 等）。配置后驱动需求拆解、日报生成与 AI 助手对话。
        </p>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="text-[12px] text-dim font-medium">Base URL</span>
            <input
              value={llmBaseUrl || s.settings.llmBaseUrl}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none focus:border-purple transition-colors"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-dim font-medium">模型名称 (Model)</span>
              <input
                value={llmModel || s.settings.llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-4o-mini / deepseek-chat"
                className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none focus:border-purple transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-dim font-medium">API Key</span>
              <input
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                type="password"
                placeholder={s.settings.llmApiKey ? '已保存（留空则不修改）' : 'sk-...'}
                className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none focus:border-purple transition-colors"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveLLM}
            disabled={llmBusy}
            className="btn-press px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D5EF0] to-[#4F7CF0] text-white text-[12.5px] font-semibold hover:shadow-[0_0_14px_rgba(109,94,240,.4)] disabled:opacity-50">
            {llmBusy ? '测试中…' : '保存并测试连通'}
          </button>
        </div>
        {llmStatus && (
          <p className="mt-3 text-[12px] text-dim bg-inset/80 p-3 rounded-xl border border-line leading-relaxed">
            {llmStatus}
          </p>
        )}
      </section>

      {/* GitHub 同步与数据重置 */}
      <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="text-[15px] font-bold text-txt mb-1">GitHub 同步与存储</h2>
        <p className="text-[12px] text-dim mb-4">
          从真实 GitHub API 拉取 Push / PR / Issue 事件并写入 PostgreSQL。公共仓库可不填 token，私有仓库需填写 PAT。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[12px] text-dim font-medium">GitHub 用户名（只同步我的活动）</span>
            <input
              value={ghUser}
              onChange={(e) => setGhUser(e.target.value)}
              placeholder={s.settings.githubUser || '例如：ad-naan'}
              className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none focus:border-accent transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-dim font-medium">Personal Access Token (PAT)</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="ghp_...（可选）"
              className="mt-1.5 w-full bg-inset border border-line rounded-xl px-3.5 py-2 text-[13px] font-mono outline-none focus:border-accent transition-colors"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={doSync}
            disabled={busy}
          className="btn-press px-4 py-2 rounded-xl bg-accent text-[#04110b] text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-50 shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]">
            {busy ? '正在同步…' : '立即同步 GitHub'}
          </button>
          <button
            onClick={reset}
            className="btn-press ml-auto px-4 py-2 rounded-xl border border-red/40 text-red text-[12.5px] hover:bg-red/10 font-medium">
            清空所有数据
          </button>
        </div>
        {status && (
          <p className="mt-3 text-[12px] text-dim bg-inset/80 p-3 rounded-xl border border-line leading-relaxed">
            {status}
          </p>
        )}
      </section>
    </div>
  )
}
