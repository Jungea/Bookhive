import { useState } from 'react'
import { supabase } from '../lib/supabase/client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
        📚 BOOKHIVE
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="p-2 rounded text-sm"
          style={{
            background: 'var(--color-wall)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-shelf)',
          }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="p-2 rounded text-sm"
          style={{
            background: 'var(--color-wall)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-shelf)',
          }}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded text-sm font-bold"
          style={{ background: 'var(--color-accent)', color: '#000' }}
        >
          {loading ? '...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      <button
        onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
        className="text-xs opacity-50"
        style={{ color: 'var(--color-text)' }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
