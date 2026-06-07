import { BillsListing } from '@/components/BillsListing'

export const revalidate = 900 // 15 minutes

export default function BillsPage() {
  return <BillsListing page={1} />
}
