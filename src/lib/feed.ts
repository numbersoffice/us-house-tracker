import { formatBillId, formatDate } from './format'

/** Resolve the public base URL used for absolute links in the feed. */
export function resolveBaseUrl(requestUrl: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SERVER_URL ?? process.env.PAYLOAD_PUBLIC_SERVER_URL ?? null
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return new URL(requestUrl).origin
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

/** Escape the characters that are special inside HTML text/attributes. */
function escapeHtml(value: string): string {
  return value.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

/** Wrap HTML content in a CDATA section, splitting any literal "]]>" sequences. */
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/** Format a date as an RFC-822 string (required by RSS pubDate/lastBuildDate). */
function toRfc822(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toUTCString()
}

export type FeedBill = {
  slug: string
  title: string
  billType: string
  billNumber: number
  introducedDate?: string | null
  latestActionDate?: string | null
  /** CRS summary HTML, or null/empty when one has not been published yet. */
  summary?: string | null
  /** Link to the full bill text on congress.gov. */
  congressGovUrl?: string | null
}

/** Shown when a bill has no published CRS summary yet. */
const SUMMARY_PLACEHOLDER =
  'No summary yet. The Congressional Research Service usually publishes one a little while after a bill is introduced — check back soon.'

export type FeedMember = {
  fullName: string
  slug: string
}

/** Build an RSS 2.0 document for a representative's sponsored bills. */
export function buildMemberFeed(member: FeedMember, bills: FeedBill[], baseUrl: string): string {
  const memberUrl = `${baseUrl}/members/${member.slug}`
  const selfUrl = `${memberUrl}/feed.xml`
  const channelTitle = `Bills sponsored by ${member.fullName}`
  const channelDescription = `Bills sponsored by ${member.fullName} in the 119th Congress, tracked by the U.S. House Tracker.`

  const lastBuildDate =
    toRfc822(bills[0]?.latestActionDate ?? bills[0]?.introducedDate) ?? new Date().toUTCString()

  const items = bills
    .map((bill) => {
      const billUrl = `${baseUrl}/bills/${bill.slug}`
      const billId = formatBillId(bill.billType, bill.billNumber)
      const introduced = formatDate(bill.introducedDate)

      const headerBits = [billId]
      if (introduced) headerBits.push(`Introduced ${introduced}`)

      // The summary is HTML, so the description is assembled as HTML and emitted
      // inside a CDATA section (see cdata) rather than entity-escaped.
      const descriptionParts = [`<p>${escapeHtml(headerBits.join(' · '))}</p>`]
      const summary = bill.summary?.trim()
      descriptionParts.push(summary ? summary : `<p>${escapeHtml(SUMMARY_PLACEHOLDER)}</p>`)
      if (bill.congressGovUrl) {
        descriptionParts.push(
          `<p><a href="${escapeHtml(bill.congressGovUrl)}">Read the full bill on congress.gov →</a></p>`,
        )
      }
      const description = descriptionParts.join('')
      const pubDate = toRfc822(bill.introducedDate ?? bill.latestActionDate)

      return [
        '    <item>',
        `      <title>${escapeXml(bill.title)}</title>`,
        `      <link>${escapeXml(billUrl)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(billUrl)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        `      <description>${cdata(description)}</description>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(memberUrl)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
}
