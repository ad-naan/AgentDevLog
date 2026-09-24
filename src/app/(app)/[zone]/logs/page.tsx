import type { Metadata } from 'next'
import LogEditor from '@/components/pages/LogEditor'
import LifeLogs from '@/components/pages/LifeLogs'

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params
  return { title: zone === 'life' ? 'DevLog · 日记本' : 'DevLog · 工作日志' }
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeLogs /> : <LogEditor />
}
