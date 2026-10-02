import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CircleStop,
  Copy,
  Eye,
  ListOrdered,
  Plus,
  Rocket,
  Settings2,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import { ConfirmDialog } from '../components/Modal'
import { ShareDialog } from '../components/ShareDialog'
import { SurveyForm } from '../components/SurveyForm'
import { useToast } from '../components/Toast'
import { ErrorBox, PageLoader, Spinner, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { useI18n, type MessageKey } from '../lib/i18n'
import { isChoice, QUESTION_TYPES, tempId, THEME_COLORS, TYPE_ICONS, withTypeDefaults } from '../lib/questions'
import type { Lang, Question, QuestionType, Survey, SurveyInput, SurveyStatus } from '../lib/types'

type Draft = Omit<Survey, 'id' | 'slug' | 'status' | 'createdAt' | 'updatedAt' | 'responseCount'>
type Tab = 'questions' | 'settings' | 'preview'
type QuestionErrors = Record<string, MessageKey>

function toDraft(s: Survey): Draft {
  return {
    title: s.title,
    description: s.description,
    language: s.language,
    themeColor: s.themeColor,
    thankYouMessage: s.thankYouMessage,
    oneResponsePerDevice: s.oneResponsePerDevice,
    closesAt: s.closesAt,
    questions: s.questions.map((q) => ({ ...q, options: [...q.options], settings: q.settings ? { ...q.settings } : null })),
  }
}

function toInput(d: Draft): SurveyInput {
  return {
    title: d.title.trim(),
    description: d.description?.trim() || null,
    language: d.language,
    themeColor: d.themeColor,
    thankYouMessage: d.thankYouMessage?.trim() || null,
    oneResponsePerDevice: d.oneResponsePerDevice,
    closesAt: d.closesAt,
    questions: d.questions.map((q) => ({
      id: q.id.startsWith('new-') ? null : q.id,
      type: q.type,
      title: q.title.trim(),
      description: q.description?.trim() || null,
      required: q.required,
      options: isChoice(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      settings: q.settings,
    })),
  }
}

function validate(d: Draft): QuestionErrors {
  const errors: QuestionErrors = {}
  for (const q of d.questions) {
    if (!q.title.trim()) errors[q.id] = 'editor.titleRequired'
    else if (isChoice(q.type) && !q.options.some((o) => o.trim())) errors[q.id] = 'editor.optionsRequired'
  }
  return errors
}

/** ISO instant ⇄ value for <input type="datetime-local"> in the user's zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ------------------------------------------------------------------ question card

function OptionsEditor({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const { t } = useI18n()
  const listRef = useRef<HTMLDivElement>(null)
  const focusIndex = useRef<number | null>(null)

  useEffect(() => {
    if (focusIndex.current === null) return
    listRef.current?.querySelectorAll<HTMLInputElement>('input')[focusIndex.current]?.focus()
    focusIndex.current = null
  })

  const setOption = (i: number, value: string) => onChange({ ...q, options: q.options.map((o, idx) => (idx === i ? value : o)) })
  const addOption = (at = q.options.length) => {
    if (q.options.length >= 50) return
    const options = [...q.options]
    options.splice(at, 0, '')
    focusIndex.current = at
    onChange({ ...q, options })
  }
  const removeOption = (i: number) => {
    focusIndex.current = Math.max(0, i - 1)
    onChange({ ...q, options: q.options.filter((_, idx) => idx !== i) })
  }

  const marker =
    q.type === 'MULTIPLE_CHOICE' ? 'rounded-[4px]' : q.type === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded-full opacity-0'

  return (
    <div ref={listRef} className="grid gap-2">
      {q.options.map((option, i) => (
        <div key={i} className="flex items-center gap-2">
          {q.type === 'DROPDOWN' ? (
            <span className="w-5 shrink-0 text-center text-sm tabular-nums text-faint">{i + 1}</span>
          ) : (
            <span className={`size-4 shrink-0 border-2 border-line-strong ${marker}`} aria-hidden="true" />
          )}
          <input
            className="field py-2"
            value={option}
            maxLength={200}
            placeholder={t('editor.option', { n: i + 1 })}
            aria-label={t('editor.option', { n: i + 1 })}
            onChange={(e) => setOption(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addOption(i + 1)
              } else if (e.key === 'Backspace' && option === '' && q.options.length > 1) {
                e.preventDefault()
                removeOption(i)
              }
            }}
          />
          <button
            type="button"
            className="icon-btn shrink-0"
            onClick={() => removeOption(i)}
            disabled={q.options.length <= 1}
            aria-label={t('editor.removeOption')}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost justify-self-start text-sm text-teal-dark" onClick={() => addOption()}>
        <Plus size={16} />
        {t('editor.addOption')}
      </button>
    </div>
  )
}

function NumberSelect({ id, value, from, to, onChange }: {
  id: string
  value: number
  from: number
  to: number
  onChange: (n: number) => void
}) {
  const values: number[] = []
  for (let n = from; n <= to; n++) values.push(n)
  return (
    <select id={id} className="field w-24" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {values.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  )
}

function TypeSettings({ q, onChange }: { q: Question; onChange: (q: Question) => void }) {
  const { t } = useI18n()
  const s = q.settings ?? {}
  const set = (patch: Partial<NonNullable<Question['settings']>>) => onChange({ ...q, settings: { ...s, ...patch } })
  const base = `q-${q.id}`

  switch (q.type) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
    case 'DROPDOWN':
      return <OptionsEditor q={q} onChange={onChange} />
    case 'RATING':
      return (
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-soft" htmlFor={`${base}-max`}>{t('editor.ratingMax')}</label>
          <NumberSelect id={`${base}-max`} value={s.max ?? 5} from={3} to={10} onChange={(max) => set({ max })} />
        </div>
      )
    case 'SCALE': {
      const min = s.min ?? 1
      return (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-ink-soft" htmlFor={`${base}-min`}>{t('editor.scaleFrom')}</label>
            <NumberSelect id={`${base}-min`} value={min} from={0} to={1}
              onChange={(v) => set({ min: v, max: Math.max(s.max ?? 5, v + 2) })} />
            <label className="text-sm text-ink-soft" htmlFor={`${base}-to`}>{t('editor.scaleTo')}</label>
            <NumberSelect id={`${base}-to`} value={s.max ?? 5} from={min + 2} to={10} onChange={(max) => set({ max })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${base}-minl`}>{t('editor.minLabel')} <span className="font-normal text-faint">({min})</span></label>
              <input id={`${base}-minl`} className="field" maxLength={60} placeholder={t('editor.minLabelPh')}
                value={s.minLabel ?? ''} onChange={(e) => set({ minLabel: e.target.value || null })} />
            </div>
            <div>
              <label className="label" htmlFor={`${base}-maxl`}>{t('editor.maxLabel')} <span className="font-normal text-faint">({s.max ?? 5})</span></label>
              <input id={`${base}-maxl`} className="field" maxLength={60} placeholder={t('editor.maxLabelPh')}
                value={s.maxLabel ?? ''} onChange={(e) => set({ maxLabel: e.target.value || null })} />
            </div>
          </div>
        </div>
      )
    }
    case 'NUMBER': {
      const parse = (v: string) => (v === '' ? null : Math.trunc(Number(v)))
      return (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor={`${base}-nmin`}>{t('editor.numberMin')}</label>
            <input id={`${base}-nmin`} type="number" className="field" placeholder={t('editor.optional')}
              value={s.min ?? ''} onChange={(e) => set({ min: parse(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor={`${base}-nmax`}>{t('editor.numberMax')}</label>
            <input id={`${base}-nmax`} type="number" className="field" placeholder={t('editor.optional')}
              value={s.max ?? ''} onChange={(e) => set({ max: parse(e.target.value) })} />
          </div>
        </div>
      )
    }
    default:
      return (
        <div className="rounded-[var(--radius-field)] border border-dashed border-line-strong px-4 py-3 text-sm text-faint">
          {t(`type.${q.type}`)}
        </div>
      )
  }
}

function QuestionCard({ q, index, total, error, onChange, onMove, onDuplicate, onDelete }: {
  q: Question
  index: number
  total: number
  error?: MessageKey
  onChange: (q: Question) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [showDescription, setShowDescription] = useState(!!q.description)
  const Icon = TYPE_ICONS[q.type]
  const base = `q-${q.id}`

  return (
    <li data-question={q.id} className={`panel scroll-mt-24 p-4 sm:p-5 ${error ? 'border-danger/70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-teal-soft text-sm font-semibold text-teal-dark">
          {index + 1}
        </span>
        <div className="relative">
          <Icon size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <select
            className="field w-auto py-1.5 ps-9 text-sm"
            value={q.type}
            aria-label={t('editor.chooseType')}
            onChange={(e) => onChange(withTypeDefaults(q, e.target.value as QuestionType, (n) => t('editor.option', { n })))}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>{t(`type.${type}`)}</option>
            ))}
          </select>
        </div>
        <label className="ms-1 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" className="peer sr-only" checked={q.required}
            onChange={(e) => onChange({ ...q, required: e.target.checked })} />
          <span className="relative h-5 w-9 rounded-full bg-line-strong transition-colors after:absolute after:start-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-teal peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-teal" />
          {t('editor.required')}
        </label>
        <div className="ms-auto flex items-center">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t('editor.moveUp')}>
            <ArrowUp size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={t('editor.moveDown')}>
            <ArrowDown size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={onDuplicate} aria-label={t('editor.duplicateQ')}>
            <Copy size={16} />
          </button>
          <button type="button" className="icon-btn hover:!text-danger" onClick={onDelete} aria-label={t('editor.deleteQ')}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="sr-only" htmlFor={`${base}-title`}>{t('editor.questionTitle')}</label>
        <textarea
          id={`${base}-title`}
          rows={1}
          maxLength={500}
          className="field resize-none text-lg font-medium [field-sizing:content]"
          placeholder={t('editor.questionTitle')}
          value={q.title}
          aria-invalid={error === 'editor.titleRequired' || undefined}
          onChange={(e) => onChange({ ...q, title: e.target.value })}
        />
        {showDescription ? (
          <div className="mt-2 flex items-start gap-2">
            <textarea
              rows={1}
              maxLength={1000}
              className="field resize-none text-sm [field-sizing:content]"
              placeholder={t('editor.questionDescription')}
              aria-label={t('editor.questionDescription')}
              value={q.description ?? ''}
              onChange={(e) => onChange({ ...q, description: e.target.value })}
            />
            <button type="button" className="icon-btn mt-1 shrink-0" aria-label={t('delete')}
              onClick={() => {
                setShowDescription(false)
                onChange({ ...q, description: null })
              }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="mt-1 text-sm text-muted underline-offset-4 hover:text-teal-dark hover:underline"
            onClick={() => setShowDescription(true)}>
            {t('editor.addDescription')}
          </button>
        )}
      </div>

      <div className="mt-4">
        <TypeSettings q={q} onChange={onChange} />
      </div>
      {error && <p className="mt-3 text-sm text-danger">{t(error)}</p>}
    </li>
  )
}

function AddQuestion({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed border-line-strong py-5 font-medium text-teal-dark hover:border-teal hover:bg-teal-soft/40">
        <Plus size={20} />
        {t('editor.addQuestion')}
      </button>
    )
  }
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{t('editor.chooseType')}</p>
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={t('close')}>
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {QUESTION_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type]
          return (
            <button key={type} type="button"
              onClick={() => {
                onAdd(type)
                setOpen(false)
              }}
              className="flex items-center gap-2.5 rounded-[var(--radius-field)] border border-line px-3 py-3 text-start text-sm hover:border-teal hover:bg-teal-soft/40">
              <Icon size={18} className="shrink-0 text-teal" />
              {t(`type.${type}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ settings

function SettingsPanel({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  const { t } = useI18n()
  return (
    <div className="panel grid gap-7 p-5 sm:p-7">
      <fieldset>
        <legend className="label">{t('editor.respondentLanguage')}</legend>
        <div className="mt-1 inline-flex rounded-[var(--radius-field)] border border-line-strong p-1">
          {(['ar', 'en'] as Lang[]).map((l) => (
            <label key={l}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-sm has-[:checked]:bg-teal has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal">
              <input type="radio" name="lang" className="sr-only" checked={draft.language === l} onChange={() => set({ language: l })} />
              {l === 'ar' ? 'العربية' : 'English'}
            </label>
          ))}
        </div>
        <p className="hint mt-2">{t('editor.respondentLanguageHint')}</p>
      </fieldset>

      <fieldset>
        <legend className="label">{t('editor.themeColor')}</legend>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          {THEME_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" className="peer sr-only" checked={draft.themeColor === c} onChange={() => set({ themeColor: c })} />
              <span className="block size-9 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-teal"
                style={{ background: c }} />
              <span className="sr-only">{c}</span>
            </label>
          ))}
          <input type="color" aria-label={t('editor.themeColor')} value={draft.themeColor}
            onChange={(e) => set({ themeColor: e.target.value.toLowerCase() })}
            className="size-9 cursor-pointer rounded-full border border-line-strong bg-transparent p-0.5" />
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="thanks">{t('editor.thankYou')}</label>
        <textarea id="thanks" className="field min-h-24" maxLength={1000} placeholder={t('editor.thankYouPh')}
          value={draft.thankYouMessage ?? ''} onChange={(e) => set({ thankYouMessage: e.target.value })} />
      </div>

      <div>
        <label className="label" htmlFor="closes">{t('editor.closesAt')}</label>
        <div className="flex max-w-md gap-2">
          <input id="closes" type="datetime-local" className="field" value={toLocalInput(draft.closesAt)}
            onChange={(e) => set({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          {draft.closesAt && (
            <button type="button" className="icon-btn shrink-0 self-center" aria-label={t('delete')} onClick={() => set({ closesAt: null })}>
              <X size={16} />
            </button>
          )}
        </div>
        <p className="hint mt-1.5">{t('editor.closesAtHint')}</p>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 size-4 accent-teal" checked={draft.oneResponsePerDevice}
          onChange={(e) => set({ oneResponsePerDevice: e.target.checked })} />
        <span>
          <span className="block font-medium">{t('editor.oneResponse')}</span>
          <span className="hint">{t('editor.oneResponseHint')}</span>
        </span>
      </label>
    </div>
  )
}

// ------------------------------------------------------------------ page

export default function Editor() {
  const { id = '' } = useParams()
  const { t, err } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: ['survey', id], queryFn: () => api<Survey>(`/api/surveys/${id}`) })
  const [saved, setSaved] = useState<Survey | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [tab, setTab] = useState<Tab>('questions')
  const [errors, setErrors] = useState<QuestionErrors>({})
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (query.data && (!saved || saved.id !== query.data.id)) {
      setSaved(query.data)
      setDraft(toDraft(query.data))
    }
  }, [query.data, saved])

  const dirty = useMemo(
    () => !!saved && !!draft && JSON.stringify(toInput(draft)) !== JSON.stringify(toInput(toDraft(saved))),
    [draft, saved],
  )

  const applyServer = (s: Survey) => {
    setSaved(s)
    setDraft(toDraft(s))
    queryClient.setQueryData(['survey', s.id], s)
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
  }

  const save = useMutation({
    mutationFn: (d: Draft) => api<Survey>(`/api/surveys/${id}`, { method: 'PUT', body: toInput(d) }),
    onSuccess: (s) => applyServer(s),
  })

  const status = useMutation({
    mutationFn: (next: SurveyStatus) => api<Survey>(`/api/surveys/${id}/status`, { method: 'POST', body: { status: next } }),
  })

  const trySave = async () => {
    if (!draft) return false
    const errs = validate(draft)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setTab('questions')
      toast(t('editor.fixErrors'), 'error')
      requestAnimationFrame(() =>
        document.querySelector(`[data-question="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return false
    }
    try {
      await save.mutateAsync(draft)
      return true
    } catch (e) {
      toast(err(e), 'error')
      return false
    }
  }

  const changeStatus = async (next: SurveyStatus) => {
    if (dirty && !(await trySave())) return
    try {
      const s = await status.mutateAsync(next)
      applyServer(s)
      toast(next === 'PUBLISHED' ? t('editor.published') : t('editor.closed'))
      if (next === 'PUBLISHED') setShareOpen(true)
    } catch (e) {
      toast(err(e), 'error')
    }
  }

  // Ctrl/Cmd+S
  const saveRef = useRef(trySave)
  saveRef.current = trySave
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current().then((ok) => ok && toast(t('saved')))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [t, toast])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  if (query.isPending || (query.data && !draft)) return <PageLoader />
  if (query.isError || !saved || !draft) return <ErrorBox message={err(query.error)} onRetry={() => query.refetch()} />

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const setQuestions = (fn: (qs: Question[]) => Question[]) => setDraft((d) => (d ? { ...d, questions: fn(d.questions) } : d))
  const updateQuestion = (q: Question) => {
    setQuestions((qs) => qs.map((x) => (x.id === q.id ? q : x)))
    if (errors[q.id]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== q.id)) as QuestionErrors)
  }
  const addQuestion = (type: QuestionType) => {
    const q = withTypeDefaults(
      { id: tempId(), type, title: '', description: null, required: false, options: [], settings: null },
      type,
      (n) => t('editor.option', { n }),
    )
    setQuestions((qs) => [...qs, q])
    requestAnimationFrame(() => document.getElementById(`q-${q.id}-title`)?.focus())
  }
  const move = (index: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs]
      const [item] = next.splice(index, 1)
      next.splice(index + dir, 0, item)
      return next
    })

  const busy = save.isPending || status.isPending
  const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
    { key: 'questions', label: t('editor.questions'), icon: ListOrdered },
    { key: 'settings', label: t('editor.settings'), icon: Settings2 },
    { key: 'preview', label: t('editor.preview'), icon: Eye },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-3">
        <Link to="/app" className="icon-btn" aria-label={t('back')}>
          <ArrowRight size={18} className="ltr:rotate-180" />
        </Link>
        <StatusBadge status={saved.status} />
        <span className={`text-sm ${dirty ? 'text-saffron-dark' : 'text-faint'}`} aria-live="polite">
          {save.isPending ? t('saving') : dirty ? t('editor.unsaved') : t('editor.allSaved')}
        </span>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <button type="button" className="icon-btn" onClick={() => setShareOpen(true)} aria-label={t('dash.share')} title={t('dash.share')}>
            <Share2 size={18} />
          </button>
          <Link to={`/app/s/${id}/results`} className="icon-btn" aria-label={t('dash.results')} title={t('dash.results')}>
            <BarChart3 size={18} />
          </Link>
          <button type="button" className="btn btn-secondary" disabled={!dirty || busy}
            onClick={() => trySave().then((ok) => ok && toast(t('saved')))}>
            {save.isPending && <Spinner size={16} />}
            {t('save')}
          </button>
          {saved.status === 'PUBLISHED' ? (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => changeStatus('CLOSED')}>
              <CircleStop size={16} />
              {t('editor.closeSurvey')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => changeStatus('PUBLISHED')}>
              {status.isPending ? <Spinner size={16} /> : <Rocket size={16} />}
              {saved.status === 'CLOSED' ? t('editor.reopen') : t('editor.publish')}
            </button>
          )}
        </div>
      </div>

      {/* tabs */}
      <div role="tablist" className="mb-5 grid grid-cols-3 rounded-[var(--radius-field)] border border-line bg-surface p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'
            }`}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {saved.status === 'PUBLISHED' && tab !== 'preview' && (
        <p className="mb-4 rounded-[var(--radius-field)] bg-teal-soft px-4 py-3 text-sm text-teal-dark">{t('editor.liveWarning')}</p>
      )}

      {tab === 'questions' && (
        <div className="grid gap-4">
          <div className="panel p-4 sm:p-5" style={{ borderTop: `4px solid ${draft.themeColor}` }}>
            <label className="sr-only" htmlFor="survey-title">{t('editor.surveyTitle')}</label>
            <textarea id="survey-title" rows={1} maxLength={200}
              className="w-full resize-none border-0 bg-transparent p-0 font-display text-2xl font-semibold [field-sizing:content] placeholder:text-faint focus:outline-none sm:text-3xl"
              placeholder={t('editor.surveyTitle')} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            <textarea rows={2} maxLength={2000} aria-label={t('editor.surveyDescription')}
              className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-ink-soft [field-sizing:content] placeholder:text-faint focus:outline-none"
              placeholder={t('editor.surveyDescription')} value={draft.description ?? ''}
              onChange={(e) => set({ description: e.target.value })} />
          </div>

          {draft.questions.length === 0 && <p className="py-6 text-center text-muted">{t('editor.noQuestions')}</p>}
          <ol className="grid gap-4">
            {draft.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} total={draft.questions.length} error={errors[q.id]}
                onChange={updateQuestion}
                onMove={(dir) => move(i, dir)}
                onDuplicate={() => setQuestions((qs) => {
                  const copy = { ...q, id: tempId(), options: [...q.options], settings: q.settings ? { ...q.settings } : null }
                  const next = [...qs]
                  next.splice(i + 1, 0, copy)
                  return next
                })}
                onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
              />
            ))}
          </ol>
          {draft.questions.length < 100 && <AddQuestion onAdd={addQuestion} />}
        </div>
      )}

      {tab === 'settings' && <SettingsPanel draft={draft} set={set} />}

      {tab === 'preview' && (
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          <p className="border-b border-line bg-surface px-4 py-2.5 text-center text-sm text-muted">{t('editor.previewNote')}</p>
          <SurveyForm survey={{ ...draft, title: draft.title || t('new.untitled') }} />
        </div>
      )}

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} slug={saved.slug} title={saved.title}
        status={saved.status} onPublish={() => {
          setShareOpen(false)
          changeStatus('PUBLISHED')
        }} />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={t('editor.unsaved')}
        body={t('editor.leaveConfirm')}
        confirmLabel={t('editor.leave')}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
