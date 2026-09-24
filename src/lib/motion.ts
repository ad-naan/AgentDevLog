/**
 * 运行时弹簧物理引擎
 * F = -k·(x - target) - c·v，半隐式欧拉积分（先更新速度再更新位置，能量守恒更好）。
 * 特性：可中断（retarget 保留当前速度，运动中切换目标不丢动能）、帧率无关、后台标签页冻结安全。
 */

export interface SpringParams {
  /** 刚度 k：越大越硬、响应越快 */
  stiffness: number
  /** 阻尼 c：越小回弹越多 */
  damping: number
  /** 质量 m：默认 1 */
  mass?: number
}

export const SPRING = {
  /** 入场 / 柔和位移 */
  gentle: { stiffness: 420, damping: 31 },
  /** 按压反馈 / 快速小位移 */
  snappy: { stiffness: 1000, damping: 52 },
  /** 切换 / 命中弹跳 */
  bouncy: { stiffness: 520, damping: 26 },
  /** 指示器滑移（近临界阻尼） */
  glide: { stiffness: 480, damping: 34 },
} as const satisfies Record<string, SpringParams>

const SUBSTEP = 1 / 240 // 物理积分子步：240Hz，覆盖 60/120/144Hz 屏幕
const MAX_FRAME = 0.064 // 帧间隔钳制：后台标签页恢复时防大跳变

export interface SpringLoop {
  /** 改变目标值；运动中调用即"保速度中断" */
  setTarget: (target: number) => void
  /** 立即钉到某位置（清零速度） */
  snap: (value: number) => void
  stop: () => void
}

/**
 * 创建一个 1D 弹簧动画循环。
 * @param params 弹簧参数
 * @param onFrame 每帧回调 (value, velocity)；velocity 单位与 value 相同（px/frame 语义下自行换算）
 * @param initial 初始位置（默认 0）
 */
export function springLoop(
  params: SpringParams,
  onFrame: (value: number, velocity: number) => void,
  initial = 0,
): SpringLoop {
  const { stiffness: k, damping: c, mass: m = 1 } = params
  let target = initial
  let x = initial
  let v = 0
  let raf = 0
  let last = 0

  const step = (now: number) => {
    const dt = Math.min(MAX_FRAME, Math.max(0.001, (now - last) / 1000))
    last = now
    const sub = Math.max(1, Math.ceil(dt / SUBSTEP))
    const h = dt / sub
    for (let i = 0; i < sub; i++) {
      const a = (-k * (x - target) - c * v) / m
      v += a * h
      x += v * h
    }
    onFrame(x, v)
    // 贴近目标且动能耗散 → 结束循环（下次 setTarget 重启）
    if (Math.abs(x - target) < 0.01 && Math.abs(v) < 0.01) {
      x = target
      v = 0
      raf = 0
      onFrame(x, 0)
      return
    }
    raf = requestAnimationFrame(step)
  }

  const kick = () => {
    if (!raf) {
      last = performance.now()
      raf = requestAnimationFrame(step)
    }
  }

  return {
    setTarget(t) {
      target = t
      kick()
    },
    snap(value) {
      cancelAnimationFrame(raf)
      raf = 0
      x = value
      v = 0
      target = value
      onFrame(x, 0)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
  }
}

/** 是否处于动效偏好"减少动态"模式（决定 JS 动画是否直接钉到位） */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
