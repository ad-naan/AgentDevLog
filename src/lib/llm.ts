import { prisma } from './prisma'

// ─── OpenAI 协议兼容的 LLM 封装（服务端唯一 AI 通道）───
// 设计原则：不做任何静默回退。未配置 / 调用失败都抛出类型化错误，
// 由 API 路由转换为 4xx/5xx 响应并让 UI 明确提示。

/** LLM 未配置（Base URL / 模型 / API Key 任一为空） */
export class LLMNotConfiguredError extends Error {
  constructor() {
    super('LLM 未配置：请在「设置」中填写 Base URL、模型名与 API Key')
    this.name = 'LLMNotConfiguredError'
  }
}

/** LLM 调用失败（网络 / HTTP / 响应格式） */
export class LLMError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMError'
  }
}

export interface LLMConfig {
  baseUrl: string
  model: string
  apiKey: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 读取用户配置；未配置时抛出 LLMNotConfiguredError（调用方必须处理） */
export async function requireLLMConfig(userId: number): Promise<LLMConfig> {
  const s = await prisma.settings.findUniqueOrThrow({ where: { userId } })
  if (!s.llmBaseUrl || !s.llmModel || !s.llmApiKey) throw new LLMNotConfiguredError()
  return { baseUrl: s.llmBaseUrl.replace(/\/+$/, ''), model: s.llmModel, apiKey: s.llmApiKey }
}

/** 已配置即返回（用于 UI 状态展示，不抛错） */
export async function findLLMConfig(userId: number): Promise<LLMConfig | null> {
  try { return await requireLLMConfig(userId) } catch { return null }
}

/**
 * 对话补全，OpenAI 兼容协议：POST {baseUrl}/chat/completions
 * 失败一律抛 LLMError，不返回空串或降级结果。
 */
export async function chatLLM(
  cfg: LLMConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; timeoutMs?: number } = {},
): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000)
  try {
    let res: Response
    try {
      res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, messages, temperature: opts.temperature ?? 0.4 }),
        signal: ctrl.signal,
      })
    } catch (e) {
      throw new LLMError(`无法连接 LLM 服务：${(e as Error).message}`)
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new LLMError(`LLM HTTP ${res.status}：${body.slice(0, 200)}`)
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = j.choices?.[0]?.message?.content?.trim()
    if (!text) throw new LLMError('LLM 返回内容为空')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 结构化对话：要求模型只输出 JSON，解析失败抛 LLMError。
 * 校验函数 validate 用于把「格式对但语义不完整」也变成显式错误。
 */
export async function chatJSON<T>(
  cfg: LLMConfig,
  messages: ChatMessage[],
  validate: (parsed: unknown) => T | null,
  opts: { temperature?: number; timeoutMs?: number } = {},
): Promise<T> {
  const raw = await chatLLM(cfg, messages, opts)
  const parsed = extractJSON(raw)
  const result = parsed === null ? null : validate(parsed)
  if (result === null) throw new LLMError('LLM 输出的 JSON 结构不符合预期，请重试')
  return result
}

/** 从模型回复中提取 JSON（容忍 ```json 围栏与前后说明文字），失败返回 null */
export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = Math.min(
    ...['{', '['].map((c) => { const i = raw.indexOf(c); return i === -1 ? Infinity : i }),
  )
  if (!isFinite(start)) return null
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'))
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

/** 连通性自检（设置页专用，永不抛错） */
export async function testLLM(userId: number): Promise<{ ok: boolean; message: string }> {
  let cfg: LLMConfig
  try {
    cfg = await requireLLMConfig(userId)
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
  try {
    const reply = await chatLLM(
      cfg,
      [
        { role: 'system', content: '只回复两个字符：ok' },
        { role: 'user', content: 'ping' },
      ],
      { timeoutMs: 20_000 },
    )
    return { ok: true, message: `连通成功（${cfg.model}）` }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}
