'use client'

import { useConfig } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

type Usage = {
  used: number
  limit: number
  oldestInWindow: string | null
}

type RunningJob = {
  id: string
  taskSlug: string | null
  queue: string | null
  createdAt: string | null
  totalTried: number
}

function barColor(pct: number): string {
  if (pct >= 90) return 'var(--theme-error-500)'
  if (pct >= 75) return 'var(--theme-warning-500)'
  return 'var(--theme-success-500)'
}

function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const CongressApiUsage: React.FC = () => {
  const { config } = useConfig()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [jobs, setJobs] = useState<RunningJob[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set())
  const cancelledRef = useRef(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [usageRes, jobsRes] = await Promise.all([
        fetch(`${config.routes.api}/globals/sync-state/congress-usage`, {
          credentials: 'include',
        }),
        fetch(`${config.routes.api}/globals/sync-state/running-jobs`, {
          credentials: 'include',
        }),
      ])
      if (!usageRes.ok) throw new Error(`usage: HTTP ${usageRes.status}`)
      if (!jobsRes.ok) throw new Error(`jobs: HTTP ${jobsRes.status}`)
      const usageData: Usage = await usageRes.json()
      const jobsData: { jobs: RunningJob[] } = await jobsRes.json()
      if (!cancelledRef.current) {
        setUsage(usageData)
        setJobs(jobsData.jobs)
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
    void refreshAll()
    const id = setInterval(refreshAll, 30_000)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [refreshAll])

  const stopJob = useCallback(
    async (id: string) => {
      if (!window.confirm('Stop this job? In-flight Congress API calls will finish first.')) {
        return
      }
      setStoppingIds((prev) => new Set(prev).add(id))
      setJobs((prev) => (prev ? prev.filter((j) => j.id !== id) : prev))
      try {
        const res = await fetch(`${config.routes.api}/globals/sync-state/cancel-job`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
      } catch (e) {
        setError(`Failed to stop job ${id}: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setStoppingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        void refreshAll()
      }
    },
    [config.routes.api, refreshAll],
  )

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
            onClick={() => void refreshAll()}
            disabled={refreshing}
            aria-label="Refresh"
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

      {jobs && jobs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--theme-elevation-500)',
              marginBottom: '0.4rem',
            }}
          >
            Running jobs
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {jobs.map((job) => {
              const stopping = stoppingIds.has(job.id)
              return (
                <li
                  key={job.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.4rem 0',
                    borderTop: '1px solid var(--theme-elevation-100)',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                      {job.taskSlug ?? '(unknown task)'}
                      {job.totalTried > 1 && (
                        <span
                          style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--theme-warning-500)',
                          }}
                        >
                          retry #{job.totalTried}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500)' }}>
                      {/* {job.queue ? `queue: ${job.queue}` : 'queue: default'} */}
                      {job.createdAt && `started ${formatDateTime(job.createdAt)}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void stopJob(job.id)}
                    disabled={stopping}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--theme-error-500)',
                      color: 'var(--theme-error-500)',
                      borderRadius: '4px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.8rem',
                      cursor: stopping ? 'default' : 'pointer',
                      opacity: stopping ? 0.5 : 1,
                    }}
                  >
                    {stopping ? 'Stopping…' : 'Stop'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && (
        <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--theme-error-500)' }}>
          {error}
        </small>
      )}
    </div>
  )
}
