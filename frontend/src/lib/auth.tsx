import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'
import type { AuthResponse, User } from './types'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  status: Status
  user: User | null
  signIn: (auth: AuthResponse) => void
  signOut: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(() => (getToken() ? 'loading' : 'anonymous'))

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const signIn = useCallback((auth: AuthResponse) => {
    setToken(auth.token)
    setUser(auth.user)
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    api<User>('/api/auth/me')
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch((e) => {
        if (cancelled) return
        // Keep the token on network errors (server asleep / offline); drop it on 401.
        if (e?.status === 401) signOut()
        else setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [signOut])

  const value = useMemo(() => ({ status, user, signIn, signOut, setUser }), [status, user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
