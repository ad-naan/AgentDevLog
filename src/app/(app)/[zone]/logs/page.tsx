import LogEditor from '@/components/pages/LogEditor'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  await params
  return <LogEditor />
}
