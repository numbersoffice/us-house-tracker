import type { getPayload, TaskConfig } from 'payload'

import { paginate } from '../lib/congress-api'
import { acquireSyncLock, releaseSyncLock } from '../lib/sync-lock'
import { revalidateFrontend, type RevalidatePath } from '../lib/revalidate'
import {
  isHouseMember,
  syncMember,
  type MemberListItem,
  type MemberListResponse,
} from '../lib/sync-members-core'

const CONGRESS = 119
const OVERLAP_BUFFER_MS = 60 * 60 * 1000

// Cached pages affected by a members sync: member pages, plus the home page and
// bill detail pages, which embed sponsor (member) data at depth 1.
const MEMBERS_REVALIDATE_PATHS: RevalidatePath[] = [
  '/',
  '/members',
  { path: '/members/[slug]', type: 'page' },
  { path: '/bills/[slug]', type: 'page' },
]

type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

type Totals = { created: number; updated: number; skipped: number; errored: number }
type SyncResult = 'created' | 'updated' | 'skipped'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

const CANCELLATION_CHECK_INTERVAL = 5

function toCongressDateTime(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`
}

async function isJobCancelled(payload: PayloadInstance, jobId: string): Promise<boolean> {
  try {
    const job = await payload.findByID({
      collection: 'payload-jobs',
      id: jobId,
      depth: 0,
      overrideAccess: true,
    })
    return Boolean(job.hasError)
  } catch {
    return false
  }
}

function parseSyncDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// The watermark is the start time of the last *successful* run, written only on
// success. A failed or cancelled run leaves it untouched, so the next run resumes
// from the last good start and re-covers whatever the failed run would have —
// no gap, and no full re-sync needed.
async function readWatermark(payload: PayloadInstance): Promise<Date | null> {
  const state = await payload.findGlobal({ slug: 'sync-state', overrideAccess: true })
  return parseSyncDate(state.lastMembersSyncStartedAt)
}

async function writeWatermark(payload: PayloadInstance, startedAt: Date): Promise<void> {
  await payload.updateGlobal({
    slug: 'sync-state',
    data: { lastMembersSyncStartedAt: startedAt.toISOString() },
    overrideAccess: true,
  })
}

// Lower bound for the next incremental sync: the last successful run's start minus
// a 1h buffer. Anchoring on the *start* (not the end) is what closes the long-run
// gap — anything updated while a multi-hour run was in flight has an updateDate
// after that start, so the next run re-fetches it.
function computeSyncWindow(watermark: Date | null): {
  fromDateTime: string | undefined
  description: string
} {
  if (!watermark) {
    return { fromDateTime: undefined, description: 'no watermark found; running full sync' }
  }
  const fromDateTime = toCongressDateTime(new Date(watermark.getTime() - OVERLAP_BUFFER_MS))
  return {
    fromDateTime,
    description: `incremental from ${fromDateTime} (last successful run started ${watermark.toISOString()}, − 1h buffer)`,
  }
}

async function runMembersSync(
  payload: PayloadInstance,
  logger: Logger,
  jobId?: string,
): Promise<Totals> {
  const totals: Totals = { created: 0, updated: 0, skipped: 0, errored: 0 }

  // Mutual exclusion: never run two members syncs at once (scheduled, autoRun, or
  // manual). A bills sync can still run alongside us — it holds a different lock.
  if (!(await acquireSyncLock(payload, 'syncMembers', jobId))) {
    logger.warn('Another members sync is already in progress; skipping this run.')
    return totals
  }

  try {
    return await runMembersSyncLocked(payload, logger, jobId, totals)
  } finally {
    await releaseSyncLock(payload, 'syncMembers')
  }
}

async function runMembersSyncLocked(
  payload: PayloadInstance,
  logger: Logger,
  jobId: string | undefined,
  totals: Totals,
): Promise<Totals> {
  const runStartedAt = new Date()
  let i = 0
  let skippedNonHouse = 0
  let cancelled = false

  logger.info(`Members sync started at ${runStartedAt.toISOString()}`)

  const { fromDateTime, description } = computeSyncWindow(await readWatermark(payload))
  logger.info(`Members sync window: ${description}`)

  logger.info(`Syncing ${CONGRESS}th Congress House members …`)

  for await (const item of paginate<MemberListItem, MemberListResponse>(
    `/member/congress/${CONGRESS}`,
    { limit: 250, sort: 'updateDate+desc', fromDateTime },
    (r) => r.members ?? [],
  )) {
    if (!isHouseMember(item)) {
      skippedNonHouse++
      continue
    }
    i++

    try {
      const result: SyncResult = await syncMember(payload, item.bioguideId, true)
      totals[result]++
      if (i % 25 === 0) {
        logger.info(
          `${i} processed (created=${totals.created}, updated=${totals.updated}, skipped=${totals.skipped})`,
        )
      }
    } catch (e) {
      totals.errored++
      logger.error(
        `error syncing ${item.bioguideId}: ${e instanceof Error ? e.message : String(e)}`,
      )
    }

    if (jobId && i % CANCELLATION_CHECK_INTERVAL === 0 && (await isJobCancelled(payload, jobId))) {
      logger.warn(`Job ${jobId} cancelled by user; stopping after ${i} members`)
      cancelled = true
      break
    }
  }

  if (cancelled) {
    logger.warn(
      `Members sync cancelled. Partial totals: ${JSON.stringify(totals)}. Watermark NOT advanced.`,
    )
    if (totals.created + totals.updated > 0)
      await revalidateFrontend(logger, MEMBERS_REVALIDATE_PATHS)
    return totals
  }

  const runCompletedAt = new Date()
  await writeWatermark(payload, runStartedAt)
  const durationSec = Math.round((runCompletedAt.getTime() - runStartedAt.getTime()) / 1000)
  logger.info(
    `Members sync complete in ${durationSec}s (started ${runStartedAt.toISOString()}, ended ${runCompletedAt.toISOString()}). Processed ${i} House members (skipped ${skippedNonHouse} non-House). Totals: ${JSON.stringify(totals)}.`,
  )
  if (totals.created + totals.updated > 0) await revalidateFrontend(logger, MEMBERS_REVALIDATE_PATHS)
  return totals
}

export const syncMembersTask: TaskConfig<'syncMembers'> = {
  slug: 'syncMembers',
  outputSchema: [
    { name: 'created', type: 'number', required: true },
    { name: 'updated', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
    { name: 'errored', type: 'number', required: true },
  ],
  retries: 2,
  handler: async ({ req, job }) => {
    const totals = await runMembersSync(req.payload, req.payload.logger, String(job.id))
    return { output: totals }
  },
}
