import { StoreProvider } from '@/components/StoreProvider'
import { ToastProvider } from '@/components/Toast'
import Shell from '@/components/Shell'

// 已登录区布局：全局 Store + Toast + 主框架（scope 由 /work | /life 路由决定）
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </StoreProvider>
  )
}
