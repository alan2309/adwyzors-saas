import { headers } from 'next/headers'
import { resolveTenant } from '@adwyzors/tenant'
import LoginForm from './login-form'

export default async function LoginPage() {
  const heads = await headers()
  const subdomain = heads.get('x-tenant-subdomain') ?? ''
  const customDomain = heads.get('x-tenant-custom-domain') ?? ''

  let tenantName = 'Adwyzors ERP'
  try {
    const host = heads.get('host') ?? 'localhost:3000'
    const tenant = await resolveTenant(host)
    tenantName = tenant.name
  } catch {
    // Fallback if tenant cannot be resolved or database isn't migrated/seeded yet
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xl shadow-md">
            A
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Sign in to {tenantName}
          </h1>
          <p className="text-sm text-zinc-400">
            {subdomain ? `${subdomain}.adwyzors.com` : customDomain || 'Enter your credentials'}
          </p>
        </div>

        <LoginForm />

        <div className="text-center text-xs text-zinc-500">
          Powered by Adwyzors. All rights reserved.
        </div>
      </div>
    </main>
  )
}
