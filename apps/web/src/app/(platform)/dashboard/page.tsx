import { requireSession } from '@adwyzors/auth'
import { headers } from 'next/headers'
import { resolveTenant } from '@adwyzors/tenant'

export default async function DashboardPage() {
  const session = await requireSession()
  const heads = await headers()
  const host = heads.get('host') ?? 'localhost:3000'
  const tenant = await resolveTenant(host)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back, {session.user.name}</h1>
        <p className="text-zinc-400 mt-1">Here is what is happening at {tenant.name} today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Tenant</p>
          <p className="text-2xl font-bold text-white">{tenant.name}</p>
          <p className="text-xs text-zinc-400">Plan: <span className="uppercase font-medium text-zinc-300">{tenant.plan}</span></p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Industry Config</p>
          <p className="text-2xl font-bold text-white capitalize">
            {(tenant.config.industry as string)?.replace('_', ' ') ?? 'Generic'}
          </p>
          <p className="text-xs text-zinc-400">Timezone: <span className="text-zinc-300">{String(tenant.config.timezone ?? 'UTC')}</span></p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active User Role</p>
          <p className="text-2xl font-bold text-white">{session.user.role}</p>
          <p className="text-xs text-zinc-400">Email: <span className="text-zinc-300">{session.user.email}</span></p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="text-sm font-semibold tracking-tight text-white uppercase tracking-wider">Configured Modules</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.isArray(tenant.config.modules) ? (
            tenant.config.modules.map((mod: string) => (
              <span
                key={mod}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 capitalize font-medium"
              >
                {mod}
              </span>
            ))
          ) : (
            <span className="text-xs text-zinc-500">No modules configured</span>
          )}
        </div>
      </div>
    </div>
  )
}
