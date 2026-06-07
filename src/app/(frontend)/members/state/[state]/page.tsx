import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MembersListing } from '@/components/MembersListing'
import { STATE_NAMES } from '@/lib/format'

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'members',
    where: { chamber: { equals: 'House' }, currentMember: { equals: true } },
    limit: 600,
    depth: 0,
    select: { state: true },
  })

  const states = new Set<string>()
  for (const m of result.docs) {
    if (m.state) states.add(m.state.toUpperCase())
  }
  return [...states].map((state) => ({ state }))
}

export default async function MembersByStatePage({
  params,
}: {
  params: Promise<{ state: string }>
}) {
  const { state } = await params
  if (!STATE_NAMES[state.toUpperCase()]) notFound()

  return <MembersListing state={state} />
}
