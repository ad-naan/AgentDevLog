import type { Metadata } from 'next'
import Reports from '@/components/pages/Reports'
import LifeReview from '@/components/pages/LifeReview'

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params
  return { title: zone === 'life' ? 'DevLog · 回忆册' : 'DevLog · 报告中心' }
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeReview /> : <Reports />
}
