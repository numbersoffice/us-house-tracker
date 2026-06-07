import { notFound } from 'next/navigation'
import { BillsListing } from '@/components/BillsListing'
import { CATEGORIES, categoryBySlug } from '@/lib/categories'

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.slug }))
}

export default async function BillsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category: categorySlug } = await params
  const category = categoryBySlug(categorySlug)
  if (!category) notFound()

  return <BillsListing category={category} page={1} />
}
