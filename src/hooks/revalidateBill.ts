import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload'
import type { Bill } from '../payload-types'
import { revalidationDisabled, safeRevalidatePath } from './revalidate-utils'

/** Resolve a bill sponsor (id or populated doc) to its member slug. */
async function sponsorSlug(
  req: PayloadRequest,
  sponsor: Bill['sponsor'] | undefined | null,
): Promise<string | null> {
  if (!sponsor) return null
  if (typeof sponsor === 'object') return sponsor.slug ?? null
  try {
    const member = await req.payload.findByID({
      collection: 'members',
      id: sponsor,
      depth: 0,
      req,
    })
    return member?.slug ?? null
  } catch {
    return null
  }
}

/** Homepage + every bills list variant (paginated and category-filtered). */
function revalidateBillLists(req: PayloadRequest): void {
  safeRevalidatePath(req, '/') // homepage shows most recent bills
  safeRevalidatePath(req, '/bills') // list, page 1
  safeRevalidatePath(req, '/bills/page/[page]', 'page') // paginated list
  safeRevalidatePath(req, '/bills/category/[category]', 'page') // category list, page 1
  safeRevalidatePath(req, '/bills/category/[category]/page/[page]', 'page') // category, paginated
}

/**
 * Revalidate the individual member page(s) of any member sponsoring the bill.
 * Using the `layout` type covers the profile and its paginated sub-routes.
 */
async function revalidateSponsorPages(
  req: PayloadRequest,
  ...sponsors: Array<Bill['sponsor'] | undefined | null>
): Promise<void> {
  const slugs = new Set<string>()
  for (const sponsor of sponsors) {
    const slug = await sponsorSlug(req, sponsor)
    if (slug) slugs.add(slug)
  }
  for (const slug of slugs) safeRevalidatePath(req, `/members/${slug}`, 'layout')
}

export const revalidateBill: CollectionAfterChangeHook<Bill> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (revalidationDisabled(req)) return doc

  revalidateBillLists(req)

  // Individual bill page (and the old slug if it changed).
  safeRevalidatePath(req, `/bills/${doc.slug}`)
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    safeRevalidatePath(req, `/bills/${previousDoc.slug}`)
  }

  // Sponsoring member page(s) — current and previous sponsor.
  await revalidateSponsorPages(req, doc.sponsor, previousDoc?.sponsor)

  return doc
}

export const revalidateBillDelete: CollectionAfterDeleteHook<Bill> = async ({ doc, req }) => {
  if (revalidationDisabled(req)) return doc

  revalidateBillLists(req)
  if (doc?.slug) safeRevalidatePath(req, `/bills/${doc.slug}`)
  await revalidateSponsorPages(req, doc?.sponsor)

  return doc
}
