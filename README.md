# Melancholy Profile

A personal portfolio website built with React, TypeScript, and Vite.

## Features

- Profile page with a typewriter terminal, meteor background, and audio player.
- Public GitHub repositories, recent activity, and contribution graph.
- Current anime and manga lists from AniList.
- Favorite anime and manga carousels with AniList cover art.
- Haryana weather from Open-Meteo.
- Spotify currently playing track, when configured on Vercel.
- Discord presence from Lanyard and recent tracks from Last.fm.

The profile uses public APIs at runtime. Those sections need an internet connection and may be unavailable if an API is down or rate-limited.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Vite prints the local development URL in the terminal.

## Build

```sh
npm run build
npm run preview
```

The production site is written to `dist/`. Both `index.html` and `favorites.html` are built as separate pages. Deploy to Vercel to run the Spotify API functions in `api/`; a static-only host will not provide those endpoints.

## Spotify setup on Vercel

The Spotify Web API requires account authorization to read current playback. Keep the Spotify credentials and refresh token in Vercel environment variables; do not commit them to the repository.

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `https://YOUR_DOMAIN/api/spotify/callback` to that app's Redirect URIs. Replace `YOUR_DOMAIN` with the site's deployed Vercel domain.
3. Add these environment variables to the Vercel project:

   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` — the exact callback URL from step 2

4. Redeploy, then open `https://YOUR_DOMAIN/api/spotify/auth` while signed into the Spotify account whose playback should appear. Approve the requested current-playback permission.
5. The callback page displays a refresh token. Copy it into the Vercel `SPOTIFY_REFRESH_TOKEN` environment variable, then redeploy again. Keep the token private.

Spotify refresh tokens expire after six months. If the card stops updating, authorize again at `/api/spotify/auth` and replace `SPOTIFY_REFRESH_TOKEN` in Vercel. The local Vite development server does not run Vercel functions; use the Vercel CLI's `vercel dev` command to try the API locally.

## Personal settings

The profile details and public service identifiers are in `src/App.tsx`. Update them to use your own accounts and location. The AniList current list requires a public profile. The weather widget uses coordinates for a regional estimate.
The project source code is available under the MIT License; see [LICENSE](LICENSE). The music and image files in `public/` and artwork loaded from AniList are not covered by that license. They remain subject to their respective owners' rights and terms.
