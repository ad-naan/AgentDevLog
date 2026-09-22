'use client'

// ─── 全局客户端 Store：从 /api/state 加载，变更后乐观刷新 ───
// scope 不再是手动开关：由当前路由 /work | /life 决定
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { AppState, Scope } from '@/lib/types'

interface StoreValue {
  s: AppState | null
  /** 当前分区，由路径 /life 前缀推导 */
  scope: Scope
  refresh: () => Promise<void>
  /** 发起 API 变更并自动刷新全局状态 */
  api: (path: string, init?: RequestInit) => Promise<Response>
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [s, setS] = useState<AppState | null>(null)

  const scope: Scope = pathname?.startsWith('/life') ? 'life' : 'work'

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' })
      if (r.status === 401) {
        router.push('/login')
        return
      }
      if (r.ok) setS((await r.json()) as AppState)
    } catch (err) {
      console.error('Failed to refresh state', err)
    }
  }, [router])

  useEffect(() => {
    let active = true
    fetch('/api/state', { cache: 'no-store' })
      .then((r) => {
        if (r.status === 401) {
          router.push('/login')
          return null
        }
        return r.ok ? r.json() : null
      })
      .then((data: AppState | null) => {
        if (active && data) setS(data)
      })
      .catch((err) => console.error('Failed to load initial state', err))
    return () => {
      active = false
    }
  }, [router])

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, init)
    await refresh()
    return r
  }, [refresh])

  return <Ctx.Provider value={{ s, scope, refresh, api }}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore 必须在 StoreProvider 内使用')
  return v
}
