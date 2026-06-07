type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

// A path to revalidate. Dynamic routes (e.g. "/bills/[slug]") must pass
// `type: 'page'`; plain paths can be given as a bare string.
export type RevalidatePath = string | { path: string; type?: 'page' | 'layout' }

// Ask the frontend to refresh the given cached pages after a sync. Sync tasks run
// in a background job with no request scope, so they can't call `revalidatePath`
// directly — instead they POST the affected paths to the `/revalidate` route
// handler, which runs in a request scope where revalidation works. Best-effort: a
// revalidation failure is logged but never fails the sync.
export async function revalidateFrontend(
  logger: Logger,
  paths: RevalidatePath[],
): Promise<void> {
  if (paths.length === 0) return

  const baseUrl = process.env.APP_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!baseUrl || !secret) {
    logger.warn(
      'Skipping frontend revalidation: APP_URL and/or REVALIDATE_SECRET are not set. Cached pages will refresh on their own schedule instead.',
    )
    return
  }

  const url = `${baseUrl.replace(/\/$/, '')}/revalidate`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ paths }),
    })
    if (!res.ok) {
      logger.warn(`Frontend revalidation request failed: HTTP ${res.status}`)
      return
    }
    logger.info(`Triggered frontend revalidation (${paths.length} paths)`)
  } catch (e) {
    logger.warn(
      `Frontend revalidation request errored: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}
