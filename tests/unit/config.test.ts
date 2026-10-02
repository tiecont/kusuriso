import { describe, expect, it } from 'vitest'

const valid = {
  NODE_ENV: 'production', PORT: '3000', PGHOST: 'db.example', PGPORT: '5432', PGUSER: 'medicine',
  PGPASSWORD: 'database-secret', PGDATABASE: 'medicine', ADMIN_USER: 'owner',
  ADMIN_PASSWORD: 'a-strong-admin-password', JWT_SECRET: 'random-jwt-secret-at-least-32-characters',
  COOKIE_SECURE: 'true', MINIO_ENDPOINT: 'https://storage.example', MINIO_PUBLIC_URL: 'https://cdn.example',
  MINIO_BUCKET: 'medicines', MINIO_ACCESS_KEY: 'storage-user', MINIO_SECRET_KEY: 'storage-secret',
}

Object.assign(process.env, valid)
const { parseConfig } = await import('../../config/env.js')

describe('environment configuration', () => {
  it('uses DATABASE_URL exclusively when present', () => {
    const result = parseConfig({ ...valid, DATABASE_URL: 'postgres://url-user:url-password@remote.example:5433/other' })
    expect(result.database).toEqual({ connectionString: 'postgres://url-user:url-password@remote.example:5433/other' })
  })
  it('uses PG fields without DATABASE_URL', () => {
    expect(parseConfig(valid).database).toMatchObject({ host: 'db.example', port: 5432, user: 'medicine' })
  })
  it.each([
    [{ JWT_SECRET: 'short' }, 'JWT_SECRET'],
    [{ ADMIN_PASSWORD: undefined }, 'ADMIN_PASSWORD'],
    [{ PGPASSWORD: undefined }, 'PGPASSWORD'],
    [{ PGPASSWORD: 'medicine-local-password' }, 'PGPASSWORD'],
    [{ MINIO_SECRET_KEY: undefined }, 'MINIO_SECRET_KEY'],
    [{ MINIO_SECRET_KEY: 'minio-local-password' }, 'MINIO_SECRET_KEY'],
    [{ COOKIE_SECURE: 'false' }, 'COOKIE_SECURE'],
    [{ DATABASE_URL: 'postgres://bad' }, 'DATABASE_URL'],
  ])('fails fast for invalid %o', (override, name) => {
    expect(() => parseConfig({ ...valid, ...override })).toThrow(name)
  })
})
