import { env } from './env.js'

export const storageConfig = {
  provider: env.STORAGE_PROVIDER,
  r2: {
    accountId: env.R2_ACCOUNT_ID ?? '',
    accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: env.R2_BUCKET_NAME ?? '',
    publicUrl: env.R2_PUBLIC_URL ?? '',
    endpoint: env.R2_ACCOUNT_ID
      ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : '',
  },
} as const

export type StorageConfig = typeof storageConfig
