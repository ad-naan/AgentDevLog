// 弹簧物理曲线生成器：模拟 F = -k·(x-target) - c·v（半隐式欧拉积分），
// 输出 CSS linear() 缓动。运动时长 = 弹簧自然稳定时间（150–400ms 工艺窗口）。
// 用法：node scripts/gen-springs.mjs

/** 模拟弹簧从 0 → 1，返回采样点与稳定耗时 */
function simulate({ stiffness, damping, mass = 1, sampleMs = 6, maxMs = 1200, eps = 0.0008 }) {
  let x = 0
  let v = 0
  let t = 0
  const h = 1 / 2000 // 0.5ms 积分子步
  const points = []
  let settleCount = 0
  while (t < maxMs / 1000) {
    const steps = Math.max(1, Math.round((sampleMs / 1000) / h))
    for (let i = 0; i < steps; i++) {
      const a = (-stiffness * (x - 1) - damping * v) / mass
      v += a * h
      x += v * h
      t += h
    }
    points.push(x)
    // 连续多帧贴近目标且动能耗散 → 判定稳定
    if (Math.abs(x - 1) < eps && Math.abs(v) < eps * 400) {
      settleCount++
      if (settleCount >= 4) break
    } else {
      settleCount = 0
    }
  }
  const duration = points.length * (sampleMs / 1000)
  // 首尾吸附到精确端点，避免 linear() 端点抖动
  points[0] = 0
  points[points.length - 1] = 1
  return { points, duration, overshoot: Math.max(...points) - 1 }
}

function toLinear(points, decimals = 3) {
  return `linear(${points.map((p) => p.toFixed(decimals)).join(', ')})`
}

// 物理预设：刚度 k / 阻尼 c（质量均为 1）
const PRESETS = {
  // 入场：柔和过冲 ~2%，≤400ms 稳定
  gentle: { stiffness: 420, damping: 31 },
  // 按压回弹：快、脆、极小过冲，~160ms
  snappy: { stiffness: 1000, damping: 52 },
  // 切换/命中：明显弹跳 ~10%，~340ms
  bouncy: { stiffness: 520, damping: 26 },
  // 位移跟踪（指示器 CSS 过渡用，近临界阻尼）
  glide: { stiffness: 480, damping: 34 },
}

for (const [name, cfg] of Object.entries(PRESETS)) {
  const { points, duration, overshoot } = simulate(cfg)
  console.log(`--spring-${name}: /* ${Math.round(duration * 1000)}ms, 过冲 ${(overshoot * 100).toFixed(1)}% */`)
  console.log(toLinear(points))
  console.log()
}
