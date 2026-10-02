import express from 'express'
import { resolve } from 'node:path'
import router from './routes/router.js'
import { initializeDatabase, pool } from './data/database.js'
import { initializeImageStorage } from './data/image-storage.js'

const server = express()

server.set('view engine', 'pug')
server.set('views', resolve(process.cwd(), 'views'))
server.use(express.urlencoded({ extended: false, limit: '64kb' }))
server.use(express.json({ limit: '64kb' }))
server.use(express.static(resolve(process.cwd(), 'public')))
server.use(router)

server.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(500).send('Đã có lỗi xảy ra. Vui lòng thử lại sau.')
})

const port = Number(process.env.PORT ?? 3000)

if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET ?? ''
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  const invalidJwtSecret = jwtSecret.length < 32 || jwtSecret === 'local-only-jwt-secret-change-me'
    || jwtSecret.includes('replace-with')
  const invalidAdminPassword = adminPassword.length < 12 || adminPassword === 'admin123'
    || adminPassword.startsWith('change-this')
  const insecureCookie = process.env.COOKIE_SECURE !== 'true'

  if (invalidJwtSecret || invalidAdminPassword || insecureCookie) {
    console.error('Production startup requires a unique JWT_SECRET (32+ characters), a strong ADMIN_PASSWORD, and COOKIE_SECURE=true.')
    process.exit(1)
  }
}

Promise.all([initializeDatabase(), initializeImageStorage()])
  .then(() => {
    server.listen(port, () => {
      console.log(`Kusuriso is listening on port ${port}`)
    })
  })
  .catch(async (error: unknown) => {
    console.error('Application startup failed:', error)
    await pool.end()
    process.exitCode = 1
  })
