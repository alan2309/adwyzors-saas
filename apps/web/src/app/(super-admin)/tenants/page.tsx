import { prisma } from '@adwyzors/database'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  // Query all tenants from the database
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Tenants</h1>
        <p className="text-zinc-400 mt-1">Manage and configure tenant instances on the platform.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 uppercase font-semibold text-xs tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Subdomain</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-800/10 transition-colors">
                <td className="p-4 font-semibold text-white">{t.name}</td>
                <td className="p-4 text-zinc-400">{t.subdomain}.localhost</td>
                <td className="p-4">
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase font-medium">
                    {t.plan}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      t.status === 'active'
                        ? 'bg-green-950/50 text-green-400 border border-green-900/50'
                        : 'bg-red-950/50 text-red-400 border border-red-900/50'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-zinc-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
