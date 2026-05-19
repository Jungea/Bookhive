import { ContentForm } from '../components/ContentForm'

interface AddPageProps {
  onSuccess?: () => void
}

export function AddPage({ onSuccess }: AddPageProps) {
  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '20px', color: 'var(--color-text)' }}>
        콘텐츠 등록
      </h2>
      <ContentForm onSuccess={onSuccess} />
    </div>
  )
}
