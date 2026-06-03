import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Bill, Member } from '@/payload-types'
import { BillRow } from '@/components/BillRow'
import { formatDistrict } from '@/lib/format'

const PAGE_SIZE = 25

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const payload = await getPayload({ config: await config })

  const memberResult = await payload.find({
    collection: 'members',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const member = memberResult.docs[0]
  if (!member) notFound()

  const billsResult = await payload.find({
    collection: 'bills',
    where: { sponsor: { equals: member.id } },
    sort: '-latestActionDate',
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  const partyClass = member.party ? member.party.toLowerCase() : 'independent'

  return (
    <article>
      <header className="member-profile">
        {member.imageUrl ? (
          <img src={member.imageUrl} alt="" className="member-photo" />
        ) : (
          <div className="member-photo" />
        )}
        <div className="who">
          <h1>{member.fullName}</h1>
          <div className="subline">
            <span className={`party-dot ${partyClass}`} aria-hidden /> {member.party} ·{' '}
            {formatDistrict(member)}
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

      <h2>Bills they&apos;ve sponsored</h2>
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
          <Pagination slug={slug} page={billsResult.page ?? 1} totalPages={billsResult.totalPages} />
        </>
      )}

      {member.imageAttribution && (
        <p className="tiny muted" style={{ marginTop: '2rem' }}>
          Photo:{' '}
          <span dangerouslySetInnerHTML={{ __html: member.imageAttribution }} />
        </p>
      )}
    </article>
  )
}

function Pagination({
  slug,
  page,
  totalPages,
}: {
  slug: string
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null
  const prev = page > 1 ? page - 1 : null
  const next = page < totalPages ? page + 1 : null
  return (
    <div className="pagination">
      {prev ? (
        <Link href={`/members/${slug}?page=${prev}`}>← Previous</Link>
      ) : (
        <span className="disabled">← Previous</span>
      )}
      <span className="current">{page}</span>
      {next ? (
        <Link href={`/members/${slug}?page=${next}`}>Next →</Link>
      ) : (
        <span className="disabled">Next →</span>
      )}
    </div>
  )
}
