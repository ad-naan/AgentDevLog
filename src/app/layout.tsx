import type { Metadata } from 'next'
import { Inter, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-jb',
  display: 'swap',
})

export const metadata: Metadata = {
  // 兜底标题：各路由通过 generateMetadata 提供分区感知的精确标题
  title: 'DevLog · 工作日志',
  description: '开发者工作日志 · 生活记录 · TodoList · GitHub 同步',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${notoSansSC.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
