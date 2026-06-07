import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Bill, Member } from '@/payload-types'
import { BillRow } from '@/components/BillRow'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { MemberPhoto } from '@/components/MemberPhoto'
import { Pagination } from '@/components/Pagination'
import { PartyName } from '@/components/PartyName'
import { formatDistrict, formatTermCount } from '@/lib/format'

export const MEMBER_BILLS_PAGE_SIZE = 25

/** Path-based href for a member's sponsored-bills pagination. */
export function memberBillsHref(slug: string, page: number): string {
  return page > 1 ? `/members/${slug}/page/${page}` : `/members/${slug}`
}

type Props = {
  slug: string
  page: number
}

export async function MemberProfile({ slug, page }: Props) {
  const payload = await getPayload({ config: await config })

  const memberResult = await payload.find({
    collection: 'members',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const member = memberResult.docs[0]
  if (!member) notFound()

  const termCount = formatTermCount(member)

  const billsResult = await payload.find({
    collection: 'bills',
    where: { sponsor: { equals: member.id } },
    sort: '-latestActionDate',
    page,
    limit: MEMBER_BILLS_PAGE_SIZE,
    depth: 1,
  })

  return (
    <article>
      <Breadcrumbs
        items={[{ label: 'Representatives', href: '/members' }, { label: member.fullName }]}
      />
      <header className="member-profile">
        <MemberPhoto src={member.imageUrl} size="lg" />
        <div className="who">
          <h1>{member.fullName}</h1>
          <div className="subline">
            <PartyName party={member.party} name={member.party ?? ''} /> · {formatDistrict(member)}
            {termCount && ` · ${termCount}`}
          </div>
          {member.officialWebsiteUrl && (
            <div className="official-link">
              <a href={member.officialWebsiteUrl} target="_blank" rel="noopener noreferrer">
                Official website →
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="section-heading">
        <h2>Bills they&apos;ve sponsored</h2>
        <a
          className="rss-link"
          href={`/members/${slug}/feed.xml`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Subscribe via RSS
        </a>
      </div>
      {billsResult.totalDocs === 0 ? (
        <p className="muted">
          No bills sponsored yet in the 119th Congress. (They may still be co-sponsoring others —
          we&apos;ll add that view soon.)
        </p>
      ) : (
        <>
          <div className="toolbar">
            <span className="count">
              {billsResult.totalDocs.toLocaleString()} sponsored bill
              {billsResult.totalDocs === 1 ? '' : 's'}
            </span>
            {billsResult.totalPages > 1 && (
              <span className="count">
                Page {billsResult.page} of {billsResult.totalPages}
              </span>
            )}
          </div>
          <ul className="list">
            {billsResult.docs.map((bill) => (
              <BillRow key={bill.id} bill={bill as Bill & { sponsor: Member | string }} />
            ))}
          </ul>
          <Pagination
            page={billsResult.page ?? 1}
            totalPages={billsResult.totalPages}
            buildHref={(p) => memberBillsHref(slug, p)}
          />
        </>
      )}

      {member.imageAttribution && (
        <p className="tiny muted" style={{ marginTop: '2rem' }}>
          Photo: <span dangerouslySetInnerHTML={{ __html: member.imageAttribution }} />
        </p>
      )}
    </article>
  )
}
