import type { getPayload, TaskConfig } from 'payload'

import { paginate } from '../lib/congress-api'
import {
  isHouseMember,
  syncMember,
  type MemberListItem,
  type MemberListResponse,
} from '../lib/sync-members-core'

const CONGRESS = 119
const OVERLAP_BUFFER_MS = 60 * 60 * 1000

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

async function readWatermark(payload: PayloadInstance): Promise<Date | null> {
  const state = await payload.findGlobal({ slug: 'sync-state', overrideAccess: true })
  if (!state.lastMembersSyncStartedAt) return null
  const d = new Date(state.lastMembersSyncStartedAt)
  return Number.isNaN(d.getTime()) ? null : d
}

async function writeWatermark(payload: PayloadInstance, startedAt: Date): Promise<void> {
  await payload.updateGlobal({
    slug: 'sync-state',
    data: { lastMembersSyncStartedAt: startedAt.toISOString() },
    overrideAccess: true,
  })
}

async function runMembersSync(
  payload: PayloadInstance,
  logger: Logger,
  jobId?: string,
): Promise<Totals> {
  const totals: Totals = { created: 0, updated: 0, skipped: 0, errored: 0 }
  const runStartedAt = new Date()
  let i = 0
  let skippedNonHouse = 0
  let cancelled = false

  const watermark = await readWatermark(payload)
  const fromDateTime = watermark
    ? toCongressDateTime(new Date(watermark.getTime() - OVERLAP_BUFFER_MS))
    : undefined

  if (fromDateTime) {
    logger.info(`Incremental sync from ${fromDateTime} (watermark ${watermark!.toISOString()})`)
  } else {
    logger.info('No watermark found; running full sync')
  }

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
    return totals
  }

  await writeWatermark(payload, runStartedAt)
  logger.info(
    `Members sync complete. Processed ${i} House members (skipped ${skippedNonHouse} non-House). Totals: ${JSON.stringify(totals)}. Watermark advanced to ${runStartedAt.toISOString()}`,
  )
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
