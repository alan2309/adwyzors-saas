import { config } from '@adwyzors/config'
import { prisma } from '@adwyzors/database'
import { logger } from '@adwyzors/logger'
import { UnauthorizedError } from '@adwyzors/shared'
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import './types.js'

const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: config.auth.secret,

  session: {
    strategy: 'jwt',
    maxAge: config.auth.sessionMaxAge,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        // Validate input shape
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) {
          throw new UnauthorizedError('Invalid credentials format')
        }

        const { email, password } = parsed.data

        // Look up user with roles
        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null, status: 'active' },
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        })

        if (!user?.passwordHash) {
          // Timing-safe: always compare even if user not found
          await bcrypt.compare(password, '$2b$12$invalid.hash.to.prevent.timing.attacks')
          logger.warn({ email }, 'Login attempt for unknown user')
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          logger.warn({ email, userId: user.id }, 'Failed login attempt — invalid password')
          return null
        }

        // Get primary role (first assigned role)
        const primaryRole = user.userRoles[0]?.role.name ?? 'TENANT_USER'

        logger.info({ email, userId: user.id, role: primaryRole }, 'User signed in successfully')

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: primaryRole,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      // On first sign-in, user object is populated — persist to token
      if (user) {
        token.userId = user.id ?? ''
        token.tenantId = user.tenantId
        token.role = user.role
      }
      return token
    },

    session({ session, token }) {
      // Shape the session from the JWT token.
      // Cast needed because Auth.js types session.user as AdapterUser,
      // but with JWT strategy there is no adapter — we control the shape entirely.
      // The actual session user type is defined in src/types.ts via module augmentation.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(session as any).user = {
        userId: token.userId,
        tenantId: token.tenantId,
        role: token.role,
        email: token.email ?? '',
        name: token.name ?? '',
      }
      return session
    },
  },
})
