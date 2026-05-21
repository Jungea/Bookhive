import { useState } from 'react'
import { createContent, updateContent } from '../lib/supabase/content'
import { getContentTypeLabel, getStatusLabel } from '../lib/utils'
import type { Content, ContentType, ProgressType, ReadingStatus } from '../lib/types'

const COVER_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#ec407a',
  '#1a1a1a', '#ffffff', '#95a5a6',
]



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
  initialData?: Content   // 있으면 수정 모드
  onSuccess?: () => void
}

export function ContentForm({ initialData, onSuccess }: ContentFormProps) {
  const isEdit = !!initialData

  const [type, setType] = useState<ContentType>(initialData?.type ?? 'book')
  const [progressType, setProgressType] = useState<ProgressType>(initialData?.progress_type ?? 'page')
  const [isOngoing, setIsOngoing] = useState(initialData?.is_ongoing ?? false)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialData?.genre ?? [])
  const [genreInput, setGenreInput] = useState('')
  const [genreOpen, setGenreOpen] = useState(false)
  const [initialStatus, setInitialStatus] = useState<ReadingStatus>('to_read')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [author, setAuthor] = useState(initialData?.author ?? '')
  const [totalPages, setTotalPages] = useState(initialData?.total_pages?.toString() ?? '')
  const [totalEpisodes, setTotalEpisodes] = useState(initialData?.total_episodes?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 커버 이미지 (ContentCard 전용, ISBN 기반 Open Library)
  const [isbn, setIsbn] = useState(initialData?.isbn ?? '')
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.cover_url ?? null)
  const [coverLoadFailed, setCoverLoadFailed] = useState(false)
  const [isbnSearching, setIsbnSearching] = useState(false)

  // 책 색상 (도서관 게임 척추 색상) — 반드시 하나 선택
  const [selectedColor, setSelectedColor] = useState<string>(
    initialData?.cover_color ?? COVER_COLORS[0]
  )


  function resolveCoverUrl(): string | null {
    return coverUrl ?? null
  }

  async function handleIsbnSearch() {
    const trimmed = isbn.replace(/-/g, '').replace(/\s/g, '').trim()
    if (!trimmed) return
    setIsbn(trimmed)
    setCoverLoadFailed(false)
    setCoverUrl(null)
    setIsbnSearching(true)
    try {
      const res = await fetch(`/api/books?isbn=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.title && !title) setTitle(data.title)
        if (data.author && !author) setAuthor(data.author)
        if (data.thumbnail) setCoverUrl(data.thumbnail)
        else setCoverLoadFailed(true)
      } else {
        setCoverLoadFailed(true)
      }
    } catch {
      setCoverLoadFailed(true)
    } finally {
      setIsbnSearching(false)
    }
  }

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
    if (!selectedColor) return
    setLoading(true)
    setError(null)
    try {
      if (isEdit && initialData) {
        await updateContent(initialData.id, {
          title: title.trim(),
          author: author.trim(),
          genre: selectedGenres,
          totalPages: totalPages ? Number(totalPages) : null,
          totalEpisodes: totalEpisodes ? Number(totalEpisodes) : null,
          isOngoing,
          coverUrl: resolveCoverUrl(),
          coverColor: selectedColor,
        })
      } else {
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
          coverUrl: resolveCoverUrl(),
          coverColor: selectedColor,
        })
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? '수정 실패' : '등록 실패')
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

      {/* 콘텐츠 타입 — 등록 시에만 표시 */}
      {!isEdit && (
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
      )}

      {/* 커버 */}
      <div>
        <label style={labelStyle}>커버</label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

          {/* 프리뷰 — 커버 이미지 없으면 선택한 책 색상 표시 */}
          <div style={{
            width: '48px', height: '68px', borderRadius: '4px', flexShrink: 0, overflow: 'hidden',
            background: coverUrl ? 'transparent' : (selectedColor || 'transparent'),
            border: '1px dashed var(--color-border)',
          }}>
            {coverUrl && !coverLoadFailed && (
              <img src={coverUrl} alt="커버" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => { setCoverLoadFailed(true); setCoverUrl(null) }} />
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* 도서관 책 색상 — 항상 표시 */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 6px' }}>도서관 책 색상</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                {COVER_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      background: c, border: c === '#ffffff' ? '1px solid var(--color-border)' : 'none',
                      outline: selectedColor === c ? '2px solid var(--color-accent)' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={selectedColor || '#3498db'}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                  title="직접 선택"
                />
              </div>
            </div>

            {/* ISBN (book 타입만) — Open Library 커버 조회 */}
            {type === 'book' && (
              <>
                <div style={{ display: 'flex' }}>
                  <input
                    style={{ ...inputStyle, flex: 1, borderRadius: '6px 0 0 6px' }}
                    value={isbn}
                    onChange={(e) => { setIsbn(e.target.value); setCoverUrl(null); setCoverLoadFailed(false) }}
                    placeholder="ISBN (예: 9791162540123)"
                  />
                  <button
                    type="button"
                    onClick={handleIsbnSearch}
                    disabled={!isbn.trim() || isbnSearching}
                    style={{
                      padding: '8px 10px', borderRadius: '0 6px 6px 0',
                      border: '1px solid var(--color-border)', borderLeft: 'none',
                      background: 'var(--color-surface)', color: 'var(--color-text)',
                      fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      opacity: (!isbn.trim() || isbnSearching) ? 0.5 : 1,
                    }}
                  >
                    {isbnSearching ? '조회 중...' : '불러오기'}
                  </button>
                </div>
                {coverLoadFailed && (
                  <p style={{ fontSize: '0.75rem', color: '#e05050', margin: 0 }}>커버를 찾을 수 없습니다.</p>
                )}
              </>
            )}
          </div>
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

      {/* 초기 상태 — 등록 시에만 표시 */}
      {!isEdit && (
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
      )}

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
        {loading ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정하기' : '등록하기')}
      </button>
    </form>
  )
}
