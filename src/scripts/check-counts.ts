import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config: await config })
const members = await payload.count({ collection: 'members' })
const bills = await payload.count({ collection: 'bills' })
console.log(`DATABASE_URL = ${process.env.DATABASE_URL}`)
console.log(`Members: ${members.totalDocs}`)
console.log(`Bills: ${bills.totalDocs}`)
