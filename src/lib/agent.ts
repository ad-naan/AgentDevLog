import { prisma } from './prisma'
import { today } from './types'
import { requireLLMConfig, chatJSON, LLMNotConfiguredError } from './llm'

// ─── Agent 层：所有 AI 能力的唯一实现，纯模型驱动，零规则回退 ───
// 每个能力 = 一次结构化 LLM 调用 + 数据库落库，失败即抛错。

const asStrings = (v: unknown, max: number): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string') && v.length
    ? v.map(String).slice(0, max)
    : null

// ─── ⑤ 工作台助手：意图路由 + 联动各 Agent ───

export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantResult {
  reply: string
  actions: string[]
}

// ─── ⑤ 工作台助手：tool-calling agent loop ───
// 每轮让模型在「调用一个工具」或「直接回答」之间决策，工具结果回灌给模型，
// 最多 6 步。模型可以自主组合多个工具（如：查日志 → 查待办 → 生成报告）。

export interface AssistantTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantResult {
  reply: string
  actions: string[]
}

const PERSONA = {
  work: '你是工作分区的 AI 助理，面向进度跟踪与向上汇报。回答偏向：进展、交付价值、风险与下一步计划。',
  life: '你是生活分区的 AI 助理，面向复盘与个人成长。语气温和，回答偏向：感受、经验提炼、习惯与改进。',
} as const

const TOOL_DOC = `你可以使用以下工具（每次调用一个）：
- query_logs {"days":7} — 查询最近 N 天的日志（含正文）
- query_todos {"includeDone":false} — 查询待办（可选包含已完成）
- query_activities {"days":7} — 查询最近 N 天的代码提交/PR/Issue/记录动态
- create_todo {"title":"...","priority":"P1|P2|P3","due":"今天|明天|本周|无","tag":"..."} — 创建一条待办
- append_log {"title":"..."} — 往今日日志追加一条记录
- generate_report {"kind":"daily|weekly"} — 基于真实数据生成日报/周报并保存到报告中心
- breakdown {"requirement":"..."} — 把一段需求拆解为模块与任务并保存

输出规则（只输出一个 JSON 对象）：
- 要调用工具：{"tool":"工具名","args":{...}}
- 信息足够、可以回答了：{"reply":"面向用户的中文回答"}

策略：
- 涉及「我做了什么/进展如何/总结一下」等问题，先用查询工具拿真实数据再回答，不要凭空编造。
- 用户要求记录/创建/生成时直接调用相应工具；复杂请求可连续组合多个工具。
- 写操作完成后要在 reply 里简要确认。`

interface ToolOutcome { observation: string; action?: string }

