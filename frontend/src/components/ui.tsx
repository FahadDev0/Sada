import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import type { SurveyStatus } from '../lib/types'

export function StatusBadge({ status }: { status: SurveyStatus }) {
  const { t } = useI18n()
  const styles: Record<SurveyStatus, string> = {
    DRAFT: 'bg-paper text-muted ring-line-strong',
    PUBLISHED: 'bg-teal-soft text-teal-dark ring-teal/25',
    CLOSED: 'bg-saffron-soft text-saffron-dark ring-saffron/30',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles[status]}`}>
      <span
        className={`size-1.5 rounded-full ${
          status === 'PUBLISHED' ? 'bg-teal' : status === 'CLOSED' ? 'bg-saffron' : 'bg-faint'
        }`}
      />
      {t(`status.${status}`)}
    </span>
  )
}

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoader() {
  const { t } = useI18n()
  return (
    <div className="grid min-h-[50vh] place-items-center text-muted">
      <div className="flex items-center gap-3">
        <Spinner />
        <span>{t('loading')}</span>
      </div>
    </div>
  )
}

/** Concentric rings — the empty-state illustration, echoing the logo. */
export function EchoRings({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="8" fill="var(--color-teal)" />
      <circle cx="60" cy="60" r="22" fill="none" stroke="var(--color-teal)" strokeOpacity=".45" strokeWidth="2" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="var(--color-teal)" strokeOpacity=".25" strokeWidth="2" />
      <circle cx="60" cy="60" r="55" fill="none" stroke="var(--color-saffron)" strokeOpacity=".6" strokeWidth="2" strokeDasharray="3 6" />
    </svg>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <EchoRings className="mb-5 size-28" />
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="panel mx-auto my-10 max-w-md p-6 text-center">
      <p className="text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-4" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  )
}

interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

/** Small popover menu anchored to a trigger button. */
export function Menu({ label, trigger, items }: { label: string; trigger: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 min-w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm hover:bg-paper ${
                item.danger ? 'text-danger' : 'text-ink'
              }`}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
