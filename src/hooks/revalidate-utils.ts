import type { PayloadRequest } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Wrapper around Next's `revalidatePath` that never throws.
 *
 * Bills and members are mutated both from the admin panel (inside a Next.js
 * request scope, where `revalidatePath` works) and from the hourly sync job
 * (a background cron, which may not have a request scope). Swallowing and
 * logging any error keeps the sync resilient while still revalidating during
 * admin edits.
 */
export function safeRevalidatePath(
  req: PayloadRequest,
  path: string,
  type?: 'layout' | 'page',
): void {
  try {
    revalidatePath(path, type)
  } catch (err) {
    req.payload.logger.warn(
      `Revalidation skipped for ${path}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/** Hooks set `context.disableRevalidate` to opt out (e.g. bulk imports). */
export function revalidationDisabled(req: PayloadRequest): boolean {
  return Boolean(req.context?.disableRevalidate)
}