async function executeTool(
  userId: number,
  scope: 'work' | 'life',
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolOutcome> {
  const days = Math.min(Math.max(Number(args.days) || 7, 1), 60)
  const sinceDay = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const sinceTs = new Date(Date.now() - days * 864e5)

  switch (tool) {
    case 'query_logs': {
      const logs = await prisma.log.findMany({
        where: { userId, scope, date: { gte: sinceDay } },
        orderBy: { date: 'desc' }, take: 30,
      })
      return {
        observation: logs.length
          ? logs.map((l) => `【${l.date}】${l.title}\n${l.content.slice(0, 500)}`).join('\n\n')
          : '（该时间范围内没有日志）',
      }
    }
    case 'query_todos': {
      const todos = await prisma.todo.findMany({
        where: { userId, scope, ...(args.includeDone ? {} : { done: false }) },
        orderBy: [{ done: 'asc' }, { createdAt: 'desc' }], take: 50,
      })
      return {
        observation: todos.length
          ? todos.map((t) => `${t.done ? '[x]' : '[ ]'} ${t.priority} ${t.title}（${t.due}${t.tag ? ` · ${t.tag}` : ''}）`).join('\n')
          : '（没有符合条件的待办）',
      }
    }
    case 'query_activities': {
      const acts = await prisma.activity.findMany({
        where: { userId, scope, ts: { gte: sinceTs } },
        orderBy: { ts: 'desc' }, take: 100,
      })
      return {
        observation: acts.length
          ? acts.map((a) => `${a.ts.toISOString().slice(0, 16)} [${a.type}] ${a.title}${a.repo ? ` @${a.repo}` : ''}`).join('\n')
          : '（该时间范围内没有动态）',
      }
    }
    case 'create_todo': {
      const r = await agentQuickCapture(userId, String(args.title || ''), scope)
      return r.kind === 'todo'
        ? { observation: `已创建待办「${r.title}」（${r.priority} · ${r.due}）`, action: `已创建待办「${r.title}」（${r.priority} · ${r.due}）` }
        : { observation: `已作为日志记录：「${r.title}」`, action: `已追加到今日日志：「${r.title}」` }
    }
    case 'append_log': {
      const r = await agentQuickCapture(userId, String(args.title || ''), scope)
      return r.kind === 'log'
        ? { observation: `已追加到今日日志：「${r.title}」`, action: `已追加到今日日志：「${r.title}」` }
        : { observation: `已创建待办「${r.title}」（${r.priority} · ${r.due}）`, action: `已创建待办「${r.title}」（${r.priority} · ${r.due}）` }
    }
    case 'generate_report': {
      const t0 = today()
      const since = new Date(Date.now() - 7 * 864e5)
      const [logs, acts, todos] = await Promise.all([
        prisma.log.findMany({ where: { userId, scope, date: { gte: since.toISOString().slice(0, 10) } }, orderBy: { date: 'desc' }, take: 7 }),
        prisma.activity.findMany({ where: { userId, scope, ts: { gte: new Date(t0) } }, take: 30 }),
        prisma.todo.findMany({ where: { userId, scope, done: false }, take: 15 }),
      ])
      const r = await agentReport(userId, scope, {
        logs: logs.map((l) => ({ title: l.title, content: l.content })),
        commits: acts.filter((a) => a.type === 'commit').map((a) => ({ title: a.title, repo: a.repo })),
        prs: acts.filter((a) => a.type === 'pr').map((a) => ({ title: a.title, repo: a.repo })),
        openTodos: todos.map((t) => `${t.priority} ${t.title}`),
      })
      return {
        observation: `报告已生成并保存到报告中心。摘要：${r.summary}`,
        action: '已生成报告（报告中心可查看）',
      }
    }
    case 'breakdown': {
      const requirement = String(args.requirement || '').slice(0, 500)
      if (!requirement) return { observation: '（requirement 参数为空，无法拆解）' }
      const r = await agentBreakdown(userId, requirement, '标准')
      const total = r.modules.reduce((n, m) => n + m.tasks.length, 0)
      const created = await prisma.breakdown.create({
        data: { userId, requirement, mode: '标准', status: 'done', modules: r.modules, tech: r.tech },
      })
      return {
        observation: `拆解完成：${r.modules.map((m) => `${m.name}（${m.tasks.length} 项）`).join('、')}，共 ${total} 个任务，已保存 #${created.id}`,
        action: `已拆解 ${r.modules.length} 个模块 / ${total} 个任务（需求拆解页 #${created.id}）`,
      }
    }
    default:
      return { observation: `（未知工具 ${tool}，可用工具见规则说明）` }
  }
}

const TOOL_NAMES = [
  'query_logs', 'query_todos', 'query_activities',
  'create_todo', 'append_log', 'generate_report', 'breakdown',
] as const

export async function runAssistant(
  userId: number,
  scope: 'work' | 'life',
  turns: AssistantTurn[],
): Promise<AssistantResult> {
  const last = turns[turns.length - 1]?.content?.trim() || ''
  if (!last) return { reply: '请输入内容。', actions: [] }

  const cfg = await requireLLMConfig(userId)
  const ctx = await assistantContext(userId, scope)
  const actions: string[] = []

  const system = `${PERSONA[scope]}简洁中文回答。\n\n用户近况（背景，工具可查更完整数据）：\n${ctx}\n\n${TOOL_DOC}`

  // 消息序列：system + 最近对话 + 逐步追加的工具调用记录
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    ...turns.slice(-8).map((t) => ({ role: t.role, content: t.content.slice(0, 1000) })),
  ]

  const MAX_STEPS = 6
  for (let step = 0; step < MAX_STEPS; step++) {
    const isFinal = step === MAX_STEPS - 1
    const decision = await chatJSON<{ tool?: string; args?: unknown; reply?: string }>(
      cfg,
      [
        ...messages,
        {
          role: 'user',
          content: isFinal
            ? '（已达工具调用次数上限，请基于已有信息直接回答，输出 {"reply":"..."}）'
            : '（输出 {"tool":"...","args":{...}} 调用工具，或 {"reply":"..."} 直接回答）',
        },
      ],
      (p) => {
        const o = p as Record<string, unknown>
        if (typeof o.reply === 'string' && o.reply) return { reply: o.reply }
        const tool = String(o.tool || '')
        if ((TOOL_NAMES as readonly string[]).includes(tool)) {
          return {
            tool,
            args: (o.args && typeof o.args === 'object' ? o.args : {}) as Record<string, unknown>,
          }
        }
        return null
      },
      { temperature: 0.3 },
    )

    if (decision.reply) return { reply: decision.reply, actions }

    // 执行工具并把结果回灌
    let outcome: ToolOutcome
    try {
      outcome = await executeTool(
        userId,
        scope,
        decision.tool!,
        (decision.args && typeof decision.args === 'object' ? decision.args : {}) as Record<string, unknown>,
      )
    } catch (e) {
      if (e instanceof LLMNotConfiguredError) throw e
      outcome = { observation: `工具执行失败：${e instanceof Error ? e.message : '未知错误'}` }
    }
    if (outcome.action) actions.push(outcome.action)
    messages.push({ role: 'assistant', content: JSON.stringify({ tool: decision.tool, args: decision.args }) })
    messages.push({ role: 'user', content: `工具结果：\n${outcome.observation.slice(0, 4000)}` })
  }

  return {
    reply: actions.length
      ? `已完成：${actions.join('；')}。`
      : '（多次调用工具后未能生成回答，请稍后重试）',
    actions,
  }
}

