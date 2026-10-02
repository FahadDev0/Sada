import { Link } from 'react-router'
import { useI18n } from '../lib/i18n'

/** The echo mark: a source dot with three widening arcs. */
export function EchoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={`flip-rtl ${className}`}>
      <rect width="64" height="64" rx="16" fill="var(--color-teal)" />
      <circle cx="20" cy="32" r="6" fill="#fff" />
      <g fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
        <path d="M31 22a14 14 0 0 1 0 20" />
        <path d="M39 15a24 24 0 0 1 0 34" opacity=".75" />
        <path d="M47 8a34 34 0 0 1 0 48" stroke="var(--color-saffron)" />
      </g>
    </svg>
  )
}

export function Logo({ to = '/' }: { to?: string }) {
  const { t } = useI18n()
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg">
      <EchoMark size={30} />
      <span className="font-display text-2xl font-semibold leading-none tracking-tight text-ink">{t('appName')}</span>
    </Link>
  )
}
