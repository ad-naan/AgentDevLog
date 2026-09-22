import TodoList from '@/components/pages/TodoList'
import LifeWishes from '@/components/pages/LifeWishes'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  return zone === 'life' ? <LifeWishes /> : <TodoList />
}
