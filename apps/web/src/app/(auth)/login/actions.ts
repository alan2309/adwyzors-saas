'use strict'
'use server'

import { signIn } from '@adwyzors/auth'
import { AuthError } from 'next-auth'

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter both email and password' }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: true,
      redirectTo: '/dashboard',
    })
    return { success: true }
  } catch (error) {
    // If redirect error, we must rethrow it so Next.js handles the redirection
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' }
        default:
          return { error: 'Authentication failed' }
      }
    }
    
    if (error instanceof Error) {
      // Auth.js uses a redirect error under the hood to perform redirects
      if (error.message === 'NEXT_REDIRECT' || error.message.includes('redirect')) {
        throw error
      }
    }
    
    // Otherwise return error
    return { error: 'Invalid email or password' }
  }
}
