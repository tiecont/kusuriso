import type { PoolConfig } from 'pg'

export type Config = {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  database: PoolConfig
  admin: { user: string; password: string }
  jwt: { secret: string; cookieSecure: boolean }
  minio: { endpoint: string; publicUrl: string; bucket: string; region: string; accessKey: string; secretKey: string }
}

export function parseConfig(env: NodeJS.ProcessEnv): Config {
  const required = (name: string): string => {
    const value = env[name]?.trim()
    if (!value || /^(change-this|replace-with|your-|<)/i.test(value)) throw new Error(`${name} is required and must not be a placeholder`)
    return value
  }
  const nodeEnv = env.NODE_ENV ?? 'development'
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be development, test, or production')
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port')
  const cookieSecure = env.COOKIE_SECURE === 'true'
  if (env.COOKIE_SECURE && !['true', 'false'].includes(env.COOKIE_SECURE)) throw new Error('COOKIE_SECURE must be true or false')
  if (nodeEnv === 'production' && !cookieSecure) throw new Error('COOKIE_SECURE must be true in production')

  let database: PoolConfig
  if (env.DATABASE_URL) {
    let url: URL
    try { url = new URL(env.DATABASE_URL) } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL') }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || !url.pathname.slice(1)) {
      throw new Error('DATABASE_URL must include host, user, password, and database')
    }
    if (nodeEnv === 'production' && decodeURIComponent(url.password) === 'medicine-local-password') {
      throw new Error('DATABASE_URL uses a development password')
    }
    database = { connectionString: env.DATABASE_URL }
  } else {
    const pgPort = Number(env.PGPORT ?? 5432)
    if (!Number.isInteger(pgPort) || pgPort < 1 || pgPort > 65535) throw new Error('PGPORT must be a valid TCP port')
    database = {
      host: env.PGHOST ?? 'localhost', port: pgPort,
      user: required('PGUSER'), password: required('PGPASSWORD'), database: required('PGDATABASE'),
    }
    if (nodeEnv === 'production' && database.password === 'medicine-local-password') throw new Error('PGPASSWORD uses a development password')
  }

  const password = required('ADMIN_PASSWORD')
  if (password === 'admin123' || (nodeEnv === 'production' && password.length < 12)) throw new Error('ADMIN_PASSWORD is weak')
  const secret = required('JWT_SECRET')
  if (secret.length < 32 || /^(local-only|development-jwt)/.test(secret)) throw new Error('JWT_SECRET must be at least 32 random characters')
  const endpoint = required('MINIO_ENDPOINT')
  const publicUrl = required('MINIO_PUBLIC_URL')
  if (nodeEnv === 'production' && (env.MINIO_ACCESS_KEY === 'minioadmin' || env.MINIO_SECRET_KEY === 'minio-local-password')) {
    throw new Error('MINIO_ACCESS_KEY or MINIO_SECRET_KEY uses development credentials')
  }
  for (const [name, value] of [['MINIO_ENDPOINT', endpoint], ['MINIO_PUBLIC_URL', publicUrl]]) {
    try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error() } catch { throw new Error(`${name} must be an HTTP URL`) }
  }
  return {
    nodeEnv: nodeEnv as Config['nodeEnv'], port, database,
    admin: { user: required('ADMIN_USER'), password },
    jwt: { secret, cookieSecure },
    minio: {
      endpoint, publicUrl, bucket: required('MINIO_BUCKET'), region: env.MINIO_REGION ?? 'us-east-1',
      accessKey: required('MINIO_ACCESS_KEY'), secretKey: required('MINIO_SECRET_KEY'),
    },
  }
}

export const config = parseConfig(process.env)
