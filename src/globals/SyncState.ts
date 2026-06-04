import type { GlobalConfig } from 'payload'

export const SyncState: GlobalConfig = {
  slug: 'sync-state',
  admin: {
    description:
      'Watermarks for incremental syncs against the Congress.gov API. Clear a field to force a full re-sync on the next run.',
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'lastBillsSyncStartedAt',
      type: 'date',
      admin: {
        description:
          'Start time of the most recent successful bills sync. Used as the lower bound (minus a 1h overlap buffer) for the next run’s Congress API `fromDateTime` filter.',
      },
    },
  ],
}
