import { randomUUID } from 'node:crypto'
import { pool } from './database.js'

export type Medicine = {
  id: string
  slug: string
  name: string
  generic_name: string
  brands: string[]
  category: string
  summary: string
  description: string
  uses: string
  directions: string
  side_effects: string
  warnings: string
  image_url: string | null
  featured: boolean
  is_demo: boolean
  created_at: Date
  updated_at: Date
}

export type MedicineInput = Omit<Medicine, 'id' | 'slug' | 'created_at' | 'updated_at' | 'is_demo'> & {
  slug?: string
}

export type PublicMedicine = {
  slug: string
  name: string
  genericName: string
  brands: string[]
  category: string
  summary: string
  description: string
  uses: string
  directions: string
  sideEffects: string
  warnings: string
  imageUrl: string | null
  featured: boolean
  isDemo: boolean
}

export function toPublicMedicine(medicine: Medicine): PublicMedicine {
  return {
    slug: medicine.slug, name: medicine.name, genericName: medicine.generic_name, brands: medicine.brands,
    category: medicine.category, summary: medicine.summary, description: medicine.description,
    uses: medicine.uses, directions: medicine.directions, sideEffects: medicine.side_effects,
    warnings: medicine.warnings, imageUrl: medicine.image_url, featured: medicine.featured,
    isDemo: medicine.is_demo,
  }
}

export function toLegacyMedicine(medicine: Medicine): Record<string, unknown> {
  return {
    slug: medicine.slug, name: medicine.name, generic_name: medicine.generic_name, brands: medicine.brands,
    category: medicine.category, summary: medicine.summary, description: medicine.description,
    uses: medicine.uses, directions: medicine.directions, side_effects: medicine.side_effects,
    warnings: medicine.warnings, image_url: medicine.image_url, featured: medicine.featured,
    is_demo: medicine.is_demo,
  }
}

export async function searchMedicines(query = '', category = '', limit = 30, offset = 0): Promise<Medicine[]> {
  const conditions: string[] = []
  const values: Array<string | number> = []

  if (query.trim()) {
    const escapedQuery = query.trim().replace(/[\\%_]/g, '\\$&')
    values.push(`%${escapedQuery}%`)
    conditions.push(`(
      name ILIKE $${values.length} ESCAPE '\\'
      OR generic_name ILIKE $${values.length} ESCAPE '\\'
      OR array_to_string(brands, ' ') ILIKE $${values.length} ESCAPE '\\'
    )`)
  }

  if (category.trim()) {
    values.push(category.trim())
    conditions.push(`category = $${values.length}`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  values.push(Math.min(Math.max(limit, 1), 50), Math.max(offset, 0))
  const { rows } = await pool.query<Medicine>(
    `SELECT * FROM medicines ${whereClause} ORDER BY featured DESC, name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )
  return rows
}

export async function listMedicines(): Promise<Medicine[]> {
  const { rows } = await pool.query<Medicine>('SELECT * FROM medicines ORDER BY name ASC')
  return rows
}

export async function getCategories(): Promise<string[]> {
  const { rows } = await pool.query<{ category: string }>(
    'SELECT DISTINCT category FROM medicines ORDER BY category ASC',
  )
  return rows.map((row) => row.category)
}

export async function getMedicineBySlug(slug: string): Promise<Medicine | undefined> {
  const { rows } = await pool.query<Medicine>('SELECT * FROM medicines WHERE slug = $1', [slug])
  return rows[0]
}

export async function getMedicinesBySlugs(slugs: string[]): Promise<Medicine[]> {
  if (!slugs.length) return []
  const { rows } = await pool.query<Medicine>(
    'SELECT * FROM medicines WHERE slug = ANY($1::text[]) ORDER BY array_position($1::text[], slug)',
    [slugs],
  )
  return rows
}

export async function getMedicineById(id: string): Promise<Medicine | undefined> {
  const { rows } = await pool.query<Medicine>('SELECT * FROM medicines WHERE id = $1', [id])
  return rows[0]
}

export async function createMedicine(input: MedicineInput): Promise<Medicine> {
  const slug = input.slug || `${slugify(input.name)}-${randomUUID().slice(0, 8)}`
  const { rows } = await pool.query<Medicine>(
    `INSERT INTO medicines (
      id, slug, name, generic_name, brands, category, summary, description,
      uses, directions, side_effects, warnings, image_url, featured
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      randomUUID(), slug, input.name, input.generic_name, input.brands, input.category,
      input.summary, input.description, input.uses, input.directions, input.side_effects,
      input.warnings, input.image_url, input.featured,
    ],
  )
  return rows[0]
}

export async function updateMedicine(id: string, input: MedicineInput): Promise<Medicine | undefined> {
  const { rows } = await pool.query<Medicine>(
    `UPDATE medicines SET
      name = $2, generic_name = $3, brands = $4, category = $5, summary = $6,
      description = $7, uses = $8, directions = $9, side_effects = $10,
      warnings = $11, image_url = $12, featured = $13, updated_at = now()
    WHERE id = $1 RETURNING *`,
    [
      id, input.name, input.generic_name, input.brands, input.category, input.summary,
      input.description, input.uses, input.directions, input.side_effects,
      input.warnings, input.image_url, input.featured,
    ],
  )
  return rows[0]
}

export async function deleteMedicine(id: string): Promise<Medicine | undefined> {
  const { rows } = await pool.query<Medicine>('DELETE FROM medicines WHERE id = $1 RETURNING *', [id])
  return rows[0]
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'thuoc'
}
