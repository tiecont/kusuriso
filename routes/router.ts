import { timingSafeEqual } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'
import { config } from '../config/env.js'
import { pool } from '../data/database.js'
import {
  createMedicine,
  deleteMedicine,
  getCategories,
  getMedicineById,
  getMedicineBySlug,
  getMedicinesBySlugs,
  listMedicines,
  searchMedicines,
  toLegacyMedicine,
  toPublicMedicine,
  updateMedicine,
  type Medicine,
  type MedicineInput,
} from '../data/medicine-store.js'
import { removeMedicineImage, saveMedicineImage } from '../data/image-storage.js'

const router = express.Router()
const cookieName = 'kusuriso_admin'
const jwtSecret = config.jwt.secret
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${stringValue(req.body?.username).toLowerCase().slice(0, 80)}`,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode === 302 && res.getHeader('Location') === '/admin',
  message: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau.' })
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(null, true)
    } else {
      callback(new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.'))
    }
  },
})

router.use((req, res, next) => {
  res.locals.isAdmin = hasAdminSession(req)
  next()
})

router.use('/api', apiLimiter)
router.use('/admin', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  const origin = req.get('origin')
  try {
    if (origin) {
      const parsed = new URL(origin)
      const expectedProtocol = config.jwt.cookieSecure ? 'https:' : `${req.protocol}:`
      if (parsed.host === req.get('host') && parsed.protocol === expectedProtocol) return next()
    }
  } catch { /* Invalid origins are rejected below. */ }
  return res.status(403).send('Nguồn yêu cầu không hợp lệ.')
})

router.get('/', async (req, res) => {
  const query = stringValue(req.query.q).trim().slice(0, 120)
  const category = stringValue(req.query.category)
  const page = Math.min(Math.max(Number.parseInt(stringValue(req.query.page), 10) || 1, 1), 334)
  const [medicines, categories] = await Promise.all([
    searchMedicines(query, category, 31, (page - 1) * 30),
    getCategories(),
  ])

  res.render('medicines/index', {
    title: 'Tra cứu thuốc | Kusuriso',
    medicines: medicines.slice(0, 30),
    categories,
    query,
    selectedCategory: category,
    page,
    hasNextPage: medicines.length > 30,
    pageType: 'home',
  })
})

router.get('/thuoc/:slug', async (req, res) => {
  const medicine = await getMedicineBySlug(stringValue(req.params.slug))
  if (!medicine) return res.status(404).render('not-found', { title: 'Không tìm thấy thuốc | Kusuriso' })

  res.render('medicines/detail', {
    title: `${medicine.name} | Kusuriso`,
    medicine,
    recentMedicine: medicine,
    pageType: 'detail',
  })
})

router.get(['/api/medicines', '/api/v1/medicines'], async (req, res) => {
  const query = stringValue(req.query.q).trim()
  if (query.length > 120) return res.status(400).json({ error: 'Từ khóa tối đa 120 ký tự.' })
  const limit = parsePageNumber(req.query.limit, 30, 50)
  const offset = parsePageNumber(req.query.offset, 0, 10000)
  if (limit === null || limit === 0 || offset === null) return res.status(400).json({ error: 'Phân trang không hợp lệ.' })
  const medicines = await searchMedicines(query, stringValue(req.query.category), limit, offset)
  res.json(medicines.map(req.path.startsWith('/api/v1/') ? toPublicMedicine : toLegacyMedicine))
})

router.get(['/api/medicines/by-slug', '/api/v1/medicines/by-slug'], async (req, res) => {
  const slugs = stringValue(req.query.slugs).split(',').filter(Boolean).slice(0, 50)
  res.json((await getMedicinesBySlugs(slugs)).map(req.path.startsWith('/api/v1/') ? toPublicMedicine : toLegacyMedicine))
})

router.get(['/api/medicines/:slug', '/api/v1/medicines/:slug'], async (req, res) => {
  const medicine = await getMedicineBySlug(stringValue(req.params.slug))
  if (!medicine) return res.status(404).json({ error: 'Không tìm thấy thuốc.' })
  res.json(req.path.startsWith('/api/v1/') ? toPublicMedicine(medicine) : toLegacyMedicine(medicine))
})

router.get('/admin/login', (req, res) => {
  if (hasAdminSession(req)) return res.redirect('/admin')
  res.render('admin/login', {
    title: 'Đăng nhập quản trị | Kusuriso',
    hasError: stringValue(req.query.error) === '1',
  })
})

router.post('/admin/login', loginLimiter, (req, res) => {
  const username = config.admin.user
  const password = config.admin.password
  if (!secureEquals(stringValue(req.body.username), username) || !secureEquals(stringValue(req.body.password), password)) {
    return res.redirect('/admin/login?error=1')
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, {
    algorithm: 'HS256',
    subject: username,
    issuer: 'kusuriso',
    audience: 'kusuriso-admin',
    expiresIn: '8h',
  })
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.jwt.cookieSecure,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })
  return res.redirect('/admin')
})

router.use('/admin', requireAdmin)

router.post('/admin/logout', (_req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', path: '/' })
  res.redirect('/')
})

router.get('/admin', async (req, res) => {
  const medicines = await listMedicines()
  res.render('admin/index', {
    title: 'Quản trị thư viện | Kusuriso',
    medicines,
    notice: noticeText(stringValue(req.query.status)),
  })
})

router.get('/admin/new', async (_req, res) => {
  res.render('admin/form', {
    title: 'Thêm thuốc | Kusuriso',
    medicine: emptyMedicine(),
    categories: await getCategories(),
    isEditing: false,
    error: '',
  })
})

router.post('/admin/new', upload.single('image'), async (req, res) => {
  const input = medicineInput(req.body, null)
  const validationError = validateMedicine(input)
  if (validationError) {
    return renderFormError(res, input, false, validationError)
  }

  let imageUrl: string | null = null
  try {
    if (req.file) imageUrl = await saveMedicineImage(req.file)
    await createMedicine({ ...input, image_url: imageUrl })
    return res.redirect('/admin?status=created')
  } catch (error) {
    await removeMedicineImage(imageUrl)
    if (isImageError(error)) return renderFormError(res, input, false, error.message)
    throw error
  }
})

router.get('/admin/:id/edit', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) return res.status(400).send('ID thuốc không hợp lệ.')
  const medicine = await getMedicineById(req.params.id)
  if (!medicine) return res.status(404).render('not-found', { title: 'Không tìm thấy thuốc | Kusuriso' })

  res.render('admin/form', {
    title: `Sửa ${medicine.name} | Kusuriso`,
    medicine,
    categories: await getCategories(),
    isEditing: true,
    error: '',
  })
})

router.post('/admin/:id', upload.single('image'), async (req, res) => {
  const id = stringValue(req.params.id)
  if (!uuidPattern.test(id)) return res.status(400).send('ID thuốc không hợp lệ.')
  const existing = await getMedicineById(id)
  if (!existing) return res.status(404).render('not-found', { title: 'Không tìm thấy thuốc | Kusuriso' })

  const input = medicineInput(req.body, existing.image_url)
  const validationError = validateMedicine(input)
  if (validationError) {
    return renderFormError(res, input, true, validationError, existing.id)
  }

  let newImageUrl: string | null = null
  try {
    if (req.file) newImageUrl = await saveMedicineImage(req.file)
    const updated = await updateMedicine(id, {
      ...input,
      image_url: newImageUrl ?? existing.image_url,
    })
    if (!updated) return res.status(404).render('not-found', { title: 'Không tìm thấy thuốc | Kusuriso' })
    if (newImageUrl && existing.image_url !== newImageUrl) await removeMedicineImage(existing.image_url)
    return res.redirect('/admin?status=saved')
  } catch (error) {
    await removeMedicineImage(newImageUrl)
    if (isImageError(error)) return renderFormError(res, input, true, error.message, existing.id)
    throw error
  }
})

router.post('/admin/:id/delete', async (req, res) => {
  if (!uuidPattern.test(req.params.id)) return res.status(400).send('ID thuốc không hợp lệ.')
  const deleted = await deleteMedicine(req.params.id)
  if (!deleted) return res.status(404).render('not-found', { title: 'Không tìm thấy thuốc | Kusuriso' })
  await removeMedicineImage(deleted.image_url)
  res.redirect('/admin?status=deleted')
})

router.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' })
})

router.get('/readyz', async (_req, res) => {
  try {
    await pool.query('SELECT 1 FROM schema_migrations LIMIT 1')
    res.json({ status: 'ready' })
  } catch {
    res.status(503).json({ status: 'unavailable' })
  }
})

router.use((req, res) => {
  res.status(404).render('not-found', { title: 'Không tìm thấy trang | Kusuriso' })
})

router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).send(error.code === 'LIMIT_FILE_SIZE'
      ? 'Ảnh tải lên tối đa 4 MB.'
      : 'Không thể nhận tệp ảnh này.')
  }
  if (error instanceof Error && (error.message.startsWith('Vui lòng chọn ảnh') || error.message.startsWith('Ảnh tải lên'))) {
    return res.status(400).send(error.message)
  }
  return next(error)
})

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!hasAdminSession(req)) {
    res.redirect('/admin/login')
    return
  }
  next()
}

function hasAdminSession(req: Request): boolean {
  const token = cookieValue(req, cookieName)
  if (!token) return false
  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'kusuriso',
      audience: 'kusuriso-admin',
    })
    return typeof payload !== 'string'
      && payload.role === 'admin'
      && payload.sub === config.admin.user
  } catch {
    return false
  }
}

function cookieValue(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(';') ?? []
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split('=')
    if (key === name) return decodeURIComponent(parts.join('='))
  }
  return undefined
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isImageError(error: unknown): error is Error {
  return error instanceof Error && (error.message.startsWith('Vui lòng chọn ảnh') || error.message.startsWith('Ảnh tải lên'))
}

function parsePageNumber(value: unknown, defaultValue: number, max: number): number | null {
  if (value === undefined) return defaultValue
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return Math.min(parsed, max)
}

function medicineInput(body: Record<string, unknown>, imageUrl: string | null): MedicineInput {
  const brands = stringValue(body.brands)
    .split(/[\n,;]+/)
    .map((brand) => brand.trim())
    .filter(Boolean)
    .slice(0, 12)

  return {
    slug: '',
    name: stringValue(body.name).trim(),
    generic_name: stringValue(body.generic_name).trim(),
    brands,
    category: stringValue(body.category).trim(),
    summary: stringValue(body.summary).trim(),
    description: stringValue(body.description).trim(),
    uses: stringValue(body.uses).trim(),
    directions: stringValue(body.directions).trim(),
    side_effects: stringValue(body.side_effects).trim(),
    warnings: stringValue(body.warnings).trim(),
    image_url: imageUrl,
    featured: body.featured === 'on',
  }
}

function validateMedicine(medicine: MedicineInput): string {
  if (!medicine.name || !medicine.category || !medicine.summary) {
    return 'Vui lòng điền tên thuốc, nhóm thuốc và phần giới thiệu ngắn.'
  }
  if (!medicine.description || !medicine.uses || !medicine.directions || !medicine.side_effects || !medicine.warnings) {
    return 'Vui lòng hoàn thiện các mục thông tin và lưu ý an toàn.'
  }
  if (medicine.name.length > 120 || medicine.summary.length > 280 || medicine.category.length > 80) {
    return 'Tên, nhóm thuốc hoặc phần giới thiệu đang vượt quá độ dài cho phép.'
  }
  return ''
}

function emptyMedicine(): Partial<Medicine> & { brands: string[] } {
  return {
    name: '', generic_name: '', brands: [], category: '', summary: '', description: '',
    uses: '', directions: '', side_effects: '', warnings: '', image_url: null, featured: false,
  }
}

async function renderFormError(
  res: Response,
  medicine: MedicineInput,
  isEditing: boolean,
  error: string,
  id?: string,
): Promise<void> {
  const categories = await getCategories()
  res.status(400).render('admin/form', {
    title: isEditing ? 'Sửa thông tin thuốc | Kusuriso' : 'Thêm thuốc | Kusuriso',
    medicine: { ...medicine, id },
    categories,
    isEditing,
    error,
  })
}

function noticeText(status: string): string {
  const notices: Record<string, string> = {
    created: 'Đã thêm thuốc vào thư viện.',
    saved: 'Đã lưu thay đổi.',
    deleted: 'Đã xóa thuốc khỏi thư viện.',
  }
  return notices[status] ?? ''
}

export default router
