import { useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { createProfile } from '../lib/supabase/store'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [storeName, setStoreName] = useState('나의 도서관')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        const prof = await createProfile(data.user.id, storeName.trim())
        if (!prof) setError('프로필 생성에 실패했습니다.')
      }
    }

    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    background: 'var(--color-wall)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-shelf)',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
        📚 BOOKHIVE
      </h1>

      {/* 탭 */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '320px',
          borderRadius: '10px',
          background: 'var(--color-wall)',
          border: '1px solid var(--color-shelf)',
          padding: '4px',
          gap: '4px',
        }}
      >
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null) }}
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: '7px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: mode === m ? 'var(--color-accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
        {mode === 'signup' && (
          <input
            placeholder="도서관 이름"
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--color-accent)',
            color: '#fff',
            opacity: loading ? 0.6 : 1,
            marginTop: '2px',
          }}
        >
          {loading ? '...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
    </div>
  )
}
