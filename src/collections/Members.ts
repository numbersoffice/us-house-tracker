import type { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'members',
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'party', 'state', 'district', 'chamber', 'currentMember'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'bioguideId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'firstName', type: 'text' },
    { name: 'lastName', type: 'text' },
    { name: 'fullName', type: 'text', required: true },
    { name: 'honorificName', type: 'text' },
    {
      name: 'party',
      type: 'select',
      options: [
        { label: 'Democrat', value: 'Democrat' },
        { label: 'Republican', value: 'Republican' },
        { label: 'Independent', value: 'Independent' },
      ],
      index: true,
    },
    { name: 'state', type: 'text', index: true },
    { name: 'stateName', type: 'text' },
    { name: 'district', type: 'number' },
    {
      name: 'chamber',
      type: 'select',
      options: [
        { label: 'House', value: 'House' },
        { label: 'Senate', value: 'Senate' },
      ],
      index: true,
    },
    { name: 'currentMember', type: 'checkbox', index: true, defaultValue: false },
    { name: 'birthYear', type: 'number' },
    { name: 'imageUrl', type: 'text' },
    { name: 'imageAttribution', type: 'text' },
    { name: 'officialWebsiteUrl', type: 'text' },
    { name: 'congressGovUrl', type: 'text' },
    {
      name: 'terms',
      type: 'array',
      fields: [
        { name: 'congress', type: 'number' },
        {
          name: 'chamber',
          type: 'select',
          options: [
            { label: 'House', value: 'House' },
            { label: 'Senate', value: 'Senate' },
          ],
        },
        { name: 'startYear', type: 'number' },
        { name: 'endYear', type: 'number' },
        { name: 'party', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'district', type: 'number' },
      ],
    },
    { name: 'updateDate', type: 'date' },
    { name: 'lastSyncedAt', type: 'date' },
  ],
}
