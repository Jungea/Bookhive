import { supabase } from '../lib/supabase/client'

export function SettingsPage() {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-accent)' }}>
        설정
      </h2>
      <p className="text-xs opacity-50 mb-6" style={{ color: 'var(--color-text)' }}>
        테마 변경 기능은 준비 중입니다.
      </p>
      <button
        onClick={handleLogout}
        className="w-full py-2 rounded text-sm"
        style={{ background: 'rgba(220,80,80,0.15)', color: '#e05050', border: '1px solid rgba(220,80,80,0.3)' }}
      >
        로그아웃
      </button>
    </div>
  )
}
