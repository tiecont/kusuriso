import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { normalizeImage } from '../../data/image-processing.js'

describe('image normalization', () => {
  it('rejects non-image content even when presented as an image', async () => {
    await expect(normalizeImage(Buffer.from('not an image'))).rejects.toThrow('Vui lòng chọn ảnh')
  })
  it('rejects excessive dimensions', async () => {
    const image = await sharp({ create: { width: 5001, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer()
    await expect(normalizeImage(image)).rejects.toThrow('kích thước quá lớn')
  })
  it('re-encodes a valid image as JPEG without metadata', async () => {
    const original = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#00aa88' } })
      .png().withMetadata({ orientation: 1 }).toBuffer()
    const output = await normalizeImage(original)
    const metadata = await sharp(output).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBe(20)
    expect(metadata.exif).toBeUndefined()
  })
})
