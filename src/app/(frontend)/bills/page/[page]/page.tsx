import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BillsListing, BILLS_PAGE_SIZE } from '@/components/BillsListing'

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'bills',
    limit: BILLS_PAGE_SIZE,
    depth: 0,
    select: {},
  })

  const params: { page: string }[] = []
  for (let p = 2; p <= result.totalPages; p++) {
    params.push({ page: String(p) })
  }
  return params
}

export default async function BillsPaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>
}) {
  const { page: pageParam } = await params
  const page = Number(pageParam)
  if (!Number.isInteger(page) || page < 1) notFound()

  return <BillsListing page={page} />
}
