import React from 'react'
import Link from 'next/link'
import './styles.css'

export const metadata = {
  title: 'U.S. House Tracker — what your representatives are working on',
  description:
    'A plain-language look at the bills moving through the U.S. House of Representatives and the members behind them.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div>
              <Link href="/" className="site-title">
                House Tracker
              </Link>
              {/* <div className="site-tagline">What your representatives are working on</div> */}
            </div>
            <nav className="site-nav">
              <Link href="/bills">Bills</Link>
              <Link href="/members">Representatives</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Data from the U.S. Congress. Updated regularly via the official{' '}
          <a href="https://api.congress.gov/" target="_blank" rel="noopener noreferrer">
            Congress.gov API
          </a>
          .
        </footer>
      </body>
    </html>
  )
}
