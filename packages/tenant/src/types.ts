export interface TenantContext {
  id: string
  name: string
  subdomain: string
  customDomain: string | null
  plan: string
  status: string
  config: Record<string, unknown>
}
