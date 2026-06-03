const BASE_URL = 'https://api.congress.gov/v3'
const MIN_INTERVAL_MS = 350

let lastRequestAt = 0

async function throttle() {
  const since = Date.now() - lastRequestAt
  if (since < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - since))
  }
  lastRequestAt = Date.now()
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('format', 'json')
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  return url
}

export async function congressGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const apiKey = process.env.CONGRESS_API_KEY
  if (!apiKey) throw new Error('CONGRESS_API_KEY is not set')

  const url = buildUrl(path, query)
  const maxRetries = 3

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await throttle()
    const res = await fetch(url, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
    })

    if (res.ok) return (await res.json()) as T

    const retriable = res.status === 429 || res.status >= 500
    if (!retriable || attempt === maxRetries) {
      const body = await res.text().catch(() => '')
      throw new Error(`Congress API ${res.status} for ${url.pathname}: ${body.slice(0, 200)}`)
    }

    const backoff = 1000 * 2 ** attempt
    await new Promise((r) => setTimeout(r, backoff))
  }

  throw new Error('unreachable')
}

type PaginatedResponse = {
  pagination?: { next?: string; count?: number }
}

export async function* paginate<TItem, TResponse extends PaginatedResponse>(
  path: string,
  query: Record<string, string | number | undefined>,
  extract: (response: TResponse) => TItem[],
): AsyncGenerator<TItem, void, void> {
  let offset = 0
  const limit = Number(query.limit ?? 250)

  while (true) {
    const response = await congressGet<TResponse>(path, { ...query, limit, offset })
    const items = extract(response)
    for (const item of items) yield item

    if (!response.pagination?.next || items.length === 0) break
    offset += limit
  }
}
