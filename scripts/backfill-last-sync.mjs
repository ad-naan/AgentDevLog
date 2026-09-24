// 一次性回填脚本：把 lastSync 回拨 14 天，让下次同步补回窗口外的历史提交
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const target = new Date(Date.now() - 14 * 864e5)
const r = await db.settings.updateMany({ data: { lastSync: target } })
console.log(`updated ${r.count} settings rows, lastSync ->`, target.toISOString())
process.exit(0)
