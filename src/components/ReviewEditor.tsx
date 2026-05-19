import { useState } from 'react'
import { upsertReview } from '../lib/supabase/review'

interface ReviewEditorProps {
  contentId: string
  contentTitle: string
  reviewId?: string
  initialTitle?: string
  initialBody?: string
  initialRating?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReviewEditor({
  contentId,
  contentTitle,
  reviewId,
  initialTitle = '',
  initialBody = '',
  initialRating = 0,
  onSuccess,
  onCancel,
}: ReviewEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [rating, setRating] = useState(initialRating)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text)', fontSize: '0.875rem', boxSizing: 'border-box',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await upsertReview({ reviewId, contentId, title: title.trim(), body: body.trim(), rating })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{contentTitle}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>독후감</p>
      </div>

      <div>
        <label style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '4px', display: 'block' }} htmlFor="review-title">제목</label>
        <input id="review-title" style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="독후감 제목" />
      </div>

      <div>
        <label style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '4px', display: 'block' }}>별점</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(rating === star ? 0 : star)}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: star <= rating ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              {star <= rating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '4px', display: 'block' }} htmlFor="review-body">내용</label>
        <textarea
          id="review-body"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="이 책에 대한 생각을 자유롭게 기록해보세요..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-text)', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </form>
  )
}
