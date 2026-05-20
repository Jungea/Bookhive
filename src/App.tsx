import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase/client'
import { StorePage } from './pages/StorePage'
import { LibraryPage } from './pages/LibraryPage'
import { AddPage } from './pages/AddPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import './index.css'

type Tab = 'store' | 'library' | 'add' | 'reviews' | 'settings'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('store')
  const [reviewContentId, setReviewContentId] = useState<string | undefined>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'SIGNED_IN') setTab('store')
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (!user) return (
    <div className="h-screen" style={{ background: 'var(--color-bg)' }}>
      <LoginPage />
    </div>
  )

  return (
    <div
      className="flex flex-col h-screen max-w-lg mx-auto"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="flex-1 overflow-auto">
        {tab === 'store'   && <StorePage />}
        {tab === 'library' && <LibraryPage onWriteReview={(id) => { setReviewContentId(id); setTab('reviews') }} />}
        {tab === 'add'     && <AddPage onSuccess={() => setTab('library')} />}
        {tab === 'reviews'  && <ReviewsPage initialContentId={reviewContentId} onNavigated={() => setReviewContentId(undefined)} />}
        {tab === 'settings' && <SettingsPage />}
      </div>

      <nav
        className="flex border-t text-xs"
        style={{ borderColor: 'var(--color-shelf)' }}
      >
        {([
          ['store',    '🏪', '서점'],
          ['library',  '📚', '서재'],
          ['add',      '➕', '추가'],
          ['reviews',  '📝', '독후감'],
          ['settings', '⚙️', '설정'],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 py-3 flex flex-col items-center gap-1"
            style={{
              color: tab === id ? 'var(--color-accent)' : 'var(--color-text)',
              opacity: tab === id ? 1 : 0.5,
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
