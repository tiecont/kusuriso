import sharp from 'sharp'

export async function normalizeImage(buffer: Buffer): Promise<Buffer> {
  let image
  let metadata
  try {
    image = sharp(buffer, { failOn: 'error', limitInputPixels: 20_000_000 })
    metadata = await image.metadata()
  } catch {
    throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP hợp lệ.')
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || !metadata.width || !metadata.height) {
    throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP hợp lệ.')
  }
  if (metadata.width > 5000 || metadata.height > 5000 || metadata.width * metadata.height > 20_000_000) {
    throw new Error('Ảnh tải lên có kích thước quá lớn.')
  }
  try { return await image.rotate().jpeg({ quality: 82 }).toBuffer() }
  catch { throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP hợp lệ.') }
}
