import { randomUUID } from 'node:crypto'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { config } from '../config/env.js'
import { normalizeImage } from './image-processing.js'

const bucket = config.minio.bucket
const publicEndpoint = config.minio.publicUrl.replace(/\/$/, '')
const endpoint = config.minio.endpoint

const client = new S3Client({
  endpoint,
  region: config.minio.region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
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

export async function checkImageStorage(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
      return
    } catch (error) {
      if (attempt === 29) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}

export async function saveMedicineImage(file: Express.Multer.File): Promise<string> {
  const body = await normalizeImage(file.buffer)
  const key = `${randomUUID()}.jpg`
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentLength: body.length,
    ContentType: 'image/jpeg',
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
