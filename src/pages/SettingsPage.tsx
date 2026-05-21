import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import { getProfile, updateProfile } from '../lib/supabase/store'
import type { UserProfile } from '../lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1px solid var(--color-shelf)',
  background: 'var(--color-wall)', color: 'var(--color-text)',
  fontSize: '0.875rem', boxSizing: 'border-box',
}

export function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const prof = await getProfile(data.user.id)
      if (prof) {
        setProfile(prof)
        setStoreName(prof.store_name)
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !storeName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await updateProfile(profile.user_id, { store_name: storeName.trim() })
      setProfile(p => p ? { ...p, store_name: storeName.trim() } : p)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>설정</h2>

      {/* 프로필 수정 */}
      <div>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          프로필
        </h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text)', display: 'block', marginBottom: '4px' }}>
              도서관 이름
            </label>
            <input
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="도서관 이름"
              style={inputStyle}
            />
          </div>
          {error && <p style={{ fontSize: '0.8rem', color: '#e05050', margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !storeName.trim() || storeName === profile?.store_name}
            style={{
              padding: '8px', borderRadius: '8px', border: 'none',
              background: saved ? '#2ecc71' : 'var(--color-accent)', color: '#fff',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              opacity: (loading || !storeName.trim() || storeName === profile?.store_name) ? 0.5 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saved ? '저장됨' : loading ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-shelf)', margin: 0 }} />

      {/* TODO: 테마 선택 UI 추가 (purchased_themes 목록에서 선택 → theme_id 업데이트) */}
      <div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '8px', borderRadius: '8px',
            background: 'rgba(220,80,80,0.15)', color: '#e05050',
            border: '1px solid rgba(220,80,80,0.3)', fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