async function assistantContext(userId: number, scope: 'work' | 'life'): Promise<string> {
  const [logs, todos, acts] = await Promise.all([
    prisma.log.findMany({ where: { userId, scope }, orderBy: { date: 'desc' }, take: 3, select: { date: true, title: true } }),
    prisma.todo.findMany({ where: { userId, scope, done: false }, take: 5, select: { title: true, priority: true, due: true } }),
    prisma.activity.findMany({ where: { userId, scope }, orderBy: { ts: 'desc' }, take: 5, select: { type: true, title: true, repo: true } }),
  ])
  return [
    logs.length ? `近期日志：${logs.map((l) => `${l.date} ${l.title}`).join('；')}` : '',
    todos.length ? `未完成待办：${todos.map((t) => `${t.priority} ${t.title}（${t.due}）`).join('；')}` : '',
    acts.length ? `近期动态：${acts.map((a) => `${a.type} ${a.title} @${a.repo}`).join('；')}` : '',
  ].filter(Boolean).join('\n') || '（暂无数据）'
}

// ─── ① 需求拆解 ───

export interface BreakdownResult {
  modules: { name: string; tasks: { title: string; est: string }[] }[]
  tech: string[]
}

export async function agentBreakdown(
  userId: number,
  requirement: string,
  mode: '标准' | '详细' | '精简',
): Promise<BreakdownResult> {
  const cfg = await requireLLMConfig(userId)
  return chatJSON<BreakdownResult>(
    cfg,
    [
      { role: 'system', content: '你是资深全栈工程师，负责需求拆解。只输出 JSON，不要任何多余文字。' },
      {
        role: 'user',
        content: `把以下需求拆解为功能模块与任务（模式：${mode}）。

要求：
- modules: 数组，每项 { name: 模块名, tasks: [{ title: 任务名, est: 工时如 "1d"/"0.5d" }] }
- tech: 技术方案要点字符串数组（3-6 条）
- ${mode === '详细' ? '细化到可执行任务并包含设计/联调' : mode === '精简' ? '只保留核心任务' : '按功能模块拆解'}
- 输出格式：{"modules":[...],"tech":[...]}

需求：
${requirement}`,
      },
    ],
    (p) => {
      const o = p as { modules?: unknown; tech?: unknown }
      const tech = asStrings(o.tech, 8)
      if (!Array.isArray(o.modules) || !o.modules.length || !tech) return null
      const modules = (o.modules as Record<string, unknown>[])
        .filter((m) => typeof m?.name === 'string' && Array.isArray(m.tasks))
        .map((m) => ({
          name: String(m.name),
          tasks: (m.tasks as Record<string, unknown>[])
            .filter((t) => typeof t?.title === 'string')
            .map((t) => ({ title: String(t.title), est: String(t.est || '1d') })),
        }))
        .filter((m) => m.tasks.length)
      return modules.length ? { modules, tech } : null
    },
    { temperature: 0.3 },
  )
}

