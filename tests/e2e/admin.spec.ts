import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test('admin table and actions remain usable', async ({ page }) => {
  const username = process.env.E2E_ADMIN_USER
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!username || !password) throw new Error('Set E2E_ADMIN_USER and E2E_ADMIN_PASSWORD')
  await page.goto('/admin/login')
  await page.getByLabel('Tên đăng nhập').fill(username)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const firstRow = page.locator('.medicine-table tbody tr').first()
  await expect(firstRow.locator('td')).toHaveCount(4)
  await expect(firstRow.getByRole('link', { name: 'Sửa' })).toBeVisible()
  await expect(firstRow.getByRole('button', { name: 'Xóa' })).toBeVisible()
  await firstRow.getByRole('link', { name: 'Sửa' }).click()
  await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible()
})

test('search copy and warning query', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('Tên thuốc, hoạt chất hoặc tên thương mại...')).toBeVisible()
  await page.getByPlaceholder('Tên thuốc, hoạt chất hoặc tên thương mại...').fill('khó thở')
  await page.getByRole('button', { name: 'Tìm kiếm' }).click()
  await expect(page.getByRole('heading', { name: 'Kết quả tra cứu' })).toBeVisible()
  await expect(page.locator('[data-medicine-card][data-slug="ibuprofen"]')).toHaveCount(0)
  await expect(page.locator('[data-medicine-card][data-slug="amoxicillin"]')).toHaveCount(0)
})

test('admin can create, edit, and delete a medicine', async ({ page }, testInfo) => {
  const username = process.env.E2E_ADMIN_USER
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!username || !password) throw new Error('Set E2E_ADMIN_USER and E2E_ADMIN_PASSWORD')
  const name = `Smoke ${testInfo.project.name} ${Date.now()}`
  await page.goto('/admin/login')
  await page.getByLabel('Tên đăng nhập').fill(username)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.getByRole('link', { name: 'Thêm thuốc' }).click()
  await page.getByLabel('Tên thuốc').fill(name)
  await page.getByLabel('Hoạt chất').fill('Smoke ingredient')
  await page.getByLabel('Nhóm thuốc').fill('Kiểm thử')
  await page.getByLabel('Giới thiệu ngắn').fill('Nội dung kiểm thử tạm thời.')
  await page.getByLabel('Thuốc này là gì?').fill('Mục kiểm thử nội bộ.')
  await page.getByLabel('Công dụng thường gặp').fill('Không dùng cho điều trị.')
  await page.getByLabel('Cách dùng và liều dùng').fill('Không dùng cho điều trị.')
  await page.getByLabel('Tác dụng không mong muốn').fill('Không áp dụng.')
  await page.getByLabel('Thận trọng').fill('Chỉ dành cho kiểm thử.')
  const image = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#00aa88' } }).png().toBuffer()
  await page.getByLabel('Ảnh bìa').setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: image })
  await page.getByRole('button', { name: 'Thêm vào thư viện' }).click()
  await expect(page).toHaveURL(/\/admin\?status=created/)
  const row = page.locator('.medicine-table tbody tr', { hasText: name })
  await expect(row).toBeVisible()
  await expect(row.locator('img')).toHaveAttribute('src', /\.jpg$/)
  await row.getByRole('link', { name: 'Sửa' }).click()
  await page.getByLabel('Giới thiệu ngắn').fill('Nội dung đã sửa.')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page).toHaveURL(/\/admin\?status=saved/)
  const editedRow = page.locator('.medicine-table tbody tr', { hasText: name })
  page.once('dialog', (dialog) => dialog.accept())
  await editedRow.getByRole('button', { name: 'Xóa' }).click()
  await expect(page).toHaveURL(/\/admin\?status=deleted/)
  await expect(page.locator('.medicine-table tbody tr', { hasText: name })).toHaveCount(0)
})
