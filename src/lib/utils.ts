import type { ContentType, ProgressType, ReadingStatus } from './types'

const STATUS_LABELS: Record<ReadingStatus, string> = {
  to_read:    '읽기 전',
  reading:    '읽는 중',
  completed:  '완독',
  dropped:    '중단',
  rereading:  '재독 중',
  waiting:    '휴재 대기',
  up_to_date: '최신화 도달',
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  book:     '책',
  webnovel: '웹소설',
  indie:    '비출간',
  original: '창작',
}

export function getStatusLabel(status: ReadingStatus): string {
  return STATUS_LABELS[status]
}

export function getContentTypeLabel(type: ContentType): string {
  return CONTENT_TYPE_LABELS[type]
}

export function formatProgress(
  progressType: ProgressType,
  progressPage: number | null,
  progressEpisode: number | null,
  totalPages: number | null,
  totalEpisodes: number | null,
): string {
  if (progressType === 'page' && progressPage !== null) {
    return totalPages ? `${progressPage} / ${totalPages}p` : `${progressPage}p`
  }
  if (progressType === 'episode' && progressEpisode !== null) {
    return totalEpisodes ? `${progressEpisode} / ${totalEpisodes}화` : `${progressEpisode}화`
  }
  return ''
}
