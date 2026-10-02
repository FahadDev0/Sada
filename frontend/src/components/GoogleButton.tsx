import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { useI18n } from '../lib/i18n'
import type { AuthResponse } from '../lib/types'

interface GoogleId {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleId
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript() {
  if (window.google?.accounts) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('gsi'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/** "Sign in with Google" — shown only when the API has a Google client id configured. */
export function GoogleButton({ onError, onSuccess }: { onError: (e: unknown) => void; onSuccess: () => void }) {
  const { data: config } = useConfig()
  const { lang, t } = useI18n()
  const { signIn } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const clientId = config?.googleEnabled ? config.googleClientId : null

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const auth = await api<AuthResponse>('/api/auth/google', { method: 'POST', body: { credential }, auth: false })
              signIn(auth)
              onSuccess()
            } catch (e) {
              onError(e)
            }
          },
        })
        ref.current.innerHTML = ''
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: Math.min(ref.current.offsetWidth || 360, 400),
          locale: lang,
        })
        setReady(true)
      })
      .catch(() => setReady(false))
    return () => {
      cancelled = true
    }
  }, [clientId, lang, signIn, onError, onSuccess])

  if (!clientId) return null
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-sm text-faint">
        <span className="h-px flex-1 bg-line" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={ref} className={`flex min-h-11 w-full justify-center ${ready ? '' : 'opacity-0'}`} />
    </>
  )
}
