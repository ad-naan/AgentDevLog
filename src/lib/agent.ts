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

export async function runAssistant(
  userId: number,
  scope: 'work' | 'life',
  turns: AssistantTurn[],
): Promise<AssistantResult> {
  const last = turns[turns.length - 1]?.content?.trim() || ''
  if (!last) return { reply: '请输入内容。', actions: [] }

  // 第一步：意图识别（一次轻量 JSON 调用）
  const cfg = await requireLLMConfig(userId)
  const route = await chatJSON<{ intent: string }>(
    cfg,
    [
      { role: 'system', content: '你是意图分类器，只输出 JSON。' },
      {
        role: 'user',
        content: `把用户请求分类为一个 intent，取值：
- "todo"：要创建/记录一条待办事项
- "log"：要往今日日志追加一条记录
- "report"：要生成日报/周报/总结
- "breakdown"：要把一段需求拆解为任务
- "chat"：其他对话/提问

输出格式：{"intent":"..."}

用户请求：${last.slice(0, 500)}`,
      },
    ],
    (p) => {
      const o = p as Record<string, unknown>
      const ok = ['todo', 'log', 'report', 'breakdown', 'chat']
      return { intent: ok.includes(String(o.intent)) ? String(o.intent) : 'chat' }
    },
    { temperature: 0 },
  )

  const actions: string[] = []
  try {
    if (route.intent === 'todo' || route.intent === 'log') {
      const r = await agentQuickCapture(userId, last, scope)
      actions.push(r.kind === 'todo'
        ? `已创建待办「${r.title}」（${r.priority} · ${r.due}）`
        : `已追加到今日日志：「${r.title}」`)
      return { reply: `好的，${r.reason}。${actions[0]}。`, actions }
    }
    if (route.intent === 'report') {
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
      actions.push('已生成报告（报告中心可查看）')
      return { reply: r.summary, actions }
    }
    if (route.intent === 'breakdown') {
      const r = await agentBreakdown(userId, last, '标准')
      const total = r.modules.reduce((n, m) => n + m.tasks.length, 0)
      const created = await prisma.breakdown.create({
        data: {
          userId, requirement: last.slice(0, 500), mode: '标准', status: 'done',
          modules: r.modules, tech: r.tech,
        },
      })
      actions.push(`已拆解 ${r.modules.length} 个模块 / ${total} 个任务（需求拆解页可查看 #${created.id}）`)
      return {
        reply: `拆解完成：${r.modules.map((m) => `${m.name}（${m.tasks.length} 项）`).join('、')}。技术方案 ${r.tech.length} 条，已保存到需求拆解页。`,
        actions,
      }
    }
  } catch (e) {
    if (e instanceof LLMNotConfiguredError) throw e
    // 工具执行失败 → 降级为对话，不让整个请求 500
    return { reply: `执行时遇到问题：${e instanceof Error ? e.message : '未知错误'}。可以换个说法再试，或直接到对应页面操作。`, actions: [] }
  }

  // chat：带上下文的普通对话
  const ctx = await assistantContext(userId, scope)
  const r = await chatJSON<{ reply: string }>(
    cfg,
    [
      { role: 'system', content: `你是 devlog 工作台的 AI 助手，简洁中文回答。可以用以下用户近况作为背景：\n${ctx}` },
      ...turns.slice(-8).map((t) => ({ role: t.role, content: t.content.slice(0, 1000) })),
      // 追加一个约束轮，确保输出 JSON
      { role: 'user', content: '（请以 {"reply":"..."} 的 JSON 格式回答上一条）' },
    ],
    (p) => {
      const o = p as Record<string, unknown>
      return { reply: typeof o.reply === 'string' && o.reply ? o.reply : '（模型未返回内容）' }
    },
    { temperature: 0.5 },
  )
  return { reply: r.reply, actions: [] }
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
    commits: { title: string; repo: string }[]
    prs: { title: string; repo: string }[]
    openTodos: string[]
  },
): Promise<ReportResult> {
  const cfg = await requireLLMConfig(userId)
  return chatJSON<ReportResult>(
    cfg,
    [
      { role: 'system', content: '你是工作日报助手。根据原始记录生成简洁、专业、不虚构事实的日报。只输出 JSON。' },
      {
        role: 'user',
        content: `基于以下真实记录生成今日（${today()}）${scope === 'work' ? '工作' : '生活'}日报。

格式：{"summary":"一句话总结(40字内)","sections":{"done":["已完成事项"],"doing":["进行中"],"risks":["风险或阻塞"],"plans":["明日计划"]}}
每类 2-4 条，只依据记录，不要编造。

日志：
${basis.logs.map((l) => `- ${l.title}: ${l.content}`).join('\n') || '（无）'}

Commits（${basis.commits.length} 条）：
${basis.commits.slice(0, 10).map((c) => `- [${c.repo}] ${c.title}`).join('\n') || '（无）'}

PR 事件（${basis.prs.length} 条）：
${basis.prs.slice(0, 10).map((c) => `- [${c.repo}] ${c.title}`).join('\n') || '（无）'}

未完成待办：
${basis.openTodos.slice(0, 15).map((t) => `- ${t}`).join('\n') || '（无）'}`,
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
  const repo = (await prisma.settings.findUniqueOrThrow({ where: { userId } })).watchedRepos[0] || 'local/notes'
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
  return chatJSON<InsightResult>(
    cfg,
    [
      { role: 'system', content: '你是开发者的智能工作台助手，基于真实数据给出犀利、可执行的洞察。只输出 JSON。' },
      {
        role: 'user',
        content: `综合以下工作台数据，给出今日洞察（当前分区：${scope === 'work' ? '工作' : '生活'}）。

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
  draft: { title: string; content: string },
  todaysActivities: { type: string; title: string; repo: string }[],
): Promise<string[]> {
  const cfg = await requireLLMConfig(userId)
  return chatJSON<string[]>(
    cfg,
    [
      { role: 'system', content: '你是开发者日志写作教练。只输出 JSON。' },
      {
        role: 'user',
        content: `基于日志草稿与今日真实活动，给出 3 条具体、可直接落笔的写作建议（补充哪类内容、如何量化、如何组织）。
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
