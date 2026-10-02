const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8080'
const TOKEN_KEY = 'sada:token'

export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, string>

  constructor(status: number, code: string, message: string, details: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// ---------------------------------------------------------------- token

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode) — session-only login */
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

// ---------------------------------------------------------------- "server waking up" signal
// Free hosting puts the API to sleep; the first request can take ~30–60 s.

type SlowListener = (slow: boolean) => void
const slowListeners = new Set<SlowListener>()
let slowCount = 0

export function subscribeSlow(listener: SlowListener) {
  slowListeners.add(listener)
  return () => {
    slowListeners.delete(listener)
  }
}

function setSlow(delta: number) {
  slowCount = Math.max(0, slowCount + delta)
  slowListeners.forEach((l) => l(slowCount > 0))
}

// ---------------------------------------------------------------- request

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

async function raw(path: string, { method = 'GET', body, auth = true, signal }: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers['Authorization'] = `Bearer ${token}`

  let flagged = false
  const timer = setTimeout(() => {
    flagged = true
    setSlow(1)
  }, 3500)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK', 'Network error')
  } finally {
    clearTimeout(timer)
    if (flagged) setSlow(-1)
  }

  if (!res.ok) {
    let code = `HTTP_${res.status}`
    let message = res.statusText
    let details: Record<string, string> = {}
    try {
      const data = await res.json()
      code = data.code ?? code
      message = data.message ?? message
      details = data.details ?? {}
    } catch {
      /* non-JSON error */
    }
    if (res.status === 401 && token) {
      onUnauthorized?.()
    }
    throw new ApiError(res.status, code, message, details)
  }
  return res
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await raw(path, options)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function download(path: string, fallbackName: string) {
  const res = await raw(path)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/.exec(disposition)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match?.[1] ?? fallbackName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function timezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
