import { app } from './app.js'
import { config } from './config/env.js'
import { checkDatabaseSchema, pool, waitForDatabase } from './data/database.js'
import { checkImageStorage } from './data/image-storage.js'

try {
  await Promise.all([waitForDatabase(), checkImageStorage()])
  await checkDatabaseSchema()
  const httpServer = app.listen(config.port, () => console.log(`Kusuriso is listening on port ${config.port}`))
  let stopping = false
  async function shutdown(): Promise<void> {
    if (stopping) return
    stopping = true
    httpServer.close(async (error) => {
      try { await pool.end() } catch (poolError) { console.error(poolError); process.exitCode = 1 }
      if (error) { console.error(error); process.exitCode = 1 }
    })
    httpServer.closeIdleConnections()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
} catch (error) {
  console.error('Application startup failed:', error)
  await pool.end()
  process.exitCode = 1
}
