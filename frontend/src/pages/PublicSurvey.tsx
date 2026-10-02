import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { WakeBanner } from '../components/AppShell'
import { EchoMark } from '../components/Logo'
import { brandStyle, SurveyForm } from '../components/SurveyForm'
import { ErrorBox, PageLoader } from '../components/ui'
import { api, ApiError } from '../lib/api'
import { translate, type MessageKey } from '../lib/i18n'
import type { AnswerValue, Lang, PublicSurvey } from '../lib/types'

const doneKey = (slug: string) => `sada:done:${slug}`

function hasResponded(slug: string) {
  try {
    return localStorage.getItem(doneKey(slug)) === '1'
  } catch {
    return false
  }
}

/** Expanding rings: the one orchestrated moment, played once when an answer is received. */
function EchoBurst({ color }: { color: string }) {
  return (
    <div className="relative mx-auto mb-8 grid size-40 place-items-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute size-16 animate-echo rounded-full border-2"
          style={{ borderColor: i === 2 ? 'var(--color-saffron)' : color, animationDelay: `${i * 0.35}s` }}
        />
      ))}
      <span className="relative grid size-16 place-items-center rounded-full text-white" style={{ background: color }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </div>
  )
}

function Message({ lang, color, title, body, burst = false }: {
  lang: Lang
  color: string
  title: string
  body: string
  burst?: boolean
}) {
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} style={brandStyle(color)}
      className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      {burst && <EchoBurst color={color} />}
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-3 whitespace-pre-line text-lg text-ink-soft">{body}</p>
    </div>
  )
}

function Footer({ lang }: { lang: Lang }) {
  return (
    <footer dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col items-center gap-1 pb-10 pt-4 text-sm text-muted">
      <Link to="/" className="inline-flex items-center gap-2 hover:text-ink">
        <EchoMark size={20} />
        {translate(lang, 'form.madeWith')}
      </Link>
      <Link to="/register" className="text-xs text-faint underline-offset-4 hover:underline">
        {translate(lang, 'form.makeYours')}
      </Link>
    </footer>
  )
}

export default function PublicSurveyPage() {
  const { slug = '' } = useParams()
  const [submitted, setSubmitted] = useState(false)
  const [thanks, setThanks] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['public-survey', slug],
    queryFn: () => api<PublicSurvey>(`/api/public/surveys/${encodeURIComponent(slug)}`, { auth: false }),
    retry: (count, error) => (error as ApiError)?.status === 0 && count < 3,
  })

  const survey = query.data
  useEffect(() => {
    if (!survey) return
    document.documentElement.lang = survey.language
    document.title = survey.title
  }, [survey])

  if (query.isPending) {
    return (
      <>
        <WakeBanner />
        <PageLoader />
      </>
    )
  }

  if (query.isError) {
    const status = (query.error as ApiError)?.status
    const lang: Lang = document.documentElement.lang === 'en' ? 'en' : 'ar'
    const t = (key: MessageKey) => translate(lang, key)
    if (status === 404) {
      return (
        <>
          <Message lang={lang} color="#0e7c74" title={t('form.notFoundTitle')} body={t('form.notFoundBody')} />
          <Footer lang={lang} />
        </>
      )
    }
    return <ErrorBox message={translate(lang, status === 0 ? 'error.NETWORK' : 'error.generic')} onRetry={() => query.refetch()} />
  }

  if (!survey) return null
  const lang = survey.language
  const t = (key: MessageKey) => translate(lang, key)

  let content
  if (submitted) {
    content = (
      <Message lang={lang} color={survey.themeColor} burst title={t('form.thanksTitle')} body={thanks || t('form.thanksDefault')} />
    )
  } else if (!survey.acceptingResponses) {
    content = <Message lang={lang} color={survey.themeColor} title={t('form.closedTitle')} body={t('form.closedBody')} />
  } else if (survey.oneResponsePerDevice && hasResponded(slug)) {
    content = <Message lang={lang} color={survey.themeColor} title={survey.title} body={t('form.already')} />
  } else {
    content = (
      <SurveyForm
        survey={survey}
        onSubmit={async (answers: Record<string, AnswerValue>) => {
          const result = await api<{ id: string; thankYouMessage: string | null }>(
            `/api/public/surveys/${encodeURIComponent(slug)}/responses`,
            { method: 'POST', body: { answers }, auth: false },
          )
          try {
            localStorage.setItem(doneKey(slug), '1')
          } catch {
            /* ignore */
          }
          setThanks(result.thankYouMessage)
          setSubmitted(true)
          window.scrollTo({ top: 0 })
        }}
      />
    )
  }

  return (
    <div className="min-h-dvh">
      <WakeBanner />
      {content}
      <Footer lang={lang} />
    </div>
  )
}
