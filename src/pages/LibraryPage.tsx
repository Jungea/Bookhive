import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { getContentsWithRecords } from '../lib/supabase/content'
import { getActivityLogs } from '../lib/supabase/reading-record'
import { ContentCard } from '../components/ContentCard'
import { ProgressForm } from '../components/ProgressForm'
import { ActivityLogTimeline } from '../components/ActivityLogTimeline'
import type { ActivityLog, ContentWithRecord } from '../lib/types'

export function LibraryPage() {
  const [contents, setContents] = useState<ContentWithRecord[]>([])
  const [selected, setSelected] = useState<ContentWithRecord | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const data = await getContentsWithRecords(user.id)
    setContents(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function selectContent(content: ContentWithRecord) {
    setSelected(content)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const data = await getActivityLogs(user.id, content.id)
    setLogs(data)
  }

  async function handleProgressSuccess() {
    await load()
    if (selected) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setLogs(await getActivityLogs(user.id, selected.id))
    }
  }

  if (loading) return (
    <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>불러오는 중...</div>
  )

  if (selected) {
    const record = selected.reading_record
    return (
      <div style={{ padding: '16px' }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}
        >
          ← 서재로
        </button>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>{selected.title}</h2>
        {selected.author && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>{selected.author}</p>
        )}
        {record ? (
          <ProgressForm
            record={record}
            contentId={selected.id}
            progressType={selected.progress_type}
            onSuccess={handleProgressSuccess}
          />
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>읽기 기록이 없습니다.</p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '20px 0' }} />
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px' }}>활동 기록</h3>
        <ActivityLogTimeline logs={logs} progressType={selected.progress_type} />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-text)' }}>서재</h2>
      {contents.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>등록된 콘텐츠가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {contents.map((c) => (
            <ContentCard key={c.id} content={c} onClick={() => selectContent(c)} />
          ))}
        </div>
      )}
    </div>
  )
}
