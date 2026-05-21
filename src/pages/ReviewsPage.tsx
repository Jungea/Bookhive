import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { getReviews, deleteReview, type ReviewWithContent } from '../lib/supabase/review'
import { getContentsWithRecords } from '../lib/supabase/content'
import { ReviewEditor } from '../components/ReviewEditor'
import type { ContentWithRecord } from '../lib/types'

type View = 'list' | 'new' | 'detail'

export function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialContentId = searchParams.get('contentId') ?? ''

  const [reviews, setReviews] = useState<ReviewWithContent[]>([])
  const [contents, setContents] = useState<ContentWithRecord[]>([])
  const [selected, setSelected] = useState<ReviewWithContent | null>(null)
  const [editing, setEditing] = useState(false)
  const [selectedContentId, setSelectedContentId] = useState(initialContentId)
  const [view, setView] = useState<View>(initialContentId ? 'new' : 'list')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [reviewData, contentData] = await Promise.all([
      getReviews(user.id),
      getContentsWithRecords(user.id),
    ])
    setReviews(reviewData)
    setContents(contentData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (initialContentId) setSearchParams({}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(review: ReviewWithContent) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await deleteReview(review.id, user.id)
    await load()
    setView('list')
    setSelected(null)
  }

  function handleSuccess() {
    load()
    setView('list')
    setSelected(null)
    setEditing(false)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })

  if (loading) return (
    <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>불러오는 중...</div>
  )

  // 새 독후감 작성
  if (view === 'new') {
    const content = contents.find((c) => c.id === selectedContentId)
    return (
      <div style={{ padding: '16px' }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}>
          ← 독후감 목록
        </button>
        {!selectedContentId ? (
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '12px' }}>어떤 책의 독후감인가요?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {contents.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContentId(c.id)}
                  style={{ textAlign: 'left', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text)', fontSize: '0.875rem' }}
                >
                  <span style={{ fontWeight: 600 }}>{c.title}</span>
                  {c.author && <span style={{ color: 'var(--color-text-muted)' }}> · {c.author}</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ReviewEditor
            contentId={selectedContentId}
            contentTitle={content?.title ?? ''}
            onSuccess={handleSuccess}
            onCancel={() => setSelectedContentId('')}
          />
        )}
      </div>
    )
  }

  // 독후감 상세
  if (view === 'detail' && selected) {
    const isEdited = selected.created_at !== selected.updated_at

    if (editing) {
      return (
        <div style={{ padding: '16px' }}>
          <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}>
            ← 취소
          </button>
          <ReviewEditor
            contentId={selected.content_id}
            contentTitle={selected.contents?.title ?? ''}
            reviewId={selected.id}
            initialTitle={selected.title}
            initialBody={selected.body}
            initialRating={selected.rating}
            onSuccess={handleSuccess}
            onCancel={() => setEditing(false)}
          />
        </div>
      )
    }

    return (
      <div style={{ padding: '16px' }}>
        <button onClick={() => { setView('list'); setSelected(null) }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '16px', padding: 0 }}>
          ← 독후감 목록
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {formatDate(selected.created_at)} 작성{isEdited && ` · ${formatDate(selected.updated_at)} 수정`}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{selected.contents?.title}</p>
            {selected.rating > 0 && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-accent)', marginTop: '4px' }}>
                {'★'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setEditing(true)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              수정
            </button>
            <button
              onClick={() => handleDelete(selected)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ef4444', background: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              삭제
            </button>
          </div>
        </div>

        {selected.title && (
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '12px' }}>{selected.title}</h2>
        )}

        {selected.body ? (
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{selected.body}</p>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>내용이 없어요.</p>
        )}
      </div>
    )
  }

  // 목록
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)' }}>독후감</h2>
        <button
          onClick={() => { setSelectedContentId(''); setView('new') }}
          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
        >
          + 새 독후감
        </button>
      </div>

      {reviews.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>작성한 독후감이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => { setSelected(r); setView('detail') }}
              style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  {r.title || '(제목 없음)'}
                </p>
                {r.rating > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', flexShrink: 0, marginLeft: '8px' }}>
                    {'★'.repeat(r.rating)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {r.contents?.title} · {formatDate(r.created_at)}
              </p>
              {r.body && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {r.body}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
