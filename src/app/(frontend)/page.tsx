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
        <p className="hero-credit">
          Photo:{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:US_Capitol_west_side.JPG"
            target="_blank"
            rel="noopener noreferrer"
          >
            Martin Falbisoner
          </a>
          , CC BY-SA 3.0
        </p>
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
