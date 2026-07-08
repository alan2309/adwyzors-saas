# Adwyzors ERP — Phase Changelog

> Append each phase summary here after completion. Keeps the team aligned on what changed.

---

## Phase 1 — Multi-Tenant Core & Auth Engine

**Completed**: 2026-07-08  
**Scope**: UI design system, audit engine, password recovery, RBAC enforcement, tenant management, app shell

---

### New Packages

| Package | Purpose |
|---------|---------|
| `packages/ui` | Shared component library (Button, Input, Card, Badge, Avatar, Dialog, DropdownMenu, Table, Breadcrumb, Sidebar, ThemeProvider) using Radix + CVA + Tailwind |
| `packages/audit` | `writeAuditLog()` — non-blocking DB writes. `withAudit()` — wraps handlers with auto-logging |

### New Database Model

- **`PasswordResetToken`** — one-time-use tokens for password recovery (1h expiry, single-use enforcement)
- Migration: `20260708165435_add_password_reset_token`

### Auth Additions

- **`getUserPermissions(userId, tenantId)`** in `packages/auth` — resolves User → Role → Permission chain. SUPER_ADMIN returns `["*"]`. Deduplicates across multiple roles.

### Password Recovery Flow

- `/forgot-password` — email form, generates crypto token, logs reset URL to terminal (no email server needed in dev). Always returns success (no enumeration).
- `/reset-password?token=...` — validates token (exists, not expired, not used), hashes new password, writes audit log. Redirects to login with success toast.

### API Routes (all follow the standard: auth + permissions + Zod validation + audit + error handling)

**Super Admin** (`/api/super-admin/tenants`):
- `GET /` — paginated list with search
- `POST /` — create tenant with default TENANT_ADMIN + TENANT_USER roles
- `GET /[id]` — detail with user/role counts
- `PATCH /[id]` — update name, plan, config, domain
- `POST /[id]/suspend` — suspend or reactivate

**Settings** (`/api/settings`):
- `GET /users` — tenant-scoped user list (paginated, searchable)
- `POST /users/invite` — create pending user with assigned role
- `GET /roles` — tenant-scoped role list
- `POST /roles` — create custom role with permissions
- `PATCH /roles/[id]` — update (blocks system roles)

### UI / App Shell Changes

- **Root layout** — added `ThemeProvider` (dark default, system-aware)
- **Platform layout** — refactored with `@adwyzors/ui` components: Avatar + DropdownMenu for user menu, Badge for role, Link-based nav with lucide icons
- **Dashboard** — Card components for KPI placeholders
- **Super-admin layout** — same refactor (destructive color scheme for admin distinction)
- **Tenants list page** — Table component, status badges, user counts, Create Tenant button
- **Tenant detail page** — Cards for stats, recent users list, raw config viewer

### Tests (43 total)

- `packages/audit` (10) — writeAuditLog DB writes, non-blocking on failure, withAudit lifecycle
- `packages/auth` (7) — getUserPermissions chain resolution, SUPER_ADMIN bypass, dedup, skip inactive
- `apps/web` (26) — password reset validation rules, token lifecycle, tenant DTO schemas

### Key Files Added/Modified

```
packages/ui/                          ← NEW: entire package
packages/audit/                       ← NEW: entire package
packages/auth/src/permissions.ts      ← NEW: getUserPermissions
packages/database/prisma/schema.prisma ← MODIFIED: PasswordResetToken model
packages/database/src/tenant-client.ts ← MODIFIED: added PasswordResetToken to TENANT_SCOPED_MODELS
apps/web/src/app/(auth)/forgot-password/ ← NEW: page, form, actions
apps/web/src/app/(auth)/reset-password/  ← NEW: page, form, actions
apps/web/src/app/api/super-admin/tenants/ ← NEW: all route handlers + DTOs
apps/web/src/app/api/settings/           ← NEW: users + roles route handlers + DTOs
apps/web/src/app/(platform)/layout.tsx    ← REWRITTEN: uses UI components
apps/web/src/app/(super-admin)/           ← REWRITTEN: uses UI components + detail page
apps/web/src/app/layout.tsx               ← MODIFIED: ThemeProvider added
tooling/typescript/react.json             ← NEW: tsconfig preset for React packages
```

### How to Verify Locally

```bash
pnpm install
docker-compose up -d
pnpm --filter @adwyzors/database db:migrate
pnpm --filter @adwyzors/database db:seed
pnpm typecheck   # 13/13 packages
pnpm lint        # 0 errors
pnpm test        # 43 tests pass
pnpm build       # all compile
```

---
