/**
 * Auth.js v5 Session type augmentation.
 * Extends the default Session/JWT types to include
 * tenant-aware fields that every API request requires.
 */
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      userId: string
      tenantId: string
      role: string
      email: string
      name: string
    }
  }

  interface User {
    tenantId: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    tenantId: string
    role: string
  }
}

export type { Session } from 'next-auth'
