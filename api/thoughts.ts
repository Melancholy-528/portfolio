type Thought = { id: string; name: string; message: string; createdAt: string }
const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

async function redis(command: unknown[][]) {
  const url = env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '')
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('storage_not_configured')
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  const result = await response.json() as { result?: unknown; error?: string }[]
  if (!response.ok || result.some((item) => item.error)) throw new Error('storage_unavailable')
  return result.map((item) => item.result)
}

export async function GET() {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: 'storage_not_configured' }, { status: 503 })
  }
  try {
    const [items] = await redis([['LRANGE', 'portfolio:thoughts', '0', '49']]) as [string[]]
    const thoughts = (items || []).flatMap((item) => {
      try { return [JSON.parse(item) as Thought] } catch { return [] }
    })
    return Response.json({ thoughts }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch {
    return Response.json({ error: 'guestbook_unavailable' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: 'storage_not_configured' }, { status: 503 })
  }
  try {
    const body = await request.json() as { name?: unknown; message?: unknown }
    const name = typeof body.name === 'string' ? body.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) : ''
    const message = typeof body.message === 'string' ? body.message.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 600) : ''
    if (!name || !message) return Response.json({ error: 'name_and_message_required' }, { status: 400 })

    const thought: Thought = { id: crypto.randomUUID(), name, message, createdAt: new Date().toISOString() }
    const encoded = JSON.stringify(thought)
    const [, , items] = await redis([
      ['LPUSH', 'portfolio:thoughts', encoded],
      ['LTRIM', 'portfolio:thoughts', '0', '49'],
      ['LRANGE', 'portfolio:thoughts', '0', '49'],
    ]) as [string, string, string[]]
    const thoughts = (items || []).flatMap((item) => {
      try { return [JSON.parse(item) as Thought] } catch { return [] }
    })
    return Response.json({ thoughts }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    const missingStorage = error instanceof Error && error.message === 'storage_not_configured'
    return Response.json({ error: missingStorage ? 'storage_not_configured' : 'guestbook_unavailable' }, { status: missingStorage ? 503 : 502 })
  }
}
