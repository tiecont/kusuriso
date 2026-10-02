import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { vi } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.PGHOST ??= '127.0.0.1'
process.env.PGPORT ??= '5434'
process.env.PGUSER ??= 'medicine'
process.env.PGPASSWORD ??= 'medicine-local-password'
process.env.PGDATABASE ??= 'medicine'
process.env.ADMIN_USER = 'test-admin'
process.env.ADMIN_PASSWORD = 'test-admin-password-123'
process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters'
process.env.COOKIE_SECURE = 'false'
process.env.MINIO_ENDPOINT = 'http://127.0.0.1:9000'
process.env.MINIO_PUBLIC_URL = 'http://127.0.0.1:9000'
process.env.MINIO_BUCKET = 'medicines'
process.env.MINIO_ACCESS_KEY = 'test-storage-user'
process.env.MINIO_SECRET_KEY = 'test-storage-password'

const { app } = await import('../../app.js')
const { migrateDatabase, pool, seedDatabase } = await import('../../data/database.js')
const origin = 'http://localhost'

beforeAll(async () => {
  await migrateDatabase()
  await seedDatabase()
})
afterAll(async () => { await pool.end() })

describe('search safety', () => {
  it.each(['paracetamol', 'acetaminophen', 'Panadol'])('finds Paracetamol by %s', async (query) => {
    const result = await request(app).get('/api/medicines').query({ q: query })
    expect(result.status).toBe(200)
    expect(result.body.some((medicine: { slug: string }) => medicine.slug === 'paracetamol')).toBe(true)
  })
  it('does not match warning and side effect text', async () => {
    const result = await request(app).get('/api/medicines').query({ q: 'khó thở' })
    expect(result.status).toBe(200)
    expect(result.body.map((medicine: { slug: string }) => medicine.slug)).not.toContain('ibuprofen')
    expect(result.body.map((medicine: { slug: string }) => medicine.slug)).not.toContain('amoxicillin')
  })
  it('supports v1 pagination without exposing internal fields', async () => {
    const result = await request(app).get('/api/v1/medicines').query({ limit: 1, offset: 0 })
    expect(result.status).toBe(200)
    expect(result.body).toHaveLength(1)
    expect(result.body[0]).toHaveProperty('slug')
    expect(result.body[0]).toHaveProperty('genericName')
    expect(result.body[0]).not.toHaveProperty('generic_name')
    expect(result.body[0]).not.toHaveProperty('id')
    expect(result.body[0]).not.toHaveProperty('created_at')
    expect((await request(app).get('/api/v1/medicines').query({ q: 'x'.repeat(121) })).status).toBe(400)
    expect((await request(app).get('/api/v1/medicines').query({ limit: 0 })).status).toBe(400)
  })
  it('connects through DATABASE_URL despite conflicting PG host fields', async () => {
    const { parseConfig } = await import('../../config/env.js')
    const database = parseConfig({ ...process.env, PGHOST: 'invalid.example',
      DATABASE_URL: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@127.0.0.1:${process.env.PGPORT}/${process.env.PGDATABASE}` }).database
    const { Pool } = await import('pg')
    const separatePool = new Pool(database)
    try { expect((await separatePool.query('SELECT 1 AS connected')).rows[0].connected).toBe(1) }
    finally { await separatePool.end() }
  })
})

describe('admin and HTTP boundaries', () => {
  it('protects admin and supports login', async () => {
    expect((await request(app).get('/admin')).status).toBe(302)
    const failed = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin).send('username=test-admin&password=wrong')
    expect(failed.headers.location).toBe('/admin/login?error=1')
    const success = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
      .send('username=test-admin&password=test-admin-password-123')
    expect(success.status).toBe(302)
    expect(success.headers['set-cookie']).toBeDefined()
  })
  it('rejects foreign origins and invalid UUIDs', async () => {
    const login = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
      .send('username=test-admin&password=test-admin-password-123')
    const cookie = login.headers['set-cookie']
    expect((await request(app).post('/admin/new').set('Origin', 'https://foreign.example').set('Cookie', cookie)).status).toBe(403)
    expect((await request(app).get('/admin/not-a-uuid/edit').set('Cookie', cookie)).status).toBe(400)
    expect((await request(app).post('/admin/not-a-uuid').set('Host', 'localhost').set('Origin', origin).set('Cookie', cookie)).status).toBe(400)
    expect((await request(app).post('/admin/not-a-uuid/delete').set('Host', 'localhost').set('Origin', origin).set('Cookie', cookie)).status).toBe(400)
  })
  it('renders four admin table cells per row', async () => {
    const login = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
      .send('username=test-admin&password=test-admin-password-123')
    const page = await request(app).get('/admin').set('Cookie', login.headers['set-cookie'])
    expect(page.status).toBe(200)
    expect(page.text).toMatch(/<tr>\s*<td>[\s\S]*?<\/td>\s*<td>[\s\S]*?<\/td>\s*<td>[\s\S]*?<\/td>\s*<td>/)
  })
  it('rejects disguised image content and preserves form data on validation errors', async () => {
    const login = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
      .send('username=test-admin&password=test-admin-password-123')
    const cookie = login.headers['set-cookie']
    const invalid = await request(app).post('/admin/new').set('Host', 'localhost').set('Origin', origin)
      .set('Cookie', cookie).send('name=Kept+name')
    expect(invalid.status).toBe(400)
    expect(invalid.text).toContain('Kept name')
    const fake = await request(app).post('/admin/new').set('Host', 'localhost').set('Origin', origin)
      .set('Cookie', cookie)
      .field('name', 'Upload test').field('category', 'Test').field('summary', 'Summary')
      .field('description', 'Description').field('uses', 'Uses').field('directions', 'Directions')
      .field('side_effects', 'Effects').field('warnings', 'Warnings')
      .attach('image', Buffer.from('not an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' })
    expect(fake.status).toBe(400)
    expect(fake.text).toContain('Upload test')
    expect(fake.text).toContain('Vui lòng chọn ảnh')
  })
  it('sets headers and distinguishes health from readiness', async () => {
    const page = await request(app).get('/healthz')
    expect(page.status).toBe(200)
    expect(page.headers['x-powered-by']).toBeUndefined()
    expect(page.headers['content-security-policy']).toContain("default-src 'self'")
    expect((await request(app).get('/readyz')).status).toBe(200)
    expect((await request(app).get('/does-not-exist')).status).toBe(404)
  })
  it('reports readiness failure without failing liveness', async () => {
    const mock = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('database down'))
    expect((await request(app).get('/readyz')).status).toBe(503)
    expect((await request(app).get('/healthz')).status).toBe(200)
    mock.mockRestore()
  })
  it('limits repeated login attempts', async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
        .send('username=rate-limit-target&password=wrong')
      expect(response.status).toBe(302)
    }
    const blocked = await request(app).post('/admin/login').set('Host', 'localhost').set('Origin', origin)
      .send('username=rate-limit-target&password=wrong')
    expect(blocked.status).toBe(429)
  })
})
