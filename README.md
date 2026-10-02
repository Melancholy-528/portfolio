# Melancholy Profile

A personal profile website built with React, TypeScript, and Vite. It includes a separate anime and manga favorites page.

## Features

- Profile page with a typewriter terminal, meteor background, and audio player.
- Public GitHub repositories, recent activity, and contribution graph.
- Current anime and manga lists from AniList.
- Favorite anime and manga carousels with AniList cover art.
- Haryana weather from Open-Meteo.
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

The production site is written to `dist/`. Deploy the contents of that directory to a static host. Both `index.html` and `favorites.html` are built as separate pages.

## Personal settings

The profile details and public service identifiers are in `src/App.tsx`. Update them to use your own accounts and location. The AniList current list requires a public profile. The weather widget uses coordinates for a regional estimate of Haryana.

## License

The project source code is available under the MIT License; see [LICENSE](LICENSE). The music and image files in `public/` and artwork loaded from AniList are not covered by that license. They remain subject to their respective owners' rights and terms.
