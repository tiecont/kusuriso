import { randomUUID } from 'node:crypto'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const bucket = process.env.MINIO_BUCKET ?? 'medicines'
const publicEndpoint = (process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000').replace(/\/$/, '')
const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000'

const client = new S3Client({
  endpoint,
  region: process.env.MINIO_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
})

export async function initializeImageStorage(): Promise<void> {
  let bucketReady = false

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
      bucketReady = true
      break
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      if (statusCode === 404 || (error as Error).name === 'NotFound') {
        await client.send(new CreateBucketCommand({ Bucket: bucket }))
        bucketReady = true
        break
      }
      if (attempt === 29) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  if (!bucketReady) throw new Error('Could not initialize MinIO bucket')

  await client.send(new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      }],
    }),
  }))
}

export async function saveMedicineImage(file: Express.Multer.File): Promise<string> {
  const extension = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
  const key = `${randomUUID()}.${extension}`
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentLength: file.size,
    ContentType: file.mimetype,
  }))
  return `${publicEndpoint}/${bucket}/${key}`
}

export async function removeMedicineImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return

  try {
    const url = new URL(imageUrl)
    if (url.origin !== new URL(publicEndpoint).origin) return
    const key = decodeURIComponent(url.pathname.slice(`/${bucket}/`.length))
    if (!url.pathname.startsWith(`/${bucket}/`) || !key || key.includes('/')) return
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch {
    // Removing an old image must not fail the medicine record update.
  }
}
