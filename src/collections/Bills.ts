import type { CollectionConfig, Endpoint } from 'payload'

const syncNowEndpoint: Endpoint = {
  path: '/sync-now',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const job = await req.payload.jobs.queue({
      task: 'syncBills',
      input: {},
      req,
    })
    void req.payload.jobs.run({ queue: 'default' })
    return Response.json({ jobId: job.id })
  },
}

export const Bills: CollectionConfig = {
  slug: 'bills',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'billType', 'billNumber', 'congress', 'latestActionDate', 'sponsor'],
    components: {
      Description: '/admin/SyncBillsButton#SyncBillsButton',
    },
  },
  endpoints: [syncNowEndpoint],
  access: {
    read: () => true,
  },
  indexes: [
    {
      fields: ['congress', 'billType', 'billNumber'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'congress', type: 'number', required: true, index: true },
    {
      name: 'billType',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'House Bill (H.R.)', value: 'hr' },
        { label: 'House Joint Resolution (H.J.Res.)', value: 'hjres' },
        { label: 'House Concurrent Resolution (H.Con.Res.)', value: 'hconres' },
        { label: 'House Resolution (H.Res.)', value: 'hres' },
        { label: 'Senate Bill (S.)', value: 's' },
        { label: 'Senate Joint Resolution (S.J.Res.)', value: 'sjres' },
        { label: 'Senate Concurrent Resolution (S.Con.Res.)', value: 'sconres' },
        { label: 'Senate Resolution (S.Res.)', value: 'sres' },
      ],
    },
    { name: 'billNumber', type: 'number', required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'shortTitle', type: 'text' },
    { name: 'introducedDate', type: 'date', index: true },
    { name: 'policyArea', type: 'text', index: true },
    {
      name: 'subjects',
      type: 'array',
      fields: [{ name: 'name', type: 'text' }],
    },
    {
      name: 'originChamber',
      type: 'select',
      options: [
        { label: 'House', value: 'House' },
        { label: 'Senate', value: 'Senate' },
      ],
    },
    { name: 'latestActionDate', type: 'date', index: true },
    { name: 'latestActionText', type: 'text' },
    {
      name: 'sponsor',
      type: 'relationship',
      relationTo: 'members',
      required: true,
      index: true,
    },
    { name: 'cosponsorsCount', type: 'number', defaultValue: 0 },
    { name: 'actionsCount', type: 'number', defaultValue: 0 },
    { name: 'congressGovUrl', type: 'text' },
    { name: 'updateDate', type: 'date', index: true },
    { name: 'lastSyncedAt', type: 'date' },
  ],
}
