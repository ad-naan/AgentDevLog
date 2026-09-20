import { useEffect, useState } from 'react'
import Sidebar, { TopBar, type PageKey } from './Shell'
import Dashboard from './pages/Dashboard'
import LogEditor from './pages/LogEditor'
import Reports from './pages/Reports'
import TodoList from './pages/TodoList'
import Breakdown from './pages/Breakdown'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard')
  useEffect(() => {
    const h = () => setPage('settings')
    window.addEventListener('nav-settings', h)
    return () => window.removeEventListener('nav-settings', h)
  }, [])
  return (
    <div className="h-full flex bg-bg">
      <Sidebar page={page} onNav={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar page={page} />
        <main className="flex-1 min-h-0 overflow-y-auto p-5">
          {page === 'dashboard' && <Dashboard />}
          {page === 'log' && <LogEditor />}
          {page === 'report' && <Reports />}
          {page === 'todo' && <TodoList />}
          {page === 'breakdown' && <Breakdown />}
          {page === 'analytics' && <Analytics />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}
