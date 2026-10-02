import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Copy, FilePlus2, MoreHorizontal, PencilLine, Plus, Share2, Sparkles, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '../components/Modal'
import { ShareDialog } from '../components/ShareDialog'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorBox, Menu, PageLoader, Spinner, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { useConfig } from '../lib/config'
import { relativeTime, useI18n } from '../lib/i18n'
import type { AiUsage, Lang, Survey, SurveyInput, SurveySummary } from '../lib/types'

function NewSurveyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, err } = useI18n()
  const { data: config } = useConfig()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'choose' | 'ai'>('choose')
  const [prompt, setPrompt] = useState('')
  const [surveyLang, setSurveyLang] = useState<Lang>(lang)
  const [count, setCount] = useState(8)
  const [error, setError] = useState<string | null>(null)

  const usage = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api<AiUsage>('/api/ai/usage'),
    enabled: open && mode === 'ai',
  })

  const close = () => {
    setMode('choose')
    setError(null)
    onClose()
  }

  const created = (survey: Survey) => {
    queryClient.invalidateQueries({ queryKey: ['surveys'] })
    queryClient.setQueryData(['survey', survey.id], survey)
    close()
    navigate(`/app/s/${survey.id}/edit`)
  }

  const blank = useMutation({
    mutationFn: () => {
      const body: SurveyInput = {
        title: t('new.untitled'),
        description: null,
        language: lang,
        themeColor: '#0e7c74',
        thankYouMessage: null,
        oneResponsePerDevice: false,
        closesAt: null,
        questions: [
          {
            id: null,
            type: 'SINGLE_CHOICE',
            title: t('new.firstQuestion'),
            description: null,
            required: true,
            options: [t('editor.option', { n: 1 }), t('editor.option', { n: 2 })],
            settings: null,
          },
        ],
      }
      return api<Survey>('/api/surveys', { method: 'POST', body })
    },
    onSuccess: created,
    onError: (e) => setError(err(e)),
  })

  const generate = useMutation({
    mutationFn: () =>
      api<Survey>('/api/ai/generate-survey', {
        method: 'POST',
        body: { prompt, language: surveyLang, questionCount: count },
      }),
    onSuccess: created,
    onError: (e) => {
      setError(err(e))
      usage.refetch()
    },
  })

  return (
    <Modal open={open} onClose={close} title={t('new.title')}>
      {mode === 'choose' ? (
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => blank.mutate()}
            disabled={blank.isPending}
            className="flex items-start gap-4 rounded-[var(--radius-field)] border border-line-strong p-4 text-start hover:border-teal hover:bg-teal-soft/40"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal-dark">
              {blank.isPending ? <Spinner /> : <FilePlus2 size={22} />}
            </span>
            <span>
              <span className="block font-semibold">{t('new.blank')}</span>
              <span className="mt-0.5 block text-sm text-muted">{t('new.blankBody')}</span>
            </span>
          </button>
          {config?.aiEnabled && (
            <button
              type="button"
              onClick={() => setMode('ai')}
              className="flex items-start gap-4 rounded-[var(--radius-field)] border border-line-strong p-4 text-start hover:border-saffron hover:bg-saffron-soft/50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-saffron-soft text-saffron-dark">
                <Sparkles size={22} />
              </span>
              <span>
                <span className="block font-semibold">{t('new.ai')}</span>
                <span className="mt-0.5 block text-sm text-muted">{t('new.aiBody')}</span>
              </span>
            </button>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            generate.mutate()
          }}
        >
          <div>
            <label className="label" htmlFor="ai-prompt">{t('new.aiBody')}</label>
            <textarea
              id="ai-prompt"
              className="field min-h-32"
              placeholder={t('new.aiPrompt')}
              maxLength={1500}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ai-lang">{t('new.aiLanguage')}</label>
              <select id="ai-lang" className="field" value={surveyLang} onChange={(e) => setSurveyLang(e.target.value as Lang)}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ai-count">{t('new.aiCount')}</label>
              <select id="ai-count" className="field" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 8, 10, 12, 15].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          {usage.data && (
            <p className="hint">{t('new.aiUsage', { used: usage.data.used, limit: usage.data.limit })}</p>
          )}
          {error && <p className="rounded-[var(--radius-field)] bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setMode('choose')} disabled={generate.isPending}>
              {t('back')}
            </button>
            <button type="submit" className="btn btn-saffron" disabled={generate.isPending || prompt.trim().length < 5}>
              {generate.isPending ? <Spinner size={16} /> : <Sparkles size={16} />}
              {generate.isPending ? t('new.generating') : t('new.generate')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function SurveyRow({ survey, onShare, onDelete }: {
  survey: SurveySummary
  onShare: () => void
  onDelete: () => void
}) {
  const { t, lang, plural, num } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const primaryLink = survey.status === 'DRAFT' ? `/app/s/${survey.id}/edit` : `/app/s/${survey.id}/results`

  const duplicate = useMutation({
    mutationFn: () => api<Survey>(`/api/surveys/${survey.id}/duplicate`, { method: 'POST' }),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      toast(t('dash.duplicated'))
      navigate(`/app/s/${copy.id}/edit`)
    },
  })

  return (
    <li className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <span className="hidden h-12 w-1 shrink-0 rounded-full sm:block" style={{ background: survey.themeColor }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={survey.status} />
          <span className="text-sm text-muted">{plural('questions', survey.questionCount)}</span>
        </div>
        <Link to={primaryLink} className="mt-1.5 block truncate text-lg font-semibold hover:text-teal-dark">
          {survey.title}
        </Link>
        <p className="text-sm text-faint">{t('dash.updated', { time: relativeTime(lang, survey.updatedAt) })}</p>
      </div>

      <Link
        to={`/app/s/${survey.id}/results`}
        className="flex items-baseline gap-2 sm:w-28 sm:flex-col sm:items-end sm:gap-0"
        aria-label={plural('responses', survey.responseCount)}
      >
        <span className="font-display text-3xl font-semibold tabular-nums leading-none">{num(survey.responseCount)}</span>
        <span className="text-sm text-muted">{t('results.individual')}</span>
      </Link>

      <div className="flex items-center gap-1 border-t border-line pt-3 sm:border-0 sm:pt-0">
        <Link to={`/app/s/${survey.id}/edit`} className="btn btn-ghost text-sm">
          <PencilLine size={16} />
          {t('dash.edit')}
        </Link>
        <Link to={`/app/s/${survey.id}/results`} className="btn btn-ghost text-sm">
          <BarChart3 size={16} />
          {t('dash.results')}
        </Link>
        <button type="button" className="btn btn-ghost text-sm" onClick={onShare}>
          <Share2 size={16} />
          <span className="hidden md:inline">{t('dash.share')}</span>
        </button>
        <div className="ms-auto sm:ms-0">
          <Menu
            label={t('dash.more')}
            trigger={<MoreHorizontal size={18} />}
            items={[
              { label: t('dash.share'), icon: <Share2 size={16} />, onSelect: onShare },
              { label: t('dash.duplicate'), icon: <Copy size={16} />, onSelect: () => duplicate.mutate() },
              { label: t('delete'), icon: <Trash2 size={16} />, onSelect: onDelete, danger: true },
            ]}
          />
        </div>
      </div>
    </li>
  )
}

export default function Dashboard() {
  const { t, plural, err } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [newOpen, setNewOpen] = useState(false)
  const [sharing, setSharing] = useState<SurveySummary | null>(null)
  const [deleting, setDeleting] = useState<SurveySummary | null>(null)

  const surveys = useQuery({ queryKey: ['surveys'], queryFn: () => api<SurveySummary[]>('/api/surveys') })

  const publish = useMutation({
    mutationFn: (id: string) => api<Survey>(`/api/surveys/${id}/status`, { method: 'POST', body: { status: 'PUBLISHED' } }),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.setQueryData(['survey', s.id], s)
      setSharing((cur) => (cur ? { ...cur, status: s.status } : cur))
      toast(t('editor.published'))
    },
    onError: (e) => toast(err(e), 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/surveys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      setDeleting(null)
      toast(t('dash.deleted'))
    },
    onError: (e) => toast(err(e), 'error'),
  })

  if (surveys.isPending) return <PageLoader />
  if (surveys.isError) return <ErrorBox message={err(surveys.error)} onRetry={() => surveys.refetch()} />

  const list = surveys.data
  const newButton = (
    <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
      <Plus size={18} />
      {t('dash.new')}
    </button>
  )

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('mySurveys')}</h1>
          {list.length > 0 && <p className="mt-1 text-muted">{plural('surveys', list.length)}</p>}
        </div>
        {list.length > 0 && newButton}
      </div>

      {list.length === 0 ? (
        <div className="panel">
          <EmptyState title={t('dash.emptyTitle')} body={t('dash.emptyBody')} action={newButton} />
        </div>
      ) : (
        <ul className="panel divide-y divide-line">
          {list.map((s) => (
            <SurveyRow key={s.id} survey={s} onShare={() => setSharing(s)} onDelete={() => setDeleting(s)} />
          ))}
        </ul>
      )}

      <NewSurveyDialog open={newOpen} onClose={() => setNewOpen(false)} />
      {sharing && (
        <ShareDialog
          open
          onClose={() => setSharing(null)}
          slug={sharing.slug}
          title={sharing.title}
          status={sharing.status}
          onPublish={() => publish.mutate(sharing.id)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={t('dash.deleteTitle', { title: deleting?.title ?? '' })}
        body={t('dash.deleteBody')}
        confirmLabel={t('delete')}
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
