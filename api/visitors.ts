const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export async function GET() {
  const url = environment.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = environment.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return Response.json({ error: 'counter_not_configured' }, { status: 503 })

  try {
    const response = await fetch(`${url}/incr/portfolio:visitor-count`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const result = await response.json() as { result?: number; error?: string }
    if (!response.ok || typeof result.result !== 'number') throw new Error(result.error || 'Counter request failed')
    return Response.json({ count: result.result }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch {
    return Response.json({ error: 'counter_unavailable' }, { status: 502 })
  }
}
