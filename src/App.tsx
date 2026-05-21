import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'
import { StorePage } from './pages/StorePage'
import { LibraryPage } from './pages/LibraryPage'
import { AddPage } from './pages/AddPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import './index.css'

const NAV_ITEMS = [
  { path: '/',         icon: '🏪', label: '도서관' },
  { path: '/library',  icon: '📚', label: '서재'   },
  { path: '/add',      icon: '➕', label: '추가'   },
  { path: '/reviews',  icon: '📝', label: '독후감' },
  { path: '/settings', icon: '⚙️', label: '설정'   },
] as const

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [dimming, setDimming] = useState(false)
  const dimTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const isFirstAuthEvent = useRef(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'SIGNED_IN' && !isFirstAuthEvent.current) navigate('/')
        isFirstAuthEvent.current = false
      }
    )
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function navigateTo(path: string) {
    if (path === location.pathname) return
    dimTimers.current.forEach(clearTimeout)
    dimTimers.current = []
    setDimming(true)
    dimTimers.current.push(setTimeout(() => {
      navigate(path)
      dimTimers.current.push(setTimeout(() => setDimming(false), 150))
    }, 150))
  }

  if (!user) return (
    <div className="h-screen" style={{ background: 'var(--color-bg)' }}>
      <LoginPage />
    </div>
  )

  const path = location.pathname

  return (
    <div
      className="flex flex-col h-screen max-w-lg mx-auto"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="flex-1 overflow-auto" style={{ position: 'relative' }}>
        {path === '/'         && <StorePage />}
        {path === '/library'  && <LibraryPage onWriteReview={(id) => { navigateTo(`/reviews?contentId=${id}`) }} />}
        {path === '/add'      && <AddPage onSuccess={() => navigateTo('/library')} />}
        {path === '/reviews'  && <ReviewsPage />}
        {path === '/settings' && <SettingsPage />}
        {!['/', '/library', '/add', '/reviews', '/settings'].includes(path) && <Navigate to="/" replace />}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            opacity: dimming ? 1 : 0,
            pointerEvents: dimming ? 'all' : 'none',
            transition: 'opacity 150ms ease',
            zIndex: 50,
          }}
        />
      </div>

      <nav
        className="flex border-t text-xs"
        style={{ borderColor: 'var(--color-shelf)' }}
      >
        {NAV_ITEMS.map(({ path: itemPath, icon, label }) => (
          <button
            key={itemPath}
            onClick={() => navigateTo(itemPath)}
            className="flex-1 py-3 flex flex-col items-center gap-1"
            style={{
              color: path === itemPath ? 'var(--color-accent)' : 'var(--color-text)',
              opacity: path === itemPath ? 1 : 0.5,
            }}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
