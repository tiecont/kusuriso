import { checkDatabaseSchema, migrateDatabase, pool, seedDatabase, waitForDatabase } from '../data/database.js'

try {
  await waitForDatabase()
  if (process.argv[2] === 'migrate') await migrateDatabase()
  else if (process.argv[2] === 'seed') {
    await checkDatabaseSchema()
    if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production')
    await seedDatabase()
  } else throw new Error('Use migrate or seed')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
