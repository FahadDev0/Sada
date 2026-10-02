import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import { ApiError } from '../lib/api'
import { translate, type MessageKey } from '../lib/i18n'
import type { AnswerValue, Lang, Question } from '../lib/types'
import { isEmptyAnswer, QuestionField, validateAnswer } from './QuestionField'
import { Spinner } from './ui'

export interface FormSurvey {
  title: string
  description: string | null
  language: Lang
  themeColor: string
  questions: Question[]
}

export function brandStyle(color: string): CSSProperties {
  return {
    '--brand': color,
    '--brand-soft': `color-mix(in srgb, ${color} 9%, white)`,
  } as CSSProperties
}

interface Props {
  survey: FormSurvey
  /** Omit for preview mode (submit disabled). */
  onSubmit?: (answers: Record<string, AnswerValue>) => Promise<void>
}

export function SurveyForm({ survey, onSubmit }: Props) {
  const lang = survey.language
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars)
  const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const answeredCount = useMemo(
    () => survey.questions.filter((q) => !isEmptyAnswer(answers[q.id])).length,
    [answers, survey.questions],
  )
  const progress = survey.questions.length ? answeredCount / survey.questions.length : 0

  const setAnswer = (id: string, value: AnswerValue | undefined) => {
    setAnswers((a) => ({ ...a, [id]: value }))
    if (errors[id]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)))
  }

  const focusFirstError = (errs: Record<string, string>) => {
    const firstId = survey.questions.find((q) => errs[q.id])?.id
    if (!firstId) return
    const el = formRef.current?.querySelector<HTMLElement>(`[data-question="${firstId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!onSubmit || submitting) return
    const errs: Record<string, string> = {}
    for (const q of survey.questions) {
      const err = validateAnswer(q, answers[q.id])
      if (err) errs[q.id] = err
    }
    setErrors(errs)
    if (Object.keys(errs).length) {
      setFormError(t('form.fixErrors'))
      focusFirstError(errs)
      return
    }
    const payload: Record<string, AnswerValue> = {}
    for (const q of survey.questions) {
      const v = answers[q.id]
      if (!isEmptyAnswer(v)) payload[q.id] = typeof v === 'string' ? v.trim() : (v as AnswerValue)
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmit(payload)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length) {
        setErrors(err.details)
        focusFirstError(err.details)
      }
      const key = `error.${(err as ApiError)?.code}` as MessageKey
      setFormError(translate(lang, key) !== key ? translate(lang, key) : t('error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={brandStyle(survey.themeColor)} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
      <div className="sticky top-0 z-10 h-1.5 bg-line" aria-hidden="true">
        <div
          className="h-full bg-[var(--brand)] transition-[width] duration-500 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold leading-snug text-balance sm:text-4xl">{survey.title}</h1>
          {survey.description && <p className="mt-3 whitespace-pre-line text-lg text-ink-soft">{survey.description}</p>}
        </header>

        <ol className="grid gap-4">
          {survey.questions.map((q, i) => {
            const errorCode = errors[q.id]
            const errorId = `err-${q.id}`
            return (
              <li
                key={q.id}
                data-question={q.id}
                className={`panel scroll-mt-6 p-5 sm:p-6 ${errorCode ? 'border-danger/60' : ''}`}
              >
                <fieldset>
                  <legend className="mb-1 flex w-full items-start gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
                      {i + 1}
                    </span>
                    <span className="text-lg font-medium leading-relaxed">
                      {q.title}
                      {q.required && (
                        <span className="ms-1 text-danger" aria-label={t('form.required')}>
                          *
                        </span>
                      )}
                    </span>
                  </legend>
                  {q.description && <p className="ms-10 whitespace-pre-line text-sm text-muted">{q.description}</p>}
                  <div className="mt-4 sm:ms-10">
                    <QuestionField
                      question={q}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      invalid={!!errorCode}
                      lang={lang}
                      describedBy={errorCode ? errorId : undefined}
                    />
                  </div>
                  {errorCode && (
                    <p id={errorId} className="mt-3 flex items-center gap-1.5 text-sm text-danger sm:ms-10">
                      <AlertCircle size={15} />
                      {translate(lang, `answer.${errorCode}` as MessageKey)}
                    </p>
                  )}
                </fieldset>
              </li>
            )
          })}
        </ol>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {t('form.progress', { done: answeredCount, total: survey.questions.length })}
          </p>
          <button
            type="submit"
            disabled={!onSubmit || submitting}
            className="btn min-w-40 bg-[var(--brand)] py-3 text-base text-white hover:brightness-95"
          >
            {submitting && <Spinner size={16} />}
            {submitting ? t('form.submitting') : t('form.submit')}
          </button>
        </div>
        {formError && (
          <p role="alert" className="mt-4 rounded-[var(--radius-field)] bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
      </form>
    </div>
  )
}
