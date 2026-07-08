import fs from 'fs/promises'
import path from 'path'
import { config } from '@adwyzors/config'
import { logger } from '@adwyzors/logger'
import type { StorageProvider } from '../types.js'

/**
 * LocalStorageProvider
 * Saves files to the local disk. Ideal for development and local testing.
 */
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string

  constructor() {
    // Save to a local 'uploads' directory in the workspace root
    this.uploadDir = path.resolve(process.cwd(), 'uploads')
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true })
    } catch (err) {
      logger.error({ err, path: this.uploadDir }, 'Failed to create local upload directory')
      throw err
    }
  }

  async upload(key: string, body: Buffer, _contentType: string): Promise<{ key: string; url: string }> {
    await this.ensureDirectoryExists()
    const filePath = path.join(this.uploadDir, key)
    
    // Ensure subdirectories inside upload directory exist
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, body)

    logger.debug({ key, filePath }, 'File uploaded locally')

    // Local URL points to the local dev server public assets route
    const url = `${config.app.appUrl}/api/storage/local/${key}`
    return { key, url }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(filePath)
      logger.debug({ key, filePath }, 'File deleted locally')
    } catch (err: any) {
      // If file doesn't exist, ignore error
      if (err.code !== 'ENOENT') {
        logger.error({ err, key, filePath }, 'Failed to delete local file')
        throw err
      }
    }
  }

  async getSignedUrl(key: string, _expiresIn: number): Promise<string> {
    // Local provider returns the direct local URL (no signing mechanism for local development simplicity)
    return `${config.app.appUrl}/api/storage/local/${key}`
  }

  getPublicUrl(key: string): string {
    return `${config.app.appUrl}/api/storage/local/${key}`
  }
}
