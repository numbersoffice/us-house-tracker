import Link from 'next/link'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { BillRow } from '@/components/BillRow'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Pagination } from '@/components/Pagination'
import type { Bill, Member } from '@/payload-types'
import { CATEGORIES, type Category } from '@/lib/categories'

export const BILLS_PAGE_SIZE = 25

/** Path-based href for a bills list, e.g. `/bills`, `/bills/page/2`,
 *  `/bills/category/health`, `/bills/category/health/page/2`. */
export function billsHref(categorySlug: string | null, page: number): string {
  const base = categorySlug ? `/bills/category/${categorySlug}` : '/bills'
  return page > 1 ? `${base}/page/${page}` : base
}

type Props = {
  category?: Category | null
  page: number
}

export async function BillsListing({ category = null, page }: Props) {
  const payload = await getPayload({ config: await config })

  const where: Where = {}
  if (category) {
    where.policyArea = { in: category.policyAreas }
  }

  const result = await payload.find({
    collection: 'bills',
    where,
    sort: '-latestActionDate',
    page,
    limit: BILLS_PAGE_SIZE,
    depth: 1,
  })

  const activeSlug = category?.slug ?? null

  return (
    <>
      <Breadcrumbs
        items={
          category
            ? [{ label: 'Bills', href: '/bills' }, { label: category.label }]
            : [{ label: 'Bills' }]
        }
      />
      <header className="page-header">
        <p className="eyebrow">Legislation</p>
        <h1>Bills</h1>
        <p className="lede">
          {category ? (
            <>
              Bills about <strong>{category.label.toLowerCase()}</strong> in the 119th Congress,
              sorted by the most recent activity.
            </>
          ) : (
            <>Every bill in the 119th Congress, sorted by the most recent activity.</>
          )}
        </p>
      </header>

      <nav className="category-bar" aria-label="Browse by topic">
        <Link href="/bills" className={`chip${!category ? ' active' : ''}`}>
          All topics
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={billsHref(cat.slug, 1)}
            className={`chip${activeSlug === cat.slug ? ' active' : ''}`}
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

      <Pagination
        page={result.page ?? 1}
        totalPages={result.totalPages}
        buildHref={(p) => billsHref(activeSlug, p)}
      />
    </>
  )
}
