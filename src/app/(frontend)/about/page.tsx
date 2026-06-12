import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 900 // 15 minutes

export const metadata = {
  title: 'About — U.S. House Tracker',
  description: 'About this site: how it works, where the data comes from, and how to use it.',
}

export default function AboutPage() {
  return (
    <article className="prose">
      <Breadcrumbs items={[{ label: 'About' }]} />
      <header className="page-header">
        <p className="eyebrow">Our mission</p>
        <h1>About House Tracker</h1>
        <p className="lede">A plain-language window into the U.S. House of Representatives.</p>
      </header>

      <h2>What this is</h2>
      <p>
        House Tracker follows every bill in the U.S. House and the members behind them. Each bill
        page shows who introduced it, the latest action taken on it, and a readable summary. Each
        member page lists the bills they have sponsored, newest first. No commentary, no scores, no
        spin.
      </p>

      <h2>
        Why not just use{' '}
        <a href="https://congress.gov/" target="_blank" rel="noopener noreferrer">
          congress.gov
        </a>
        ?
      </h2>
      <p>
        You can, and everything here comes from there. But the official site is built for
        completeness, which makes it a lot to wade through. House Tracker is built for one thing:
        making it easy to follow the work of your own representative.
      </p>

      <h2>Why we built it</h2>
      <p>
        It is hard to hold representatives accountable when their work is buried in procedural
        language. We think checking in on Congress should be about as easy as reading the news, so
        we built the site we wanted to use ourselves.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        All legislative data comes from the official{' '}
        <a href="https://api.congress.gov/" target="_blank" rel="noopener noreferrer">
          Congress.gov API
        </a>
        , maintained by the Library of Congress, and is refreshed once an hour. Member photos come
        from the Bioguide, the official biographical directory of Congress.
      </p>

      <h2>Who made this</h2>
      <p>
        House Tracker is an open-source project by{' '}
        <a href="https://github.com/numbersoffice/" target="_blank" rel="noopener noreferrer">
          Numbers Office
        </a>
        , a small group building software focused on community, privacy, and positive impact. The
        site takes no position on any bill; party labels are shown as facts, nothing more.
      </p>

      <h2>Contact</h2>
      <p>
        Spotted a bug, a data error, or have an idea? Open an issue on GitHub or reach out. We read
        everything.
      </p>
    </article>
  )
}
