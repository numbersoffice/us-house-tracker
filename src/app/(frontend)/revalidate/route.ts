import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

// On-demand revalidation endpoint. Sync jobs run outside any request scope, where
// Next's `revalidatePath` throws ("static generation store missing"), so they
// can't refresh the Full Route Cache themselves. Instead they POST the list of
// paths they affected here, and we revalidate from within this route handler,
// which *does* have a request scope.
//
// Body: { paths: Array<string | { path: string; type?: 'page' | 'layout' }> }
// Dynamic routes (e.g. "/bills/[slug]") must include `type: 'page'`, otherwise
// `revalidatePath` is a no-op (Next requires the type for dynamic paths).

type NormalizedPath = { path: string; type?: 'page' | 'layout' }

function normalizePath(entry: unknown): NormalizedPath | null {
  if (typeof entry === 'string') {
    return entry.length > 0 ? { path: entry } : null
  }
  if (entry && typeof entry === 'object' && 'path' in entry) {
    const { path, type } = entry as { path: unknown; type?: unknown }
    if (typeof path !== 'string' || path.length === 0) return null
    return type === 'page' || type === 'layout' ? { path, type } : { path }
  }
  return null
}

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'REVALIDATE_SECRET is not configured' }, { status: 500 })
  }
  if (req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawPaths =
    body && typeof body === 'object' && 'paths' in body ? (body as { paths: unknown }).paths : null
  if (!Array.isArray(rawPaths)) {
    return NextResponse.json({ error: 'Body must include a `paths` array' }, { status: 400 })
  }

  const paths = rawPaths
    .map(normalizePath)
    .filter((p): p is NormalizedPath => p !== null)
  if (paths.length === 0) {
    return NextResponse.json({ error: '`paths` contained no valid entries' }, { status: 400 })
  }

  for (const { path, type } of paths) {
    if (type) revalidatePath(path, type)
    else revalidatePath(path)
  }

  return NextResponse.json({ revalidated: paths.map((p) => p.path), at: new Date().toISOString() })
}
