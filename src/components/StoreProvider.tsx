'use client'

// ─── 全局客户端 Store：从 /api/state 加载，变更后乐观刷新 ───
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { AppState, Scope } from '@/lib/types'

interface StoreValue {
  s: AppState | null
  scope: Scope
  setScope: (s: Scope) => void
  refresh: () => Promise<void>
  /** 发起 API 变更并自动刷新全局状态 */
  api: (path: string, init?: RequestInit) => Promise<Response>
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<AppState | null>(null)
  const [scope, setScope] = useState<Scope>('work')

  const refresh = useCallback(async () => {
    const r = await fetch('/api/state', { cache: 'no-store' })
    if (r.ok) setS(await r.json())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // 初次加载后跟随设置里的默认分区
  useEffect(() => { if (s && !loadedOnce) { loadedOnce = true; setScope(s.settings.defaultScope) } }, [s])

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, init)
    await refresh()
    return r
  }, [refresh])

  return <Ctx.Provider value={{ s, scope, setScope, refresh, api }}>{children}</Ctx.Provider>
}

let loadedOnce = false

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore 必须在 StoreProvider 内使用')
  return v
}
