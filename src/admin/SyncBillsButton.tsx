'use client'

import { Button, toast, useConfig } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

function nextHourBoundary(from: Date): Date {
  const next = new Date(from)
  next.setMinutes(60, 0, 0)
  return next
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

type RunningJob = { taskSlug: string | null }

export const SyncBillsButton: React.FC = () => {
  const { config } = useConfig()
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [nextRun, setNextRun] = useState<Date>(() => nextHourBoundary(new Date()))
  const cancelledRef = useRef(false)

  const checkRunning = useCallback(async () => {
    try {
      const res = await fetch(`${config.routes.api}/globals/sync-state/running-jobs`, {
        credentials: 'include',
      })
      if (!res.ok) return
      const data: { jobs: RunningJob[] } = await res.json()
      if (cancelledRef.current) return
      setSyncing(data.jobs.some((j) => j.taskSlug === 'syncBills'))
    } catch {
      // swallow — disabling the button on a transient network blip would be annoying
    }
  }, [config.routes.api])

  useEffect(() => {
    cancelledRef.current = false
    const tick = () => setNextRun(nextHourBoundary(new Date()))
    const id = setInterval(tick, 30_000)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    void checkRunning()
    const id = setInterval(checkRunning, 10_000)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [checkRunning])

  const handleClick = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${config.routes.api}/bills/sync-now`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      toast.success('Bills sync started')
      setSyncing(true)
      void checkRunning()
    } catch (e) {
      toast.error(`Failed to start sync: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = submitting || syncing
  const label = syncing ? 'Sync in progress…' : submitting ? 'Starting…' : 'Sync bills now'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        alignItems: 'flex-start',
        padding: 'var(--gutter-h, 2rem)',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
      }}
    >
      <small style={{ color: 'var(--theme-elevation-500)', lineHeight: 1.2, margin: 0 }}>
        Next automatic sync at {formatTime(nextRun)}
      </small>
      <Button
        buttonStyle="secondary"
        size="small"
        onClick={handleClick}
        disabled={disabled}
        margin={false}
      >
        {label}
      </Button>
    </div>
  )
}
