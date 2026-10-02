import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import type { OptionCount } from '../lib/types'

/** Horizontal bars for categorical answers. Single hue: identity comes from the label, not the colour. */
export function BarList({ options, highlightMax = true }: { options: OptionCount[]; highlightMax?: boolean }) {
  const { num } = useI18n()
  const max = Math.max(1, ...options.map((o) => o.count))
  const top = Math.max(...options.map((o) => o.count))
  return (
    <ul className="grid gap-3">
      {options.map((o) => {
        const isTop = highlightMax && o.count === top && top > 0
        return (
          <li key={o.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
            <span className="truncate text-sm text-ink-soft" title={o.label}>{o.label}</span>
            <span className="text-sm tabular-nums text-ink-soft sm:order-3 sm:min-w-24 sm:text-end">
              <span className="font-semibold text-ink">{num(o.percent)}%</span>
              <span className="ms-2 text-faint">({num(o.count)})</span>
            </span>
            <span className="col-span-2 h-3 rounded-e-[4px] bg-paper sm:order-2 sm:col-span-1" role="presentation">
              <span
                className={`block h-full rounded-e-[4px] transition-[width] duration-700 ease-out ${isTop ? 'bg-teal' : 'bg-teal/55'}`}
                style={{ width: `${(o.count / max) * 100}%`, minWidth: o.count > 0 ? 4 : 0 }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Vertical columns for ordinal distributions (rating stars, scales). */
export function Columns({ options, color = 'teal' }: { options: OptionCount[]; color?: 'teal' | 'saffron' }) {
  const { num } = useI18n()
  const max = Math.max(1, ...options.map((o) => o.count))
  const fill = color === 'saffron' ? 'bg-saffron' : 'bg-teal'
  return (
    <div>
      <div className="flex h-36 items-end gap-[2px] border-b border-line-strong" role="img"
        aria-label={options.map((o) => `${o.label}: ${o.count}`).join(', ')}>
        {options.map((o) => (
          <div key={o.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-xs tabular-nums text-muted">{o.count > 0 ? num(o.count) : ''}</span>
            <span
              className={`mx-auto block w-full max-w-12 rounded-t-[4px] ${fill} transition-[height] duration-700 ease-out group-hover:brightness-90`}
              style={{ height: `${(o.count / max) * 80}%`, minHeight: o.count > 0 ? 3 : 0 }}
              title={`${o.label}: ${o.count} (${o.percent}%)`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {options.map((o) => (
          <span key={o.label} className="flex-1 text-center text-xs tabular-nums text-muted">{o.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Responses per day, with a hover/focus tooltip on each day. */
export function Timeline({ data }: { data: { date: string; count: number }[] }) {
  const { lang, num, t } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.count))
  const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' })
  const label = (d: { date: string }) => fmt.format(new Date(`${d.date}T12:00:00`))
  const current = active !== null ? data[active] : null

  return (
    <figure>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <figcaption className="font-medium">{t('results.timeline')}</figcaption>
        <span className="min-h-5 text-sm tabular-nums text-muted" aria-live="polite">
          {current ? `${label(current)}: ${num(current.count)}` : ''}
        </span>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden="true" />
        <span className="pointer-events-none absolute -top-2.5 end-0 bg-surface ps-1 text-xs tabular-nums text-faint" aria-hidden="true">
          {num(max)}
        </span>
        <div className="flex h-32 items-end gap-[2px] border-b border-line-strong pt-1">
          {data.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className="group flex h-full flex-1 items-end focus:outline-none"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${label(d)}: ${d.count}`}
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${
                  active === i ? 'bg-saffron' : 'bg-teal'
                } group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-saffron`}
                style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 3 : 1, opacity: d.count > 0 ? 1 : 0.25 }}
              />
            </button>
          ))}
        </div>
      </div>
      {data.length > 0 && (
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>{label(data[0])}</span>
          <span>{label(data[data.length - 1])}</span>
        </div>
      )}
    </figure>
  )
}
