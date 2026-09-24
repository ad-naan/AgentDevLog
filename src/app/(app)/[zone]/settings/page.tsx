import type { Metadata } from 'next'
import Settings from '@/components/pages/Settings'

export const metadata: Metadata = { title: 'DevLog · 设置' }

export default function Page() {
  return <Settings />
}
