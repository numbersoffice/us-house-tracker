import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BillRow } from '@/components/BillRow'
import type { Bill, Member } from '@/payload-types'

export const revalidate = 900 // 15 minutes

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
      <section className="hero">
        <p className="eyebrow">119th Congress · U.S. House</p>
        <h1>
          See your <span className="hero-mark">representatives</span> at work.
        </h1>
        <p>
          For democracy to flourish, we need to be confident that our representatives are acting in
          our best interest. This site helps to see what they are doing.
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

      <section className="home-section">
        <p className="eyebrow">Fresh off the floor</p>
        <h2>Most recent activity</h2>
        <ul className="list">
          {recent.docs.map((bill) => (
            <BillRow key={bill.id} bill={bill as Bill & { sponsor: Member | string }} />
          ))}
        </ul>
        <div className="home-more">
          <Link href="/bills" className="btn btn-secondary">
            See all bills →
          </Link>
        </div>
      </section>
    </>
  )
}
