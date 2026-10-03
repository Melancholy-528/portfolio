type SpotifyTokenResponse = { access_token?: string; expires_in?: number; error?: string }
type SpotifyPlayback = {
  currently_playing_type?: string
  is_playing?: boolean
  progress_ms?: number | null
  item?: {
    name?: string
    type?: string
    duration_ms?: number
    artists?: { name: string }[]
    album?: { name?: string; images?: { url: string }[] }
    external_urls?: { spotify?: string }
  } | null
}

const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const noCache = { 'Cache-Control': 'no-store, max-age=0', 'Content-Type': 'application/json; charset=utf-8' }
const publicTrackCache = { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=10', 'Content-Type': 'application/json; charset=utf-8' }
const tokenCache = globalThis as typeof globalThis & { __spotifyAccessToken?: { value: string; expiresAt: number } }

export async function GET() {
  const clientId = environment.SPOTIFY_CLIENT_ID
  const clientSecret = environment.SPOTIFY_CLIENT_SECRET
  const refreshToken = environment.SPOTIFY_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    return Response.json({ error: 'setup_required' }, { status: 503, headers: noCache })
  }

  try {
    let accessToken = tokenCache.__spotifyAccessToken?.expiresAt && tokenCache.__spotifyAccessToken.expiresAt > Date.now() + 30_000
      ? tokenCache.__spotifyAccessToken.value
      : undefined
    if (!accessToken) {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        cache: 'no-store',
      })
      const token = await tokenResponse.json() as SpotifyTokenResponse
      if (!tokenResponse.ok || !token.access_token) {
        const reauthorize = token.error === 'invalid_grant'
        return Response.json({ error: reauthorize ? 'reauthorize' : 'spotify_unavailable' }, { status: reauthorize ? 401 : 502, headers: noCache })
      }
      accessToken = token.access_token
      tokenCache.__spotifyAccessToken = { value: accessToken, expiresAt: Date.now() + Math.max(60, (token.expires_in || 3600) - 60) * 1000 }
    }

    const playbackResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (playbackResponse.status === 204) return Response.json({ isPlaying: false }, { headers: publicTrackCache })
    if (!playbackResponse.ok) return Response.json({ error: 'spotify_unavailable' }, { status: 502, headers: noCache })

    const playback = await playbackResponse.json() as SpotifyPlayback
    const track = playback.item
    if (!playback.is_playing || playback.currently_playing_type !== 'track' || !track) {
      return Response.json({ isPlaying: false }, { headers: publicTrackCache })
    }

    return Response.json({
      isPlaying: true,
      title: track.name || 'Unknown track',
      artist: track.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist',
      album: track.album?.name || '',
      image: track.album?.images?.[0]?.url || '',
      url: track.external_urls?.spotify || '',
      progressMs: playback.progress_ms || 0,
      durationMs: track.duration_ms || 0,
    }, { headers: publicTrackCache })
  } catch {
    return Response.json({ error: 'spotify_unavailable' }, { status: 502, headers: noCache })
  }
}
