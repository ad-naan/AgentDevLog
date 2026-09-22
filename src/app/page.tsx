'use client'

// 根路径落区：按用户本地时间与设置的工作时段（workStart ~ workEnd）跳转 /work 或 /life
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/icons'

const inWorkHours = (h: number, m: number, start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const now = h * 60 + m
  const s = sh * 60 + sm
  const e = eh * 60 + em
  return s <= e ? now >= s && now < e : now >= s || now < e // 支持跨夜时段
}

export default function Home() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let gone = false
    const go = (zone: 'work' | 'life') => {
      if (!gone) {
        gone = true
        router.replace(`/${zone}`)
      }
    }
    const d = new Date()
    fetch('/api/state', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const start = s?.settings?.workStart ?? '09:00'
        const end = s?.settings?.workEnd ?? '18:00'
        go(inWorkHours(d.getHours(), d.getMinutes(), start, end) ? 'work' : 'life')
      })
      .catch(() => go('work'))
    const t = setTimeout(() => setFailed(true), 5000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-bg text-dim">
      <Logo size={40} />
      <p className="text-[13px]">{failed ? '加载中…' : '正在前往你的分区…'}</p>
    </div>
  )
}
