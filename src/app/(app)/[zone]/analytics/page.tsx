import { notFound } from 'next/navigation'
import Analytics from '@/components/pages/Analytics'

// 数据看板聚焦代码产出，工作区专属
export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  if ((await params).zone !== 'work') notFound()
  return <Analytics />
}
