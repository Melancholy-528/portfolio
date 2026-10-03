const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export function GET(request: Request) {
  const clientId = environment.SPOTIFY_CLIENT_ID
  const redirectUri = environment.SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri || !environment.SPOTIFY_CLIENT_SECRET) {
    return new Response('Spotify is not configured. Add the Spotify app settings to Vercel first.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  const state = crypto.randomUUID()
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  const authorizeUrl = new URL('https://accounts.spotify.com/authorize')
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing',
    state,
  }).toString()

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': `spotify_oauth_state=${state}; Path=/api/spotify; Max-Age=600; HttpOnly; SameSite=Lax${secure}`,
      'Cache-Control': 'no-store',
    },
  })
}
