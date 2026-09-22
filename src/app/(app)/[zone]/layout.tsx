// 分区路由：仅允许 /work 与 /life，其余 404
export default function ZoneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function generateStaticParams() {
  return [{ zone: 'work' }, { zone: 'life' }]
}

export const dynamicParams = false
