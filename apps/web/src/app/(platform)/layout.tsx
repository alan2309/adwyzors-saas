import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireSession, signOut } from '@adwyzors/auth'
import { resolveTenant } from '@adwyzors/tenant'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  const heads = await headers()
  const host = heads.get('host') ?? 'localhost:3000'

  let tenant = null
  try {
    tenant = await resolveTenant(host)
  } catch {
    // If tenant could not be resolved, redirect to tenant error page or root login
    redirect('/login')
  }

  // Cross-tenant verification:
  // Ensure the user's tenantId matches the resolved tenant's id,
  // unless the user is a platform SUPER_ADMIN.
  if (session.user.role !== 'SUPER_ADMIN' && session.user.tenantId !== tenant.id) {
    // Redirect to login or appropriate tenant path
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-white text-zinc-950 font-bold flex items-center justify-center">
              M
            </div>
            <span className="font-semibold tracking-tight text-sm">{tenant.name}</span>
          </div>

          <nav className="space-y-1">
            <a
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-zinc-800/50 text-white text-sm font-medium"
            >
              Dashboard
            </a>
            {session.user.role === 'SUPER_ADMIN' && (
              <a
                href="/tenants"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/30 hover:text-white text-sm font-medium"
              >
                Super Admin Panel
              </a>
            )}
          </nav>
        </div>

        <div className="space-y-4 border-t border-zinc-800 pt-6">
          <div className="px-3">
            <p className="text-sm font-medium text-white">{session.user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/10">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-400">
            {tenant.name} &bull; ERP Platform
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 capitalize font-medium">
              {session.user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
