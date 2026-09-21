'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '../StoreProvider'
import type { Scope } from '@/lib/types'

export default function Settings() {
  const { s, refresh, api } = useStore()
  const router = useRouter()
  const [repoInput, setRepoInput] = useState('')
  const [token, setToken] = useState('')
const [ghUser, setGhUser] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [llmBaseUrl, setLlmBaseUrl] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmStatus, setLlmStatus] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!s) return <p className="text-faint text-[13px]">加载中…</p>

  const validRepo = /^[\w.-]+\/[\w.-]+$/
  const patch = (body: Record<string, unknown>) =>
    api('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  const addRepo = async () => {
    const r = repoInput.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
    if (!validRepo.test(r) || s.settings.watchedRepos.includes(r)) return
    await patch({ watchedRepos: [...s.settings.watchedRepos, r] })
    setRepoInput('')
    setStatus(`已添加关注仓库 ${r}，点击「立即同步」拉取活动`)
  }
  const removeRepo = (r: string) => patch({ watchedRepos: s.settings.watchedRepos.filter((x) => x !== r) })
  const doSync = async () => {
    setBusy(true); setStatus(null)
    if (token.trim()) await patch({ githubToken: token.trim() })
    if (ghUser.trim()) await patch({ githubUser: ghUser.trim().replace(/^@/, '') })
    const r = await fetch('/api/sync', { method: 'POST' })
    const j = await r.json() as { fetched: number; errors: string[] }
    await refresh()
    setBusy(false)
    setStatus(j.errors.length
      ? `拉取 ${j.fetched} 条真实活动；部分仓库失败：${j.errors.join('；')}（公共仓库可不填 token，私有仓库或限流时需填）`
      : `同步完成：从 GitHub 拉取 ${j.fetched} 条真实活动`)
  }
  const saveProfile = async () => {
    await patch({ userName: name || s.user.name, userTitle: title || s.user.title })
    setStatus('个人信息已保存')
  }
  const saveLLM = async () => {
    setLlmBusy(true); setLlmStatus(null)
    await patch({
      llmBaseUrl: llmBaseUrl || s.settings.llmBaseUrl,
      llmModel: llmModel || s.settings.llmModel,
      llmApiKey: llmApiKey || s.settings.llmApiKey,
    })
    const r = await fetch('/api/llm/test', { method: 'POST' })
    const j = await r.json() as { ok: boolean; message: string }
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
    <div className="max-w-[760px] mx-auto flex flex-col gap-4 pb-8">
      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="text-[15px] font-bold mb-1">个人信息</h2>
        <p className="text-[12px] text-dim mb-4">用于问候语、日志署名与侧栏展示（保存在 PostgreSQL）。</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[12px] text-dim">昵称</span>
            <input value={name || s.user.name} onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-line2" />
          </label>
          <label className="block">
            <span className="text-[12px] text-dim">职位</span>
            <input value={title || s.user.title} onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-line2" />
          </label>
        </div>
        <button onClick={saveProfile}
          className="mt-4 px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold">保存</button>
      </section>

      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="text-[15px] font-bold mb-1">工作 / 生活分区</h2>
        <p className="text-[12px] text-dim mb-4">每条日志、待办与活动都会归属一个分区，侧栏顶部可随时切换视图；这里设置新建内容的默认分区。</p>
        <div className="flex gap-2">
          {([['work', '工作'], ['life', '生活']] as [Scope, string][]).map(([k, l]) => (
            <button key={k} onClick={() => patch({ defaultScope: k })}
              className={`px-4 py-2 rounded-lg text-[13px] border ${s.settings.defaultScope === k
                ? k === 'work' ? 'border-accent bg-[rgba(61,220,151,.12)] text-accent' : 'border-orange bg-[rgba(240,136,62,.12)] text-orange'
                : 'border-line text-dim hover:text-txt'}`}>{l}</button>
          ))}
        </div>
      </section>

      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="text-[15px] font-bold mb-1">关注的 GitHub 仓库</h2>
        <p className="text-[12px] text-dim mb-4">工作台的动态、commits 统计、热力图都只统计这些仓库。格式：<code className="font-mono text-accent">owner/name</code></p>
        <div className="flex gap-2">
          <input value={repoInput} onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRepo()}
            placeholder="例如：vercel/next.js"
            className="flex-1 bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
          <button onClick={addRepo} className="px-4 py-2 rounded-lg border border-line2 text-[13px] hover:bg-[rgba(255,255,255,.05)]">添加</button>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {s.settings.watchedRepos.map((r) => (
            <div key={r} className="flex items-center gap-3 bg-inset border border-line rounded-lg px-3 py-2">
              <svg viewBox="0 0 16 16" width={15} height={15} fill="#8b94a3"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
              <span className="font-mono text-[13px]">{r}</span>
              <button onClick={() => removeRepo(r)} className="ml-auto text-faint hover:text-red text-[12px]">移除</button>
            </div>
          ))}
          {s.settings.watchedRepos.length === 0 && <p className="text-[12px] text-faint py-2">暂无关注仓库 —— 各页数据将为空，先添加几个吧。</p>}
        </div>
      </section>

      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="text-[15px] font-bold mb-1">AI / LLM 配置</h2>
        <p className="text-[12px] text-dim mb-4">OpenAI 协议兼容接口。配置后「需求拆解」「日报生成」由 LLM 驱动；未配置或调用失败时自动回退本地规则引擎。三项都填写才会启用。</p>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="text-[12px] text-dim">Base URL{s.settings.llmBaseUrl ? '（已配置）' : ''}</span>
            <input value={llmBaseUrl || s.settings.llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-dim">模型</span>
              <input value={llmModel || s.settings.llmModel} onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
            </label>
            <label className="block">
              <span className="text-[12px] text-dim">API Key</span>
              <input value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} type="password"
                placeholder={s.settings.llmApiKey ? '已保存（留空则不修改）' : 'sk-...'}
                className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveLLM} disabled={llmBusy}
            className="px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold disabled:opacity-50">
            {llmBusy ? '测试中…' : '保存并测试连通'}
          </button>
          {s.settings.llmBaseUrl && s.settings.llmModel && s.settings.llmApiKey
            ? <span className="text-[12px] text-accent">已启用 LLM</span>
            : <span className="text-[12px] text-faint">未启用（使用本地规则）</span>}
        </div>
        {llmStatus && <p className="mt-3 text-[12px] text-dim leading-relaxed">{llmStatus}</p>}
      </section>

      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="text-[15px] font-bold mb-1">GitHub 同步</h2>
        <p className="text-[12px] text-dim mb-4">服务端从真实 GitHub API 拉取关注仓库的 Push / PR / Issue 事件，以事件 id 去重后写入 PostgreSQL。公共仓库无需 token；私有仓库或触发限流时填写 Personal Access Token。</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[12px] text-dim">GitHub 用户名（只同步我的活动）</span>
            <input value={ghUser} onChange={(e) => setGhUser(e.target.value)}
              placeholder={s.settings.githubUser || '例如：ad-naan'}
              className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
          </label>
          <label className="block">
            <span className="text-[12px] text-dim">Personal Access Token</span>
            <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="ghp_...（可选）"
              className="mt-1.5 w-full bg-inset border border-line rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-line2" />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={doSync} disabled={busy}
            className="px-4 py-2 rounded-lg bg-accent text-[#04110b] text-[13px] font-semibold disabled:opacity-50">
            {busy ? '同步中…' : '立即同步'}
          </button>
          <button onClick={reset}
            className="px-4 py-2 rounded-lg border border-red/40 text-red text-[13px] hover:bg-[rgba(248,81,73,.1)]">
            清空全部数据
          </button>
        </div>
        {status && <p className="mt-3 text-[12px] text-dim leading-relaxed">{status}</p>}
      </section>
    </div>
  )
}
