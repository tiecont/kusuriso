import { initializeImageStorage } from '../data/image-storage.js'

try {
  await initializeImageStorage()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
