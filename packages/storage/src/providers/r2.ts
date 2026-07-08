import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '@adwyzors/config'
import { logger } from '@adwyzors/logger'
import type { StorageProvider } from '../types.js'

/**
 * R2StorageProvider
 * Connects to Cloudflare R2 using S3-compatible APIs.
 */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    const { r2 } = config.storage

    if (!r2.accountId || !r2.accessKeyId || !r2.secretAccessKey || !r2.bucket) {
      throw new Error(
        'Cloudflare R2 environment variables are missing. Please define them or set STORAGE_PROVIDER=local'
      )
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      },
    })
    this.bucket = r2.bucket
    this.publicUrl = r2.publicUrl
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<{ key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })

      await this.client.send(command)

      const url = this.getPublicUrl(key)
      logger.debug({ key, bucket: this.bucket }, 'File uploaded to Cloudflare R2')
      return { key, url }
    } catch (err) {
      logger.error({ err, key, bucket: this.bucket }, 'Cloudflare R2 upload failed')
      throw err
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.client.send(command)
      logger.debug({ key, bucket: this.bucket }, 'File deleted from Cloudflare R2')
    } catch (err) {
      logger.error({ err, key, bucket: this.bucket }, 'Cloudflare R2 delete failed')
      throw err
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    try {
      // In S3-compatible SDK, signing requires GetObject command client builder
      const command = {
        Bucket: this.bucket,
        Key: key,
      } as any
      
      // Use getS3SignedUrl from request-presigner
      // We pass the command constructor
      const { GetObjectCommand } = await import('@aws-sdk/client-s3')
      const getCommand = new GetObjectCommand(command)
      
      return await getS3SignedUrl(this.client, getCommand, { expiresIn })
    } catch (err) {
      logger.error({ err, key, bucket: this.bucket }, 'Cloudflare R2 sign URL failed')
      throw err
    }
  }

  getPublicUrl(key: string): string {
    if (!this.publicUrl) {
      return ''
    }
    // Ensure public URL has trailing slash
    const base = this.publicUrl.endsWith('/') ? this.publicUrl : `${this.publicUrl}/`
    return `${base}${key}`
  }
}