// ─── ② 日报生成 ───

export interface ReportResult {
  summary: string
  sections: { done: string[]; doing: string[]; risks: string[]; plans: string[] }
}

export async function agentReport(
  userId: number,
  scope: 'work' | 'life',
  basis: {
    logs: { title: string; content: string }[]
    commits: { title: string; repo: string; detail?: string | null }[]
    prs: { title: string; repo: string }[]
    openTodos: string[]
  },
): Promise<ReportResult> {
  const cfg = await requireLLMConfig(userId)
  // 双轨定位：工作=向上汇报（结果/价值/风险）；生活=自我复盘（经历/感悟/改进）
  const isWork = scope === 'work'
  const system = isWork
    ? '你是工作日报助手，为撰写者生成可直接提交给上级的日报：进展清晰、结果导向、量化价值、风险与计划明确。严格依据真实记录，不虚构。只输出 JSON。'
    : '你是私人复盘教练，把用户当天的生活记录提炼为成长复盘：忠实于经历，侧重观察、感悟与教训，落脚到具体可执行的改进。不评判、不说教、不虚构。只输出 JSON。'
  return chatJSON<ReportResult>(
    cfg,
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `基于以下真实记录生成今日（${today()}）${isWork ? '工作日报（供向上汇报）' : '生活复盘（供自我提升）'}。

${isWork
  ? `sections 语义（汇报口径）：
- done：今日完成，写清「做了什么 + 达到什么结果/价值」，尽量量化
- doing：进行中，当前进度与状态
- risks：风险与阻塞，写清影响与需要的支持
- plans：明日计划，写清预期产出`
  : `sections 语义（复盘口径）：
- done：今日经历，客观记录做了什么、和谁、当时的感受
- doing：观察与感悟，今天有什么新发现、认知上的变化
- risks：反思与教训，哪里做得不够好、背后的原因是什么
- plans：明日行动，从反思中提炼的具体改进（可执行、可验证）`}

格式：{"summary":"一句话总结(40字内)","sections":{"done":["…"],"doing":["…"],"risks":["…"],"plans":["…"]}}
每类 2-4 条，只依据记录，不要编造。

日志：
${basis.logs.map((l) => `- ${l.title}: ${l.content}`).join('\n') || '（无）'}

${isWork ? `Commits（${basis.commits.length} 条，附提交正文与改动文件清单，用于分析实际改动内容）：
${basis.commits.slice(0, 15).map((c) => `- [${c.repo}] ${c.title}${c.detail ? `\n  ${c.detail.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12).join('\n  ')}` : ''}`).join('\n') || '（无）'}

PR 事件（${basis.prs.length} 条）：
${basis.prs.slice(0, 10).map((c) => `- [${c.repo}] ${c.title}`).join('\n') || '（无）'}

未完成待办：
${basis.openTodos.slice(0, 15).map((t) => `- ${t}`).join('\n') || '（无）'}` : `未完成待办（可视为「想做的事」，用于行动建议）：
${basis.openTodos.slice(0, 15).map((t) => `- ${t}`).join('\n') || '（无）'}`}`,
      },
    ],
    (p) => {
      const o = p as { summary?: unknown; sections?: Record<string, unknown> }
      if (typeof o.summary !== 'string' || !o.summary || !o.sections) return null
      const done = asStrings(o.sections.done, 6)
      if (!done) return null
      return {
        summary: o.summary.slice(0, 120),
        sections: {
          done,
          doing: asStrings(o.sections.doing, 6) || [],
          risks: asStrings(o.sections.risks, 5) || [],
          plans: asStrings(o.sections.plans, 5) || [],
        },
      }
    },
    { temperature: 0.5 },
  )
}
export interface WeeklyProjectInput {
  name: string
  commits: number
  prs: number
  samples: string[] // 代表性 commit/PR 标题
}

