import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { GET as getGitHubData } from './api/github'
import { GET as getVisitorCount } from './api/visitors'
import { GET as getThoughts, POST as postThought } from './api/thoughts'

let localVisitorCount = 0
let localThoughts: { id: string; name: string; message: string; createdAt: string }[] = []
type DevRequest = { method?: string; on: (event: 'data' | 'end', listener: (chunk?: unknown) => void) => void }

const githubApiDevRoute: Plugin = {
  name: 'github-api-dev-route',
  configureServer(server) {
    server.middlewares.use('/api/github', (request, response, next) => {
      if ((request as typeof request & { method?: string }).method !== 'GET') return next()
      void getGitHubData().then(async (result) => {
        response.statusCode = result.status
        result.headers.forEach((value: string, name: string) => response.setHeader(name, value))
        response.end(await result.text())
      }).catch(() => {
        response.statusCode = 502
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ repositories: [], events: [], repositoriesFailed: true, eventsFailed: true }))
      })
    })
    server.middlewares.use('/api/visitors', (request, response, next) => {
      if ((request as typeof request & { method?: string }).method !== 'GET') return next()
      void getVisitorCount().then(async (result) => {
        if (result.status === 503) {
          localVisitorCount += 1
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.setHeader('Cache-Control', 'no-store')
          response.end(JSON.stringify({ count: localVisitorCount, localOnly: true }))
          return
        }
        response.statusCode = result.status
        result.headers.forEach((value: string, name: string) => response.setHeader(name, value))
        response.end(await result.text())
      }).catch(() => {
        response.statusCode = 502
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ error: 'counter_unavailable' }))
      })
    })
    server.middlewares.use('/api/thoughts', (request, response, next) => {
      const devRequest = request as unknown as DevRequest
      if (devRequest.method !== 'GET' && devRequest.method !== 'POST') return next()
      const sendJson = (status: number, body: unknown) => {
        response.statusCode = status
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(body))
      }
      if (devRequest.method === 'GET') {
        void getThoughts().then(async (result) => {
          if (result.status === 503) sendJson(200, { thoughts: localThoughts, localOnly: true })
          else {
            response.statusCode = result.status
            result.headers.forEach((value: string, name: string) => response.setHeader(name, value))
            response.end(await result.text())
          }
        }).catch(() => sendJson(502, { error: 'guestbook_unavailable' }))
        return
      }
      let body = ''
      devRequest.on('data', (chunk) => { body += String(chunk ?? '') })
      devRequest.on('end', () => {
        const webRequest = new Request('http://localhost/api/thoughts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        void postThought(webRequest).then(async (result) => {
          if (result.status !== 503) {
            response.statusCode = result.status
            result.headers.forEach((value: string, name: string) => response.setHeader(name, value))
            response.end(await result.text())
            return
          }
          try {
            const input = JSON.parse(body) as { name?: unknown; message?: unknown }
            const name = typeof input.name === 'string' ? input.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) : ''
            const message = typeof input.message === 'string' ? input.message.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 600) : ''
            if (!name || !message) return sendJson(400, { error: 'name_and_message_required' })
            localThoughts = [{ id: `local-${Date.now()}`, name, message, createdAt: new Date().toISOString() }, ...localThoughts].slice(0, 50)
            sendJson(200, { thoughts: localThoughts, localOnly: true })
          } catch { sendJson(400, { error: 'invalid_request' }) }
        }).catch(() => sendJson(502, { error: 'guestbook_unavailable' }))
      })
    })
  },
}

export default defineConfig(({ mode }) => {
  const processEnvironment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env
  if (processEnvironment) Object.assign(processEnvironment, loadEnv(mode, '.', ''))
  return {
    base: './',
    plugins: [react(), githubApiDevRoute],
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          favorites: 'favorites.html',
          thoughts: 'thoughts.html',
        },
      },
    },
  }
})
