import React from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { Flag } from '@/components/Flag'
import './styles.css'

const archivo = localFont({
  src: '../../fonts/archivo-latin-variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-archivo',
})

export const metadata = {
  title: 'U.S. House Tracker — what your representatives are working on',
  description:
    'A plain-language look at the bills moving through the U.S. House of Representatives and the members behind them.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="site-title">
              <Flag />
              U.S. House Tracker
            </Link>
            <nav className="site-nav">
              <Link href="/bills">Bills</Link>
              <Link href="/members">Representatives</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <span className="site-footer-stars" aria-hidden="true">
            ★ ★ ★
          </span>
          Data from the U.S. Congress. Updated once an hour via the official{' '}
          <a href="https://api.congress.gov/" target="_blank" rel="noopener noreferrer">
            Congress.gov API
          </a>
          .
        </footer>
      </body>
    </html>
  )
}
