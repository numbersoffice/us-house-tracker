import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MemberProfile, MEMBER_BILLS_PAGE_SIZE } from '@/components/MemberProfile'

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })
  const members = await payload.find({
    collection: 'members',
    limit: 0,
    pagination: false,
    depth: 0,
    select: { slug: true },
  })

  const params: { slug: string; page: string }[] = []
  for (const member of members.docs) {
    const bills = await payload.find({
      collection: 'bills',
      where: { sponsor: { equals: member.id } },
      limit: MEMBER_BILLS_PAGE_SIZE,
      depth: 0,
      select: {},
    })
    for (let p = 2; p <= bills.totalPages; p++) {
      params.push({ slug: member.slug, page: String(p) })
    }
  }
  return params
}

export default async function MemberProfilePaginatedPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>
}) {
  const { slug, page: pageParam } = await params
  const page = Number(pageParam)
  if (!Number.isInteger(page) || page < 1) notFound()

  return <MemberProfile slug={slug} page={page} />
}
