import { getContentTypeLabel, formatProgress, getStatusLabel } from '../lib/utils'
import type { ContentWithRecord } from '../lib/types'

interface ContentCardProps {
  content: ContentWithRecord
  onClick: () => void
}

export function ContentCard({ content, onClick }: ContentCardProps) {
  const record = content.reading_record

  const progress = record
    ? formatProgress(content.progress_type, record.progress_page, record.progress_episode, content.total_pages, content.total_episodes)
    : ''

  const progressPercent =
    record && content.progress_type === 'page' && content.total_pages && record.progress_page
      ? Math.round((record.progress_page / content.total_pages) * 100)
      : record && content.progress_type === 'episode' && content.total_episodes && record.progress_episode
      ? Math.round((record.progress_episode / content.total_episodes) * 100)
      : null

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', gap: '12px', alignItems: 'center',
        width: '100%', textAlign: 'left',
        padding: '12px', borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        cursor: 'pointer',
      }}
    >
      {/* 커버 */}
      <div style={{
        width: '40px', height: '56px', borderRadius: '4px', flexShrink: 0,
        background: 'var(--color-accent)', overflow: 'hidden',
      }}>
        {content.cover_url && (
          <img src={content.cover_url} alt={content.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {content.title}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {content.author && `${content.author} · `}
          {getContentTypeLabel(content.type)}
          {progress && ` · ${progress}`}
        </p>
        {progressPercent !== null && (
          <div style={{ marginTop: '6px', height: '4px', borderRadius: '9999px', background: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '9999px', background: 'var(--color-accent)', width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      {/* 상태 배지 */}
      {record && (
        <span style={{
          flexShrink: 0, fontSize: '0.7rem', padding: '2px 8px',
          borderRadius: '9999px', border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
        }}>
          {getStatusLabel(record.status)}
        </span>
      )}
    </button>
  )
}