export async function agentWeeklyReport(
  userId: number,
  scope: 'work' | 'life',
  basis: {
    range: [string, string] // [周一, 周日] YYYY-MM-DD
    projects: WeeklyProjectInput[]
    logs: { title: string; content: string }[]
    closedTodos: string[]
    openTodos: string[]
    manualNotes?: string[] // 手动补充：不在 git / 无法用 git 衡量的工作
  },
): Promise<ReportResult> {
  const cfg = await requireLLMConfig(userId)
  const [from, to] = basis.range
  const manual = (basis.manualNotes || []).map((x) => x.trim()).filter(Boolean)

  // ── 生活周复盘：给自己看的复盘，不做项目量化，聚焦经验提炼与行为改进 ──
  if (scope === 'life') {
    return chatJSON<ReportResult>(
      cfg,
      [
        {
          role: 'system',
          content:
            '你是私人成长复盘教练，为用户撰写一周生活复盘（给自己看，不是给别人汇报）。硬性要求：' +
            '① 忠实于记录，不虚构、不美化，记录不足时如实说明；' +
            '② 重点从经历中提炼可复用的经验与反复出现的模式（时间分配、情绪触发点、习惯养成等）；' +
            '③ 反思要挖到原因，行动要具体可执行、下周可验证；' +
            '④ 语气真诚克制，不说教、不灌鸡汤。只输出 JSON，不要多余解释。',
        },
        {
          role: 'user',
          content: `基于以下真实记录，生成 ${from} ~ ${to} 的生活周复盘。

sections 语义（复盘口径，存储字段沿用 done/doing/risks/plans）：
- done：本周经历与收获，按主题归纳（如健康、学习、关系、兴趣），突出值得记住的时刻与真实成长
- doing：观察与模式，本周反复出现的行为/情绪/时间模式，以及背后的可能原因
- risks：反思与教训，哪些做得不够好、错失了什么、根因是什么（对自己诚实，但不过度自责）
- plans：下周行动，从反思导出的具体改进，可执行、可验证，不超过 5 条

输出 JSON 格式：{"summary":"一句话诚实总结本周(60字内)","sections":{"done":[],"doing":[],"risks":[],"plans":[]}}
每类 2-5 条，只依据下方记录，宁可写「本周记录较少」也不要编造。

本周生活日志（${basis.logs.length} 篇）：
${basis.logs.map((l) => `- ${l.title}: ${l.content.slice(0, 400)}`).join('\n') || '（无）'}

本周完成的待办（${basis.closedTodos.length} 个）：
${basis.closedTodos.slice(0, 25).map((t) => `- ${t}`).join('\n') || '（无）'}

未完成 / 想做的事：
${basis.openTodos.slice(0, 25).map((t) => `- ${t}`).join('\n') || '（无）'}`,
        },
      ],
      (p) => {
        const o = p as { summary?: unknown; sections?: Record<string, unknown> }
        if (typeof o.summary !== 'string' || !o.summary || !o.sections) return null
        const done = asStrings(o.sections.done, 12)
        if (!done) return null
        return {
          summary: o.summary.slice(0, 160),
          sections: {
            done,
            doing: asStrings(o.sections.doing, 10) || [],
            risks: asStrings(o.sections.risks, 8) || [],
            plans: asStrings(o.sections.plans, 8) || [],
          },
        }
      },
      { temperature: 0.5, timeoutMs: 120_000 },
    )
  }

  // ── 工作周报：面向上级的汇报体 ──
  return chatJSON<ReportResult>(
    cfg,
    [
      {
        role: 'system',
        content:
          '你是资深项目周报助手，为「可能不懂技术细节的上级/产品/协作方」撰写通俗易懂、有信息量、可量化的周报。硬性要求：' +
          '① 用大白话讲清楚「做了什么、为了解决什么问题、带来什么价值或效果」，让非技术读者也能看懂；' +
          '② 严禁照搬 commit 里的英文变量名、函数名、字段名、内部代号（如 fallback_generated、identity_key、remote_key、zero-create replay 等），必须翻译成业务语言，如「素材自动兜底」「人物身份识别」「远程存储配置」；确需保留的专有名词要用一句话解释它是什么；' +
          '③ 严格按项目分组，逐项目展开；每个项目内部按「新增功能 / 优化 / 修复」归纳，把多条 commit 合并成完整、连贯的工作叙述，禁止逐条罗列 commit 标题、也禁止只写一句空话；' +
          '④ 量化要落到业务价值而非仅堆 commit 数：优先写清楚影响范围、提升幅度、解决了多少问题（如「减少人工介入约 70%」「修复 4 类导致素材生成失败的问题」），commit/PR 数作为辅助佐证；' +
          '⑤ 用户提供的「手动补充工作」是 git 无法记录的线下/本地工作（需求评审、设计、联调、排障、文档、沟通、调研等），必须与代码工作同等重视，在 done 中作为独立条目展开量化，不得遗漏；' +
          '⑥ 绝不虚构：仅依据提供的记录，记录不足时如实标注「记录较少，仅…」而不是编造。只输出 JSON，不要多余解释。',
      },
      {
        role: 'user',
        content: `基于以下真实记录，生成 ${from} ~ ${to} 的${scope === 'work' ? '工作' : '生活'}周报。要求：通俗易懂、分项目、分层次、按业务价值量化，非技术读者也能看懂。

写作对照示例：
- 反面（禁止）：「新增 fallback_generated 标志位至素材元数据，修复 identity_key 判定错误」
- 正面（应这样写）：「新增素材自动兜底能力：缺素材时自动转入待补状态，减少人工盯梢约 70%；修复了 4 类导致素材生成失败的问题（如人物识别误判、占位文字错乱）」

输出 JSON 格式：{"summary":"一句话总结(80字内，用大白话，须含本周项目数、关键成果与量化数字，如修复 bug 数/效率提升)","sections":{
"done":[
  "每个有活动的项目输出 1 条，充分展开，格式：「【项目名】阶段（已完成 / 进行中·具体阶段），本周提交 N 次、PR M 个。新增：<用业务语言说明新增了什么能力、给谁用、达到什么效果>；优化：<改进了什么、带来多少提升>；修复：<解决了哪类问题、共 K 个、影响是什么>。」缺某类则省略该类；所有英文术语必须译成业务语言并在必要时解释；禁止照抄 commit 标题。必须把「手动补充工作」每条也纳入 done 并展开量化"
],
"doing":[
  "进行中未完成或未启动的项目/事项，逐条讲清当前状态、完成度、卡在哪、原因，用大白话，如「【项目C】还没启动，因人力未到位，计划下周开始」「【某模块】开发约 60%，还差联调和测试」"
],
"risks":[
  "本周问题与风险，逐条写清「发生了什么 + 会造成什么影响 + 建议怎么办」，用非技术语言；末尾附「亮点：…」与「不足：…」各一条，点评整体表现"
],
"plans":[
  "下周计划，逐条写「打算做什么 + 预期能交付什么/验收标准」，如「完成某功能开发，预期交付：可联调版本 + 覆盖 5 个场景的测试」，并标出优先级"
]}}
规则：done 每个项目一条且充分展开、含业务量化，并覆盖全部手动补充工作；doing 覆盖所有未完成项；risks 至少 2 条加亮点/不足；plans 至少 2 条且带预期产出。各类只依据下方记录，宁可写「记录较少」也不要编造。

各项目量化统计（真实数据）：
${basis.projects.map((p) => `- ${p.name}：${p.commits} 次 commit，${p.prs} 个 PR`).join('\n') || '（无）'}

代表性提交/PR（附提交正文与改动文件清单，据此理解实际改动内容，务必翻译成业务语言、不要照抄）：
${basis.projects.flatMap((p) => p.samples.slice(0, 12).map((s) => `- [${p.name}] ${s}`)).slice(0, 60).join('\n') || '（无）'}

手动补充工作（git 无法记录的线下/本地工作，务必纳入并展开量化，${manual.length} 条）：
${manual.slice(0, 30).map((t) => `- ${t}`).join('\n') || '（无）'}

本周日志（${basis.logs.length} 篇，用于补充成果与细节）：
${basis.logs.map((l) => `- ${l.title}: ${l.content.slice(0, 400)}`).join('\n') || '（无）'}

本周完成的待办（${basis.closedTodos.length} 个）：
${basis.closedTodos.slice(0, 25).map((t) => `- ${t}`).join('\n') || '（无）'}

未完成 / 未启动待办：
${basis.openTodos.slice(0, 25).map((t) => `- ${t}`).join('\n') || '（无）'}`,
      },
    ],
    (p) => {
      const o = p as { summary?: unknown; sections?: Record<string, unknown> }
      if (typeof o.summary !== 'string' || !o.summary || !o.sections) return null
      const done = asStrings(o.sections.done, 16)
      if (!done) return null
      return {
        summary: o.summary.slice(0, 200),
        sections: {
          done,
          doing: asStrings(o.sections.doing, 12) || [],
          risks: asStrings(o.sections.risks, 10) || [],
          plans: asStrings(o.sections.plans, 12) || [],
        },
      }
    },
    // 周报 prompt 较长、生成内容多，放宽超时到 180s，避免默认 60s 中断导致 502
    { temperature: 0.4, timeoutMs: 180_000 },
  )
}

