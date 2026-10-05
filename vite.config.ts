import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { GET as getGitHubData } from './api/github'

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
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), githubApiDevRoute],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        favorites: 'favorites.html',
      },
    },
  },
})
