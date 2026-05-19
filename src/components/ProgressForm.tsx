import { useState } from 'react'
import { updateProgress } from '../lib/supabase/reading-record'
import { getStatusLabel } from '../lib/utils'
import type { ReadingRecord, ReadingStatus, ProgressType } from '../lib/types'

const STATUS_OPTIONS: ReadingStatus[] = [
  'reading', 'completed', 'to_read', 'dropped', 'rereading', 'waiting', 'up_to_date',
]
const SHOW_PROGRESS: ReadingStatus[] = ['reading', 'rereading', 'dropped']

interface ProgressFormProps {
  record: ReadingRecord
  contentId: string
  progressType: ProgressType
  onSuccess?: () => void
}

export function ProgressForm({ record, contentId, progressType, onSuccess }: ProgressFormProps) {
  const [status, setStatus] = useState<ReadingStatus>(record.status)
  const [progressPage, setProgressPage] = useState(record.progress_page?.toString() ?? '')
  const [progressEpisode, setProgressEpisode] = useState(record.progress_episode?.toString() ?? '')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showProgress = progressType !== 'none' && SHOW_PROGRESS.includes(status)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text)', fontSize: '0.875rem', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem', color: 'var(--color-text)', marginBottom: '4px', display: 'block',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await updateProgress({
        recordId:        record.id,
        contentId,
        status,
        progressPage:    progressPage ? Number(progressPage) : null,
        progressEpisode: progressEpisode ? Number(progressEpisode) : null,
        note:            note.trim() || null,
      })
      setNote('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle} htmlFor="status">상태</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReadingStatus)}
          style={{ ...inputStyle, appearance: 'none' }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {showProgress && progressType === 'page' && (
        <div>
          <label style={labelStyle} htmlFor="progress_page">현재 페이지</label>
          <input id="progress_page" type="number" min={0} style={inputStyle} value={progressPage} onChange={(e) => setProgressPage(e.target.value)} />
        </div>
      )}

      {showProgress && progressType === 'episode' && (
        <div>
          <label style={labelStyle} htmlFor="progress_episode">현재 화수</label>
          <input id="progress_episode" type="number" min={0} style={inputStyle} value={progressEpisode} onChange={(e) => setProgressEpisode(e.target.value)} />
        </div>
      )}

      <div>
        <label style={labelStyle} htmlFor="note">메모 (선택)</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="오늘의 독서 메모..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '8px', borderRadius: '6px', border: 'none',
          backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)',
          fontSize: '0.875rem', fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '저장 중...' : '기록하기'}
      </button>
    </form>
  )
}
