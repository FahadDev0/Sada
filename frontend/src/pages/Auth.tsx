import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { LanguageToggle, WakeBanner } from '../components/AppShell'
import { GoogleButton } from '../components/GoogleButton'
import { Logo } from '../components/Logo'
import { Spinner } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import type { AuthResponse } from '../lib/types'

function AuthLayout({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <WakeBanner />
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <LanguageToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mb-7 mt-1.5 text-muted">{body}</p>
          {children}
        </div>
      </main>
    </div>
  )
}

function useAfterAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return useCallback(() => navigate(from && from.startsWith('/app') ? from : '/app', { replace: true }), [navigate, from])
}

export function LoginPage() {
  const { t, err } = useI18n()
  const { signIn } = useAuth()
  const done = useAfterAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onGoogleError = useCallback((e: unknown) => setError(err(e)), [err])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      signIn(await api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }))
      done()
    } catch (ex) {
      setError(err(ex))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} body={t('auth.loginBody')}>
      <form onSubmit={submit} className="grid gap-4">
        <div>
          <label className="label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" dir="ltr" autoComplete="email" required className="field"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" dir="ltr" autoComplete="current-password" required className="field"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-[var(--radius-field)] bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary mt-1 py-3" disabled={busy}>
          {busy && <Spinner size={16} />}
          {t('auth.loginBtn')}
        </button>
      </form>
      <GoogleButton onError={onGoogleError} onSuccess={done} />
      <p className="mt-7 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-teal-dark underline-offset-4 hover:underline">
          {t('auth.registerBtn')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { t, err } = useI18n()
  const { signIn } = useAuth()
  const done = useAfterAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onGoogleError = useCallback((e: unknown) => setError(err(e)), [err])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      signIn(await api<AuthResponse>('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false }))
      done()
    } catch (ex) {
      setError(ex instanceof ApiError && ex.code === 'VALIDATION' && ex.details.password
        ? t('auth.passwordHint')
        : err(ex))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title={t('auth.registerTitle')} body={t('auth.registerBody')}>
      <form onSubmit={submit} className="grid gap-4">
        <div>
          <label className="label" htmlFor="name">{t('auth.name')}</label>
          <input id="name" autoComplete="name" required maxLength={120} className="field"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" dir="ltr" autoComplete="email" required className="field"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" dir="ltr" autoComplete="new-password" required minLength={8}
            className="field" aria-describedby="pw-hint" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p id="pw-hint" className="hint mt-1.5">{t('auth.passwordHint')}</p>
        </div>
        {error && <p role="alert" className="rounded-[var(--radius-field)] bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary mt-1 py-3" disabled={busy}>
          {busy && <Spinner size={16} />}
          {t('auth.registerBtn')}
        </button>
      </form>
      <GoogleButton onError={onGoogleError} onSuccess={done} />
      <p className="mt-7 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-teal-dark underline-offset-4 hover:underline">
          {t('auth.loginBtn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
