import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Member } from '@/payload-types'
import { formatDistrict } from '@/lib/format'
import { StateFilter } from '@/components/StateFilter'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state: stateParam } = await searchParams
  const stateFilter = stateParam?.toUpperCase()

  const payload = await getPayload({ config: await config })

  const where: Record<string, unknown> = {
    chamber: { equals: 'House' },
    currentMember: { equals: true },
  }
  if (stateFilter) where.state = { equals: stateFilter }

  const result = await payload.find({
    collection: 'members',
    where,
    sort: ['state', 'district', 'lastName'],
    limit: 600,
    depth: 0,
  })

  return (
    <>
      <h1>Representatives</h1>
      <p className="muted">
        The {result.totalDocs.toLocaleString()} members of the U.S. House of Representatives in the
        119th Congress. Filter by state, then tap a representative to see what they&apos;ve been
        working on.
      </p>

      <div className="toolbar">
        <StateFilter value={stateFilter ?? ''} />
        <span className="count">
          Showing {result.docs.length} of {result.totalDocs}
        </span>
      </div>

      <ul className="member-grid">
        {result.docs.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </ul>
    </>
  )
}

function MemberCard({ member }: { member: Member }) {
  const partyClass = member.party ? member.party.toLowerCase() : 'independent'
  return (
    <Link href={`/members/${member.slug}`} className="member-card">
      {member.imageUrl ? (
        <img src={member.imageUrl} alt="" className="member-photo" />
      ) : (
        <div className="member-photo" />
      )}
      <div className="member-name">
        <span className={`party-dot ${partyClass}`} aria-hidden /> {member.fullName}
      </div>
      <div className="member-place">{formatDistrict(member)}</div>
    </Link>
  )
}
