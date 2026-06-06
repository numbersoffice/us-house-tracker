import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { MemberCard } from '@/components/MemberCard'
import { StateFilter } from '@/components/StateFilter'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state: stateParam } = await searchParams
  const stateFilter = stateParam?.toUpperCase()

  const payload = await getPayload({ config: await config })

  const where: Where = {
    chamber: { equals: 'House' },
    currentMember: { equals: true },
  }
  if (stateFilter) where.state = { equals: stateFilter }

  const result = await payload.find({
    collection: 'members',
    where,
    sort: ['lastName'],
    limit: 600,
    depth: 0,
  })

  return (
    <>
      <Breadcrumbs items={[{ label: 'Representatives' }]} />
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
