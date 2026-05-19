import type { ActivityLog, ProgressType, ReadingStatus } from '../lib/types'
import { getStatusLabel } from '../lib/utils'

interface ActivityLogTimelineProps {
  logs: ActivityLog[]
  progressType?: ProgressType
}

const ACTION_LABELS: Record<string, string> = {
  review_written: '독후감 작성',
  started:        '등록',
}

function getLogLabel(log: ActivityLog): string {
  if (log.action === 'progress' || log.action === 'completed') {
    return log.status_snapshot
      ? getStatusLabel(log.status_snapshot as ReadingStatus)
      : ACTION_LABELS[log.action] ?? log.action
  }
  return ACTION_LABELS[log.action] ?? log.action
}

export function ActivityLogTimeline({ logs, progressType }: ActivityLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', textAlign: 'center', padding: '16px 0', color: 'var(--color-text-muted)' }}>
        활동 기록이 없어요.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {logs.map((log) => (
        <div key={log.id} style={{ display: 'flex', gap: '12px', fontSize: '0.875rem' }}>
          <span style={{ flexShrink: 0, width: '52px', textAlign: 'right', color: 'var(--color-text-muted)' }}>
            {new Date(log.logged_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          </span>
          <div style={{ color: 'var(--color-text)' }}>
            <span style={{ fontWeight: 600 }}>{getLogLabel(log)}</span>
            {log.progress_snapshot !== null && progressType && progressType !== 'none' && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                {' '}— {log.progress_snapshot}{progressType === 'page' ? 'p' : '화'}
              </span>
            )}
            {log.note && (
              <span style={{ color: 'var(--color-text-muted)' }}> · {log.note}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
