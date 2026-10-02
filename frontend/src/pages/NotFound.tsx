import { Link } from 'react-router'
import { PublicHeader } from '../components/AppShell'
import { EchoRings } from '../components/ui'
import { useI18n } from '../lib/i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <EchoRings className="mb-6 size-32 opacity-70" />
        <h1 className="font-display text-3xl font-semibold">{t('notFound.title')}</h1>
        <p className="mt-2 text-muted">{t('notFound.body')}</p>
        <Link to="/" className="btn btn-primary mt-6">
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  )
}
