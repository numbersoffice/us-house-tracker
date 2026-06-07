import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BillsListing, BILLS_PAGE_SIZE } from '@/components/BillsListing'
import { CATEGORIES, categoryBySlug } from '@/lib/categories'

export const revalidate = 900 // 15 minutes

export async function generateStaticParams() {
  const payload = await getPayload({ config: await config })

  const params: { category: string; page: string }[] = []
  for (const cat of CATEGORIES) {
    const result = await payload.find({
      collection: 'bills',
      where: { policyArea: { in: cat.policyAreas } },
      limit: BILLS_PAGE_SIZE,
      depth: 0,
      select: {},
    })
    for (let p = 2; p <= result.totalPages; p++) {
      params.push({ category: cat.slug, page: String(p) })
    }
  }
  return params
}

export default async function BillsCategoryPaginatedPage({
  params,
}: {
  params: Promise<{ category: string; page: string }>
}) {
  const { category: categorySlug, page: pageParam } = await params
  const category = categoryBySlug(categorySlug)
  const page = Number(pageParam)
  if (!category || !Number.isInteger(page) || page < 1) notFound()

  return <BillsListing category={category} page={page} />
}
