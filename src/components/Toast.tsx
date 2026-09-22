'use client'

// ─── 全局 Toast：success / error / info，入场/退场动画 ───
import { createContext, useCallback, useContext, useState } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  leaving?: boolean
}

interface ToastValue {
  toast: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastValue>({ toast: () => {} })

const STYLE: Record<ToastKind, { icon: string; border: string; iconColor: string }> = {
  success: { icon: '✓', border: 'border-[rgba(52,199,89,.45)]', iconColor: 'text-accent' },
  error: { icon: '✕', border: 'border-[rgba(248,81,73,.5)]', iconColor: 'text-red' },
  info: { icon: '✦', border: 'border-[rgba(191,90,242,.45)]', iconColor: 'text-purple' },
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 260)
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++
    setItems((xs) => [...xs.slice(-3), { id, kind, message }])
    setTimeout(() => remove(id), 3400)
  }, [remove])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {items.map((t) => {
          const st = STYLE[t.kind]
          return (
            <div key={t.id}
              onClick={() => remove(t.id)}
              className={`toast-${t.leaving ? 'out' : 'in'} pointer-events-auto cursor-pointer flex items-center gap-2.5
                bg-[#141b26]/95 backdrop-blur border ${st.border} rounded-xl pl-3 pr-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,.4)]`}>
              <span className={`w-5 h-5 rounded-full bg-inset flex items-center justify-center text-[11px] font-bold ${st.iconColor}`}>
                {st.icon}
              </span>
              <span className="text-[12.5px] text-txt whitespace-pre-wrap max-w-[420px]">{t.message}</span>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx).toast
}

/** 从 fetch 响应提取错误信息（约定后端 { error } 格式） */
export async function apiError(res: Response): Promise<string> {
  try {
    const j = await res.json() as { error?: string }
    return j.error || `请求失败（${res.status}）`
  } catch {
    return `请求失败（${res.status}）`
  }
}
