import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Download, Lightbulb, ListChecks, PencilLine, Share2, Sparkles, Star, Trash2 } from 'lucide-react'
import { BarList, Columns, Timeline } from '../components/Charts'
import { ConfirmDialog } from '../components/Modal'
import { ShareDialog } from '../components/ShareDialog'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorBox, PageLoader, Spinner, StatusBadge } from '../components/ui'
import { api, download, timezone } from '../lib/api'
import { useConfig } from '../lib/config'
import { formatDate, relativeTime, useI18n } from '../lib/i18n'
import type { AnswerValue, Insights, Page, Question, QuestionResult, ResponseItem, Survey, SurveyResults } from '../lib/types'

// ------------------------------------------------------------------ summary blocks

function TextAnswers({ items, dates = false }: { items: QuestionResult['textAnswers']; dates?: boolean }) {
  const { t, lang } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, 5)
  return (
    <div>
      <ul className="divide-y divide-line rounded-[var(--radius-field)] border border-line">
        {shown.map((a, i) => (
          <li key={i} className="px-4 py-3">
            <p className="whitespace-pre-line break-words">{dates ? formatDate(lang, `${a.value}T12:00:00`, false) : a.value}</p>
            <p className="mt-1 text-xs text-faint">{relativeTime(lang, a.submittedAt)}</p>
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <button type="button" className="btn btn-ghost mt-2 text-sm text-teal-dark" onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('results.showLess') : t('results.showMore')}
        </button>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="hint max-w-56">{hint}</p>}
    </div>
  )
}

function QuestionBlock({ result, index, total, question }: {
  result: QuestionResult
  index: number
  total: number
  question?: Question
}) {
  const { t, num } = useI18n()
  const max = question?.settings?.max ?? 5

  let body: ReactNode
  if (result.answered === 0) {
    body = <p className="text-sm text-faint">{t('results.noAnswers')}</p>
  } else if (result.type === 'SINGLE_CHOICE' || result.type === 'MULTIPLE_CHOICE' || result.type === 'DROPDOWN') {
    body = <BarList options={result.options} />
  } else if (result.type === 'RATING') {
    body = (
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="text-sm text-muted">{t('results.average')}</p>
          <p className="flex items-center gap-2 font-display text-4xl font-semibold tabular-nums">
            {num(result.average ?? 0, 2)}
            <Star className="fill-saffron text-saffron" size={28} />
          </p>
          <p className="text-sm text-faint">/ {num(max)}</p>
        </div>
        <Columns options={result.options} color="saffron" />
      </div>
    )
  } else if (result.type === 'SCALE') {
    body = (
      <div className="grid gap-6">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Stat label={t('results.average')} value={num(result.average ?? 0, 2)} />
          {result.nps !== null && <Stat label={t('results.nps')} value={num(result.nps)} hint={t('results.npsHint')} />}
        </div>
        <Columns options={result.options} />
        {(question?.settings?.minLabel || question?.settings?.maxLabel) && (
          <div className="-mt-4 flex justify-between text-xs text-faint">
            <span>{question?.settings?.minLabel}</span>
            <span>{question?.settings?.maxLabel}</span>
          </div>
        )}
      </div>
    )
  } else if (result.type === 'NUMBER') {
    body = (
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Stat label={t('results.average')} value={num(result.average ?? 0, 2)} />
        <Stat label={t('results.min')} value={num(result.min ?? 0, 2)} />
        <Stat label={t('results.max')} value={num(result.max ?? 0, 2)} />
      </div>
    )
  } else {
    body = (
      <>
        <p className="mb-2 text-sm text-muted">{t('results.latestAnswers')}</p>
        <TextAnswers items={result.textAnswers} dates={result.type === 'DATE'} />
      </>
    )
  }

  return (
    <section className="panel p-5 sm:p-6">
      <header className="mb-5">
        <p className="text-sm text-muted">
          {index + 1}. {t(`type.${result.type}`)}
        </p>
        <h3 className="mt-0.5 text-lg font-semibold leading-snug">{result.title}</h3>
        <p className="mt-0.5 text-sm text-faint">{t('results.answered', { answered: num(result.answered), total: num(total) })}</p>
      </header>
      {body}
    </section>
  )
}

