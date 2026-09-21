'use client'

interface PageSkeletonProps {
  type?: 'dashboard' | 'todos' | 'logs' | 'analytics' | 'reports' | 'settings'
}

export default function PageSkeleton({ type = 'dashboard' }: PageSkeletonProps) {
  if (type === 'todos') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 h-full min-h-0 max-w-[1400px] mx-auto fade-up">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="skeleton h-7 w-36" />
              <div className="skeleton h-3.5 w-64" />
            </div>
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-7 w-16 rounded-full" />
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-line rounded-xl p-4 flex items-center gap-3">
                <div className="skeleton w-4.5 h-4.5 rounded-[5px] shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="ai-panel rounded-2xl p-5 flex flex-col gap-2">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3 w-48 mt-1" />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="bg-[rgba(139,92,246,.07)] border border-[rgba(139,92,246,.2)] rounded-2xl p-4.5 flex flex-col gap-2.5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'logs') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] lg:grid-cols-[170px_1fr_330px] gap-4 h-full min-h-0 max-w-[1440px] mx-auto fade-up">
        <div className="bg-card border border-line rounded-2xl p-3 flex flex-col gap-2">
          <div className="skeleton h-4 w-20 mb-2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-11 w-full rounded-xl" />
          ))}
        </div>
        <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-20" />
          </div>
          <div className="flex flex-col gap-2.5 mt-2 flex-1">
            <div className="skeleton h-5 w-48" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-5/6" />
            <div className="skeleton h-3.5 w-4/6" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-3/4" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-line rounded-2xl p-4.5 flex flex-col gap-3">
            <div className="skeleton h-4 w-32" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12 w-full rounded-xl" />
            ))}
          </div>
          <div className="insight-glow rounded-2xl p-4.5 flex flex-col gap-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'analytics') {
    return (
      <div className="flex flex-col gap-5 min-h-0 h-full max-w-[1400px] mx-auto fade-up">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-3.5 w-72" />
          </div>
          <div className="skeleton h-9 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4 min-h-[260px]">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-32 w-full mt-2" />
          </div>
          <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-4 min-h-[260px]">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-full mt-3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="insight-glow rounded-2xl p-5 flex flex-col gap-3 min-h-[180px]">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-10 w-full rounded-xl my-2" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'reports') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 h-full min-h-0 max-w-[1400px] mx-auto fade-up">
        <div className="bg-card border border-line rounded-2xl p-3.5 flex flex-col gap-2">
          <div className="skeleton h-4 w-24 mb-2" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="bg-card border border-line rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="skeleton h-8 w-56 mt-2" />
          <div className="grid grid-cols-2 gap-4 mt-4 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-line rounded-2xl p-4.5 flex flex-col gap-2">
                <div className="skeleton h-4 w-28 mb-1" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'settings') {
    return (
      <div className="max-w-[840px] mx-auto flex flex-col gap-5 pb-12 fade-up">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-2xl" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-6 w-36" />
            <div className="skeleton h-3.5 w-60" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-72 mb-2" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  // 默认：Dashboard 工作台骨架屏
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 h-full min-h-0 max-w-[1400px] mx-auto fade-up">
      {/* 左侧主视区骨架 */}
      <div className="flex flex-col gap-5 min-h-0 pr-1">
        {/* 顶部问候栏骨架 */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-8 w-52" />
            <div className="skeleton h-3.5 w-72" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3.5 w-20" />
          </div>
        </div>

        {/* 3 张关键指标卡片骨架 */}
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card border border-line rounded-2xl p-4.5 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="skeleton h-4 w-16 rounded-full" />
              </div>
              <div className="my-2">
                <div className="skeleton h-8 w-14" />
                <div className="skeleton h-3 w-24 mt-1.5" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-line/50">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* 今日动态时间轴骨架 */}
        <div className="bg-card border border-line rounded-2xl flex-1 min-h-[380px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <div className="skeleton w-3 h-3 rounded-full" />
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-3 w-36 ml-2" />
            </div>
            <div className="skeleton h-3.5 w-16" />
          </div>

          <div className="flex flex-col gap-4 mt-2 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧边栏骨架 */}
      <div className="flex flex-col gap-4 min-h-0">
        <div className="bg-card border border-line rounded-2xl p-5 flex flex-col gap-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-20 w-full rounded-xl" />
          <div className="flex items-center justify-between pt-1">
            <div className="skeleton h-6 w-20 rounded-lg" />
            <div className="skeleton w-8 h-8 rounded-xl" />
          </div>
        </div>

        <div className="insight-glow rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-6 w-16 rounded-lg" />
          </div>
          <div className="skeleton h-3.5 w-full mt-1" />
          <div className="skeleton h-3.5 w-5/6" />
          <div className="skeleton h-3.5 w-3/4" />
        </div>

        <div className="bg-card border border-line rounded-2xl p-4.5 flex flex-col gap-3">
          <div className="skeleton h-4 w-20" />
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="skeleton h-16 rounded-xl" />
            <div className="skeleton h-16 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
