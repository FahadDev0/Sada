import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { BarChart3, QrCode, Sparkles, ListChecks } from 'lucide-react'
import { PublicHeader, WakeBanner } from '../components/AppShell'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

const SEED = [42, 21, 37]

/** The hero is a working mini-survey: answer it and it turns into the owner's results view. */
function DemoQuestion() {
  const { t, num } = useI18n()
  const options = t('landing.demoOptions').split('|')
  const [counts, setCounts] = useState(SEED)
  const [picked, setPicked] = useState<number | null>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const total = counts.reduce((a, b) => a + b, 0)

  const vote = (i: number, e: MouseEvent<HTMLButtonElement>) => {
    if (picked !== null) return
    const box = e.currentTarget.closest('[data-demo]')!.getBoundingClientRect()
    setRipple({ x: e.clientX - box.left, y: e.clientY - box.top, key: Date.now() })
    setPicked(i)
    setCounts((c) => c.map((v, idx) => (idx === i ? v + 1 : v)))
  }

  return (
    <div data-demo className="panel relative overflow-hidden p-6 shadow-[0_24px_60px_-30px_rgba(16,32,29,0.35)] sm:p-8">
      {ripple && (
        <span
          key={ripple.key}
          aria-hidden="true"
          className="pointer-events-none absolute size-56 -translate-x-1/2 -translate-y-1/2 animate-echo rounded-full border-2 border-saffron"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}
      <p className="font-display text-2xl font-semibold">{t('landing.demoQuestion')}</p>
      <div className="mt-5 grid gap-2.5" role="group" aria-label={t('landing.demoQuestion')}>
        {options.map((label, i) => {
          const percent = Math.round((counts[i] / total) * 100)
          const voted = picked !== null
          return (
            <button
              key={label}
              type="button"
              onClick={(e) => vote(i, e)}
              disabled={voted}
              aria-pressed={picked === i}
              className={`relative overflow-hidden rounded-[var(--radius-field)] border px-4 py-3 text-start transition-colors ${
                picked === i ? 'border-teal' : 'border-line-strong'
              } ${voted ? 'cursor-default' : 'hover:border-teal hover:bg-teal-soft/50'}`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 start-0 transition-[width] duration-700 ease-out ${
                  picked === i ? 'bg-teal-soft' : 'bg-paper'
                }`}
                style={{ width: voted ? `${percent}%` : '0%' }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="font-medium">{label}</span>
                {voted && <span className="text-sm tabular-nums text-ink-soft">{num(percent)}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-4 min-h-6 text-sm text-muted" aria-live="polite">
        {picked === null ? t('landing.demoHint') : t('landing.demoThanks')}
      </p>
    </div>
  )
}

export default function Landing() {
  const { t } = useI18n()
  const { status } = useAuth()
  const authed = status === 'authenticated'

  const features = [
    { icon: ListChecks, title: t('landing.f1.title'), body: t('landing.f1.body') },
    { icon: QrCode, title: t('landing.f2.title'), body: t('landing.f2.body') },
    { icon: BarChart3, title: t('landing.f3.title'), body: t('landing.f3.body') },
    { icon: Sparkles, title: t('landing.f4.title'), body: t('landing.f4.body') },
  ]

  return (
    <div className="min-h-dvh">
      <WakeBanner />
      <PublicHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20">
        <div>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.25] text-balance sm:text-6xl sm:leading-[1.2]">
            {t('landing.title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">{t('landing.body')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {authed ? (
              <Link to="/app" className="btn btn-primary px-6 py-3 text-base">
                {t('landing.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary px-6 py-3 text-base">
                  {t('landing.start')}
                </Link>
                <Link to="/login" className="btn btn-secondary px-6 py-3 text-base">
                  {t('landing.login')}
                </Link>
              </>
            )}
          </div>
        </div>
        <DemoQuestion />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="text-teal" size={26} strokeWidth={1.75} />
              <h2 className="mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">{t('landing.stepsTitle')}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[t('landing.s1'), t('landing.s2'), t('landing.s3')].map((step, i) => (
            <li key={step} className="flex gap-4">
              <span className="font-display text-4xl font-semibold leading-none text-saffron">{i + 1}</span>
              <p className="pt-1 text-lg leading-relaxed text-ink-soft">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">{t('landing.footer')}</div>
      </footer>
    </div>
  )
}
