import type { getPayload, TaskConfig } from 'payload'

import { congressGet, paginate } from '../lib/congress-api'
import { syncMember } from '../lib/sync-members-core'
import { acquireSyncLock, releaseSyncLock } from '../lib/sync-lock'

const CONGRESS = 119
const BILL_TYPES = ['hr', 'hjres'] as const
type BillType = (typeof BILL_TYPES)[number]

type BillListItem = {
  congress: number
  number: string
  type: string
  title: string
  originChamber?: string
  latestAction?: { actionDate?: string; text?: string }
  updateDate?: string
  url?: string
}

type BillListResponse = {
  bills: BillListItem[]
  pagination?: { next?: string; count?: number }
}

type BillSponsor = {
  bioguideId: string
  firstName?: string
  lastName?: string
  fullName?: string
  party?: string
  state?: string
  district?: number
}

type BillDetailResponse = {
  bill: {
    congress: number
    number: string
    type: string
    title: string
    introducedDate?: string
    originChamber?: string
    policyArea?: { name?: string }
    sponsors?: BillSponsor[]
    cosponsors?: { count?: number }
    actions?: { count?: number }
    summaries?: { count?: number; url?: string }
    latestAction?: { actionDate?: string; text?: string }
    legislationUrl?: string
    updateDate?: string
  }
}

type BillSummary = {
  actionDate?: string
  actionDesc?: string
  text?: string
  updateDate?: string
  versionCode?: string
}

type BillSummariesResponse = {
  summaries?: BillSummary[]
}

type ChamberValue = 'House' | 'Senate'

type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

type Totals = { created: number; updated: number; skipped: number; errored: number }
type SyncResult = 'created' | 'updated' | 'skipped' | 'errored'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

function chamberFromString(raw?: string | null): ChamberValue | null {
  if (!raw) return null
  return raw.toLowerCase().includes('senate') ? 'Senate' : 'House'
}

function makeSlug(congress: number, billType: string, billNumber: number): string {
  return `${congress}-${billType.toLowerCase()}-${billNumber}`
}

