import { StoreProvider } from '@/components/StoreProvider'
import { ToastProvider } from '@/components/Toast'
import Shell from '@/components/Shell'

// 已登录区布局：全局 Store + Toast + 主框架
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </StoreProvider>
  )
}