// ─── ③ 快速捕获：自然语言 → 结构化记录（todo / log）并落库 ───

export type QuickKind = 'todo' | 'log'

export interface QuickCaptureResult {
  kind: QuickKind
  /** todo：规范化标题；log：追加到今日日志的条目 */
  title: string
  priority?: string
  due?: string
  tag?: string
  reason: string
}

export async function agentQuickCapture(
  userId: number,
  text: string,
  scope: 'work' | 'life',
): Promise<QuickCaptureResult> {
  const cfg = await requireLLMConfig(userId)
  const parsed = await chatJSON<QuickCaptureResult>(
    cfg,
    [
      { role: 'system', content: '你是个人助理，负责把随手输入的文本归类为待办或日志。只输出 JSON。' },
      {
        role: 'user',
        content: `判断以下文本更适合「待办事项」还是「今日日志条目」，并规范化。

规则：
- kind: "todo"（行动项、要做的事）或 "log"（已完成的事、状态、见闻、想法）
- title: 规范化标题，简洁明确，保留关键信息
- 仅当 kind=todo 时：priority（"P1"|"P2"|"P3"，紧急/重要为 P1）、due（"今天"|"明天"|"本周"|"无"）
- tag: 一个词的分类标签（如 前端/产品/生活/学习）
- reason: 15 字内说明归类理由
- 输出格式：{"kind":"...","title":"...","priority":"...","due":"...","tag":"...","reason":"..."}

文本：${text}`,
      },
    ],
    (p) => {
      const o = p as Record<string, unknown>
      if ((o.kind !== 'todo' && o.kind !== 'log') || typeof o.title !== 'string' || !o.title) return null
      return {
        kind: o.kind,
        title: o.title.slice(0, 120),
        priority: typeof o.priority === 'string' ? o.priority : 'P2',
        due: typeof o.due === 'string' ? o.due : '本周',
        tag: typeof o.tag === 'string' ? o.tag.slice(0, 12) : (scope === 'work' ? '产品' : '生活'),
        reason: typeof o.reason === 'string' ? o.reason.slice(0, 30) : '',
      }
    },
    { temperature: 0.2 },
  )

  await persistQuickCapture(userId, parsed, scope)
  return parsed
}

