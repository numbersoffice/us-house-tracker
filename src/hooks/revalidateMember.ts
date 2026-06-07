import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload'
import type { Member } from '../payload-types'
import { revalidationDisabled, safeRevalidatePath } from './revalidate-utils'

/** Member list, including every state-filtered variant. */
function revalidateMemberLists(req: PayloadRequest): void {
  safeRevalidatePath(req, '/members') // full list
  safeRevalidatePath(req, '/members/state/[state]', 'page') // state-filtered list
}

/** Revalidate the individual bill page of every bill this member sponsors. */
async function revalidateSponsoredBills(req: PayloadRequest, memberId: Member['id']): Promise<void> {
  try {
    const bills = await req.payload.find({
      collection: 'bills',
      where: { sponsor: { equals: memberId } },
      depth: 0,
      pagination: false,
      select: { slug: true },
      req,
    })
    for (const bill of bills.docs) {
      if (bill.slug) safeRevalidatePath(req, `/bills/${bill.slug}`)
    }
  } catch (err) {
    req.payload.logger.warn(
      `Could not revalidate sponsored bills for member ${memberId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

export const revalidateMember: CollectionAfterChangeHook<Member> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (revalidationDisabled(req)) return doc

  // Individual member page + its paginated sponsored-bills sub-routes. A member
  // is identified globally by slug, so revalidate the old slug too if it changed.
  safeRevalidatePath(req, `/members/${doc.slug}`, 'layout')
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    safeRevalidatePath(req, `/members/${previousDoc.slug}`, 'layout')
  }

  // The state list is revalidated globally (all state variants), so a member
  // moving between states refreshes both the old and new state pages.
  revalidateMemberLists(req)
  await revalidateSponsoredBills(req, doc.id)

  return doc
}

export const revalidateMemberDelete: CollectionAfterDeleteHook<Member> = async ({ doc, req }) => {
  if (revalidationDisabled(req)) return doc

  if (doc?.slug) safeRevalidatePath(req, `/members/${doc.slug}`, 'layout')
  revalidateMemberLists(req)
  if (doc?.id) await revalidateSponsoredBills(req, doc.id)

  return doc
}
