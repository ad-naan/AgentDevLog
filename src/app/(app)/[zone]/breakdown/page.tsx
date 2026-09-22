import { notFound } from 'next/navigation'
import Breakdown from '@/components/pages/Breakdown'

// 需求拆解是工作区专属能力
export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  if ((await params).zone !== 'work') notFound()
  return <Breakdown />
}
