'use client'

import { Button, toast, useConfig } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

function nextHourBoundary(from: Date): Date {
  const next = new Date(from)
  next.setMinutes(60, 0, 0)
  return next
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const SyncBillsButton: React.FC = () => {
  const { config } = useConfig()
  const [loading, setLoading] = useState(false)
  const [nextRun, setNextRun] = useState<Date>(() => nextHourBoundary(new Date()))

  useEffect(() => {
    const tick = () => setNextRun(nextHourBoundary(new Date()))
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${config.routes.api}/bills/sync-now`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      toast.success('Bills sync started')
    } catch (e) {
      toast.error(`Failed to start sync: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
      <small style={{ color: 'var(--theme-elevation-500)' }}>
        Next automatic sync at {formatTime(nextRun)}
      </small>
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Syncing…' : 'Sync bills now'}
      </Button>
    </div>
  )
}