function InsightsPanel({ surveyId }: { surveyId: string }) {
  const { t, err, num } = useI18n()
  const queryClient = useQueryClient()
  const cached = queryClient.getQueryData<Insights>(['insights', surveyId])
  const [insights, setInsights] = useState<Insights | undefined>(cached)
  const run = useMutation({
    mutationFn: () => api<Insights>(`/api/surveys/${surveyId}/insights`, { method: 'POST' }),
    onSuccess: (data) => {
      setInsights(data)
      queryClient.setQueryData(['insights', surveyId], data)
    },
  })

  return (
    <section className="rounded-[var(--radius-panel)] border border-saffron/40 bg-saffron-soft/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 shrink-0 text-saffron-dark" size={20} />
          <div>
            <h2 className="text-lg font-semibold">{t('results.insights')}</h2>
            {!insights && !run.isPending && <p className="text-sm text-ink-soft">{t('results.insightsBody')}</p>}
          </div>
        </div>
        <button type="button" className="btn btn-saffron text-sm" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Spinner size={16} /> : <Sparkles size={16} />}
          {run.isPending ? t('results.analyzing') : insights ? t('results.regenerate') : t('results.generateInsights')}
        </button>
      </div>
      {run.isError && <p className="mt-3 text-sm text-danger">{err(run.error)}</p>}
      {insights && (
        <div className={`mt-5 grid gap-5 ${run.isPending ? 'opacity-50' : ''}`}>
          <p className="max-w-3xl leading-relaxed">{insights.summary}</p>
          <div className="grid gap-5 md:grid-cols-2">
            {insights.highlights.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium"><ListChecks size={17} className="text-teal" />{t('results.highlights')}</h3>
                <ul className="grid list-disc gap-1.5 ps-5 text-ink-soft marker:text-teal">
                  {insights.highlights.map((h) => <li key={h}>{h}</li>)}
                </ul>
              </div>
            )}
            {insights.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium"><Lightbulb size={17} className="text-saffron-dark" />{t('results.recommendations')}</h3>
                <ul className="grid list-disc gap-1.5 ps-5 text-ink-soft marker:text-saffron">
                  {insights.recommendations.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-muted">{t('results.basedOn', { n: num(insights.basedOnResponses) })}</p>
        </div>
      )}
    </section>
  )
}

// ------------------------------------------------------------------ individual responses

function formatAnswer(value: AnswerValue | undefined, q: Question, lang: 'ar' | 'en') {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value)) return value.join('، ')
  if (q.type === 'RATING') return `${'★'.repeat(Number(value))} (${value}/${q.settings?.max ?? 5})`
  if (q.type === 'DATE' && typeof value === 'string') return formatDate(lang, `${value}T12:00:00`, false)
  return String(value)
}

