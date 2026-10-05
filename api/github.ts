type GitHubRepository = {
  id: number
  name: string
  html_url: string
  description: string | null
  language: string | null
  updated_at: string
  fork: boolean
  archived: boolean
}

type GitHubEvent = {
  id: string
  type: string
  created_at: string
  repo: { name: string }
  payload: { action?: string; ref_type?: string }
}

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  'Content-Type': 'application/json; charset=utf-8',
}
const noCacheHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
}
const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export async function GET() {
  try {
    const [reposResponse, eventsResponse] = await Promise.all([
      fetch('https://api.github.com/users/Melancholy-528/repos?sort=updated&per_page=100', { headers: githubHeaders }),
      fetch('https://api.github.com/users/Melancholy-528/events/public?per_page=30', { headers: githubHeaders }),
    ])
    const [repositories, events] = await Promise.all([
      reposResponse.ok ? reposResponse.json() as Promise<GitHubRepository[]> : Promise.resolve(null),
      eventsResponse.ok ? eventsResponse.json() as Promise<GitHubEvent[]> : Promise.resolve(null),
    ])

    if (!repositories && !events) {
      return Response.json({ repositories: [], events: [], repositoriesFailed: true, eventsFailed: true }, { status: 502, headers: noCacheHeaders })
    }
    return Response.json({
      repositories: repositories || [],
      events: events || [],
      repositoriesFailed: !repositories,
      eventsFailed: !events,
    }, { headers: repositories && events ? cacheHeaders : noCacheHeaders })
  } catch {
    return Response.json({ repositories: [], events: [], repositoriesFailed: true, eventsFailed: true }, { status: 502, headers: noCacheHeaders })
  }
}
