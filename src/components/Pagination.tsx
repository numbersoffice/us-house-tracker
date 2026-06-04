import Link from 'next/link'
import styles from './Pagination.module.css'

type Props = {
  page: number
  totalPages: number
  buildHref: (page: number) => string
}

export function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null
  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null

  return (
    <div className={styles.pagination}>
      {prev ? (
        <Link href={buildHref(prev)}>← Previous</Link>
      ) : (
        <span className={styles.disabled}>← Previous</span>
      )}
      <span className={styles.current}>{page}</span>
      {next ? (
        <Link href={buildHref(next)}>Next →</Link>
      ) : (
        <span className={styles.disabled}>Next →</span>
      )}
    </div>
  )
}
