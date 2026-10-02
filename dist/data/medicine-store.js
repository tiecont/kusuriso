import { randomUUID } from 'node:crypto';
import { pool } from './database.js';
export async function searchMedicines(query = '', category = '') {
    const conditions = [];
    const values = [];
    if (query.trim()) {
        const escapedQuery = query.trim().replace(/[\\%_]/g, '\\$&');
        values.push(`%${escapedQuery}%`);
        conditions.push(`(
      name ILIKE $${values.length} ESCAPE '\\'
      OR generic_name ILIKE $${values.length} ESCAPE '\\'
      OR array_to_string(brands, ' ') ILIKE $${values.length} ESCAPE '\\'
      OR category ILIKE $${values.length} ESCAPE '\\'
      OR summary ILIKE $${values.length} ESCAPE '\\'
      OR description ILIKE $${values.length} ESCAPE '\\'
      OR uses ILIKE $${values.length} ESCAPE '\\'
      OR directions ILIKE $${values.length} ESCAPE '\\'
      OR side_effects ILIKE $${values.length} ESCAPE '\\'
      OR warnings ILIKE $${values.length} ESCAPE '\\'
    )`);
    }
    if (category.trim()) {
        values.push(category.trim());
        conditions.push(`category = $${values.length}`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM medicines ${whereClause} ORDER BY featured DESC, name ASC`, values);
    return rows;
}
export async function getCategories() {
    const { rows } = await pool.query('SELECT DISTINCT category FROM medicines ORDER BY category ASC');
    return rows.map((row) => row.category);
}
export async function getMedicineBySlug(slug) {
    const { rows } = await pool.query('SELECT * FROM medicines WHERE slug = $1', [slug]);
    return rows[0];
}
export async function getMedicinesBySlugs(slugs) {
    if (!slugs.length)
        return [];
    const { rows } = await pool.query('SELECT * FROM medicines WHERE slug = ANY($1::text[]) ORDER BY array_position($1::text[], slug)', [slugs]);
    return rows;
}
export async function getMedicineById(id) {
    const { rows } = await pool.query('SELECT * FROM medicines WHERE id = $1', [id]);
    return rows[0];
}
export async function createMedicine(input) {
    const slug = input.slug || `${slugify(input.name)}-${randomUUID().slice(0, 8)}`;
    const { rows } = await pool.query(`INSERT INTO medicines (
      id, slug, name, generic_name, brands, category, summary, description,
      uses, directions, side_effects, warnings, image_url, featured
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`, [
        randomUUID(), slug, input.name, input.generic_name, input.brands, input.category,
        input.summary, input.description, input.uses, input.directions, input.side_effects,
        input.warnings, input.image_url, input.featured,
    ]);
    return rows[0];
}
export async function updateMedicine(id, input) {
    const { rows } = await pool.query(`UPDATE medicines SET
      name = $2, generic_name = $3, brands = $4, category = $5, summary = $6,
      description = $7, uses = $8, directions = $9, side_effects = $10,
      warnings = $11, image_url = $12, featured = $13, updated_at = now()
    WHERE id = $1 RETURNING *`, [
        id, input.name, input.generic_name, input.brands, input.category, input.summary,
        input.description, input.uses, input.directions, input.side_effects,
        input.warnings, input.image_url, input.featured,
    ]);
    return rows[0];
}
export async function deleteMedicine(id) {
    const { rows } = await pool.query('DELETE FROM medicines WHERE id = $1 RETURNING *', [id]);
    return rows[0];
}
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'thuoc';
}
