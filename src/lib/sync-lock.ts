import type { getPayload } from 'payload'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

export type SyncTask = 'syncBills' | 'syncMembers'

// A sync run should never legitimately exceed this. If a lock is older we assume
// the holder crashed (the process died before releasing) and reclaim it, so a
// stale lock can't block syncs forever. Comfortably above any real run: even a
// cold full sync is bounded by the Congress API rate limiter to well under this.
const STALE_LOCK_MS = 3 * 60 * 60 * 1000

async function findLock(payload: PayloadInstance, task: SyncTask) {
  const res = await payload.find({
    collection: 'sync-locks',
    where: { task: { equals: task } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

function isStale(lockedAt: unknown, now: number): boolean {
  const t = typeof lockedAt === 'string' ? Date.parse(lockedAt) : NaN
  return !Number.isFinite(t) || now - t > STALE_LOCK_MS
}

async function insertLock(
  payload: PayloadInstance,
  task: SyncTask,
  jobId: string | undefined,
  now: number,
): Promise<boolean> {
  try {
    await payload.create({
      collection: 'sync-locks',
      data: { task, lockedAt: new Date(now).toISOString(), jobId: jobId ?? null },
      overrideAccess: true,
    })
    return true
  } catch {
    // Unique index rejected us: another run holds the lock.
    return false
  }
}

/**
 * Try to acquire the mutual-exclusion lock for `task`. Returns true if this
 * caller now owns the lock and may run, false if another run already holds it.
 * Reclaims locks left behind by a crashed run (older than STALE_LOCK_MS).
 */
export async function acquireSyncLock(
  payload: PayloadInstance,
  task: SyncTask,
  jobId?: string,
): Promise<boolean> {
  const now = Date.now()

  if (await insertLock(payload, task, jobId, now)) return true

  // Couldn't insert — a lock row exists. Reclaim it if it's stale, otherwise
  // a run is genuinely in progress and we yield.
  const existing = await findLock(payload, task)
  if (!existing) {
    // The holder released between our insert attempt and this read; try once more.
    return insertLock(payload, task, jobId, now)
  }
  if (!isStale(existing.lockedAt, now)) return false

  try {
    await payload.delete({ collection: 'sync-locks', id: existing.id, overrideAccess: true })
  } catch {
    // Someone else reclaimed it first — fall through and let the insert decide.
  }
  return insertLock(payload, task, jobId, now)
}

/** Release the lock for `task`. Best-effort; safe to call even if not held. */
export async function releaseSyncLock(payload: PayloadInstance, task: SyncTask): Promise<void> {
  try {
    await payload.delete({
      collection: 'sync-locks',
      where: { task: { equals: task } },
      overrideAccess: true,
    })
  } catch {
    // Best-effort: a stale-lock reclaim or a prior release may have removed it.
  }
}
