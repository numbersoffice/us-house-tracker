import { notFound } from 'next/navigation'

export const revalidate = 900 // 15 minutes

export default function CatchAllNotFound() {
  notFound()
}
