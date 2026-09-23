import Reports from '@/components/pages/Reports'
import LifeReview from '@/components/pages/LifeReview'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeReview /> : <Reports />
}
