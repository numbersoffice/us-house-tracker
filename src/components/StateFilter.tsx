'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { STATE_NAMES } from '@/lib/format'
import styles from './StateFilter.module.css'

type Props = {
  value: string
}

export function StateFilter({ value }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className={styles.filter}>
      <label htmlFor="state-filter">State:</label>
      <select
        id="state-filter"
        name="state"
        defaultValue={value}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value
          startTransition(() => {
            router.push(next ? `/members/state/${next}` : '/members')
          })
        }}
      >
        <option value="">All states</option>
        {Object.entries(STATE_NAMES)
          .sort(([, a], [, b]) => a.localeCompare(b))
          .map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
      </select>
    </div>
  )
}