async function findSponsorId(payload: PayloadInstance, bioguideId: string): Promise<string | null> {
  const res = await payload.find({
    collection: 'members',
    where: { bioguideId: { equals: bioguideId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs[0]?.id ?? null
}

async function ensureSponsor(
  payload: PayloadInstance,
  bioguideId: string,
  logger: Logger,
): Promise<string | null> {
  let id = await findSponsorId(payload, bioguideId)
  if (id) return id

  logger.warn(`sponsor ${bioguideId} not in DB; fetching on the fly`)
  try {
    await syncMember(payload, bioguideId, true)
    id = await findSponsorId(payload, bioguideId)
  } catch (e) {
    logger.error(
      `failed to sync missing sponsor ${bioguideId}: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
  return id
}

async function fetchSummaries(
  billType: BillType,
  billNumber: number,
  logger: Logger,
): Promise<BillSummary[]> {
  try {
    const res = await congressGet<BillSummariesResponse>(
      `/bill/${CONGRESS}/${billType}/${billNumber}/summaries`,
    )
    return res.summaries ?? []
  } catch (e) {
    logger.warn(
      `failed to fetch summaries for ${CONGRESS}-${billType}-${billNumber}: ${e instanceof Error ? e.message : String(e)}`,
    )
    return []
  }
}

function mapSummaries(summaries: BillSummary[]) {
  return [...summaries]
    .sort((a, b) => (b.actionDate ?? '').localeCompare(a.actionDate ?? ''))
    .map((s) => ({
      actionDate: s.actionDate ?? null,
      actionDesc: s.actionDesc ?? null,
      versionCode: s.versionCode ?? null,
      text: s.text ?? null,
      updateDate: s.updateDate ?? null,
    }))
}

async function syncBill(
  payload: PayloadInstance,
  billType: BillType,
  billNumber: number,
  listUpdateDate: string | undefined,
  logger: Logger,
): Promise<SyncResult> {
  const slug = makeSlug(CONGRESS, billType, billNumber)

  const existing = await payload.find({
    collection: 'bills',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const stored = existing.docs[0]

  if (stored && stored.updateDate && listUpdateDate && stored.updateDate >= listUpdateDate) {
    return 'skipped'
  }

  const detail = await congressGet<BillDetailResponse>(
    `/bill/${CONGRESS}/${billType}/${billNumber}`,
  )
  const b = detail.bill

  const summaries =
    (b.summaries?.count ?? 0) > 0 ? await fetchSummaries(billType, billNumber, logger) : []

  const sponsorBioguide = b.sponsors?.[0]?.bioguideId
  if (!sponsorBioguide) {
    logger.warn(`${slug} has no sponsor; skipping`)
    return 'errored'
  }

  const sponsorId = await ensureSponsor(payload, sponsorBioguide, logger)
  if (!sponsorId) {
    logger.warn(`${slug}: could not resolve sponsor ${sponsorBioguide}; skipping`)
    return 'errored'
  }

  const data = {
    slug,
    congress: b.congress,
    billType,
    billNumber,
    title: b.title,
    introducedDate: b.introducedDate ?? null,
    policyArea: b.policyArea?.name ?? null,
    originChamber: chamberFromString(b.originChamber),
    latestActionDate: b.latestAction?.actionDate ?? null,
    latestActionText: b.latestAction?.text ?? null,
    sponsor: sponsorId,
    cosponsorsCount: b.cosponsors?.count ?? 0,
    actionsCount: b.actions?.count ?? 0,
    summaries: mapSummaries(summaries),
    congressGovUrl:
      b.legislationUrl ??
      `https://www.congress.gov/bill/${CONGRESS}th-congress/${billType === 'hr' ? 'house-bill' : 'house-joint-resolution'}/${billNumber}`,
    updateDate: b.updateDate ?? null,
    lastSyncedAt: new Date().toISOString(),
  }

  if (!stored) {
    await payload.create({ collection: 'bills', data, overrideAccess: true })
    return 'created'
  }
  await payload.update({ collection: 'bills', id: stored.id, data, overrideAccess: true })
  return 'updated'
}

const OVERLAP_BUFFER_MS = 60 * 60 * 1000

function toCongressDateTime(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`
}

const CANCELLATION_CHECK_INTERVAL = 5

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
  return parseSyncDate(state.lastBillsSyncStartedAt)
}

async function writeWatermark(payload: PayloadInstance, startedAt: Date): Promise<void> {
  await payload.updateGlobal({
    slug: 'sync-state',
    data: { lastBillsSyncStartedAt: startedAt.toISOString() },
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

async function runBillsSync(
  payload: PayloadInstance,
  logger: Logger,
  jobId?: string,
): Promise<Totals> {
  const totals: Totals = { created: 0, updated: 0, skipped: 0, errored: 0 }

  // Mutual exclusion: never run two bills syncs at once (scheduled, autoRun, or
  // manual). A members sync can still run alongside us — it holds a different lock.
  if (!(await acquireSyncLock(payload, 'syncBills', jobId))) {
    logger.warn('Another bills sync is already in progress; skipping this run.')
    return totals
  }

  try {
    return await runBillsSyncLocked(payload, logger, jobId, totals)
  } finally {
    await releaseSyncLock(payload, 'syncBills')
  }
}

async function runBillsSyncLocked(
  payload: PayloadInstance,
  logger: Logger,
  jobId: string | undefined,
  totals: Totals,
): Promise<Totals> {
  const runStartedAt = new Date()
  logger.info(`Bills sync started at ${runStartedAt.toISOString()}`)

  const { fromDateTime, description } = computeSyncWindow(await readWatermark(payload))
  logger.info(`Bills sync window: ${description}`)

  let cancelled = false

  for (const billType of BILL_TYPES) {
    if (cancelled) break
    logger.info(`Syncing /bill/${CONGRESS}/${billType} …`)
    const perType: Totals = { created: 0, updated: 0, skipped: 0, errored: 0 }
    let i = 0

    for await (const item of paginate<BillListItem, BillListResponse>(
      `/bill/${CONGRESS}/${billType}`,
      { limit: 250, sort: 'updateDate+desc', fromDateTime },
      (r) => r.bills ?? [],
    )) {
      i++
      const billNumber = Number(item.number)
      if (!billNumber) continue

      try {
        const result = await syncBill(payload, billType, billNumber, item.updateDate, logger)
        perType[result]++
        if (i % 50 === 0) {
          logger.info(
            `${i} processed (created=${perType.created}, updated=${perType.updated}, skipped=${perType.skipped}, errored=${perType.errored})`,
          )
        }
      } catch (e) {
        perType.errored++
        logger.error(
          `error on ${billType} ${billNumber}: ${e instanceof Error ? e.message : String(e)}`,
        )
      }

      if (
        jobId &&
        i % CANCELLATION_CHECK_INTERVAL === 0 &&
        (await isJobCancelled(payload, jobId))
      ) {
        logger.warn(`Job ${jobId} cancelled by user; stopping after ${i} ${billType} bills`)
        cancelled = true
        break
      }
    }

    logger.info(`${billType} done: ${JSON.stringify(perType)}`)
    totals.created += perType.created
    totals.updated += perType.updated
    totals.skipped += perType.skipped
    totals.errored += perType.errored
  }

  if (cancelled) {
    logger.warn(
      `Bills sync cancelled. Partial totals: ${JSON.stringify(totals)}. Watermark NOT advanced.`,
    )
    return totals
  }

  const runCompletedAt = new Date()
  await writeWatermark(payload, runStartedAt)
  const durationSec = Math.round((runCompletedAt.getTime() - runStartedAt.getTime()) / 1000)
  logger.info(
    `Bills sync complete in ${durationSec}s (started ${runStartedAt.toISOString()}, ended ${runCompletedAt.toISOString()}). Totals: ${JSON.stringify(totals)}.`,
  )
  return totals
}

export const syncBillsTask: TaskConfig<'syncBills'> = {
  slug: 'syncBills',
  outputSchema: [
    { name: 'created', type: 'number', required: true },
    { name: 'updated', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
    { name: 'errored', type: 'number', required: true },
  ],
  retries: 2,
  schedule: [{ cron: '0 * * * *', queue: 'default' }],
  handler: async ({ req, job }) => {
    const totals = await runBillsSync(req.payload, req.payload.logger, String(job.id))
    return { output: totals }
  },
}
