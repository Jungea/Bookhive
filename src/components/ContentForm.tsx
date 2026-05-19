import { useState } from 'react'
import { createContent } from '../lib/supabase/content'
import { getContentTypeLabel, getStatusLabel } from '../lib/utils'
import type { ContentType, ProgressType, ReadingStatus } from '../lib/types'

const CONTENT_TYPES: ContentType[] = ['book', 'webnovel', 'indie', 'original']
const INITIAL_STATUSES: ReadingStatus[] = ['to_read', 'reading', 'completed']

const DEFAULT_PROGRESS_TYPE: Record<ContentType, ProgressType> = {
  book:     'page',
  webnovel: 'episode',
  indie:    'episode',
  original: 'none',
}

const GENRE_OPTIONS = [
  '판타지', '현대판타지', '로맨스', '무협', 'SF', '미스터리', '추리',
  '공포', '일상', '성장', '드라마', '액션', '스릴러', '역사', '코미디',
  'BL', 'GL', '이세계', '회귀',
]

interface ContentFormProps {
  onSuccess?: () => void
}

export function ContentForm({ onSuccess }: ContentFormProps) {
  const [type, setType] = useState<ContentType>('book')
  const [progressType, setProgressType] = useState<ProgressType>('page')
  const [isOngoing, setIsOngoing] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [genreInput, setGenreInput] = useState('')
  const [genreOpen, setGenreOpen] = useState(false)
  const [initialStatus, setInitialStatus] = useState<ReadingStatus>('to_read')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [totalEpisodes, setTotalEpisodes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredGenres = GENRE_OPTIONS.filter(
    (g) => g.includes(genreInput) && !selectedGenres.includes(g)
  )
  const trimmed = genreInput.trim()
  const canAdd = trimmed !== '' && !GENRE_OPTIONS.includes(trimmed) && !selectedGenres.includes(trimmed)

  function addGenre(genre: string) {
    setSelectedGenres((prev) => [...prev, genre])
    setGenreInput('')
    setGenreOpen(false)
  }

  function removeGenre(genre: string) {
    setSelectedGenres((prev) => prev.filter((g) => g !== genre))
  }

  function handleTypeChange(t: ContentType) {
    setType(t)
    setProgressType(DEFAULT_PROGRESS_TYPE[t])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createContent({
        type,
        progressType,
        title: title.trim(),
        author: author.trim(),
        genre: selectedGenres,
        totalPages: totalPages ? Number(totalPages) : null,
        totalEpisodes: totalEpisodes ? Number(totalEpisodes) : null,
        isOngoing,
        initialStatus,
      })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패')
    } finally {
      setLoading(false)
    }
  }

  const chipStyle = (active: boolean) => ({
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    border: '1px solid',
    borderColor: active ? 'transparent' : 'var(--color-border)',
    backgroundColor: active ? 'var(--color-accent)' : 'transparent',
    color: active ? 'var(--color-bg)' : 'var(--color-text)',
    cursor: 'pointer',
  } as React.CSSProperties)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    marginBottom: '4px',
    display: 'block',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* 콘텐츠 타입 */}
      <div>
        <label style={labelStyle}>콘텐츠 타입</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CONTENT_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => handleTypeChange(t)} style={chipStyle(type === t)}>
              {getContentTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label style={labelStyle} htmlFor="title">제목 *</label>
        <input
          id="title"
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* 작가 */}
      <div>
        <label style={labelStyle} htmlFor="author">작가</label>
        <input
          id="author"
          style={inputStyle}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>

      {/* 장르 */}
      <div>
        <label style={labelStyle}>장르</label>
        {selectedGenres.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {selectedGenres.map((g) => (
              <span
                key={g}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem',
                  backgroundColor: 'var(--color-accent)', color: '#fff',
                }}
              >
                {g}
                <button type="button" onClick={() => removeGenre(g)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <input
            style={inputStyle}
            value={genreInput}
            onChange={(e) => { setGenreInput(e.target.value); setGenreOpen(true) }}
            onFocus={() => setGenreOpen(true)}
            onBlur={() => setTimeout(() => setGenreOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (canAdd) addGenre(trimmed)
                else if (filteredGenres.length > 0) addGenre(filteredGenres[0])
              }
            }}
            placeholder="장르 검색 또는 직접 입력"
          />
          {genreOpen && (filteredGenres.length > 0 || canAdd) && (
            <div style={{
              position: 'absolute', zIndex: 10, top: '100%', marginTop: '4px',
              width: '100%', borderRadius: '6px', border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}>
              {canAdd && (
                <button
                  type="button"
                  onMouseDown={() => addGenre(trimmed)}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.875rem', color: 'var(--color-accent)', borderBottom: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}
                >
                  + &quot;{trimmed}&quot; 추가
                </button>
              )}
              <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {filteredGenres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onMouseDown={() => addGenre(g)}
                    style={{ width: '100%', padding: '8px 12px', textAlign: 'left', fontSize: '0.875rem', background: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 진행도 방식 */}
      <div>
        <label style={labelStyle}>진행도 방식</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['page', 'episode', 'none'] as ProgressType[]).map((pt) => (
            <button key={pt} type="button" onClick={() => setProgressType(pt)} style={chipStyle(progressType === pt)}>
              {pt === 'page' ? '페이지' : pt === 'episode' ? '화수' : '없음'}
            </button>
          ))}
        </div>
      </div>

      {progressType === 'page' && (
        <div>
          <label style={labelStyle} htmlFor="total_pages">총 페이지 수</label>
          <input id="total_pages" type="number" min={1} style={inputStyle} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
        </div>
      )}

      {progressType === 'episode' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>연재 중</label>
            <button
              type="button"
              role="switch"
              aria-checked={isOngoing}
              onClick={() => setIsOngoing((v) => !v)}
              style={{
                position: 'relative', display: 'inline-flex', height: '24px', width: '44px',
                borderRadius: '9999px', border: 'none', cursor: 'pointer',
                backgroundColor: isOngoing ? 'var(--color-accent)' : 'var(--color-border)',
                transition: 'background-color 0.2s',
              }}
            >
              <span style={{
                display: 'inline-block', height: '20px', width: '20px', borderRadius: '9999px',
                backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: isOngoing ? 'translate(22px, 2px)' : 'translate(2px, 2px)',
                transition: 'transform 0.2s',
              }} />
            </button>
          </div>
          {!isOngoing && (
            <div>
              <label style={labelStyle} htmlFor="total_episodes">총 화수</label>
              <input id="total_episodes" type="number" min={1} style={inputStyle} value={totalEpisodes} onChange={(e) => setTotalEpisodes(e.target.value)} />
            </div>
          )}
        </>
      )}

      {/* 초기 상태 */}
      <div>
        <label style={labelStyle} htmlFor="initial_status">초기 상태</label>
        <select
          id="initial_status"
          value={initialStatus}
          onChange={(e) => setInitialStatus(e.target.value as ReadingStatus)}
          style={{ ...inputStyle, appearance: 'none' }}
        >
          {INITIAL_STATUSES.map((s) => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '10px', borderRadius: '6px', border: 'none',
          backgroundColor: 'var(--color-accent)', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </form>
  )
}