function ResponsesTab({ survey }: { survey: Survey }) {
  const { t, lang, err, num, plural } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const size = 10

  const responses = useQuery({
    queryKey: ['responses', survey.id, page],
    queryFn: () => api<Page<ResponseItem>>(`/api/surveys/${survey.id}/responses?page=${page}&size=${size}`),
    placeholderData: keepPreviousData,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['responses', survey.id] })
    queryClient.invalidateQueries({ queryKey: ['results', survey.id] })
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
    queryClient.removeQueries({ queryKey: ['insights', survey.id] })
  }

  const removeOne = useMutation({
    mutationFn: (rid: string) => api<void>(`/api/surveys/${survey.id}/responses/${rid}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleting(null)
      refresh()
      toast(t('dash.deleted'))
    },
    onError: (e) => toast(err(e), 'error'),
  })
  const removeAll = useMutation({
    mutationFn: () => api<{ deleted: number }>(`/api/surveys/${survey.id}/responses`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeletingAll(false)
      setPage(0)
      refresh()
      toast(t('dash.deleted'))
    },
    onError: (e) => toast(err(e), 'error'),
  })

  if (responses.isPending) return <PageLoader />
  if (responses.isError) return <ErrorBox message={err(responses.error)} onRetry={() => responses.refetch()} />

  const data = responses.data
  const pages = Math.max(1, Math.ceil(data.total / size))
  if (data.total === 0) {
    return <div className="panel"><EmptyState title={t('results.emptyTitle')} body={t('results.emptyBody')} /></div>
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">{plural('responses', data.total)}</p>
        <button type="button" className="btn btn-ghost text-sm text-danger" onClick={() => setDeletingAll(true)}>
          <Trash2 size={16} />
          {t('results.deleteAll')}
        </button>
      </div>

      {data.items.map((r, i) => (
        <article key={r.id} className="panel p-5 sm:p-6">
          <header className="mb-4 flex items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 className="font-semibold">{t('results.response', { n: num(data.total - (page * size + i)) })}</h3>
              <p className="text-sm text-faint">{formatDate(lang, r.submittedAt)}</p>
            </div>
            <button type="button" className="icon-btn hover:!text-danger" aria-label={t('results.deleteResponse')}
              onClick={() => setDeleting(r.id)}>
              <Trash2 size={16} />
            </button>
          </header>
          <dl className="grid gap-4">
            {survey.questions.map((q) => {
              const value = formatAnswer(r.answers[q.id], q, lang)
              return (
                <div key={q.id}>
                  <dt className="text-sm text-muted">{q.title}</dt>
                  <dd className={`mt-0.5 whitespace-pre-line break-words ${value ? '' : 'text-faint'}`}>
                    {value ?? t('results.noAnswer')}
                  </dd>
                </div>
              )
            })}
          </dl>
        </article>
      ))}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3">
          <button type="button" className="btn btn-secondary text-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            {t('results.prev')}
          </button>
          <span className="text-sm text-muted">{t('results.pageOf', { page: num(page + 1), pages: num(pages) })}</span>
          <button type="button" className="btn btn-secondary text-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            {t('results.next')}
          </button>
        </nav>
      )}

      <ConfirmDialog open={!!deleting} title={t('results.deleteResponse')} body={t('results.deleteResponseBody')}
        confirmLabel={t('delete')} busy={removeOne.isPending}
        onConfirm={() => deleting && removeOne.mutate(deleting)} onCancel={() => setDeleting(null)} />
      <ConfirmDialog open={deletingAll} title={t('results.deleteAll')} body={t('results.deleteAllBody', { n: num(data.total) })}
        confirmLabel={t('delete')} busy={removeAll.isPending}
        onConfirm={() => removeAll.mutate()} onCancel={() => setDeletingAll(false)} />
    </div>
  )
}

// ------------------------------------------------------------------ page

export default function Results() {
  const { id = '' } = useParams()
  const { t, lang, err, num } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: config } = useConfig()
  const [tab, setTab] = useState<'summary' | 'responses'>('summary')
  const [shareOpen, setShareOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const survey = useQuery({ queryKey: ['survey', id], queryFn: () => api<Survey>(`/api/surveys/${id}`) })
  const results = useQuery({
    queryKey: ['results', id],
    queryFn: () => api<SurveyResults>(`/api/surveys/${id}/results?tz=${encodeURIComponent(timezone())}`),
    refetchInterval: 30_000,
  })

  const publish = useMutation({
    mutationFn: () => api<Survey>(`/api/surveys/${id}/status`, { method: 'POST', body: { status: 'PUBLISHED' } }),
    onSuccess: (s) => {
      queryClient.setQueryData(['survey', id], s)
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      toast(t('editor.published'))
    },
    onError: (e) => toast(err(e), 'error'),
  })

  if (survey.isPending || results.isPending) return <PageLoader />
  if (survey.isError) return <ErrorBox message={err(survey.error)} onRetry={() => survey.refetch()} />
  if (results.isError) return <ErrorBox message={err(results.error)} onRetry={() => results.refetch()} />

  const s = survey.data
  const r = results.data
  const questionById = new Map(s.questions.map((q) => [q.id, q]))

  const exportCsv = async () => {
    setExporting(true)
    try {
      await download(`/api/surveys/${id}/export?tz=${encodeURIComponent(timezone())}`, `sada-${s.slug}.csv`)
    } catch (e) {
      toast(err(e), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <Link to="/app" className="icon-btn mt-1" aria-label={t('back')}>
          <ArrowRight size={18} className="ltr:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <StatusBadge status={s.status} />
          <h1 className="mt-1.5 font-display text-2xl font-semibold leading-snug sm:text-3xl">{s.title}</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link to={`/app/s/${id}/edit`} className="btn btn-secondary text-sm">
            <PencilLine size={16} />
            {t('results.editSurvey')}
          </Link>
          <button type="button" className="btn btn-secondary text-sm" onClick={() => setShareOpen(true)}>
            <Share2 size={16} />
            {t('dash.share')}
          </button>
          <button type="button" className="btn btn-secondary text-sm" onClick={exportCsv} disabled={exporting || r.totalResponses === 0}>
            {exporting ? <Spinner size={16} /> : <Download size={16} />}
            {t('results.export')}
          </button>
        </div>
      </div>

      <div role="tablist" className="mb-6 flex gap-6 border-b border-line">
        {(['summary', 'responses'] as const).map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === key ? 'border-teal text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}>
            {key === 'summary' ? t('results.summary') : t('results.individual')}
            {key === 'responses' && <span className="ms-1.5 rounded-full bg-paper px-2 py-0.5 text-xs tabular-nums">{num(r.totalResponses)}</span>}
          </button>
        ))}
      </div>

      {tab === 'responses' ? (
        <ResponsesTab survey={s} />
      ) : r.totalResponses === 0 ? (
        <div className="panel">
          <EmptyState
            title={t('results.emptyTitle')}
            body={s.status === 'DRAFT' ? t('results.emptyDraft') : t('results.emptyBody')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setShareOpen(true)}>
                <Share2 size={16} />
                {t('dash.share')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-5">
          <section className="panel grid gap-8 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:gap-12">
            <div className="flex gap-10 md:flex-col md:gap-5">
              <div>
                <p className="text-sm text-muted">{t('results.total')}</p>
                <p className="font-display text-5xl font-semibold tabular-nums leading-tight">{num(r.totalResponses)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">{t('results.last')}</p>
                <p className="font-medium">{r.lastResponseAt ? relativeTime(lang, r.lastResponseAt) : '—'}</p>
              </div>
            </div>
            <Timeline data={r.timeline} />
          </section>

          {config?.aiEnabled && <InsightsPanel surveyId={id} />}

          {r.questions.map((qr, i) => (
            <QuestionBlock key={qr.questionId} result={qr} index={i} total={r.totalResponses} question={questionById.get(qr.questionId)} />
          ))}
        </div>
      )}

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} slug={s.slug} title={s.title} status={s.status}
        onPublish={() => publish.mutate()} />
    </div>
  )
}
