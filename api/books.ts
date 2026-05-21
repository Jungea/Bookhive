import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { isbn } = req.query
  if (!isbn || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'isbn 파라미터가 필요합니다.' })
  }

  const apiKey = process.env.KAKAO_BOOK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' })
  }

  const response = await fetch(
    `https://dapi.kakao.com/v3/search/book?target=isbn&query=${encodeURIComponent(isbn)}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } }
  )

  if (!response.ok) {
    return res.status(response.status).json({ error: '카카오 API 오류' })
  }

  const data = await response.json()
  const book = data.documents?.[0]

  if (!book) {
    return res.status(404).json({ error: '책을 찾을 수 없습니다.' })
  }

  return res.status(200).json({
    title: book.title,
    author: book.authors?.join(', ') ?? '',
    thumbnail: book.thumbnail ?? null,
    publisher: book.publisher ?? '',
  })
}
