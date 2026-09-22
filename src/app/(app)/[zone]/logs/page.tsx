import LogEditor from '@/components/pages/LogEditor'
import LifeLogs from '@/components/pages/LifeLogs'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeLogs /> : <LogEditor />
}
