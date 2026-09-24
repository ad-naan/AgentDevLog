// 临时诊断脚本：检查同步配置 + 各仓库分支数 / 目标分支最近提交是否在同步窗口内
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const s = await db.settings.findFirst({ include: { user: true } })
if (!s) { console.log('no settings'); process.exit(0) }
console.log('githubUser =', JSON.stringify(s.githubUser))
console.log('lastSync   =', s.lastSync.toISOString())
console.log('since      =', new Date(Math.max(s.lastSync.getTime() - 10 * 60e3, Date.now() - 90 * 864e5)).toISOString())
console.log('watchedRepos =', s.watchedRepos, ' life =', s.watchedReposLife)

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'devlog-app',
  ...(s.githubToken ? { Authorization: `Bearer ${s.githubToken}` } : {}),
}
const ghUser = (s.githubUser || '').trim().toLowerCase()

for (const repo of [...s.watchedRepos, ...s.watchedReposLife]) {
  const info = await fetch(`https://api.github.com/repos/${repo}`, { headers })
  if (!info.ok) { console.log(`${repo}: repo fetch ${info.status}`); continue }
  const meta = await info.json()
  // 数全部分支
  let total = 0, names = []
  for (let p = 1; p <= 10; p++) {
    const r = await fetch(`https://api.github.com/repos/${repo}/branches?per_page=100&page=${p}`, { headers })
    if (!r.ok) break
    const list = await r.json()
    total += list.length
    if (p === 1) names = list.map((b) => b.name)
    if (list.length < 100) break
  }
  console.log(`\n${repo}: 分支总数=${total}${total > 12 ? '  ⚠️ 超过12条，第13条起不会被同步!' : ''} 前12条=`, names.slice(0, 12))
  // 每个分支最近一条提交的作者/时间
  const sinceISO = new Date(Math.max(s.lastSync.getTime() - 10 * 60e3, Date.now() - 90 * 864e5)).toISOString()
  for (const b of names.slice(0, 15)) {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(b)}&per_page=1`, { headers })
    if (!r.ok) { console.log(`  ${b}: commits fetch ${r.status}`); continue }
    const [c] = await r.json()
    if (!c) { console.log(`  ${b}: (空分支)`); continue }
    const login = c.author?.login?.toLowerCase() ?? '(未关联账号)'
    const date = c.commit?.author?.date
    const inWindow = date && new Date(date) >= new Date(sinceISO)
    const mine = login === ghUser || login === '(未关联账号)'
    console.log(`  ${b}: ${date} author=${login}${login !== '(未关联账号)' && !mine ? '  ⚠️ 非当前账号，会被过滤' : ''}${!inWindow ? '  (早于同步窗口)' : ''}`)
  }
}
process.exit(0)
