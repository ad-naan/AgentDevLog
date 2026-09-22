import Dashboard from '@/components/pages/Dashboard'
import LifeHome from '@/components/pages/LifeHome'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  return (await params).zone === 'life' ? <LifeHome /> : <Dashboard />
}
