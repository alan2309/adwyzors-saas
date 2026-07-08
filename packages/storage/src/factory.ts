import { config } from '@adwyzors/config'
import { LocalStorageProvider } from './providers/local.js'
import { R2StorageProvider } from './providers/r2.js'
import type { StorageProvider } from './types.js'

let providerInstance: StorageProvider | null = null

/**
 * Creates or retrieves the singleton instance of the configured StorageProvider.
 */
export function createStorageProvider(): StorageProvider {
  if (providerInstance) {
    return providerInstance
  }

  const providerType = config.storage.provider

  if (providerType === 'r2') {
    providerInstance = new R2StorageProvider()
  } else {
    providerInstance = new LocalStorageProvider()
  }

  return providerInstance
}
