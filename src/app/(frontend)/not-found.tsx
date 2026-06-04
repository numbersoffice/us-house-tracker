import Link from 'next/link'

export const metadata = {
  title: 'Page not found — U.S. House Tracker',
}

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="not-found-eyebrow">Error 404</p>
      <h1>We couldn&rsquo;t find that page.</h1>
      <p className="not-found-lede">
        The bill, representative, or page you were looking for may have moved, been renamed, or
        never existed. Try one of the links below to get back on track.
      </p>
      <div className="not-found-actions">
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link href="/bills" className="btn btn-secondary">
          Browse bills
        </Link>
        <Link href="/members" className="btn btn-secondary">
          Find a representative
        </Link>
      </div>
    </section>
  )
}
