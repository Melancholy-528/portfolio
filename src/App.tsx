import { useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'

const playlist = [
  { title: 'Anytime Anywhere', image: './milet.jpg', audio: './[028] Milet ~ Anytime Anywhere _ Lyrics RomEng [(Onion Subs)].m4a' },
  { title: 'Haru', image: './Haruyorusika.jpg', audio: './haru.mp3' },
]
const terminalPages = [
  ['neofetch', 'Distro: Omarchy · Fedora 44', 'CPU: i5 11400H', 'GPU: GTX 1650', 'RAM: 24 gigs'],
  ['ls skills/', 'HTML', 'CSS', 'Python', 'C (basic)', 'Linux'],
  ['ls Hobbies/', 'Anime', 'Coding', 'Linux'],
  ['Favorite shows', 'Neon Genesis Evangelion', 'Serial Experiments Lain', 'Dragon Ball', 'Re:Zero', 'Eighty-Six'],
]
type Favorite = { title: string; note: string }
const animeFavorites: Favorite[] = [
  { title: 'Neon Genesis Evangelion', note: 'Mecha on the surface; existential questions underneath.' },
  { title: 'Serial Experiments Lain', note: 'A lonely, strange trip through the Wired.' },
  { title: 'Dragon Ball', note: 'Big adventures and even bigger fights.' },
  { title: 'Re:Zero', note: 'Fantasy built around a brutal reset button.' },
  { title: 'Eighty-Six', note: 'War, prejudice, and the people caught between them.' },
]
const mangaFavorites: Favorite[] = [
  { title: 'Oyasumi Punpun', note: 'A coming-of-age story that turns painfully surreal.' },
  { title: 'Neon Genesis Evangelion', note: 'The familiar descent, told in a different form.' },
  { title: 'Chainsaw Man', note: 'Chaotic devil hunting with a softer center.' },
  { title: 'Kaguya-sama: Love Is War', note: 'A rom-com where every confession is a battle.' },
  { title: 'Tokyo Ghoul', note: 'A life split between two worlds.' },
]
const aniListUsername = 'Alpha882882'
type MediaKind = 'ANIME' | 'MANGA'
type FavoriteArt = { coverImage?: { extraLarge?: string; large?: string } }
type AniListEntry = { status: string; progress?: number; notes?: string | null; media: { title: { userPreferred?: string; english?: string | null; romaji: string }; siteUrl: string; coverImage?: { extraLarge?: string | null; large?: string | null; medium?: string | null }; episodes?: number | null; chapters?: number | null } }
type CurrentWeather = { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number }
type RecentTrack = { name: string; artist: { '#text'?: string } | string; image?: { size: string; '#text': string }[] }
type SpotifyNowPlaying = { isPlaying: true; title: string; artist: string; album: string; image: string; url: string; progressMs: number; durationMs: number }
type GitHubRepository = { id: number; name: string; html_url: string; description: string | null; language: string | null; updated_at: string; fork: boolean; archived: boolean }
type GitHubEvent = { id: string; type: string; created_at: string; repo: { name: string }; payload: { action?: string; ref_type?: string } }
const contributionChartUrl = 'https://gh-heat.anishroy.com/api/Melancholy-528/svg?theme=green&darkMode=true&transparent=true&shape=square&cellSize=11&cellGap=3'

function eventLabel(event: GitHubEvent) {
  switch (event.type) {
    case 'PushEvent': return 'Pushed updates to'
    case 'CreateEvent': return `Created a ${event.payload.ref_type || 'branch'} in`
    case 'WatchEvent': return 'Starred'
    case 'ForkEvent': return 'Forked'
    case 'IssuesEvent': return `${event.payload.action || 'Updated'} an issue in`
    case 'PullRequestEvent': return `${event.payload.action || 'Updated'} a pull request in`
    case 'ReleaseEvent': return 'Published a release in'
    case 'PublicEvent': return 'Made public'
    default: return 'Activity in'
  }
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  const age = Date.now() - date.getTime()
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function weatherDescription(code: number) {
  if (code === 0) return 'Clear sky'
  if ([1, 2].includes(code)) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Current conditions'
}

function AniListNow({ username }: { username: string }) {
  const [entries, setEntries] = useState<{ anime: AniListEntry[]; manga: AniListEntry[] } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const query = 'query ($userName: String!, $type: MediaType!) { MediaListCollection(userName: $userName, type: $type) { lists { entries { status progress notes media { title { userPreferred english romaji } siteUrl coverImage { extraLarge large medium } episodes chapters } } } } }'
    const load = async (type: MediaKind) => {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables: { userName: username, type } }),
      })
      if (!response.ok) throw new Error('AniList request failed')
      const result = await response.json()
      if (result?.errors?.length) throw new Error('AniList list unavailable')
      const lists = result?.data?.MediaListCollection?.lists ?? []
      return lists.flatMap((list: { entries?: AniListEntry[] }) => list.entries ?? []).filter((entry: AniListEntry) => entry.status === 'CURRENT') as AniListEntry[]
    }
    Promise.all([load('ANIME'), load('MANGA')]).then(([anime, manga]) => {
      if (!controller.signal.aborted) setEntries({ anime: anime.slice(0, 3), manga: manga.slice(0, 3) })
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    const refresh = window.setInterval(() => {
      if (controller.signal.aborted) return
      Promise.all([load('ANIME'), load('MANGA')]).then(([anime, manga]) => {
        if (!controller.signal.aborted) { setEntries({ anime: anime.slice(0, 3), manga: manga.slice(0, 3) }); setFailed(false) }
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    }, 30 * 60 * 1000)
    return () => { controller.abort(); window.clearInterval(refresh) }
  }, [username])

  const group = (kind: MediaKind, items: AniListEntry[]) => <div className={`current-group ${kind === 'ANIME' ? 'is-anime' : 'is-manga'}`}>
    <div className="current-group-heading"><span className="eyebrow">{kind === 'ANIME' ? 'WATCHING' : 'READING'}</span><span className="current-count">{String(items.length).padStart(2, '0')} {items.length === 1 ? 'title' : 'titles'}</span></div>
    {items.length ? <ul>{items.map((entry) => {
      const name = entry.media.title.userPreferred || entry.media.title.english || entry.media.title.romaji
      const total = kind === 'ANIME' ? entry.media.episodes : entry.media.chapters
      const unit = kind === 'ANIME' ? 'episodes' : 'chapters'
      const progress = entry.progress || 0
      const progressPercent = total ? Math.min(100, Math.round((progress / total) * 100)) : 0
      const cover = entry.media.coverImage?.extraLarge || entry.media.coverImage?.large || entry.media.coverImage?.medium
      return <li className="current-title" key={entry.media.siteUrl}>
        <a className="current-cover" href={entry.media.siteUrl} target="_blank" rel="noreferrer" aria-label={`Open ${name} on AniList`}>
          <span aria-hidden="true">{name.split(/\s+/).map((word) => word[0]).join('').slice(0, 3)}</span>
          {cover && <img src={cover} alt="" loading="eager" onError={(event) => { event.currentTarget.style.opacity = '0' }} />}
        </a>
        <div className="current-title-copy">
          <a className="current-title-name" href={entry.media.siteUrl} target="_blank" rel="noreferrer">{name}<span aria-hidden="true">↗</span></a>
          <div className="current-progress-label">{total ? `${progress} / ${total} ${unit}` : `${progress} ${unit}`}</div>
          {total && <div className="current-progress-track" role="progressbar" aria-label={`${name} progress`} aria-valuenow={Math.min(progress, total)} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${progressPercent}%` }} /></div>}
          {entry.notes && <p>{entry.notes}</p>}
        </div>
      </li>
    })}</ul> : <p className="current-empty">Nothing marked current.</p>}
  </div>

  return <section className="current-panel" id="anime" aria-label="Currently watching and reading on AniList">
    <div className="current-panel-heading"><h2>Currently into</h2></div>
    {failed ? <p className="current-empty">Couldn’t load this public AniList list.</p> : entries ? <div className="current-groups">{group('ANIME', entries.anime)}{group('MANGA', entries.manga)}</div> : <p className="current-empty">Loading your current list…</p>}
  </section>
}

function formatTrackTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function LocalClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)

  return <div className="local-clock">
    <time dateTime={now.toISOString()} aria-label={`Local time ${time}`}>{time}</time>
  </div>
}

const birthTimestamp = Date.parse('2006-05-28T13:06:00+05:30')
const yearMilliseconds = 365.2425 * 24 * 60 * 60 * 1000

function AgeIndicator() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const years = ((now - birthTimestamp) / yearMilliseconds).toFixed(8)
  return <div className="age-indicator profile-age" aria-label={`Age ${years} years`}>
    <span>AGE</span><strong>{years}y</strong>
  </div>
}

function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null)
  const [counterError, setCounterError] = useState<'setup' | 'offline' | null>(null)

  useEffect(() => {
    const sessionKey = 'melancholy-portfolio-visitor-count'
    let cachedCount: string | null = null
    try { cachedCount = window.sessionStorage.getItem(sessionKey) } catch { /* Storage may be disabled by the browser. */ }
    if (cachedCount && Number.isFinite(Number(cachedCount))) {
      setCount(Number(cachedCount))
      return
    }
    fetch('/api/visitors')
      .then(async (response) => {
        const data = await response.json() as { count?: number; error?: string }
        if (!response.ok) throw new Error(data.error || 'counter_unavailable')
        return data
      })
      .then(({ count: total }) => {
        if (typeof total !== 'number' || !Number.isFinite(total)) throw new Error('Visitor count unavailable')
        try { window.sessionStorage.setItem(sessionKey, String(total)) } catch { /* The displayed count still works without session storage. */ }
        setCount(total)
      })
      .catch((reason: unknown) => setCounterError(reason instanceof Error && reason.message === 'counter_not_configured' ? 'setup' : 'offline'))
  }, [])

  return <div className="visitor-counter" aria-live="polite">
    <span>VISITORS</span><strong title={counterError === 'setup' ? 'Add the Upstash Redis environment variables in Vercel, then redeploy.' : undefined}>{count === null ? (counterError === 'setup' ? 'Setup needed' : counterError ? 'Offline' : '…') : count.toLocaleString('en-IN')}</strong>
  </div>
}

function SiteFooter({ onThoughts, showThoughtLink = true }: { onThoughts?: () => void; showThoughtLink?: boolean }) {
  return <footer className="site-footer">
    {showThoughtLink && <a href="./thoughts.html" onClick={(event) => { if (!onThoughts) return; event.preventDefault(); onThoughts() }}>Guestbook <span aria-hidden="true">↗</span></a>}
    <VisitorCounter />
  </footer>
}

type GuestThought = { id: string; name: string; message: string; createdAt: string }

function ThoughtsGuestbook() {
  const [thoughts, setThoughts] = useState<GuestThought[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const loadThoughts = () => fetch('/api/thoughts', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { thoughts?: GuestThought[]; error?: string }
        if (!response.ok) throw new Error(data.error || 'guestbook_unavailable')
        setThoughts(data.thoughts || [])
        setLoading(false)
        setStorageUnavailable(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const message = reason instanceof Error ? reason.message : ''
        setStorageUnavailable(message === 'storage_not_configured')
        setError(message === 'storage_not_configured' ? 'Shared thoughts storage needs to be configured.' : 'Could not sync thoughts right now.')
        setLoading(false)
      })
    void loadThoughts()
    const refresh = window.setInterval(() => { void loadThoughts() }, 15_000)
    return () => { controller.abort(); window.clearInterval(refresh) }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      const data = await response.json() as { thoughts?: GuestThought[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'guestbook_unavailable')
      setThoughts(data.thoughts || [])
      setMessage('')
      setError('Your thought is posted.')
    } catch (reason) {
      const cause = reason instanceof Error ? reason.message : ''
      setStorageUnavailable(cause === 'storage_not_configured')
      setError(cause === 'storage_not_configured' ? 'Shared thoughts storage needs to be configured.' : 'Could not post your thought. Please try again.')
    } finally { setSending(false) }
  }

  return <div className="thoughts-content">
    <form className="thought-form" onSubmit={submit}>
      <label htmlFor="thought-name">Name</label>
      <input id="thought-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required placeholder="What should we call you?" />
      <label htmlFor="thought-message">Your thought</label>
      <textarea id="thought-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={600} rows={4} required placeholder="Leave a note, a recommendation, or say hello…" />
      <div className="thought-form-footer"><span>{message.length}/600</span><button type="submit" disabled={sending || storageUnavailable}>{sending ? 'Posting…' : 'Post thought'}</button></div>
      {error && <p className={`thought-form-status ${storageUnavailable ? 'is-error' : ''}`} role="status">{error}</p>}
    </form>
    <div className="thought-list" aria-live="polite">
      <div className="thought-list-heading"><h3>Recent thoughts</h3><span>{thoughts.length.toString().padStart(2, '0')}</span></div>
      {loading ? <p className="thought-empty">Loading thoughts…</p> : thoughts.length ? thoughts.map((thought) => <article className="thought-entry" key={thought.id}>
        <div className="thought-entry-heading"><strong>{thought.name}</strong><time dateTime={thought.createdAt}>{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(thought.createdAt))}</time></div>
        <p>{thought.message}</p>
      </article>) : <p className="thought-empty">{storageUnavailable ? 'Entries will appear here once shared storage is connected.' : 'No thoughts yet. You can start the conversation.'}</p>}
    </div>
  </div>
}

function SpotifyNowCard() {
  const [track, setTrack] = useState<SpotifyNowPlaying | null>(null)
  const [status, setStatus] = useState<'loading' | 'playing' | 'idle' | 'setup' | 'reauthorize' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch('/api/spotify/currently-playing', { signal: controller.signal, cache: 'no-store' })
        const result = await response.json()
        if (result?.error === 'setup_required') { setTrack(null); setStatus('setup'); return }
        if (result?.error === 'reauthorize') { setTrack(null); setStatus('reauthorize'); return }
        if (!response.ok || result?.error) throw new Error('Spotify request failed')
        if (result?.isPlaying && result.title) { setTrack(result as SpotifyNowPlaying); setStatus('playing') }
        else { setTrack(null); setStatus('idle') }
      } catch {
        if (!controller.signal.aborted) { setTrack(null); setStatus('error') }
      }
    }
    void load()
    const timer = window.setInterval(() => { if (!controller.signal.aborted) void load() }, 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (status !== 'playing') return
    const timer = window.setInterval(() => {
      setTrack((current) => current && current.durationMs > 0
        ? { ...current, progressMs: Math.min(current.durationMs, current.progressMs + 1000) }
        : current)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const percent = track?.durationMs ? Math.min(100, Math.round((track.progressMs / track.durationMs) * 100)) : 0
  const statusText = status === 'playing' ? 'PLAYING NOW' : status === 'idle' ? 'NOTHING PLAYING' : status === 'setup' ? 'SETUP REQUIRED' : status === 'reauthorize' ? 'RECONNECT REQUIRED' : status === 'error' ? 'UNAVAILABLE' : 'CHECKING SPOTIFY'

  return <section className="spotify-now-card" id="spotify-now" aria-label="Spotify currently playing">
    <div className="spotify-now-heading">
      <div><span className="eyebrow">SPOTIFY</span><h2>Now playing</h2></div>
      <span className={`spotify-now-status ${status === 'playing' ? 'is-playing' : ''}`}><i aria-hidden="true" />{statusText}</span>
    </div>
    {track ? <div className="spotify-now-body">
      {track.image ? <img className="spotify-now-art" src={track.image} alt={`${track.album} cover`} onError={() => setTrack((current) => current ? { ...current, image: '' } : null)} /> : <div className="spotify-now-art spotify-art-placeholder" aria-hidden="true">♪</div>}
      <div className="spotify-now-details">
        <a className="spotify-now-title" href={track.url || undefined} target="_blank" rel="noreferrer">{track.title}</a>
        <p className="spotify-now-artist">{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
        <div className="spotify-progress-row"><span>{formatTrackTime(track.progressMs)}</span><div className="spotify-progress"><span style={{ width: `${percent}%` }} /></div><span>{formatTrackTime(track.durationMs)}</span></div>
        <a className="spotify-listen-link" href={track.url || undefined} target="_blank" rel="noreferrer">Open in Spotify <span aria-hidden="true">↗</span></a>
      </div>
    </div> : <p className="spotify-now-message">{status === 'idle' ? 'Nothing is playing on Spotify right now.' : status === 'setup' ? 'Spotify setup is incomplete. See the README for the Vercel connection steps.' : status === 'reauthorize' ? 'The Spotify connection expired. Reauthorize the site owner’s account in Spotify.' : status === 'error' ? 'Spotify is unavailable right now.' : 'Checking playback…'}</p>}
  </section>
}

function MediaCarousel({ title, kind, items }: { title: string; kind: MediaKind; items: Favorite[] }) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [art, setArt] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const query = 'query ($search: String, $type: MediaType) { Media(search: $search, type: $type) { coverImage { extraLarge large } } }'
    Promise.all(items.map(async ({ title: search }) => {
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables: { search, type: kind } }),
        })
        if (!response.ok) throw new Error('Cover request failed')
        const result = await response.json()
        const image = (result?.data?.Media as FavoriteArt | undefined)?.coverImage?.extraLarge || (result?.data?.Media as FavoriteArt | undefined)?.coverImage?.large
        return image ? [search, image] as const : null
      } catch {
        return null
      }
    })).then((results) => {
      if (!controller.signal.aborted) setArt(Object.fromEntries(results.filter((entry): entry is readonly [string, string] => entry !== null)))
      if (!controller.signal.aborted && results.every((entry) => entry === null)) setFailed(true)
    })
    return () => controller.abort()
  }, [items, kind])

  const move = (direction: -1 | 1) => carouselRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' })

  return <section className="favorites-shelf" aria-label={`${title} favorites`}>
    <div className="shelf-heading"><div><span className="eyebrow">{kind === 'ANIME' ? 'ANIMATION' : 'ON PAPER'}</span><h2>{title}</h2></div>
      <div className="shelf-controls"><span className="panel-index">{String(items.length).padStart(2, '0')}</span><button aria-label={`Scroll ${title} left`} onClick={() => move(-1)}>←</button><button aria-label={`Scroll ${title} right`} onClick={() => move(1)}>→</button></div>
    </div>
    <div className="media-carousel" ref={carouselRef} tabIndex={0} aria-label={`${title} image carousel`}>
      {items.map(({ title: name, note }, index) => <article className="media-card" key={name}>
        <div className="media-cover">
          {art[name] ? <img src={art[name]} alt={`${name} ${kind === 'ANIME' ? 'poster' : 'manga cover'}`} loading="lazy" onError={() => setArt((previous) => { const next = { ...previous }; delete next[name]; return next })} /> : <div className="media-cover-placeholder" aria-hidden="true">{failed ? 'Image unavailable' : name.split(/\s+/).map((word) => word[0]).join('').slice(0, 3)}</div>}
          <span>{String(index + 1).padStart(2, '0')}</span>
        </div>
        <h3>{name}</h3>
        <p className="media-note">{note}</p>
      </article>)}
    </div>
  </section>
}

function FavoritesPage({ onHome, onThoughts }: { onHome: () => void; onThoughts: () => void }) {
  return <main className="app is-entered">
    <div className="night-sky" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span className="meteor" key={i} />)}</div>
    <div className="page-shell favorites-shell">
      <a className="back-link" href="./" onClick={(event) => { event.preventDefault(); onHome() }}><span aria-hidden="true">←</span> Back to home</a>
      <header className="favorites-header">
        <span className="eyebrow">A PERSONAL LIST</span>
        <h1>Favorites</h1>
        <p>Anime and manga on my favorites list.</p>
      </header>
      <div className="favorites-shelves">
        <MediaCarousel title="Anime" kind="ANIME" items={animeFavorites} />
        <MediaCarousel title="Manga" kind="MANGA" items={mangaFavorites} />
      </div>
      <p className="favorites-credit">Cover images from <a href="https://anilist.co/" target="_blank" rel="noreferrer">AniList</a>.</p>
      <SiteFooter onThoughts={onThoughts} />
    </div>
  </main>
}

function ThoughtsPage({ onHome }: { onHome: () => void }) {
  return <main className="app is-entered">
    <div className="night-sky" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span className="meteor" key={i} />)}</div>
    <div className="page-shell thoughts-shell">
      <a className="back-link" href="./" onClick={(event) => { event.preventDefault(); onHome() }}><span aria-hidden="true">←</span> Back to home</a>
      <header className="thoughts-header">
        <span className="eyebrow">GUESTBOOK</span>
        <h1>Thoughts</h1>
        <p>A place for notes, recommendations, and passing thoughts. New posts appear here for everyone.</p>
      </header>
      <section className="panel thoughts-panel" aria-label="Guestbook comments">
        <div className="panel-heading"><div><span className="eyebrow">OPEN THREAD</span><h2>What’s on your mind?</h2></div><span className="panel-index">01</span></div>
        <ThoughtsGuestbook />
      </section>
      <SiteFooter showThoughtLink={false} />
    </div>
  </main>
}

function HomePage({ onFavorites, onThoughts, startEntered = false }: { onFavorites: () => void; onThoughts: () => void; startEntered?: boolean }) {
  const [entered, setEntered] = useState(startEntered)
  const [profile, setProfile] = useState<{ name: string; avatar: string; decoration?: string; status: string }>()
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([])
  const [repositories, setRepositories] = useState<GitHubRepository[] | null>(null)
  const [githubEvents, setGithubEvents] = useState<GitHubEvent[] | null>(null)
  const [repositoriesFailed, setRepositoriesFailed] = useState(false)
  const [eventsFailed, setEventsFailed] = useState(false)
  const [contributionChartFailed, setContributionChartFailed] = useState(false)
  const [terminalIndex, setTerminalIndex] = useState(0)
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [currentTrack, setCurrentTrack] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [weatherFailed, setWeatherFailed] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('https://api.lanyard.rest/v1/users/524169169667883008', { signal: controller.signal })
      .then((res) => res.json()).then((result) => {
        const user = result?.data?.discord_user
        if (!user) return
        const format = user.avatar?.startsWith('a_') ? 'gif' : 'webp'
        setProfile({
          name: user.global_name || user.username || 'Melancholy',
          avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=240`,
          decoration: user.avatar_decoration_data?.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=240` : undefined,
          status: result.data.discord_status || 'offline',
        })
      }).catch(() => undefined)
    fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=melancholy55838&api_key=ad45b0df4ea54c0597c6c74d60b79119&format=json&limit=10', { signal: controller.signal })
      .then((res) => res.json()).then((result) => setRecentTracks(result?.recenttracks?.track?.slice(0, 10) ?? [])).catch(() => undefined)
    const applyRepositories = (repos: GitHubRepository[]) => {
      const eligible = repos.filter((repo) => !repo.fork && !repo.archived && !repo.name.toLowerCase().includes('twitter-sentiment-analysis'))
      const featuredPortfolio = eligible.find((repo) => repo.name.toLowerCase() === 'my-portfolio')
      const selected = featuredPortfolio ? [featuredPortfolio, ...eligible.filter((repo) => repo.id !== featuredPortfolio.id)] : eligible
      setRepositories(selected.slice(0, 3))
    }
    const applyEvents = (events: GitHubEvent[]) => setGithubEvents(events
      .filter((event) => ['PushEvent', 'CreateEvent', 'WatchEvent', 'ForkEvent', 'IssuesEvent', 'PullRequestEvent', 'ReleaseEvent', 'PublicEvent'].includes(event.type))
      .slice(0, 6))
    fetch('/api/github', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('GitHub data request failed'); return res.json() as Promise<{ repositories: GitHubRepository[]; events: GitHubEvent[]; repositoriesFailed: boolean; eventsFailed: boolean }> })
      .then((data) => {
        if (controller.signal.aborted) return
        if (data.repositoriesFailed) { setRepositories([]); setRepositoriesFailed(true) } else applyRepositories(data.repositories)
        if (data.eventsFailed) { setGithubEvents([]); setEventsFailed(true) } else applyEvents(data.events)
      })
      .catch(() => { if (!controller.signal.aborted) { setRepositories([]); setGithubEvents([]); setRepositoriesFailed(true); setEventsFailed(true) } })
    const loadWeather = () => fetch('https://api.open-meteo.com/v1/forecast?latitude=29.0588&longitude=76.0856&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FKolkata', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('Weather request failed'); return res.json() })
      .then((result) => setWeather(result?.current ?? null))
      .catch(() => { if (!controller.signal.aborted) setWeatherFailed(true) })
    void loadWeather()
    const weatherTimer = window.setInterval(() => { if (!controller.signal.aborted) void loadWeather() }, 15 * 60 * 1000)
    return () => { controller.abort(); window.clearInterval(weatherTimer) }
  }, [])

  useEffect(() => {
    const lines = terminalPages[terminalIndex]
    let lineIndex = 0
    let characterCount = 0
    let timer = 0
    setVisibleLines([])
    const type = () => {
      if (lineIndex >= lines.length) {
        timer = window.setTimeout(() => setTerminalIndex((index) => (index + 1) % terminalPages.length), 3200)
        return
      }
      const activeLine = lineIndex
      const text = lines[activeLine]
      characterCount += 1
      const typedText = [...text].slice(0, characterCount).join('')
      setVisibleLines((previous) => {
        const next = [...previous]
        next[activeLine] = typedText
        return next
      })
      if (characterCount >= [...text].length) {
        lineIndex += 1
        characterCount = 0
        timer = window.setTimeout(type, 360)
      } else {
        timer = window.setTimeout(type, 85)
      }
    }
    timer = window.setTimeout(type, 450)
    return () => window.clearTimeout(timer)
  }, [terminalIndex])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false); return }
    try { await audio.play(); setPlaying(true) } catch { setPlaying(false) }
  }
  const changeTrack = async (index: number) => {
    setCurrentTrack(index)
    setProgress(0)
    setDuration(0)
    const audio = audioRef.current
    if (!audio) return
    audio.src = playlist[index].audio
    try { await audio.play(); setPlaying(true) } catch { setPlaying(false) }
  }
  const selected = playlist[currentTrack]

  return <main className={`app ${entered ? 'is-entered' : ''}`}>
    {!entered && <div className="enter-screen">
      <div className="enter-content">
        <button className="enter-button" onClick={() => setEntered(true)}><span>Click to enter</span><span className="enter-icon" aria-hidden="true">⏎</span></button>
      </div>
    </div>}
    <div className="page-shell">
      <div className="night-sky" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <span className="meteor" key={i} />)}</div>
      <div className="topbar">
        <nav className="section-nav" aria-label="Page sections">
          <a href="#about">About</a>
          <a href="#anime">Manga/anime</a>
          <a href="#music">Listening to</a>
          <a href="#github">GitHub</a>
        </nav>
        <LocalClock />
      </div>
      <section className="profile-card" id="top">
        <div className="profile-copy">
          <div className="eyebrow"><span className={`status-indicator ${profile?.status || 'offline'}`} />{profile?.status === 'online' ? 'around right now' : profile?.status === 'idle' ? 'away for a bit' : profile?.status === 'dnd' ? 'keeping quiet' : profile ? 'not around right now' : 'discord status unavailable'}</div>
          <h1>Hey, I’m <span>{profile?.name || 'Melancholy'}</span>.</h1>
          <p className="profile-description">Anime enthusiast, CS student, and your average guy.</p>
          <nav className="social-links" aria-label="Social links">
            <a href="https://discordapp.com/users/524169169667883008" target="_blank" rel="noreferrer">Discord <span aria-hidden="true">↗</span></a>
            <a href="https://www.instagram.com/chillin_in_the_back_room/" target="_blank" rel="noreferrer">Instagram <span aria-hidden="true">↗</span></a>
            <a href="https://github.com/Melancholy-528" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          </nav>
          <div className="profile-actions">
            <a className="favorites-cta" href="./favorites.html" onClick={(event) => { event.preventDefault(); onFavorites() }}>Anime &amp; manga favorites <span aria-hidden="true">↗</span></a>
            <a className="thoughts-cta" href="./thoughts.html" onClick={(event) => { event.preventDefault(); onThoughts() }}>Guestbook <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="profile-art">
          <div className="avatar-wrap">
            {profile ? <img className="aboutme-img" src={profile.avatar} alt="Discord avatar" /> : <div className="avatar-placeholder">M</div>}
            {profile?.decoration && <img className="avatar-decoration" src={profile.decoration} alt="" />}
          </div>
          <AgeIndicator />
        </div>
      </section>

      <div className="dashboard-grid">
      <SpotifyNowCard />

      <section className="panel terminal-box" id="about" aria-label="About me">
        <div className="panel-heading"><div><span className="eyebrow">A FEW DETAILS</span><h2>About me</h2></div><span className="panel-index">02</span></div>
        <div className="terminal"><div className="prompt"><span className="prompt-symbol">$</span> <span className="username">Melancholy</span>@about-me:~</div>
          <div className="output">{visibleLines.map((line, i) => <div className="line" key={`${terminalIndex}-${i}`}>{line}{i === visibleLines.length - 1 && <span className="cursor">_</span>}</div>)}</div>
        </div>
        <div className="terminal-footer"><span>Omarchy · Fedora 44</span><span>HTML · CSS · Python · C</span></div>
      </section>

      <section className="weather-strip" id="weather" aria-label="Current weather in Haryana, India">
        <div className="weather-place"><span className="eyebrow">WEATHER · STATE ESTIMATE</span><h2>Haryana, India</h2></div>
        {weather ? <>
          <div className="weather-now"><span className="weather-symbol" aria-hidden="true">{weather.weather_code === 0 ? '☀' : [1, 2, 3].includes(weather.weather_code) ? '◒' : [95, 96, 99].includes(weather.weather_code) ? 'ϟ' : '☁'}</span><strong>{Math.round(weather.temperature_2m)}°</strong><span>{weatherDescription(weather.weather_code)}</span></div>
          <div className="weather-footer">
            <div className="weather-details">
              <div className="weather-detail"><span>Feels like</span><strong>{Math.round(weather.apparent_temperature)}°C</strong></div>
              <div className="weather-detail"><span>Humidity</span><strong>{weather.relative_humidity_2m}%</strong></div>
              <div className="weather-detail"><span>Wind</span><strong>{Math.round(weather.wind_speed_10m)} km/h</strong></div>
            </div>
            <a className="weather-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
          </div>
        </> : <p className="weather-message">{weatherFailed ? 'Weather is unavailable right now.' : 'Loading current conditions…'}</p>}
      </section>

      <AniListNow username={aniListUsername} />

      <div className="content-grid">
        <section className="panel music" id="music" aria-label="Music player">
          <div className="panel-heading"><div><span className="eyebrow">ON REPEAT</span><h2>Listening to</h2></div><span className="panel-index">01</span></div>
          <img src={selected.image} alt={`${selected.title} cover`} className="song-img" />
          <div className="song-meta"><h3>{selected.title}</h3><span>{currentTrack === 0 ? 'milet' : 'Yorushika'}</span></div>
          <audio ref={audioRef} src={selected.audio} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} />
          <input aria-label="Track position" className="bar" type="range" min="0" max={duration} value={progress} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); setProgress(Number(event.target.value)) }} />
          <div className="controls">
            <button aria-label="Previous track" onClick={() => changeTrack((currentTrack + playlist.length - 1) % playlist.length)}><span aria-hidden="true">|◀</span></button>
            <button className="play-button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlayback}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button>
            <button aria-label="Next track" onClick={() => changeTrack((currentTrack + 1) % playlist.length)}><span aria-hidden="true">▶|</span></button>
          </div>
        </section>

        <section className="panel spotify" id="lastfm" aria-label="Recently played tracks">
          <div className="panel-heading"><div><span className="eyebrow">LAST.FM</span><h2>Recently played</h2></div><span className="panel-index">03</span></div>
          <div className="track-list">
            {recentTracks.length ? recentTracks.map((track, i) => {
              const image = track.image?.find((item) => item.size === 'extralarge')?.['#text'] || track.image?.find((item) => item.size === 'large')?.['#text']
              const artist = typeof track.artist === 'string' ? track.artist : track.artist?.['#text']
              return <div className="track-item" key={i}><img src={image || './milet.jpg'} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = './milet.jpg' }} alt="" /><div className="track-text"><div className="track-name">{track.name || 'Unknown Track'}</div><div className="track-artist">{artist || 'Unknown Artist'}</div></div></div>
            }) : <div className="track-empty">Nothing scrobbled just now.</div>}
          </div>
        </section>
      </div>

      <section className="panel github-panel" id="github" aria-label="GitHub projects and activity">
        <div className="panel-heading github-heading">
          <div><span className="eyebrow">GITHUB</span><h2>Projects &amp; activity</h2></div>
          <a className="github-profile-link" href="https://github.com/Melancholy-528" target="_blank" rel="noreferrer">View profile <span aria-hidden="true">↗</span></a>
        </div>
        <div className="contribution-block">
          <div className="contribution-heading"><h3>Contribution graph</h3><span>past year</span><span className="contribution-mobile-note">scroll for full year →</span></div>
          {contributionChartFailed ? <p className="github-empty">The contribution graph is unavailable right now.</p> : <div className="contribution-scroll"><img className="contribution-chart" src={contributionChartUrl} alt="GitHub contribution activity over the past year" onError={() => setContributionChartFailed(true)} /></div>}
        </div>
        <div className="github-columns">
          <section className="github-section" aria-label="Recent projects">
            <h3>Projects</h3>
            <div className="project-list">
              {repositories === null ? <p className="github-empty">Loading repositories…</p> : repositories.length ? repositories.map((repo) => <a className="project-row" href={repo.html_url} target="_blank" rel="noreferrer" key={repo.id}>
                <div className="project-info"><div className="project-name">{repo.name}<span aria-hidden="true">↗</span></div>{repo.description && <p>{repo.description}</p>}</div>
                <div className="project-meta">{repo.language && <span className="language-dot" />}{repo.language || 'Repository'}<time>{formatActivityDate(repo.updated_at)}</time></div>
              </a>) : <p className="github-empty">{repositoriesFailed ? 'Couldn’t load public repositories.' : 'No public repositories yet.'}</p>}
            </div>
          </section>
          <section className="github-section activity-section" aria-label="Recent public GitHub activity">
            <h3>Recent activity</h3>
            <div className="activity-list">
              {githubEvents === null ? <p className="github-empty">Loading activity…</p> : githubEvents.length ? githubEvents.map((event) => <div className="activity-row" key={event.id}>
                <span className="activity-mark" aria-hidden="true" />
                <p>{eventLabel(event)} <a href={`https://github.com/${event.repo.name}`} target="_blank" rel="noreferrer">{event.repo.name.split('/').at(-1)}</a></p>
                <time>{formatActivityDate(event.created_at)}</time>
              </div>) : <p className="github-empty">{eventsFailed ? 'Couldn’t load recent activity.' : 'No recent public activity.'}</p>}
            </div>
          </section>
        </div>
      </section>
      </div>
      <SiteFooter onThoughts={onThoughts} />
    </div>
  </main>
}

type AppPage = 'home' | 'favorites' | 'thoughts'
const pageFromPath = (pathname: string): AppPage => pathname.endsWith('/favorites.html') ? 'favorites' : pathname.endsWith('/thoughts.html') ? 'thoughts' : 'home'

function App() {
  const initialPage = pageFromPath(window.location.pathname)
  const [page, setPage] = useState<AppPage>(initialPage)
  const [homeMounted, setHomeMounted] = useState(initialPage === 'home')
  const [homeStartsEntered, setHomeStartsEntered] = useState(false)
  const [favoritesMounted, setFavoritesMounted] = useState(initialPage === 'favorites')
  const [thoughtsMounted, setThoughtsMounted] = useState(initialPage === 'thoughts')

  const showPage = (nextPage: AppPage) => {
    setPage(nextPage)
    if (nextPage === 'home') {
      if (!homeMounted) setHomeStartsEntered(true)
      setHomeMounted(true)
    }
    else if (nextPage === 'favorites') setFavoritesMounted(true)
    else setThoughtsMounted(true)
  }

  const transitionPage = (update: () => void) => {
    const transitionDocument = document as Document & { startViewTransition?: (callback: () => void) => unknown }
    if (transitionDocument.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      transitionDocument.startViewTransition(() => flushSync(update))
    } else update()
  }

  const navigate = (path: string) => {
    const url = new URL(path, window.location.href)
    transitionPage(() => {
      window.history.pushState({ portfolioPage: true }, '', `${url.pathname}${url.search}${url.hash}`)
      showPage(pageFromPath(url.pathname))
    })
  }

  useEffect(() => {
    const onPopState = () => transitionPage(() => showPage(pageFromPath(window.location.pathname)))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return <>
    {homeMounted && <div className={`page-route ${page === 'home' ? 'is-current' : ''}`} hidden={page !== 'home'}><HomePage startEntered={homeStartsEntered} onFavorites={() => navigate('./favorites.html')} onThoughts={() => navigate('./thoughts.html')} /></div>}
    {favoritesMounted && <div className={`page-route ${page === 'favorites' ? 'is-current' : ''}`} hidden={page !== 'favorites'}><FavoritesPage onHome={() => navigate('./')} onThoughts={() => navigate('./thoughts.html')} /></div>}
    {thoughtsMounted && <div hidden={page !== 'thoughts'}><ThoughtsPage onHome={() => navigate('./')} /></div>}
  </>
}

export default App
