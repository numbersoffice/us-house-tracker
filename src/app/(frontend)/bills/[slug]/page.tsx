import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Bill, Member } from '@/payload-types'
import {
  formatBillHeadline,
  formatBillId,
  formatDate,
  formatDistrict,
  humanizeActionPrefix,
} from '@/lib/format'
import { categoryForPolicyArea } from '@/lib/categories'

export default async function BillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })

  const result = await payload.find({
    collection: 'bills',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const bill = result.docs[0] as (Bill & { sponsor: Member | string }) | undefined
  if (!bill) notFound()

  const sponsor = typeof bill.sponsor === 'object' ? bill.sponsor : null
  const partyClass = sponsor?.party ? sponsor.party.toLowerCase() : 'independent'
  const headline = formatBillHeadline(bill.billType, bill.billNumber)
  const billId = formatBillId(bill.billType, bill.billNumber)
  const humanized = humanizeActionPrefix(bill.latestActionText)
  const actionDate = formatDate(bill.latestActionDate)
  const introducedDate = formatDate(bill.introducedDate)
  const category = categoryForPolicyArea(bill.policyArea)

  return (
    <article>
      <div className="bill-detail-header">
        <div className="bill-id">
          {billId} · 119th Congress · {bill.originChamber ?? 'House'}-originated
        </div>
        <h1>{bill.title}</h1>
        <div className="meta small">
          {headline}
          {introducedDate && <> · Introduced {introducedDate}</>}
        </div>
        {category && (
          <div style={{ marginTop: '0.5rem' }}>
            <Link href={`/bills?category=${category.slug}`} className="category-tag">
              {category.label}
            </Link>
          </div>
        )}
      </div>

      {sponsor && (
        <Link href={`/members/${sponsor.slug}`} className="sponsor-card">
          {sponsor.imageUrl && (
            <img src={sponsor.imageUrl} alt="" className="sponsor-photo" />
          )}
          <div>
            <div className="label">Sponsored by</div>
            <div className="name">
              <span className={`party-dot ${partyClass}`} aria-hidden /> {sponsor.fullName}
            </div>
            <div className="meta">{formatDistrict(sponsor)} · {sponsor.party}</div>
          </div>
        </Link>
      )}

      <div className="status-block">
        <div className="label">What&apos;s happening</div>
        {humanized && <div className="summary">{humanized}</div>}
        <div className="raw">
          {actionDate && <strong>{actionDate} — </strong>}
          {bill.latestActionText ?? 'No recorded activity yet.'}
        </div>
      </div>

      {(bill.cosponsorsCount ?? 0) > 0 && (
        <p className="muted small">
          {bill.cosponsorsCount} other{' '}
          {bill.cosponsorsCount === 1 ? 'representative has' : 'representatives have'} signed on as
          co-sponsors.
        </p>
      )}

      {bill.congressGovUrl && (
        <p>
          <a href={bill.congressGovUrl} target="_blank" rel="noopener noreferrer">
            Read the full bill on congress.gov →
          </a>
        </p>
      )}
    </article>
  )
}
