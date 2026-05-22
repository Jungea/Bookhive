import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { getContentsWithRecords, deleteContent } from '../lib/supabase/content'
import { getActivityLogs } from '../lib/supabase/reading-record'
import { ContentCard } from '../components/ContentCard'
import { PageLoading } from '../components/PageLoading'
import { ContentForm } from '../components/ContentForm'
import { ProgressForm } from '../components/ProgressForm'
import { ActivityLogTimeline } from '../components/ActivityLogTimeline'
import { getContentTypeLabel } from '../lib/utils'
import type { ActivityLog, ContentWithRecord } from '../lib/types'

export function LibraryPage({ onWriteReview }: { onWriteReview?: (contentId: string) => void }) {
  const [contents, setContents] = useState<ContentWithRecord[]>([])
  const [selected, setSelected] = useState<ContentWithRecord | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

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

  if (loading) return <PageLoading />

  const tagStyle: React.CSSProperties = {
    padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  }

  if (selected) {
    const record = selected.reading_record

    if (editing) {
      return (
        <div style={{ padding: '16px' }}>
          <button
            onClick={() => setEditing(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}
          >
            ← 취소
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '20px' }}>정보 수정</h2>
          <ContentForm
            initialData={selected}
            onSuccess={async () => {
              setEditing(false)
              await load()
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const updated = await import('../lib/supabase/content').then(m => m.getContentsWithRecords(user.id))
                const found = updated.find(c => c.id === selected.id)
                if (found) setSelected(found)
              }
            }}
          />
        </div>
      )
    }

    return (
      <div style={{ padding: '16px' }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}
        >
          ← 서재로
        </button>
        {/* 헤더: 커버 + 기본 정보 */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          {/* 커버 */}
          <div style={{
            width: '72px', height: '100px', borderRadius: '4px', flexShrink: 0, overflow: 'hidden',
            background: selected.cover_color ?? 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}>
            {selected.cover_url && (
              <img src={selected.cover_url} alt="커버" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {/* 제목·작가·수정·삭제 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{selected.title}</h2>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px' }}
                >
                  수정
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`"${selected.title}"을(를) 삭제할까요?\n삭제하면 모든 기록이 사라집니다.`)) return
                    await deleteContent(selected.id)
                    setSelected(null)
                    await load()
                  }}
                  style={{ background: 'none', border: '1px solid #e05050', color: '#e05050', cursor: 'pointer', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px' }}
                >
                  삭제
                </button>
              </div>
            </div>
            {selected.author && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>{selected.author}</p>
            )}

            {/* 태그형 메타 정보 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span style={tagStyle}>{getContentTypeLabel(selected.type)}</span>
              {selected.genre.map(g => (
                <span key={g} style={tagStyle}>{g}</span>
              ))}
              {selected.progress_type === 'page' && selected.total_pages && (
                <span style={tagStyle}>{selected.total_pages}p</span>
              )}
              {selected.progress_type === 'episode' && (
                <span style={tagStyle}>
                  {selected.is_ongoing ? '연재 중' : selected.total_episodes ? `전 ${selected.total_episodes}화` : '완결'}
                </span>
              )}
              {selected.isbn && (
                <span style={tagStyle}>ISBN {selected.isbn}</span>
              )}
            </div>
          </div>
        </div>
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

        {record?.status === 'completed' && (
          <button
            onClick={() => onWriteReview?.(selected.id)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-accent)', background: 'none', color: 'var(--color-accent)', fontSize: '0.875rem', cursor: 'pointer', marginTop: '8px' }}
          >
            📝 독후감 쓰기
          </button>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '20px 0' }} />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          등록일 {new Date(selected.created_at).toLocaleDateString('ko-KR')}
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {contents.map((c) => (
            <ContentCard key={c.id} content={c} onClick={() => selectContent(c)} />
          ))}
        </div>
      )}
    </div>
  )
}
