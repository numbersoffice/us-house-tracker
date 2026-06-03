import Link from 'next/link'
import type { Bill, Member } from '@/payload-types'
import {
  formatBillHeadline,
  formatBillId,
  formatDate,
  formatDistrict,
  humanizeActionPrefix,
} from '@/lib/format'
import { categoryForPolicyArea } from '@/lib/categories'

type Props = {
  bill: Bill & { sponsor: Member | string }
}

export function BillRow({ bill }: Props) {
  const sponsor = typeof bill.sponsor === 'object' ? bill.sponsor : null
  const partyClass = sponsor?.party ? sponsor.party.toLowerCase() : 'independent'
  const headline = formatBillHeadline(bill.billType, bill.billNumber)
  const billId = formatBillId(bill.billType, bill.billNumber)
  const humanized = humanizeActionPrefix(bill.latestActionText)
  const actionDate = formatDate(bill.latestActionDate)
  const category = categoryForPolicyArea(bill.policyArea)

  return (
    <li className="list-item">
      <Link href={`/bills/${bill.slug}`} className="headline">
        <div className="bill-headline">
          <h3>{bill.title} →</h3>
          {/* <span className="bill-id">{billId}</span> */}
        </div>
      </Link>
      {sponsor && (
        <div className="bill-meta small">
          Sponsored by{' '}
          <Link href={`/members/${sponsor.slug}`}>
            <strong>{sponsor.fullName}</strong>
          </Link>{' '}
          {/* <span className={`party-dot ${partyClass}`} aria-hidden /> */}
          {/* <span className="muted"> {formatDistrict(sponsor)}</span> */}
        </div>
      )}

      {bill.latestActionText && (
        <div className="action-line">
          {/* {humanized && <span className="humanized">{humanized}.</span>}{' '} */}
          {/* <span className="muted">
            {actionDate && <>{actionDate} — </>}
            {bill.latestActionText}
          </span> */}
        </div>
      )}
      {category ? (
        <Link href={`/bills?category=${category.slug}`} className="category-tag">
          {category.label}
        </Link>
      ) : (
        <div className="category-tag inactive">Category Pending</div>
      )}
    </li>
  )
}
