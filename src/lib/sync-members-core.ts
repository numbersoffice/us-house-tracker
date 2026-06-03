import type { getPayload } from 'payload'
import { congressGet } from './congress-api'
import { formatState, normalizeParty, stateNameToCode } from './format'

export type ChamberValue = 'House' | 'Senate'

export type MemberListItem = {
  bioguideId: string
  name: string
  partyName?: string
  state?: string
  district?: number
  updateDate?: string
  url?: string
  terms?: {
    item?: Array<{ chamber?: string; memberType?: string; startYear?: number; endYear?: number }>
  }
}

export type MemberListResponse = {
  members: MemberListItem[]
  pagination?: { next?: string; count?: number }
}

type TermItem = {
  congress: number
  chamber: string
  startYear: number
  endYear?: number
  party?: string
  partyName?: string
  stateCode?: string
  stateName?: string
  district?: number
  memberType?: string
}

type MemberDetailResponse = {
  member: {
    bioguideId: string
    firstName?: string
    lastName?: string
    lastname?: string
    directOrderName?: string
    invertedOrderName?: string
    honorificName?: string
    partyHistory?: Array<{ partyName: string; startYear: number }>
    state?: string
    district?: number
    birthYear?: string | number
    depiction?: { imageUrl?: string; attribution?: string }
    officialWebsiteUrl?: string
    terms?: TermItem[] | { item: TermItem[] }
    updateDate?: string
    currentMember?: boolean
  }
}

function chamberFromString(raw?: string | null): ChamberValue {
  return raw && raw.toLowerCase().includes('senate') ? 'Senate' : 'House'
}

function slugify(lastName: string | undefined, bioguideId: string): string {
  const base = (lastName ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base ? `${base}-${bioguideId.toLowerCase()}` : bioguideId.toLowerCase()
}

function resolveStateCodeAndName(input?: string | null, fallbackName?: string | null) {
  if (!input && !fallbackName) return { code: null, name: null }
  const raw = (input ?? '').trim()
  if (raw.length === 2) {
    return { code: raw.toUpperCase(), name: formatState(raw) }
  }
  const code = stateNameToCode(raw || fallbackName || '')
  return { code, name: raw || fallbackName || null }
}

export function isHouseMember(item: MemberListItem): boolean {
  const terms = item.terms?.item ?? []
  return terms.some(
    (t) => t.chamber?.includes('House') || t.memberType === 'Representative',
  )
}

export async function syncMember(
  payload: Awaited<ReturnType<typeof getPayload>>,
  bioguideId: string,
  currentMember: boolean,
): Promise<'created' | 'updated' | 'skipped'> {
  const detail = await congressGet<MemberDetailResponse>(`/member/${bioguideId}`)
  const m = detail.member

  const terms: TermItem[] = Array.isArray(m.terms) ? m.terms : (m.terms?.item ?? [])
  const latestTerm = terms[terms.length - 1]
  const chamber: ChamberValue =
    latestTerm?.memberType === 'Senator' ? 'Senate' : chamberFromString(latestTerm?.chamber)
  const lastName = m.lastName ?? m.lastname ?? ''

  const partyRaw =
    m.partyHistory?.[m.partyHistory.length - 1]?.partyName ??
    latestTerm?.partyName ??
    latestTerm?.party
  const party = normalizeParty(partyRaw)
  if (!party) {
    console.warn(`  ! unknown party "${partyRaw}" for ${m.bioguideId} — defaulting to Independent`)
  }

  const stateInput = m.state ?? latestTerm?.stateCode ?? latestTerm?.stateName ?? null
  const { code: stateCode, name: stateName } = resolveStateCodeAndName(stateInput, latestTerm?.stateName)

  const district = m.district ?? latestTerm?.district ?? null

  const fullName =
    m.directOrderName ?? m.invertedOrderName ?? `${m.firstName ?? ''} ${lastName}`.trim()
  const slug = slugify(lastName, m.bioguideId)

  const birthYearNum = m.birthYear ? Number(m.birthYear) : null

  const data = {
    bioguideId: m.bioguideId,
    slug,
    firstName: m.firstName ?? null,
    lastName: lastName || null,
    fullName,
    honorificName: m.honorificName ?? null,
    party: (party ?? 'Independent') as 'Democrat' | 'Republican' | 'Independent',
    state: stateCode,
    stateName,
    district,
    chamber,
    currentMember,
    birthYear: birthYearNum,
    imageUrl: m.depiction?.imageUrl ?? null,
    imageAttribution: m.depiction?.attribution ?? null,
    officialWebsiteUrl: m.officialWebsiteUrl ?? null,
    congressGovUrl: `https://www.congress.gov/member/${slug}`,
    terms: terms.map((t) => ({
      congress: t.congress,
      chamber: (t.memberType === 'Senator' ? 'Senate' : chamberFromString(t.chamber)) as ChamberValue,
      startYear: t.startYear,
      endYear: t.endYear ?? null,
      party: t.partyName ?? t.party ?? null,
      state: t.stateCode ?? null,
      district: t.district ?? null,
    })),
    updateDate: m.updateDate ?? null,
    lastSyncedAt: new Date().toISOString(),
  }

  const existing = await payload.find({
    collection: 'members',
    where: { bioguideId: { equals: m.bioguideId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.docs.length === 0) {
    await payload.create({ collection: 'members', data, overrideAccess: true })
    return 'created'
  }

  const stored = existing.docs[0]
  if (
    stored.updateDate &&
    data.updateDate &&
    stored.updateDate === data.updateDate &&
    stored.currentMember === currentMember
  ) {
    return 'skipped'
  }
  await payload.update({ collection: 'members', id: stored.id, data, overrideAccess: true })
  return 'updated'
}
