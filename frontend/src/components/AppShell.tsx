import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Languages, LogOut } from 'lucide-react'
import { subscribeSlow } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { Logo } from './Logo'
import { Menu } from './ui'

export function WakeBanner() {
  const [slow, setSlow] = useState(false)
  const { t } = useI18n()
  useEffect(() => subscribeSlow(setSlow), [])
  if (!slow) return null
  return (
    <div className="sticky top-0 z-40 bg-saffron-soft px-4 py-2 text-center text-sm text-saffron-dark" role="status">
      {t('wakeBanner')}
    </div>
  )
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <button
      type="button"
      className={`btn btn-ghost text-sm ${className}`}
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      lang={lang === 'ar' ? 'en' : 'ar'}
    >
      <Languages size={16} />
      {t('switchLanguage')}
    </button>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover" />
  const initial = name.trim().charAt(0) || '؟'
  return (
    <span className="grid size-8 place-items-center rounded-full bg-teal-soft font-semibold text-teal-dark">{initial}</span>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const { t, lang, setLang } = useI18n()

  return (
    <div className="min-h-dvh">
      <WakeBanner />
      <header className="border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo to="/app" />
            <nav className="hidden sm:block">
              <NavLink
                to="/app"
                end
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-soft text-teal-dark' : 'text-ink-soft hover:bg-paper'}`
                }
              >
                {t('mySurveys')}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle className="hidden sm:inline-flex" />
            {user && (
              <Menu
                label={user.name}
                trigger={<Avatar name={user.name} url={user.avatarUrl} />}
                items={[
                  {
                    label: t('switchLanguage'),
                    icon: <Languages size={16} />,
                    onSelect: () => setLang(lang === 'ar' ? 'en' : 'ar'),
                  },
                  { label: t('signOut'), icon: <LogOut size={16} />, onSelect: signOut, danger: true },
                ]}
              />
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        <Outlet />
      </main>
    </div>
  )
}

export function PublicHeader() {
  const { status } = useAuth()
  const { t } = useI18n()
  return (
    <header className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <Logo />
      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageToggle />
        {status === 'authenticated' ? (
          <Link to="/app" className="btn btn-primary text-sm">
            {t('mySurveys')}
          </Link>
        ) : (
          <Link to="/login" className="btn btn-secondary text-sm">
            {t('landing.login')}
          </Link>
        )}
      </div>
    </header>
  )
}
