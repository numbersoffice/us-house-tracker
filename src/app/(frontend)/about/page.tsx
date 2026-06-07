import Link from 'next/link'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const revalidate = 900 // 15 minutes

export const metadata = {
  title: 'About — U.S. House Tracker',
  description: 'About this site: how it works, where the data comes from, and how to use it.',
}

export default function AboutPage() {
  return (
    <article>
      <Breadcrumbs items={[{ label: 'About' }]} />
      <h1>About House Tracker</h1>
      <p className="muted">A plain-language window into the U.S. House of Representatives.</p>

      <h2>What this is</h2>
      <p>
        House Tracker follows the bills moving through the U.S. House of Representatives and the
        members behind them. It is built for people who want to know what their representatives are
        working on without wading through procedural jargon.
      </p>
      <p>
        Every bill page shows who introduced it, the most recent action taken on it, and a readable
        summary of its current status. Every member page lists the bills they have sponsored, most
        recent first.
      </p>

      <h2>
        Why not go to{' '}
        <a href="https://congress.gov/" target="_blank" rel="noopener noreferrer">
          congress.gov
        </a>{' '}
        directly?
      </h2>
      <p>
        The official site of congress is a great source of valuable data. It's what this site is
        based on. But while the official site contains all important data, it can be a bit
        overwhelming. This site is built for the sole purpose of making it as easy as possible to
        follow the work of your own representative.
      </p>

      <h2>Why this matters</h2>
      <p>
        Representative democracy rests on a simple bargain: we send people to Washington to act on
        our behalf, and in return we get to see what they do there. Trust is not given once at the
        ballot box and then forgotten — it is earned, or lost, in the daily work of legislating.
      </p>
      <p>
        That trust depends on transparency. When the work of Congress is visible — the bills
        introduced, the votes cast, the priorities pursued — constituents can hold their
        representatives accountable, recognize good work, and push back when something is off. When
        that work is hidden behind procedural language or scattered across hard-to-navigate systems,
        accountability quietly erodes.
      </p>
      <p>
        House Tracker exists to make the daily work of the House legible to the people it is meant
        to serve. Not as advocacy, and not as commentary — just as a clear view of what your
        representatives are actually doing.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        All legislative data is sourced from the official{' '}
        <a href="https://api.congress.gov/" target="_blank" rel="noopener noreferrer">
          Congress.gov API
        </a>
        , maintained by the Library of Congress. Bill text, sponsor information, and action
        histories are updated once an hour from that source.
      </p>
      <p>
        Member photographs are provided by the Bioguide, the official biographical directory of the
        United States Congress.
      </p>

      <h2>Who made this</h2>
      <p>
        House Tracker was built by{' '}
        <a href="https://github.com/numbersoffice/" target="_blank" rel="noopener noreferrer">
          Numbers Office
        </a>
        , a small group that builds open-source software focused on community, privacy, and positive
        impact. This project is open source — you can read the code, file issues, or contribute on
        GitHub.
      </p>

      <h2>A note on neutrality</h2>
      <p>
        This site does not take positions on legislation. Bills are presented as they are recorded
        in the public record; party labels are shown only as factual identifiers attached to each
        member.
      </p>

      <h2>Contact</h2>
      <p>
        Found a bug, a mistake in the data, or have a suggestion? Reach out and let us know —
        feedback is welcome.
      </p>
    </article>
  )
}
