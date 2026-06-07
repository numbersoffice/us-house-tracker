import Link from 'next/link'
import type { Bill, Member } from '@/payload-types'
import { categoryForPolicyArea } from '@/lib/categories'
import styles from './BillRow.module.css'

type Props = {
  bill: Bill & { sponsor: Member | string }
}

export function BillRow({ bill }: Props) {
  const sponsor = typeof bill.sponsor === 'object' ? bill.sponsor : null
  const category = categoryForPolicyArea(bill.policyArea)

  return (
    <li className={`card ${styles.listItem}`}>
      <Link href={`/bills/${bill.slug}`} className={styles.headline}>
        <div className={styles.billHeadline}>
          <h3>{bill.title} →</h3>
        </div>
      </Link>
      {sponsor && (
        <div className={`${styles.billMeta} small`}>
          Sponsored by{' '}
          <Link href={`/members/${sponsor.slug}`}>
            <strong>{sponsor.fullName}</strong>
          </Link>
        </div>
      )}
      {category ? (
        <Link href={`/bills/category/${category.slug}`} className="chip chip-sm">
          {category.label}
        </Link>
      ) : (
        <span className="chip chip-sm inactive">Category Pending</span>
      )}
    </li>
  )
}
