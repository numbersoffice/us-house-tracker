import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Bill, Member } from '@/payload-types'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { MemberPhoto } from '@/components/MemberPhoto'
import { PartyName } from '@/components/PartyName'
import {
  formatBillHeadline,
  formatBillId,
  formatDate,
  formatDistrict,
  humanizeActionPrefix,
} from '@/lib/format'
import { categoryForPolicyArea } from '@/lib/categories'

export const revalidate = 900 // 15 minutes

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'bills',
    limit: 0,
    pagination: false,
    depth: 0,
    select: { slug: true },
  })
  return result.docs.map((bill) => ({ slug: bill.slug }))
}

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
  const headline = formatBillHeadline(bill.billType, bill.billNumber)
  const billId = formatBillId(bill.billType, bill.billNumber)
  const humanized = humanizeActionPrefix(bill.latestActionText)
  const actionDate = formatDate(bill.latestActionDate)
  const introducedDate = formatDate(bill.introducedDate)
  const category = categoryForPolicyArea(bill.policyArea)
  const summary = bill.summaries?.find((s) => s.text)
  const summaryDate = formatDate(summary?.actionDate)

  return (
    <article>
      <Breadcrumbs items={[{ label: 'Bills', href: '/bills' }, { label: billId }]} />
      <div className="bill-detail-header">
        <div className="bill-id">
          {billId} · 119th Congress · {bill.originChamber ?? 'House'}-originated
        </div>
        <h1>{bill.title}</h1>
        <div className="meta small">
          {/* {headline}
          {introducedDate && <> · Introduced {introducedDate}</>} */}
          <>Introduced {introducedDate}</>
        </div>
        {category && (
          <Link href={`/bills/category/${category.slug}`} className="chip chip-sm">
            {category.label}
          </Link>
        )}
      </div>

      {sponsor && (
        <Link href={`/members/${sponsor.slug}`} className="card sponsor-card">
          <MemberPhoto src={sponsor.imageUrl} size="sm" />
          <div>
            <div className="label">Sponsored by</div>
            <div className="name">
              <PartyName party={sponsor.party} name={sponsor.fullName} />
            </div>
            <div className="meta">
              {formatDistrict(sponsor)} · {sponsor.party}
            </div>
          </div>
        </Link>
      )}

      <section className={`card bill-summary${summary?.text ? '' : ' is-empty'}`}>
        <div className="label">
          Summary
          {summary?.text && summary.actionDesc && <> · {summary.actionDesc}</>}
          {summary?.text && summaryDate && <> · {summaryDate}</>}
        </div>
        {summary?.text ? (
          <div className="bill-summary-body" dangerouslySetInnerHTML={{ __html: summary.text }} />
        ) : (
          <div className="bill-summary-empty">
            No summary yet. The Congressional Research Service usually publishes one a little while
            after a bill is introduced — check back soon.
          </div>
        )}
      </section>

      {/* <div className="card status-block">
        <div className="label">What&apos;s happening</div>
        {humanized && <div className="summary">{humanized}</div>}
        <div className="raw">
          {actionDate && <strong>{actionDate} — </strong>}
          {bill.latestActionText ?? 'No recorded activity yet.'}
        </div>
      </div> */}

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
