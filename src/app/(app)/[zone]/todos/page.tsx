import type { Metadata } from 'next'
import TodoList from '@/components/pages/TodoList'
import LifeWishes from '@/components/pages/LifeWishes'

export async function generateMetadata({ params }: { params: Promise<{ zone: string }> }): Promise<Metadata> {
  const { zone } = await params
  return { title: zone === 'life' ? 'DevLog · 小心愿' : 'DevLog · 待办清单' }
}

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeWishes /> : <TodoList />
}
