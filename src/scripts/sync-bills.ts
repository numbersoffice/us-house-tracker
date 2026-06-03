import { getPayload } from 'payload'
import config from '@payload-config'

import { congressGet, paginate } from '../lib/congress-api'
import { syncMember } from '../lib/sync-members-core'

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
    latestAction?: { actionDate?: string; text?: string }
    legislationUrl?: string
    updateDate?: string
  }
}

type ChamberValue = 'House' | 'Senate'

function chamberFromString(raw?: string | null): ChamberValue | null {
  if (!raw) return null
  return raw.toLowerCase().includes('senate') ? 'Senate' : 'House'
}

function makeSlug(congress: number, billType: string, billNumber: number): string {
  return `${congress}-${billType.toLowerCase()}-${billNumber}`
}

async function findSponsorId(
  payload: Awaited<ReturnType<typeof getPayload>>,
  bioguideId: string,
): Promise<string | null> {
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
  payload: Awaited<ReturnType<typeof getPayload>>,
  bioguideId: string,
): Promise<string | null> {
  let id = await findSponsorId(payload, bioguideId)
  if (id) return id

  console.warn(`  ! sponsor ${bioguideId} not in DB; fetching on the fly`)
  try {
    await syncMember(payload, bioguideId, true)
    id = await findSponsorId(payload, bioguideId)
  } catch (e) {
    console.error(`  ! failed to sync missing sponsor ${bioguideId}:`, e instanceof Error ? e.message : e)
  }
  return id
}

async function syncBill(
  payload: Awaited<ReturnType<typeof getPayload>>,
  billType: BillType,
  billNumber: number,
  listUpdateDate: string | undefined,
): Promise<'created' | 'updated' | 'skipped' | 'errored'> {
  const slug = makeSlug(CONGRESS, billType, billNumber)

  // Check existing first — possible early-exit on incremental sync
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

  const detail = await congressGet<BillDetailResponse>(`/bill/${CONGRESS}/${billType}/${billNumber}`)
  const b = detail.bill

  const sponsorBioguide = b.sponsors?.[0]?.bioguideId
  if (!sponsorBioguide) {
    console.warn(`  ! ${slug} has no sponsor; skipping`)
    return 'errored'
  }

  const sponsorId = await ensureSponsor(payload, sponsorBioguide)
  if (!sponsorId) {
    console.warn(`  ! ${slug}: could not resolve sponsor ${sponsorBioguide}; skipping`)
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

console.log('Booting Payload…')
const resolvedConfig = await config
const payload = await getPayload({ config: resolvedConfig })

const totals = { created: 0, updated: 0, skipped: 0, errored: 0 }

for (const billType of BILL_TYPES) {
  console.log(`\nSyncing /bill/${CONGRESS}/${billType} …`)
  const perType = { created: 0, updated: 0, skipped: 0, errored: 0 }
  let i = 0

  for await (const item of paginate<BillListItem, BillListResponse>(
    `/bill/${CONGRESS}/${billType}`,
    { limit: 250, sort: 'updateDate+desc' },
    (r) => r.bills ?? [],
  )) {
    i++
    const billNumber = Number(item.number)
    if (!billNumber) continue

    try {
      const result = await syncBill(payload, billType, billNumber, item.updateDate)
      perType[result]++
      if (i % 50 === 0) {
        console.log(
          `  ${i} processed (created=${perType.created}, updated=${perType.updated}, skipped=${perType.skipped}, errored=${perType.errored})`,
        )
      }
    } catch (e) {
      perType.errored++
      console.error(`  ! error on ${billType} ${billNumber}:`, e instanceof Error ? e.message : e)
    }
  }

  console.log(`  ${billType} done: ${JSON.stringify(perType)}`)
  totals.created += perType.created
  totals.updated += perType.updated
  totals.skipped += perType.skipped
  totals.errored += perType.errored
}

console.log(`\nAll done. Totals: ${JSON.stringify(totals)}`)
