import { getPayload } from 'payload'
import config from '@payload-config'
import { MemberProfile } from '@/components/MemberProfile'

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'members',
    limit: 0,
    pagination: false,
    depth: 0,
    select: { slug: true },
  })
  return result.docs.map((member) => ({ slug: member.slug }))
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <MemberProfile slug={slug} page={1} />
}
