import TodoList from '@/components/pages/TodoList'

export default async function Page({ params }: { params: Promise<{ zone: string }> }) {
  await params
  return <TodoList />
}
