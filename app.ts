import express from 'express'
import helmet from 'helmet'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { config } from './config/env.js'
import router from './routes/router.js'

export const app = express()
app.disable('x-powered-by')
app.set('view engine', 'pug')
app.set('views', resolve(process.cwd(), 'views'))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', new URL(config.minio.publicUrl).origin],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
    },
  },
  hsts: config.nodeEnv === 'production',
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
app.use((req, res, next) => {
  const requestId = randomUUID()
  const started = performance.now()
  res.setHeader('X-Request-ID', requestId)
  res.locals.requestId = requestId
  res.on('finish', () => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', request_id: requestId,
      method: req.method, path: req.path, status: res.statusCode, duration_ms: Math.round(performance.now() - started) }))
  })
  next()
})
app.use(express.urlencoded({ extended: false, limit: '64kb' }))
app.use(express.json({ limit: '64kb' }))
app.use(express.static(resolve(process.cwd(), 'public')))
app.use(router)
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', request_id: res.locals.requestId,
    error: error instanceof Error ? error.stack : String(error) }))
  res.status(500).send('Đã có lỗi xảy ra. Vui lòng thử lại sau.')
})
