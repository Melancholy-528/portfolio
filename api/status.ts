function environment() {
  return (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
}

export async function GET() {
  const env = environment()
  const url = env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return Response.json({ storage: 'missing_configuration' })

  try {
    const response = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const result = await response.json() as { result?: string }
    return Response.json({ storage: response.ok && result.result === 'PONG' ? 'connected' : 'connection_failed' })
  } catch {
    return Response.json({ storage: 'connection_failed' })
  }
}
