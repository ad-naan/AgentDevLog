import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/components/StoreProvider'
import { ToastProvider } from '@/components/Toast'
import Shell from '@/components/Shell'

export const metadata: Metadata = {
  title: 'DevLog · 工作日志',
  description: '开发者工作日志 · TodoList · GitHub 同步',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <StoreProvider>
          <ToastProvider>
            <Shell>{children}</Shell>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
