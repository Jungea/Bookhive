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

function useIsPC() {
  const [isPC, setIsPC] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsPC(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isPC
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [dimming, setDimming] = useState(false)
  const dimTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const isFirstAuthEvent = useRef(true)
  const isPC = useIsPC()
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
    <div style={{ height: '100dvh', background: 'var(--color-bg)' }}>
      <LoginPage />
    </div>
  )

  const path = location.pathname

  const VALID_PATHS = ['/', '/library', '/add', '/reviews', '/settings']

  const pages = (
    <>
      {path === '/'         && <StorePage />}
      {path === '/library'  && <LibraryPage onWriteReview={(id) => navigateTo(`/reviews?contentId=${id}`)} />}
      {path === '/add'      && <AddPage onSuccess={() => navigateTo('/library')} />}
      {path === '/reviews'  && <ReviewsPage />}
      {path === '/settings' && <SettingsPage />}
      {!VALID_PATHS.includes(path) && <Navigate to="/" replace />}
    </>
  )

  const dimOverlay = (
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
  )

  const pcNav = (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '0 16px',
      borderBottom: '1px solid var(--color-shelf)',
    }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent)', marginRight: '16px', letterSpacing: '0.05em' }}>
        BOOKHIVE
      </span>
      {NAV_ITEMS.map(({ path: itemPath, icon, label }) => (
        <button
          key={itemPath}
          onClick={() => navigateTo(itemPath)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '12px 14px', border: 'none', background: 'none',
            color: path === itemPath ? 'var(--color-accent)' : 'var(--color-text)',
            opacity: path === itemPath ? 1 : 0.5,
            fontSize: '0.875rem', cursor: 'pointer',
            borderBottom: path === itemPath ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )

  if (isPC) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          width: '100%',
          height: '100dvh',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        {pcNav}
        <div style={{ position: 'relative', overflow: 'auto' }}>
          {path === '/' ? (
            // 도서관: 전체 너비·높이
            <div style={{ height: '100%' }}>{pages}</div>
          ) : (
            // 나머지: 가운데 고정 너비
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px' }}>
              {pages}
            </div>
          )}
          {dimOverlay}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
        <div className="flex-1 overflow-auto" style={{ position: 'relative' }}>
          {pages}
          {dimOverlay}
          {path === '/' && (
            <button
              onClick={() => navigateTo('/library')}
              style={{
                position: 'absolute', bottom: '16px', right: '16px',
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-shelf)',
                color: 'var(--color-text)',
                fontSize: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 20,
              }}
            >
              📚
            </button>
          )}
        </div>
        {path !== '/' && (
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
        )}
    </div>
  )
}
