import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BillRow } from '@/components/BillRow'
import type { Bill, Member } from '@/payload-types'

export default async function HomePage() {
  const payload = await getPayload({ config: await config })

  const recent = await payload.find({
    collection: 'bills',
    sort: '-latestActionDate',
    limit: 10,
    depth: 1,
  })

  return (
    <>
      <section className="hero" aria-label="The west front of the United States Capitol">
        <h1>See your representatives at work.</h1>
        <p>
          Democracy works best when transparent and trusted. Have a look at what your
          representatives are doing.
        </p>
        <div className="hero-actions">
          <Link href="/members" className="btn btn-primary">
            Find your representative →
          </Link>
          <Link href="/bills" className="btn btn-secondary">
            Explore all bills
          </Link>
        </div>
      </section>

      <section>
        <h2>Most recent activity</h2>
        <ul className="list">
          {recent.docs.map((bill) => (
            <BillRow key={bill.id} bill={bill as Bill & { sponsor: Member | string }} />
          ))}
        </ul>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/bills">See all bills →</Link>
        </div>
      </section>
    </>
  )
}
