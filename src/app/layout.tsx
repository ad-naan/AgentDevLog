import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevLog · 工作日志',
  description: '开发者工作日志 · TodoList · GitHub 同步',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
