import { MembersListing } from '@/components/MembersListing'

export const revalidate = 900 // 15 minutes

export default function MembersPage() {
  return <MembersListing />
}
