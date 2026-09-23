export class ApiRequestError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

export async function apiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    return body.error || `请求失败（${res.status}）`
  } catch {
    return `请求失败（${res.status}）`
  }
}

export async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch (error) {
    throw new ApiRequestError(error instanceof Error ? error.message : '网络请求失败，请稍后重试', 0)
  }

  if (!res.ok) {
    let message = `请求失败（${res.status}）`
    let code: string | undefined
    try {
      const body = (await res.json()) as { error?: string; code?: string }
      message = body.error || message
      code = body.code
    } catch {
      // 保留状态码错误，避免非 JSON 响应吞掉原因。
    }
    throw new ApiRequestError(message, res.status, code)
  }

  return (await res.json()) as T
}