async function persistQuickCapture(
  userId: number,
  r: QuickCaptureResult,
  scope: 'work' | 'life',
) {
  if (r.kind === 'todo') {
    await prisma.todo.create({
      data: {
        userId, title: r.title, done: false,
        priority: ['P1', 'P2', 'P3'].includes(r.priority || '') ? r.priority! : 'P2',
        due: r.due === '今天' || r.due === '明天' || r.due === '本周' ? r.due : '本周',
        scope, source: 'AI 捕获', tag: r.tag,
      },
    })
    return
  }
  const t = today()
  const existing = await prisma.log.findFirst({ where: { userId, date: t, scope } })
  if (existing) {
    await prisma.log.update({
      where: { id: existing.id },
      data: { content: `${existing.content}\n- ${r.title}`, updatedAt: new Date() },
    })
  } else {
    await prisma.log.create({
      data: {
        userId, date: t, scope,
        title: scope === 'work' ? '今日工作日志' : '生活记录',
        content: `- ${r.title}`, tags: [], mood: 3, linked: [],
      },
    })
  }
  // 生活区与工作区仓库完全切割：生活日志挂 life/notes，不引用工作关注仓库
  const repo = scope === 'work'
    ? (await prisma.settings.findUniqueOrThrow({ where: { userId } })).watchedRepos[0] || 'work/notes'
    : 'life/notes'
  await prisma.activity.create({
    data: { userId, type: 'log', repo, scope, title: r.title, ts: new Date() },
  })
}

// ─── ④ 工作台洞察：跨数据源（日志/活动/待办/拆解）联动分析 ───

