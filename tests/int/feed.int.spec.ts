import { describe, it, expect } from 'vitest'
import { buildMemberFeed, resolveBaseUrl, type FeedBill } from '@/lib/feed'

const member = { fullName: 'Jane Q. Representative', slug: 'jane-q-representative' }
const baseUrl = 'https://example.com'

const bills: FeedBill[] = [
  {
    slug: '119-hr-1',
    title: 'A Bill to Improve Things <& More>',
    billType: 'hr',
    billNumber: 1,
    introducedDate: '2026-01-15',
    latestActionDate: '2026-02-01',
    summary: '<p>This bill improves <strong>things</strong>.</p>',
    congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/1',
  },
  {
    slug: '119-hjres-7',
    title: 'Joint Resolution Seven',
    billType: 'hjres',
    billNumber: 7,
    introducedDate: '2026-03-02',
    latestActionDate: '2026-03-10',
    summary: null,
    congressGovUrl: null,
  },
]

describe('resolveBaseUrl', () => {
  it('falls back to the request origin when no env override is set', () => {
    delete process.env.NEXT_PUBLIC_SERVER_URL
    delete process.env.PAYLOAD_PUBLIC_SERVER_URL
    expect(resolveBaseUrl('https://host.test/members/x/feed.xml')).toBe('https://host.test')
  })
})

describe('buildMemberFeed', () => {
  const xml = buildMemberFeed(member, bills, baseUrl)

  it('produces a well-formed RSS channel for the representative', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<title>Bills sponsored by Jane Q. Representative</title>')
    expect(xml).toContain(`<link>${baseUrl}/members/${member.slug}</link>`)
    expect(xml).toContain(
      `<atom:link href="${baseUrl}/members/${member.slug}/feed.xml" rel="self" type="application/rss+xml" />`,
    )
  })

  it('emits an item per sponsored bill with absolute permalinks', () => {
    expect((xml.match(/<item>/g) ?? []).length).toBe(2)
    expect(xml).toContain(`<link>${baseUrl}/bills/119-hr-1</link>`)
    expect(xml).toContain(`<guid isPermaLink="true">${baseUrl}/bills/119-hjres-7</guid>`)
  })

  it('escapes XML-special characters in titles', () => {
    expect(xml).toContain('A Bill to Improve Things &lt;&amp; More&gt;')
    expect(xml).not.toContain('Things <& More>')
  })

  it('formats pubDate as an RFC-822 string', () => {
    expect(xml).toContain('<pubDate>Thu, 15 Jan 2026 00:00:00 GMT</pubDate>')
  })

  it('includes the bill summary instead of the latest action', () => {
    expect(xml).toContain('This bill improves <strong>things</strong>.')
    expect(xml).not.toContain('Referred to the Committee on Rules.')
  })

  it('shows a placeholder when a bill has no summary yet', () => {
    expect(xml).toContain('No summary yet.')
  })

  it('links to the full bill text when available', () => {
    expect(xml).toContain(
      '<a href="https://www.congress.gov/bill/119th-congress/house-bill/1">Read the full bill on congress.gov →</a>',
    )
  })
})
