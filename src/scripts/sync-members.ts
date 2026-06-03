import { getPayload } from 'payload'
import config from '@payload-config'

import { paginate } from '../lib/congress-api'
import { isHouseMember, syncMember, type MemberListItem, type MemberListResponse } from '../lib/sync-members-core'

const CONGRESS = 119

console.log('Booting Payload…')
const resolvedConfig = await config
const payload = await getPayload({ config: resolvedConfig })
console.log(`Syncing ${CONGRESS}th Congress House members…`)

const counts = { created: 0, updated: 0, skipped: 0, errored: 0 }
let i = 0
let skippedNonHouse = 0

for await (const item of paginate<MemberListItem, MemberListResponse>(
  `/member/congress/${CONGRESS}`,
  { limit: 250 },
  (r) => r.members ?? [],
)) {
  if (!isHouseMember(item)) {
    skippedNonHouse++
    continue
  }
  i++
  try {
    const result = await syncMember(payload, item.bioguideId, true)
    counts[result]++
    if (i % 25 === 0) {
      console.log(
        `  ${i} processed (created=${counts.created}, updated=${counts.updated}, skipped=${counts.skipped})`,
      )
    }
  } catch (e) {
    counts.errored++
    console.error(`  ! error syncing ${item.bioguideId}:`, e instanceof Error ? e.message : e)
  }
}

console.log(`Done. Processed ${i} House members (skipped ${skippedNonHouse} non-House). ${JSON.stringify(counts)}`)
