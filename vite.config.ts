import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleSendEmail } from './api/send-email'

// Vercel serves api/send-email.ts as a real serverless function in prod, but
// `npm run dev` (plain Vite) has no idea /api routes exist — this dev-only
// middleware calls the exact same handleSendEmail() so the local dev
// experience matches the deployed one, rather than needing `vercel dev`.
function devApiSendEmail(): Plugin {
  return {
    name: 'dev-api-send-email',
    configureServer(server) {
      server.middlewares.use('/api/send-email', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}')
            const result = await handleSendEmail(payload)
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.body))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // vite.config.ts runs in Node, not the browser — reading RESEND_API_KEY
  // (deliberately NOT VITE_-prefixed) here via loadEnv is what keeps it out
  // of the client bundle. loadEnv's 3rd arg '' (no prefix filter) is needed
  // specifically because non-VITE_ vars are normally excluded.
  const env = loadEnv(mode, process.cwd(), '')
  process.env.RESEND_API_KEY ??= env.RESEND_API_KEY

  return {
    plugins: [
      tailwindcss(),
      react(),
      devApiSendEmail(),
    ],
  }
})
