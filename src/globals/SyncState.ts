import type { Endpoint, GlobalConfig } from 'payload'

export const CONGRESS_API_HOURLY_LIMIT = 5000
export const CONGRESS_API_WINDOW_MS = 60 * 60 * 1000

type Bucket = { startedAt?: string | null; count?: number | null }

function countFreshRequests(buckets: Bucket[], now: number) {
  const cutoff = now - CONGRESS_API_WINDOW_MS
  const fresh = buckets.filter((b) => {
    const t = b.startedAt ? Date.parse(b.startedAt) : NaN
    return Number.isFinite(t) && t > cutoff
  })
  const used = fresh.reduce((sum, b) => sum + (b.count ?? 0), 0)
  const oldestInWindow = fresh[0]?.startedAt ?? null
  return { used, oldestInWindow }
}

const congressUsageEndpoint: Endpoint = {
  path: '/congress-usage',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const state = await req.payload.findGlobal({ slug: 'sync-state', overrideAccess: true })
    const buckets = (state.congressApiBuckets ?? []) as Bucket[]
    const { used, oldestInWindow } = countFreshRequests(buckets, Date.now())
    return Response.json({
      used,
      limit: CONGRESS_API_HOURLY_LIMIT,
      oldestInWindow,
    })
  },
}

const runningJobsEndpoint: Endpoint = {
  path: '/running-jobs',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await req.payload.find({
      collection: 'payload-jobs',
      where: { processing: { equals: true } },
      sort: '-createdAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })
    const jobs = result.docs.map((job) => ({
      id: String(job.id),
      taskSlug: job.taskSlug ?? null,
      queue: job.queue ?? null,
      createdAt: job.createdAt ?? null,
      totalTried: job.totalTried ?? 0,
    }))
    return Response.json({ jobs })
  },
}

const cancelJobEndpoint: Endpoint = {
  path: '/cancel-job',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let body: unknown = null
    try {
      body = typeof req.json === 'function' ? await req.json() : null
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const id =
      body && typeof body === 'object' && 'id' in body ? (body as { id: unknown }).id : null
    if (typeof id !== 'string' || id.length === 0) {
      return Response.json({ error: 'Missing or invalid `id`' }, { status: 400 })
    }
    try {
      await req.payload.jobs.cancelByID({ id, req })
      return Response.json({ ok: true })
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Failed to cancel job' },
        { status: 400 },
      )
    }
  },
}

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
  endpoints: [congressUsageEndpoint, runningJobsEndpoint, cancelJobEndpoint],
  fields: [
    {
      name: 'lastBillsSyncStartedAt',
      type: 'date',
      admin: {
        description:
          'Start time of the most recent successful bills sync. The next run reads from this time minus a 1h buffer (`fromDateTime`). Anchoring on the run’s start means records updated while a long run was in flight are still re-fetched next time. A failed run leaves this untouched, so the next run safely resumes from the last good start. Clear it to force a full re-sync.',
      },
    },
    {
      name: 'lastMembersSyncStartedAt',
      type: 'date',
      admin: {
        description:
          'Start time of the most recent successful members sync. The next run reads from this time minus a 1h buffer (`fromDateTime`). Anchoring on the run’s start means records updated while a long run was in flight are still re-fetched next time. A failed run leaves this untouched, so the next run safely resumes from the last good start. Clear it to force a full re-sync.',
      },
    },
    {
      name: 'congressApiBuckets',
      type: 'array',
      admin: {
        initCollapsed: true,
        description:
          'Per-minute request counts against the Congress.gov API. The hourly limiter prunes entries older than 1 hour and rejects new requests once the rolling sum reaches the cap.',
        readOnly: true,
      },
      fields: [
        { name: 'startedAt', type: 'date', required: true },
        { name: 'count', type: 'number', required: true, defaultValue: 0 },
      ],
    },
  ],
}
