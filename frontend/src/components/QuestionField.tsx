import { Star } from 'lucide-react'
import { scaleRange } from '../lib/questions'
import { translate } from '../lib/i18n'
import type { AnswerValue, Lang, Question } from '../lib/types'

interface FieldProps {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue | undefined) => void
  invalid: boolean
  lang: Lang
  describedBy?: string
}

const choiceRow =
  'flex cursor-pointer items-center gap-3 rounded-[var(--radius-field)] border border-line-strong bg-surface px-4 py-3 transition-colors hover:border-[var(--brand)] has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--brand)]'

export function QuestionField({ question: q, value, onChange, invalid, lang, describedBy }: FieldProps) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars)
  const name = `q-${q.id}`
  const common = { 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy }

  switch (q.type) {
    case 'SHORT_TEXT':
      return (
        <input
          id={name}
          className="field"
          maxLength={500}
          placeholder={t('form.yourAnswer')}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      )
    case 'LONG_TEXT':
      return (
        <textarea
          id={name}
          className="field min-h-28 resize-y"
          rows={4}
          maxLength={5000}
          placeholder={t('form.yourAnswer')}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      )
    case 'NUMBER':
      return (
        <input
          id={name}
          type="number"
          inputMode="decimal"
          className="field max-w-60"
          min={q.settings?.min ?? undefined}
          max={q.settings?.max ?? undefined}
          step="any"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          {...common}
        />
      )
    case 'DATE':
      return (
        <input
          id={name}
          type="date"
          className="field max-w-60"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          {...common}
        />
      )
    case 'DROPDOWN':
      return (
        <select
          id={name}
          className="field max-w-md"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          {...common}
        >
          <option value="">{t('form.choose')}</option>
          {q.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'SINGLE_CHOICE':
      return (
        <div role="radiogroup" className="grid gap-2" {...common}>
          {q.options.map((o) => (
            <label key={o} className={choiceRow}>
              <input
                type="radio"
                name={name}
                className="size-4 accent-[var(--brand)]"
                checked={value === o}
                onChange={() => onChange(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )
    case 'MULTIPLE_CHOICE': {
      const selected = Array.isArray(value) ? value : []
      return (
        <div className="grid gap-2" {...common}>
          <p className="hint -mt-1 mb-1">{t('form.selectAll')}</p>
          {q.options.map((o) => (
            <label key={o} className={choiceRow}>
              <input
                type="checkbox"
                className="size-4 rounded accent-[var(--brand)]"
                checked={selected.includes(o)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, o] : selected.filter((s) => s !== o)
                  onChange(next.length ? q.options.filter((opt) => next.includes(opt)) : undefined)
                }}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'RATING': {
      const max = q.settings?.max ?? 5
      const current = typeof value === 'number' ? value : 0
      return (
        <div role="radiogroup" className="flex flex-wrap gap-1" {...common}>
          {scaleRange(q).map((v) => (
            <label key={v} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--brand)]">
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={current === v}
                onChange={() => onChange(v)}
                aria-label={t('form.stars', { n: v, max })}
              />
              <Star
                size={34}
                strokeWidth={1.5}
                className={`transition-transform active:scale-90 ${v <= current ? 'fill-saffron text-saffron' : 'text-line-strong'}`}
              />
            </label>
          ))}
        </div>
      )
    }
    case 'SCALE': {
      const values = scaleRange(q)
      return (
        <div {...common}>
          <div
            role="radiogroup"
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
          >
            {values.map((v) => (
              <label
                key={v}
                className="grid h-11 cursor-pointer place-items-center rounded-[var(--radius-field)] border border-line-strong bg-surface text-sm font-medium transition-colors hover:border-[var(--brand)] has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand)] has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--brand)]"
              >
                <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
                {v}
              </label>
            ))}
          </div>
          {(q.settings?.minLabel || q.settings?.maxLabel) && (
            <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
              <span>{q.settings?.minLabel}</span>
              <span className="text-end">{q.settings?.maxLabel}</span>
            </div>
          )}
        </div>
      )
    }
  }
}

export function isEmptyAnswer(value: AnswerValue | undefined) {
  return (
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'number' && Number.isNaN(value))
  )
}

/** Client-side mirror of the API's checks, so most mistakes are caught before submitting. */
export function validateAnswer(q: Question, value: AnswerValue | undefined): string | null {
  if (isEmptyAnswer(value)) return q.required ? 'REQUIRED' : null
  if (q.type === 'NUMBER' && typeof value === 'number') {
    if ((q.settings?.min != null && value < q.settings.min) || (q.settings?.max != null && value > q.settings.max)) {
      return 'OUT_OF_RANGE'
    }
  }
  return null
}
