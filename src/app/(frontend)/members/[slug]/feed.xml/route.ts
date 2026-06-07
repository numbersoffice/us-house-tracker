import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { buildMemberFeed, resolveBaseUrl, type FeedBill, type FeedMember } from '@/lib/feed'

const MAX_ITEMS = 100

// The underlying data only changes hourly (via the sync job), so we cache the
// feed and rebuild it on a timer rather than tracking individual bill changes.
const REVALIDATE_SECONDS = 900 // 15 minutes

// Keep the route segment's cache lifetime in step with the cached feed data.
export const revalidate = 900 // 15 minutes

type FeedData = { member: FeedMember; bills: FeedBill[] }

const getFeedData = unstable_cache(
  async (slug: string): Promise<FeedData | null> => {
    const payload = await getPayload({ config: await config })

    const memberResult = await payload.find({
      collection: 'members',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    const member = memberResult.docs[0]
    if (!member) return null

    const billsResult = await payload.find({
      collection: 'bills',
      where: { sponsor: { equals: member.id } },
      sort: '-introducedDate',
      limit: MAX_ITEMS,
      depth: 0,
    })

    return {
      member: { fullName: member.fullName, slug: member.slug },
      bills: billsResult.docs.map((bill) => ({
        slug: bill.slug,
        title: bill.title,
        billType: bill.billType,
        billNumber: bill.billNumber,
        introducedDate: bill.introducedDate ?? null,
        latestActionDate: bill.latestActionDate ?? null,
        latestActionText: bill.latestActionText ?? null,
      })),
    }
  },
  ['member-feed'],
  { revalidate: REVALIDATE_SECONDS },
)

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const data = await getFeedData(slug)
  if (!data) {
    return new Response('Not found', { status: 404 })
  }

  const baseUrl = resolveBaseUrl(request.url)
  const xml = buildMemberFeed(data.member, data.bills, baseUrl)

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
