import Link from 'next/link'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { BillRow } from '@/components/BillRow'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Pagination } from '@/components/Pagination'
import type { Bill, Member } from '@/payload-types'
import { CATEGORIES, categoryBySlug } from '@/lib/categories'

const PAGE_SIZE = 25

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const { page: pageParam, category: categoryParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const activeCategory = categoryBySlug(categoryParam)

  const payload = await getPayload({ config: await config })

  const where: Where = {}
  if (activeCategory) {
    where.policyArea = { in: activeCategory.policyAreas }
  }

  const result = await payload.find({
    collection: 'bills',
    where,
    sort: '-latestActionDate',
    page,
    limit: PAGE_SIZE,
    depth: 1,
  })

  const buildHref = (p: number) =>
    activeCategory ? `/bills?category=${activeCategory.slug}&page=${p}` : `/bills?page=${p}`

  return (
    <>
      <Breadcrumbs
        items={
          activeCategory
            ? [{ label: 'Bills', href: '/bills' }, { label: activeCategory.label }]
            : [{ label: 'Bills' }]
        }
      />
      <h1>Bills</h1>
      <p className="muted">
        {activeCategory ? (
          <>
            Bills about <strong>{activeCategory.label.toLowerCase()}</strong> in the 119th Congress,
            sorted by the most recent activity.
          </>
        ) : (
          <>Every bill in the 119th Congress, sorted by the most recent activity.</>
        )}
      </p>

      <nav className="category-bar" aria-label="Browse by topic">
        <Link href="/bills" className={`chip${!activeCategory ? ' active' : ''}`}>
          All topics
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/bills?category=${cat.slug}`}
            className={`chip${activeCategory?.slug === cat.slug ? ' active' : ''}`}
          >
            {cat.label}
          </Link>
        ))}
      </nav>

      <div className="toolbar">
        <span className="count">
          {result.totalDocs.toLocaleString()} bill{result.totalDocs === 1 ? '' : 's'}
        </span>
        {result.totalPages > 1 && (
          <span className="count">
            Page {result.page} of {result.totalPages}
          </span>
        )}
      </div>

      {result.docs.length === 0 ? (
        <p className="muted">No bills here yet — try another topic.</p>
      ) : (
        <ul className="list">
          {result.docs.map((bill) => (
            <BillRow key={bill.id} bill={bill as Bill & { sponsor: Member | string }} />
          ))}
        </ul>
      )}

      <Pagination page={result.page ?? 1} totalPages={result.totalPages} buildHref={buildHref} />
    </>
  )
}