export interface InsightResult {
  headline: string
  points: string[]
  suggestion: string
}

export async function agentInsight(
  userId: number,
  scope: 'work' | 'life',
  context: {
    recentLogs: { date: string; title: string; content: string }[]
    recentActivities: { type: string; title: string; repo: string; ts: string }[]
    openTodos: { title: string; priority: string; due: string }[]
    breakdowns: { requirement: string; modules: number }[]
  },
): Promise<InsightResult> {
  const cfg = await requireLLMConfig(userId)
  const persona = scope === 'work'
    ? '你是工作汇报顾问，基于真实数据给出面向「向上汇报与交付」的犀利洞察：进度风险、价值呈现、优先级建议。'
    : '你是个人成长教练，基于真实记录给出面向「自我提升」的洞察：行为模式、成长机会、值得坚持或调整的事。'
  return chatJSON<InsightResult>(
    cfg,
    [
      { role: 'system', content: `${persona}只输出 JSON。` },
      {
        role: 'user',
        content: `综合以下工作台数据，给出今日洞察（当前分区：${scope === 'work' ? '工作（汇报视角）' : '生活（成长视角）'}）。

格式：{"headline":"一句话洞察(25字内)","points":["2-4 条具体发现，引用数据"],"suggestion":"一条最值得现在做的行动建议(30字内)"}

近期日志：
${context.recentLogs.map((l) => `- [${l.date}] ${l.title}: ${l.content.slice(0, 120)}`).join('\n') || '（无）'}

近期 GitHub 活动（${context.recentActivities.length} 条）：
${context.recentActivities.slice(0, 15).map((a) => `- [${a.repo}] ${a.type}: ${a.title}`).join('\n') || '（无）'}

未完成待办（${context.openTodos.length} 项）：
${context.openTodos.slice(0, 10).map((t) => `- [${t.priority}/${t.due}] ${t.title}`).join('\n') || '（无）'}

需求拆解记录：
${context.breakdowns.map((b) => `- ${b.requirement.slice(0, 60)}（${b.modules} 个模块）`).join('\n') || '（无）'}`,
      },
    ],
    (p) => {
      const o = p as { headline?: unknown; points?: unknown; suggestion?: unknown }
      const points = asStrings(o.points, 4)
      if (typeof o.headline !== 'string' || !o.headline || !points
        || typeof o.suggestion !== 'string' || !o.suggestion) return null
      return { headline: o.headline.slice(0, 40), points, suggestion: o.suggestion.slice(0, 60) }
    },
    { temperature: 0.6 },
  )
}

// ─── ⑤ 日志写作建议：基于当前日志草稿与今日真实活动 ───

export async function agentLogTips(
  userId: number,
  scope: 'work' | 'life',
  draft: { title: string; content: string },
  todaysActivities: { type: string; title: string; repo: string }[],
): Promise<string[]> {
  const cfg = await requireLLMConfig(userId)
  const persona = scope === 'work'
    ? '你是工作日志写作教练：帮用户把日志写成有汇报价值的记录——补结果、补量化、补影响。'
    : '你是生活复盘写作教练：帮用户把日记写成有成长价值的复盘——补感受、补细节、补反思，引导而不评判。'
  return chatJSON<string[]>(
    cfg,
    [
      { role: 'system', content: `${persona}只输出 JSON。` },
      {
        role: 'user',
        content: `基于日志草稿与今日真实活动，给出 3 条具体、可直接落笔的写作建议（${scope === 'work' ? '补充哪类结果与量化、如何组织以便汇报' : '补充哪类细节与感受、如何深化反思'}）。
每条 ≤40 字，引用真实活动，不要空话。

格式：{"tips":["...","...","..."]}

日志草稿：
标题：${draft.title || '（空）'}
内容：${draft.content || '（空）'}

今日活动：
${todaysActivities.slice(0, 15).map((a) => `- [${a.type}/${a.repo}] ${a.title}`).join('\n') || '（无）'}`,
      },
    ],
    (p) => {
      const o = p as { tips?: unknown }
      const tips = asStrings(o.tips, 4)
      return tips ? tips.map((t) => t.slice(0, 60)) : null
    },
    { temperature: 0.5 },
  )
}

// ─── 导出未配置错误，供路由层统一转换 ───
export { LLMNotConfiguredError }
