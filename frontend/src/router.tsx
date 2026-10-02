import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, useLocation } from 'react-router'
import { AppShell } from './components/AppShell'
import { PageLoader } from './components/ui'
import { useAuth } from './lib/auth'
import Landing from './pages/Landing'
import { LoginPage, RegisterPage } from './pages/Auth'
import NotFound from './pages/NotFound'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Editor = lazy(() => import('./pages/Editor'))
const Results = lazy(() => import('./pages/Results'))
const PublicSurveyPage = lazy(() => import('./pages/PublicSurvey'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageLoader />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (status === 'authenticated') return <Navigate to="/app" replace />
  return <>{children}</>
}

const suspense = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
  { path: '/s/:slug', element: suspense(<PublicSurveyPage />) },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: suspense(<Dashboard />) },
      { path: 's/:id/edit', element: suspense(<Editor />) },
      { path: 's/:id/results', element: suspense(<Results />) },
    ],
  },
  { path: '*', element: <NotFound /> },
])
