import { notFound } from 'next/navigation'
import { MembersListing } from '@/components/MembersListing'
import { STATE_NAMES } from '@/lib/format'

// Enumerate state paths from the canonical state list rather than by grouping
// current members. A member's state can change, so deriving the param set from
// member groupings would make it stale; the global list keeps every state path
// stable and prerenderable regardless of who currently sits where.
export function generateStaticParams() {
  return Object.keys(STATE_NAMES).map((state) => ({ state }))
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
