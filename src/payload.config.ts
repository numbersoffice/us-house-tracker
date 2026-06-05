import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Members } from './collections/Members'
import { Bills } from './collections/Bills'
import { SyncState } from './globals/SyncState'
import { syncBillsTask } from './tasks/syncBills'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeDashboard: ['/admin/CongressApiUsage#CongressApiUsage'],
    },
  },
  collections: [Users, Members, Bills],
  globals: [SyncState],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  jobs: {
    tasks: [syncBillsTask],
    autoRun: [{ cron: '* * * * *', queue: 'default' }],
    shouldAutoRun: () => process.env.PAYLOAD_DISABLE_JOBS !== 'true',
    deleteJobOnComplete: true,
  },
  sharp,
  plugins: [],
})
