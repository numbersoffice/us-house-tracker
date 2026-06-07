import type { CollectionConfig } from 'payload'

// Internal mutual-exclusion locks for sync tasks. One row per task slug; the
// unique index on `task` is what makes lock acquisition atomic — two concurrent
// runs of the same task race to `create`, the database lets exactly one win and
// rejects the other with a duplicate-key error. Different tasks use different
// keys, so e.g. a members sync and a bills sync can hold their locks side by side.
export const SyncLocks: CollectionConfig = {
  slug: 'sync-locks',
  admin: { hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'task',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'lockedAt', type: 'date', required: true },
    { name: 'jobId', type: 'text' },
  ],
}
