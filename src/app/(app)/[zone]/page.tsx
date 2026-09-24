import type { Metadata } from 'next'
import Dashboard from '@/components/pages/Dashboard'
import LifeHome from '@/components/pages/LifeHome'

// 分区感知的浏览器标题（声明式 metadata，避免客户端覆盖失效）
export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params
  return { title: zone === 'life' ? 'DevLog · 生活日志' : 'DevLog · 工作日志' }
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeHome /> : <Dashboard />
}
