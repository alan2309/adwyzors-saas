import { requireRole, signOut } from '@adwyzors/auth'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Enforce SUPER_ADMIN role at layout level
  const session = await requireRole('SUPER_ADMIN')

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center">
              A
            </div>
            <span className="font-semibold tracking-tight text-sm text-red-500">Adwyzors Admin</span>
          </div>

          <nav className="space-y-1">
            <a
              href="/tenants"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-zinc-800/50 text-white text-sm font-medium"
            >
              Tenants Management
            </a>
            <a
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/30 hover:text-white text-sm font-medium"
            >
              Back to ERP
            </a>
          </nav>
        </div>

        <div className="space-y-4 border-t border-zinc-800 pt-6">
          <div className="px-3">
            <p className="text-sm font-medium text-white">{session.user.name}</p>
            <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Super Admin</p>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/10">
          <h2 className="text-sm font-semibold tracking-tight text-red-500">
            Adwyzors Super Admin Control Panel
          </h2>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
