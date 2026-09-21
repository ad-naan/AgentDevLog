'use client'

// ─── 全局客户端 Store：从 /api/state 加载，变更后乐观刷新 ───
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

let loadedOnce = false

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [s, setS] = useState<AppState | null>(null)
  const [scope, setScope] = useState<Scope>('work')

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' })
      if (r.status === 401) {
        router.push('/login')
        return
      }
      if (r.ok) {
        const data = (await r.json()) as AppState
        setS(data)
        if (!loadedOnce) {
          loadedOnce = true
          if (data.settings?.defaultScope) {
            setScope(data.settings.defaultScope)
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh state', err)
    }
  }, [])

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
        if (active && data) {
          setS(data)
          if (!loadedOnce) {
            loadedOnce = true
            if (data.settings?.defaultScope) {
              setScope(data.settings.defaultScope)
            }
          }
        }
      })
      .catch((err) => console.error('Failed to load initial state', err))

    return () => {
      active = false
    }
  }, [])

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, init)
    await refresh()
    return r
  }, [refresh])

  return <Ctx.Provider value={{ s, scope, setScope, refresh, api }}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore 必须在 StoreProvider 内使用')
  return v
}
