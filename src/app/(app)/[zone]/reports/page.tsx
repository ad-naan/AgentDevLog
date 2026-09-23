import Reports from '@/components/pages/Reports'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  await params
  return <Reports />
}
