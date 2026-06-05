'use client'

import { useConfig } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

type Usage = {
  used: number
  limit: number
  oldestInWindow: string | null
}

function barColor(pct: number): string {
  if (pct >= 90) return 'var(--theme-error-500)'
  if (pct >= 75) return 'var(--theme-warning-500)'
  return 'var(--theme-success-500)'
}

export const CongressApiUsage: React.FC = () => {
  const { config } = useConfig()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const cancelledRef = useRef(false)

  const fetchUsage = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${config.routes.api}/globals/sync-state/congress-usage`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data: Usage = await res.json()
      if (!cancelledRef.current) {
        setUsage(data)
        setError(null)
      }
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      if (!cancelledRef.current) {
        setRefreshing(false)
      }
    }
  }, [config.routes.api])

  useEffect(() => {
    cancelledRef.current = false
    void fetchUsage()
    const id = setInterval(fetchUsage, 30_000)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [fetchUsage])

  const pct = usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <strong style={{ fontSize: '0.95rem' }}>Congress.gov API usage</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {usage && (
            <span style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-500)' }}>
              {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} in the last hour
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchUsage()}
            disabled={refreshing}
            aria-label="Refresh usage"
            title="Refresh"
            style={{
              background: 'transparent',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: '4px',
              padding: '0.15rem 0.4rem',
              cursor: refreshing ? 'default' : 'pointer',
              color: 'var(--theme-elevation-500)',
              fontSize: '0.85rem',
              lineHeight: 1,
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                transition: 'transform 0.6s ease',
                transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
              }}
            >
              ↻
            </span>
          </button>
        </div>
      </div>
      <div
        style={{
          height: '8px',
          width: '100%',
          background: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor(pct),
            transition: 'width 0.4s ease, background 0.4s ease',
          }}
        />
      </div>
      {error && (
        <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--theme-error-500)' }}>
          Could not load usage: {error}
        </small>
      )}
    </div>
  )
}
