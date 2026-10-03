type SpotifyTokenResponse = { refresh_token?: string; error?: string }
const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character)
}

function page(message: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotify setup</title><body style="margin:0;padding:32px;background:#090d14;color:#e7edf5;font:15px/1.6 system-ui,sans-serif"><main style="max-width:680px;margin:8vh auto;padding:28px;border:1px solid #263241;border-radius:10px;background:#101722"><h1 style="font-size:24px">Spotify setup</h1>${message}<p><a style="color:#a9c9ef" href="/">Back to the site</a></p></main></body></html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': 'spotify_oauth_state=; Path=/api/spotify; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    },
  })
}

export async function GET(request: Request) {
  const clientId = environment.SPOTIFY_CLIENT_ID
  const clientSecret = environment.SPOTIFY_CLIENT_SECRET
  const redirectUri = environment.SPOTIFY_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return page('<p>Spotify is not configured. Add the app credentials and redirect URI to Vercel.</p>', 503)

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const cookieState = request.headers.get('cookie')?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('spotify_oauth_state='))?.split('=').slice(1).join('=')
  if (!state || !cookieState || state !== cookieState) return page('<p>Spotify authorization could not be verified. Start the connection again.</p>', 400)
  if (url.searchParams.has('error')) return page('<p>Spotify authorization was cancelled or denied.</p>', 400)

  const code = url.searchParams.get('code')
  if (!code) return page('<p>Spotify did not return an authorization code.</p>', 400)

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const result = await response.json() as SpotifyTokenResponse
    if (!response.ok || !result.refresh_token) return page('<p>Spotify could not complete authorization. Check the app settings and try again.</p>', 502)

    return page(`<p>Authorization succeeded. Copy this refresh token into the <code>SPOTIFY_REFRESH_TOKEN</code> environment variable in Vercel, then redeploy.</p><p>This token grants access to your Spotify playback status. Keep it private.</p><pre style="overflow-wrap:anywhere;white-space:pre-wrap;padding:14px;border:1px solid #263241;border-radius:6px;background:#0b111a;color:#c6d9ef">${escapeHtml(result.refresh_token)}</pre><p>For security, this page is not cached. Close it after saving the token.</p>`)
  } catch {
    return page('<p>Spotify could not be reached. Try again later.</p>', 502)
  }
}
